import type {
  JobResearchProfile,
  OptimizedResumeDocument,
  ResumeGenerationMode,
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillSection,
  ResumeStrategyPlan,
  ResumeSystemRequest,
  ResumeSystemResponse,
} from "../../../lib/resume-system";
import { createResumeQualityReport, repairOptimizedResume } from "../../../lib/resume-system";
import { renderResumeLatex } from "../../../lib/resume-latex-renderer";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

type ResumeModelPayload = {
  researchProfile: JobResearchProfile;
  strategyPlan: ResumeStrategyPlan;
  optimizedResume: OptimizedResumeDocument;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResumeGenerationMode(value: unknown): value is ResumeGenerationMode {
  return value === "real_application" || value === "synthetic_test";
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(getString).filter(Boolean);
}

function jsonResponse(payload: ResumeSystemResponse) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
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

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Model response was not valid JSON.");
  }
}

function buildSystemPrompt() {
  return [
    "You are InternPilot's schema-first resume planning engine.",
    "InternPilot is moving from freeform LaTeX generation to schema-first resume generation.",
    "Output JSON only.",
    "Output exactly these top-level fields: researchProfile, strategyPlan, optimizedResume.",
    "Do not include latex.",
    "Do not include qualityReport.",
    "Do not include fallbackUsed.",
    "Do not wrap JSON in markdown.",
    "optimizedResume.contact.name should be extracted from the base resume when present.",
    "Preserve mode in optimizedResume.metadata.mode.",
    "real_application mode cannot fabricate jobs, skills, tools, dates, credentials, metrics, awards, projects, or education.",
    "In synthetic_test mode, create internally consistent synthetic role-aligned projects if needed.",
    "Max 3 projects.",
    "Max 3 bullets per project.",
    "Max 2 experience items.",
    "Max 3 bullets per experience item.",
    "Avoid keyword stuffing.",
    "Avoid Role Alignment sections.",
    "Do not use generic project names like Project.",
    "Do not include unsupported metrics.",
    "Avoid vague bullets like improved user satisfaction.",
    "Do not leave skills sections empty when skills are present in the base resume or allowed synthetic context.",
    "Keep the resume visually believable and parser-readable.",
  ].join(" ");
}

function buildUserPrompt(payload: ResumeSystemRequest) {
  return [
    "Create a schema-first optimized resume response.",
    `Mode: ${payload.mode}`,
    `Company name: ${payload.companyName || "not provided"}`,
    `Role title: ${payload.roleTitle || "not provided"}`,
    payload.researchNotes ? `Research notes:\n${payload.researchNotes}` : "Research notes: not provided",
    `Base resume text:\n${payload.baseResumeText}`,
    `Job description:\n${payload.jobDescription}`,
    "In real_application mode, include only facts supported by the base resume text.",
    "In synthetic_test mode, synthesized content must be plausible and internally consistent.",
    "Use specific project names and technically grounded bullets.",
    "Avoid unsupported metrics and vague claims.",
    "Do not generate final LaTeX.",
    "Return only JSON with researchProfile, strategyPlan, optimizedResume.",
  ].join("\n\n");
}

function extractSupportedSkills(baseResumeText: string) {
  const text = baseResumeText.toLowerCase();
  const supported = [
    "Python",
    "C++",
    "Java",
    "TypeScript",
    "JavaScript",
    "React",
    "Node.js",
    "FastAPI",
    "Flask",
    "SQL",
    "Git",
    "GitHub",
    "Docker",
    "Linux",
    "AWS",
  ].filter((skill) => text.includes(skill.toLowerCase()));

  return supported.length ? supported : ["Resume-supported skills not parsed"];
}

function extractContact(baseResumeText: string): OptimizedResumeDocument["contact"] {
  const email = baseResumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = baseResumeText.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
  const linkedin = baseResumeText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const github = baseResumeText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const name = extractLikelyName(baseResumeText);
  const location = /san jose,\s*ca/i.test(baseResumeText) ? "San Jose, CA" : extractLikelyLocation(baseResumeText);

  return {
    name,
    location,
    phone: phone ?? "Phone not provided",
    email: email ?? "Email not provided",
    linkedin: linkedin ?? "LinkedIn not provided",
    ...(github ? { github } : {}),
  };
}

function extractLikelyName(baseResumeText: string) {
  if (/krish\s+patel/i.test(baseResumeText)) {
    return "Krish Patel";
  }

  const firstLines = baseResumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of firstLines) {
    const cleanLine = line.replace(/[|•,;:]/g, " ").replace(/\s+/g, " ").trim();

    if (
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(cleanLine) &&
      !/(resume|curriculum|email|phone|linkedin|github|education|experience)/i.test(cleanLine)
    ) {
      return cleanLine;
    }
  }

  return "Candidate";
}

function extractLikelyLocation(baseResumeText: string) {
  const locationMatch = baseResumeText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/);
  return locationMatch?.[0] ?? "Location not provided";
}

function createFallbackResearchProfile(
  payload: Partial<ResumeSystemRequest>,
  mode: ResumeGenerationMode
): JobResearchProfile {
  const roleTitle = getString(payload.roleTitle) || "Target Role";
  const companyName = getString(payload.companyName) || "Target Company";
  const jobDescription = getString(payload.jobDescription);

  return {
    companyName,
    roleTitle,
    roleFamily: "General software or internship role",
    roleLevel: mode === "synthetic_test" ? "Synthetic test candidate" : "Candidate level not inferred",
    targetCandidateProfile: "Fallback profile created because the resume system could not complete model generation.",
    mustHaveSignals: jobDescription ? ["Signals should be reviewed from the provided job description."] : [],
    preferredSignals: [],
    keywordGroups: {
      languages: [],
      frameworks: [],
      systems: [],
      tools: [],
      roleKeywords: jobDescription ? ["job-description-provided"] : [],
    },
    interviewThemes: [],
    companyValues: [],
    resumeImplications: [
      "Use only resume-supported facts in real_application mode.",
      "Render LaTeX deterministically from optimizedResume JSON.",
    ],
  };
}

function createFallbackStrategyPlan(): ResumeStrategyPlan {
  return {
    sectionOrder: ["Education", "Technical Skills", "Projects", "Experience", "Certifications"],
    headlineStrategy: "Use a conservative, parser-readable layout without unsupported claims.",
    skillsStrategy: "Include only skills found in the base resume text.",
    projectStrategy: "Use at most three projects and do not invent real-application evidence.",
    experienceStrategy: "Use at most two experience items and preserve supported facts.",
    educationStrategy: "Preserve education details only when supported by the resume.",
    certificationStrategy: "Include certifications only when present.",
    layoutStrategy: "Render through the deterministic compact Jake-style LaTeX renderer.",
    riskFlags: ["Fallback response used."],
  };
}

function createFallbackResume(
  payload: Partial<ResumeSystemRequest>,
  mode: ResumeGenerationMode
): OptimizedResumeDocument {
  const baseResumeText = getString(payload.baseResumeText);
  const companyName = getString(payload.companyName) || undefined;
  const roleTitle = getString(payload.roleTitle) || undefined;
  const supportedSkills = extractSupportedSkills(baseResumeText);
  const syntheticProject =
    mode === "synthetic_test"
      ? [
          {
            name: roleTitle ? `${roleTitle} Synthetic Test Project` : "Synthetic Test Project",
            technologies: supportedSkills,
            startDate: "Synthetic",
            endDate: "Synthetic",
            bullets: [
              "Created internally consistent test project content for schema and renderer validation.",
            ],
          },
        ]
      : [];

  return {
    contact: extractContact(baseResumeText),
    education: [],
    skills: [
      {
        label: "Technical Skills",
        items: supportedSkills,
      },
    ],
    projects: syntheticProject,
    experience: [],
    certifications: [],
    metadata: {
      mode,
      ...(companyName ? { companyName } : {}),
      ...(roleTitle ? { roleTitle } : {}),
      generatedAt: new Date().toISOString(),
    },
  };
}

function normalizeContact(value: unknown, request: ResumeSystemRequest): ResumeContact {
  const fallback = extractContact(request.baseResumeText);

  if (!isRecord(value)) {
    return fallback;
  }

  const github = getString(value.github) || getString(value.gitHub);

  return {
    name: getString(value.name) || fallback.name,
    location: getString(value.location) || fallback.location,
    phone: getString(value.phone) || fallback.phone,
    email: getString(value.email) || fallback.email,
    linkedin: getString(value.linkedin) || getString(value.linkedIn) || fallback.linkedin,
    ...(github ? { github } : fallback.github ? { github: fallback.github } : {}),
  };
}

function normalizeEducation(value: unknown): ResumeEducation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      school: getString(item.school) || getString(item.institution) || "School not provided",
      location: getString(item.location),
      degree: getString(item.degree) || "Degree not provided",
      graduationDate:
        getString(item.graduationDate) ||
        getString(item.endDate) ||
        getString(item.date) ||
        "Graduation date not provided",
      ...(getString(item.gpa) ? { gpa: getString(item.gpa) } : {}),
      ...(getStringArray(item.honors).length ? { honors: getStringArray(item.honors) } : {}),
      ...(getStringArray(item.coursework).length ? { coursework: getStringArray(item.coursework) } : {}),
    }));
}

function normalizeSkills(value: unknown): ResumeSkillSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const items = getStringArray(item.items).length
        ? getStringArray(item.items)
        : getStringArray(item.keywords);

      return {
        label: getString(item.label) || getString(item.name) || "Technical Skills",
        items,
      };
    })
    .filter((section) => section.items.length > 0);
}

function normalizeProjects(value: unknown): ResumeProject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const bullets = getStringArray(item.bullets).length
        ? getStringArray(item.bullets)
        : getStringArray(item.highlights);

      return {
        name: getString(item.name) || "Project",
        technologies: getStringArray(item.technologies).length
          ? getStringArray(item.technologies)
          : getStringArray(item.keywords),
        startDate: getString(item.startDate) || getString(item.start) || "",
        endDate: getString(item.endDate) || getString(item.end) || "",
        bullets: bullets.slice(0, 3),
      };
    })
    .filter((project) => project.bullets.length > 0)
    .slice(0, 3);
}

function normalizeExperience(value: unknown): ResumeExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const bullets = getStringArray(item.bullets).length
        ? getStringArray(item.bullets)
        : getStringArray(item.highlights);

      return {
        title: getString(item.title) || getString(item.position) || "Experience",
        organization: getString(item.organization) || getString(item.name) || "Organization",
        location: getString(item.location),
        startDate: getString(item.startDate) || getString(item.start) || "",
        endDate: getString(item.endDate) || getString(item.end) || "",
        bullets: bullets.slice(0, 3),
      };
    })
    .filter((experience) => experience.bullets.length > 0)
    .slice(0, 2);
}

function normalizeCertifications(value: unknown): ResumeCertification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      name: getString(item.name),
      ...(getString(item.issuer) ? { issuer: getString(item.issuer) } : {}),
    }))
    .filter((certification) => certification.name);
}

function normalizeResearchProfile(value: unknown, request: ResumeSystemRequest): JobResearchProfile {
  const fallback = createFallbackResearchProfile(request, request.mode);

  if (!isRecord(value)) {
    return fallback;
  }

  const keywordGroups = isRecord(value.keywordGroups) ? value.keywordGroups : {};

  return {
    companyName: getString(value.companyName) || fallback.companyName,
    roleTitle: getString(value.roleTitle) || fallback.roleTitle,
    roleFamily: getString(value.roleFamily) || fallback.roleFamily,
    roleLevel: getString(value.roleLevel) || fallback.roleLevel,
    targetCandidateProfile: getString(value.targetCandidateProfile) || fallback.targetCandidateProfile,
    mustHaveSignals: getStringArray(value.mustHaveSignals),
    preferredSignals: getStringArray(value.preferredSignals),
    keywordGroups: {
      languages: getStringArray(keywordGroups.languages),
      frameworks: getStringArray(keywordGroups.frameworks),
      systems: getStringArray(keywordGroups.systems),
      tools: getStringArray(keywordGroups.tools),
      roleKeywords: getStringArray(keywordGroups.roleKeywords),
    },
    interviewThemes: getStringArray(value.interviewThemes),
    companyValues: getStringArray(value.companyValues),
    resumeImplications: getStringArray(value.resumeImplications).length
      ? getStringArray(value.resumeImplications)
      : fallback.resumeImplications,
  };
}

function normalizeStrategyPlan(value: unknown): ResumeStrategyPlan {
  const fallback = createFallbackStrategyPlan();

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    sectionOrder: getStringArray(value.sectionOrder).length
      ? getStringArray(value.sectionOrder)
      : fallback.sectionOrder,
    headlineStrategy: getString(value.headlineStrategy) || fallback.headlineStrategy,
    skillsStrategy: getString(value.skillsStrategy) || fallback.skillsStrategy,
    projectStrategy: getString(value.projectStrategy) || fallback.projectStrategy,
    experienceStrategy: getString(value.experienceStrategy) || fallback.experienceStrategy,
    educationStrategy: getString(value.educationStrategy) || fallback.educationStrategy,
    certificationStrategy: getString(value.certificationStrategy) || fallback.certificationStrategy,
    layoutStrategy: getString(value.layoutStrategy) || fallback.layoutStrategy,
    riskFlags: getStringArray(value.riskFlags),
  };
}

function getResumeCandidate(value: Record<string, unknown>) {
  const candidates = [value.optimizedResume, value.resume, value.document];
  return candidates.find(isRecord) ?? null;
}

function normalizeOptimizedResume(value: unknown, request: ResumeSystemRequest): OptimizedResumeDocument | null {
  if (!isRecord(value)) {
    return null;
  }

  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const companyName = getString(metadata.companyName) || request.companyName;
  const roleTitle = getString(metadata.roleTitle) || request.roleTitle;
  const optimizedResume: OptimizedResumeDocument = {
    contact: normalizeContact(value.contact, request),
    education: normalizeEducation(value.education),
    skills: normalizeSkills(value.skills),
    projects: normalizeProjects(value.projects),
    experience: normalizeExperience(value.experience),
    certifications: normalizeCertifications(value.certifications),
    metadata: {
      mode: isResumeGenerationMode(metadata.mode) ? metadata.mode : request.mode,
      ...(companyName ? { companyName } : {}),
      ...(roleTitle ? { roleTitle } : {}),
      generatedAt: getString(metadata.generatedAt) || new Date().toISOString(),
    },
  };

  if (
    !optimizedResume.contact.name ||
    (optimizedResume.skills.length === 0 &&
      optimizedResume.projects.length === 0 &&
      optimizedResume.experience.length === 0 &&
      optimizedResume.education.length === 0)
  ) {
    return null;
  }

  return optimizedResume;
}

function normalizeResumeModelPayload(
  value: unknown,
  request: ResumeSystemRequest
): ResumeModelPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const resumeCandidate = getResumeCandidate(value);
  const optimizedResume = normalizeOptimizedResume(resumeCandidate, request);

  if (!optimizedResume) {
    return null;
  }

  return {
    researchProfile: normalizeResearchProfile(value.researchProfile, request),
    strategyPlan: normalizeStrategyPlan(value.strategyPlan),
    optimizedResume,
  };
}

function createFallbackResponse(
  reason: string,
  payload: Partial<ResumeSystemRequest> = {}
): ResumeSystemResponse {
  const mode = isResumeGenerationMode(payload.mode) ? payload.mode : "real_application";
  const researchProfile = createFallbackResearchProfile(payload, mode);
  const strategyPlan = createFallbackStrategyPlan();
  const optimizedResume = createFallbackResume(payload, mode);
  const latex = renderResumeLatex(optimizedResume);
  const qualityReport = createResumeQualityReport(optimizedResume, latex);

  return {
    mode,
    researchProfile,
    strategyPlan,
    optimizedResume,
    latex,
    qualityReport: {
      ...qualityReport,
      warnings: [...qualityReport.warnings, `Fallback used: ${reason}`],
    },
    fallbackUsed: true,
  };
}

function validatePayload(value: unknown): ResumeSystemRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const baseResumeText = getString(value.baseResumeText);
  const jobDescription = getString(value.jobDescription);

  if (!baseResumeText || !jobDescription || !isResumeGenerationMode(value.mode)) {
    return null;
  }

  return {
    baseResumeText,
    jobDescription,
    mode: value.mode,
    ...(getString(value.companyName) ? { companyName: getString(value.companyName) } : {}),
    ...(getString(value.roleTitle) ? { roleTitle: getString(value.roleTitle) } : {}),
    ...(getString(value.researchNotes) ? { researchNotes: getString(value.researchNotes) } : {}),
  };
}

async function requestResumeSystemFromOpenAI(
  payload: ResumeSystemRequest,
  apiKey: string
): Promise<unknown> {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error("OpenAI response did not include message content.");
  }

  return parseModelJson(rawText);
}

export async function POST(request: Request) {
  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(createFallbackResponse("invalid JSON body"));
  }

  const payload = validatePayload(rawPayload);

  if (!payload) {
    return jsonResponse(
      createFallbackResponse("invalid input", isRecord(rawPayload) ? rawPayload : {})
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(createFallbackResponse("OPENAI_API_KEY is not configured", payload));
  }

  try {
    const parsed = await requestResumeSystemFromOpenAI(payload, apiKey);
    const normalized = normalizeResumeModelPayload(parsed, payload);

    if (!normalized) {
      return jsonResponse(createFallbackResponse("no usable optimizedResume in model response", payload));
    }

    const repairedResume = repairOptimizedResume(normalized.optimizedResume, payload);
    const latex = renderResumeLatex(repairedResume);
    const qualityReport = createResumeQualityReport(repairedResume, latex);

    return jsonResponse({
      mode: payload.mode,
      researchProfile: normalized.researchProfile,
      strategyPlan: normalized.strategyPlan,
      optimizedResume: repairedResume,
      latex,
      qualityReport,
      fallbackUsed: false,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "resume system generation failed";
    return jsonResponse(createFallbackResponse(reason, payload));
  }
}
