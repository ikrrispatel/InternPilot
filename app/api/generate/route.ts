import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type GeneratePayload = {
  resumeText: string;
  jobDescription: string;
  companyUrl?: string;
  selectedOutputs: {
    tailoredResume: boolean;
    coverLetter: boolean;
    outreachEmail: boolean;
  };
  editInstructions?: string;
  matchAnalysis?: {
    fitLabel?: string;
    summary?: string;
    matchedSignals?: Array<{ label: string }>;
    missingOrWeakSignals?: Array<{ label: string }>;
  };
};

function buildSystemPrompt() {
  return [
    "You are writing final draft text for job applications.",
    "The uploaded resume text is the only source of truth for candidate facts.",
    "Do not invent jobs, dates, metrics, tools, education, certifications, awards, publications, internships, open-source contributions, coding competitions, GPU/CUDA/HPC/deep learning/profiling experience, or skills.",
    "If a job requirement is missing from the resume, do not add it.",
    "Missing skills can be mentioned only as gaps or areas of interest, not as claimed experience.",
    "Preserve real dates, school, degree, GPA, projects, tools, and experience from the resume.",
    "Write final usable draft text, not instructions or placeholders.",
    "Avoid broad unsupported phrases such as systems software unless the resume explicitly supports them.",
    "Prefer safer resume-supported language such as algorithms, backend development, developer tooling, data/retrieval/evaluation, GitHub Actions, Linux, Docker, AWS EC2, Python, C++, FastAPI, and Flask.",
    "Do not claim CUDA, GPU clusters, PyTorch, TensorFlow, deep learning frameworks, HPC, profiling tools, performance optimization at scale, or previous NVIDIA-style internship experience.",
    "Return structured JSON with the requested drafts only for the selected outputs.",
    "Do not output JSON-looking prose to the user; return clean structured JSON from the API.",
  ].join(" ");
}

function buildUserPrompt(payload: GeneratePayload) {
  const selected = Object.entries(payload.selectedOutputs)
    .filter(([, selected]) => selected)
    .map(([key]) => key);

  return [
    "Create polished, final draft text for the selected outputs.",
    `Selected outputs: ${selected.join(", ") || "none"}`,
    `Resume text:\n${payload.resumeText}`,
    `Job description:\n${payload.jobDescription}`,
    payload.companyUrl ? `Company URL: ${payload.companyUrl}` : "Company URL: not provided",
    payload.editInstructions ? `Edit instructions:\n${payload.editInstructions}` : "Edit instructions: none",
    payload.matchAnalysis ? `Match analysis:\n${JSON.stringify(payload.matchAnalysis)}` : "Match analysis: not provided",
    "For the NVIDIA-style role, emphasize only verified resume facts such as CS enrollment, GPA, Python, C++, data structures and algorithms, backend/API projects, Git/GitHub/GitHub Actions, Docker/Linux/AWS EC2, and retrieval/evaluation/project work. Do not claim CUDA, GPU clusters, PyTorch, TensorFlow, deep learning, HPC, profiling tools, performance optimization at scale, or prior NVIDIA-style internship experience.",
  ].join("\n\n");
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as GeneratePayload;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        tailoredResume: "",
        coverLetter: "",
        outreachEmail: "",
        warnings: ["OPENAI_API_KEY is not configured. Using fallback mock output."],
        fallbackUsed: true,
      },
      { status: 200 }
    );
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
          content: `${buildUserPrompt(payload)}\n\nReturn only valid JSON with this exact shape: {"tailoredResume":"...","coverLetter":"...","outreachEmail":"...","warnings":["..."]}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as {
      tailoredResume?: string;
      coverLetter?: string;
      outreachEmail?: string;
      warnings?: string[];
    };

    return NextResponse.json({
      tailoredResume: parsed.tailoredResume ?? "",
      coverLetter: parsed.coverLetter ?? "",
      outreachEmail: parsed.outreachEmail ?? "",
      warnings: parsed.warnings ?? ["Generated with OpenAI."],
      fallbackUsed: false,
    });
  } catch {
    return NextResponse.json(
      {
        tailoredResume: "",
        coverLetter: "",
        outreachEmail: "",
        warnings: ["OpenAI generation failed. Using fallback mock output."],
        fallbackUsed: true,
      },
      { status: 200 }
    );
  }
}
