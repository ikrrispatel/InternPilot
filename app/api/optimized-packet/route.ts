import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { renderOptimizedResumeText, validateOptimizedPacketResponse } from "../../../lib/optimized-packet";
import type { OptimizedPacketRequest, OptimizedPacketResponse } from "../../../lib/optimized-packet";

function buildSystemPrompt() {
  return [
    "You are generating one optimized synthetic application packet for a candidate.",
    "Treat the uploaded resume text as the candidate baseline seed, not as a perfect final document.",
    "Analyze the job description deeply and infer the likely role type, company type, and hiring expectations.",
    "Produce one strongest synthetic packet.",
    "Use a JSON Resume-inspired structure with coherent sections such as basics, education, skills, projects, work, and certificates.",
    "Keep the generated packet internally coherent and realistic.",
    "Skills listed in the skills section should be supported by projects or work inside the generated resume JSON.",
    "Project bullets should match the project technologies and role context.",
    "Cover letter or CV content should align with the optimized resume JSON.",
    "Cold outreach email content should align with the optimized resume JSON and company type.",
    "Dates should be plausible and impact metrics should sound realistic.",
    "Do not add live scraping or export logic.",
    "Return valid JSON only with the requested fields.",
  ].join(" ");
}

function buildUserPrompt(payload: OptimizedPacketRequest) {
  return [
    "Create one optimized synthetic application packet.",
    `Resume text:\n${payload.resumeText}`,
    `Job description:\n${payload.jobDescription}`,
    payload.companyUrl ? `Company URL: ${payload.companyUrl}` : "Company URL: not provided",
    payload.companyContext ? `Company context: ${payload.companyContext}` : "Company context: not provided",
    payload.editInstructions ? `Edit instructions:\n${payload.editInstructions}` : "Edit instructions: none",
    payload.matchAnalysis ? `Match analysis:\n${JSON.stringify(payload.matchAnalysis)}` : "Match analysis: not provided",
    "Infer the most relevant skills, tools, and evidence from the actual job description and company context, then tailor the packet toward those themes.",
    "Return valid JSON only with this exact shape: {\"normalizedResumeJson\":{...},\"optimizedResumeJson\":{...},\"coverLetter\":\"...\",\"coldOutreachEmail\":\"...\",\"researchRationale\":\"...\",\"changedSectionsSummary\":[...],\"warnings\":[...]}"
  ].join("\n\n");
}

function createFallbackResponse(): OptimizedPacketResponse {
  const fallbackResume = {
    basics: {
      name: "Candidate",
      summary: "Fallback packet generated because optimized generation was unavailable.",
    },
    education: [],
    skills: [],
    projects: [],
    work: [],
  };

  return {
    normalizedResumeJson: fallbackResume,
    optimizedResumeJson: fallbackResume,
    renderedResumeText: renderOptimizedResumeText(fallbackResume),
    coverLetter: "I am interested in this opportunity and would welcome the chance to discuss how I could contribute.",
    coldOutreachEmail: "Hello, I am interested in this opportunity and would appreciate the chance to connect.",
    researchRationale: "Fallback used because optimized generation was unavailable.",
    changedSectionsSummary: ["Fallback packet"],
    warnings: ["Optimized packet generation failed; fallback response was used."],
    fallbackUsed: true,
  };
}

export async function POST(request: NextRequest) {
  let payload: OptimizedPacketRequest;

  try {
    payload = (await request.json()) as OptimizedPacketRequest;
  } catch {
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  if (!payload || typeof payload.resumeText !== "string" || !payload.resumeText.trim() || typeof payload.jobDescription !== "string" || !payload.jobDescription.trim()) {
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: `${buildUserPrompt(payload)}\n\nReturn only valid JSON.`,
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawText) as Partial<OptimizedPacketResponse>;

    const normalizedResumeJson = parsed.normalizedResumeJson;
    const optimizedResumeJson = parsed.optimizedResumeJson;

    if (!normalizedResumeJson || !optimizedResumeJson) {
      throw new Error("Missing resume JSON blocks");
    }

    const response: OptimizedPacketResponse = {
      normalizedResumeJson: normalizedResumeJson as OptimizedPacketResponse["normalizedResumeJson"],
      optimizedResumeJson: optimizedResumeJson as OptimizedPacketResponse["optimizedResumeJson"],
      renderedResumeText: renderOptimizedResumeText(optimizedResumeJson as OptimizedPacketResponse["optimizedResumeJson"]),
      coverLetter: parsed.coverLetter ?? "",
      coldOutreachEmail: parsed.coldOutreachEmail ?? "",
      researchRationale: parsed.researchRationale ?? "",
      changedSectionsSummary: Array.isArray(parsed.changedSectionsSummary) ? parsed.changedSectionsSummary : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      fallbackUsed: false,
    };

    if (!validateOptimizedPacketResponse(response)) {
      throw new Error("Validation failed");
    }

    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }
}
