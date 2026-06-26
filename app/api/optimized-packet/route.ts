import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { renderOptimizedResumeText, validateOptimizedPacketResponse } from "../../../lib/optimized-packet";
import type { OptimizedPacketRequest, OptimizedPacketResponse } from "../../../lib/optimized-packet";

function logFallback(reason: string, detail?: unknown) {
  console.warn(`[optimized-packet] fallback: ${reason}`, detail ?? "");
}

function buildSystemPrompt() {
  return [
    "You are generating one optimized synthetic application packet for a candidate.",
    "This optimized packet flow is synthetic.",
    "The uploaded resume is a seed, not a factual boundary.",
    "You may synthesize optimized content for the target role.",
    "Use the uploaded resume as the baseline seed and then strengthen it toward the target role with a single strongest packet.",
    "Analyze the job description deeply and infer the likely role type, company type, and hiring expectations.",
    "Missing or weak signals from matchAnalysis should be treated as optimization targets, not limitations.",
    "Treat those signals silently as optimization targets and do not mention them as missing.",
    "Do not write that the candidate lacks a skill.",
    "Do not write that the candidate is merely eager to learn a missing skill.",
    "Do not use the words lacks, lacked, missing, gap, gaps, unsupported, not supported, not clearly supported, honesty, truthfulness, or eager to learn anywhere in generated output.",
    "In researchRationale, do not describe the seed resume as lacking, missing, weak, unsupported, or incomplete.",
    "In researchRationale, explain the positive construction strategy: target role signals identified, synthetic evidence created, skills/projects/work/certifications aligned, and the packet made internally coherent.",
    "Instead, create internally coherent generated evidence that supports the target skills.",
    "If you add a generated skill, at least one generated project or work bullet must support it.",
    "The optimized packet should present the candidate as already matching the generated synthetic profile.",
    "Research rationale should explain how the packet was optimized, not apologize for gaps.",
    "Use a JSON Resume-inspired structure with coherent sections such as basics, education, skills, projects, work, and certificates.",
    "Keep the generated packet internally coherent and realistic.",
    "Skills listed in the skills section should be supported by projects or work inside the generated resume JSON.",
    "Project bullets should match the project technologies and role context.",
    "Cover letter or CV content should align with the optimized resume JSON.",
    "Cold outreach email content should align with the optimized resume JSON and company type.",
    "Dates should be plausible and impact metrics should sound realistic.",
    "Do not add live scraping or export logic.",
    "Return a strict JSON object only.",
    "Do not include renderedResumeText. The server will derive renderedResumeText from optimizedResumeJson.",
    "Each of normalizedResumeJson and optimizedResumeJson must include a basics object with a non-empty name, an education array, a skills array of objects with name and keywords array, a projects array of objects with name, keywords array, and highlights array, a work array of objects with name, position, and highlights array, and certificates as an optional array.",
    "Return only: normalizedResumeJson, optimizedResumeJson, coverLetter, coldOutreachEmail, researchRationale, changedSectionsSummary, warnings.",
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
    "Return only a strict JSON object with: normalizedResumeJson, optimizedResumeJson, coverLetter, coldOutreachEmail, researchRationale, changedSectionsSummary, warnings.",
  ].join("\n\n");
}

function parseModelJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        // fall through to throw below
      }
    }

    throw new Error("model JSON parse failed");
  }
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
    logFallback("request JSON parse failed");
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  if (!payload || typeof payload.resumeText !== "string" || !payload.resumeText.trim() || typeof payload.jobDescription !== "string" || !payload.jobDescription.trim()) {
    logFallback("missing resumeText or jobDescription");
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logFallback("missing OPENAI_API_KEY");
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
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
    const parsed = parseModelJson(rawText) as Partial<OptimizedPacketResponse>;

    const normalizedResumeJson = parsed.normalizedResumeJson;
    const optimizedResumeJson = parsed.optimizedResumeJson;

    if (!normalizedResumeJson || !optimizedResumeJson) {
      throw new Error("missing normalizedResumeJson or optimizedResumeJson");
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
      throw new Error("final validateOptimizedPacketResponse failed");
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "OpenAI call failed";
    logFallback(reason, error);
    return NextResponse.json(createFallbackResponse(), { status: 200 });
  }
}
