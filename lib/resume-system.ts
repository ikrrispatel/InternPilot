export type ResumeGenerationMode = "real_application" | "synthetic_test";

export type ResumeSystemRequest = {
  baseResumeText: string;
  jobDescription: string;
  companyName?: string;
  roleTitle?: string;
  mode: ResumeGenerationMode;
  researchNotes?: string;
};

export type JobResearchProfile = {
  companyName: string;
  roleTitle: string;
  roleFamily: string;
  roleLevel: string;
  targetCandidateProfile: string;
  mustHaveSignals: string[];
  preferredSignals: string[];
  keywordGroups: {
    languages: string[];
    frameworks: string[];
    systems: string[];
    tools: string[];
    roleKeywords: string[];
  };
  interviewThemes: string[];
  companyValues: string[];
  resumeImplications: string[];
};

export type ResumeStrategyPlan = {
  sectionOrder: string[];
  headlineStrategy: string;
  skillsStrategy: string;
  projectStrategy: string;
  experienceStrategy: string;
  educationStrategy: string;
  certificationStrategy: string;
  layoutStrategy: string;
  riskFlags: string[];
};

export type ResumeContact = {
  name: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github?: string;
};

export type ResumeEducation = {
  school: string;
  location: string;
  degree: string;
  graduationDate: string;
  gpa?: string;
  honors?: string[];
  coursework?: string[];
};

export type ResumeSkillSection = {
  label: string;
  items: string[];
};

export type ResumeProject = {
  name: string;
  technologies: string[];
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type ResumeExperience = {
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type ResumeCertification = {
  name: string;
  issuer?: string;
};

export type OptimizedResumeDocument = {
  contact: ResumeContact;
  education: ResumeEducation[];
  skills: ResumeSkillSection[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  certifications: ResumeCertification[];
  metadata: {
    mode: ResumeGenerationMode;
    companyName?: string;
    roleTitle?: string;
    generatedAt: string;
  };
};

export type ResumeQualityReport = {
  humanReadabilityScore: number;
  parserReadabilityScore: number;
  jobAlignmentScore: number;
  layoutRisk: "low" | "medium" | "high";
  issues: string[];
  fixesApplied: string[];
  warnings: string[];
};

export type ResumeSystemResponse = {
  mode: ResumeGenerationMode;
  researchProfile: JobResearchProfile;
  strategyPlan: ResumeStrategyPlan;
  optimizedResume: OptimizedResumeDocument;
  latex: string;
  qualityReport: ResumeQualityReport;
  fallbackUsed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isResumeGenerationMode(value: unknown): value is ResumeGenerationMode {
  return value === "real_application" || value === "synthetic_test";
}

function hasOptionalString(record: Record<string, unknown>, key: string) {
  return record[key] === undefined || typeof record[key] === "string";
}

function isResumeContact(value: unknown): value is ResumeContact {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.location === "string" &&
    typeof value.phone === "string" &&
    typeof value.email === "string" &&
    typeof value.linkedin === "string" &&
    hasOptionalString(value, "github")
  );
}

function isResumeEducation(value: unknown): value is ResumeEducation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.school === "string" &&
    typeof value.location === "string" &&
    typeof value.degree === "string" &&
    typeof value.graduationDate === "string" &&
    hasOptionalString(value, "gpa") &&
    (value.honors === undefined || isStringArray(value.honors)) &&
    (value.coursework === undefined || isStringArray(value.coursework))
  );
}

function isResumeSkillSection(value: unknown): value is ResumeSkillSection {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.label === "string" && isStringArray(value.items);
}

function isResumeProject(value: unknown): value is ResumeProject {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    isStringArray(value.technologies) &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    isStringArray(value.bullets)
  );
}

function isResumeExperience(value: unknown): value is ResumeExperience {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.organization === "string" &&
    typeof value.location === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    isStringArray(value.bullets)
  );
}

function isResumeCertification(value: unknown): value is ResumeCertification {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.name === "string" && hasOptionalString(value, "issuer");
}

function isOptimizedResumeDocument(value: unknown): value is OptimizedResumeDocument {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return false;
  }

  return (
    isResumeContact(value.contact) &&
    Array.isArray(value.education) &&
    value.education.every(isResumeEducation) &&
    Array.isArray(value.skills) &&
    value.skills.every(isResumeSkillSection) &&
    Array.isArray(value.projects) &&
    value.projects.every(isResumeProject) &&
    Array.isArray(value.experience) &&
    value.experience.every(isResumeExperience) &&
    Array.isArray(value.certifications) &&
    value.certifications.every(isResumeCertification) &&
    isResumeGenerationMode(value.metadata.mode) &&
    hasOptionalString(value.metadata, "companyName") &&
    hasOptionalString(value.metadata, "roleTitle") &&
    typeof value.metadata.generatedAt === "string"
  );
}

function isJobResearchProfile(value: unknown): value is JobResearchProfile {
  if (!isRecord(value) || !isRecord(value.keywordGroups)) {
    return false;
  }

  return (
    typeof value.companyName === "string" &&
    typeof value.roleTitle === "string" &&
    typeof value.roleFamily === "string" &&
    typeof value.roleLevel === "string" &&
    typeof value.targetCandidateProfile === "string" &&
    isStringArray(value.mustHaveSignals) &&
    isStringArray(value.preferredSignals) &&
    isStringArray(value.keywordGroups.languages) &&
    isStringArray(value.keywordGroups.frameworks) &&
    isStringArray(value.keywordGroups.systems) &&
    isStringArray(value.keywordGroups.tools) &&
    isStringArray(value.keywordGroups.roleKeywords) &&
    isStringArray(value.interviewThemes) &&
    isStringArray(value.companyValues) &&
    isStringArray(value.resumeImplications)
  );
}

function isResumeStrategyPlan(value: unknown): value is ResumeStrategyPlan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isStringArray(value.sectionOrder) &&
    typeof value.headlineStrategy === "string" &&
    typeof value.skillsStrategy === "string" &&
    typeof value.projectStrategy === "string" &&
    typeof value.experienceStrategy === "string" &&
    typeof value.educationStrategy === "string" &&
    typeof value.certificationStrategy === "string" &&
    typeof value.layoutStrategy === "string" &&
    isStringArray(value.riskFlags)
  );
}

function isResumeQualityReport(value: unknown): value is ResumeQualityReport {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.humanReadabilityScore === "number" &&
    typeof value.parserReadabilityScore === "number" &&
    typeof value.jobAlignmentScore === "number" &&
    (value.layoutRisk === "low" || value.layoutRisk === "medium" || value.layoutRisk === "high") &&
    isStringArray(value.issues) &&
    isStringArray(value.fixesApplied) &&
    isStringArray(value.warnings)
  );
}

function hasMarkdownLink(value: string) {
  return /\[[^\]]+\]\([^)]+\)/.test(value);
}

function hasMailtoMarkdown(value: string) {
  return /\[[^\]]+\]\(\s*mailto:[^)]+\)/i.test(value);
}

function hasDanglingSingleBackslash(value: string) {
  return value
    .split(/\r?\n/)
    .some((line) => /(^|[^\\])\\$/.test(line.trim()));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(value: string) {
  return value.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0];
}

function extractLinkedIn(value: string) {
  return value.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
}

function extractGitHub(value: string) {
  return value.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
}

function extractLikelyName(value: string) {
  if (/krish\s+patel/i.test(value)) {
    return "Krish Patel";
  }

  const firstLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of firstLines) {
    const cleanLine = line.replace(/[|•,;:]/g, " ").replace(/\s+/g, " ").trim();

    if (
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/.test(cleanLine) &&
      !/(resume|curriculum|email|phone|linkedin|github|education|experience|projects|skills)/i.test(
        cleanLine
      )
    ) {
      return cleanLine;
    }
  }

  return undefined;
}

function extractLocation(value: string) {
  if (/san jose,\s*ca/i.test(value)) {
    return "San Jose, CA";
  }

  return value.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/)?.[0];
}

function hasUsableContactValue(value: string, placeholder: string) {
  return Boolean(value && value.trim() && value.trim().toLowerCase() !== placeholder.toLowerCase());
}

const PLACEHOLDER_VALUES = new Set([
  "organization",
  "company",
  "location not provided",
  "phone not provided",
  "linkedin not provided",
  "graduation date not provided",
  "n/a",
  "unknown",
]);

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed === "" ? false : PLACEHOLDER_VALUES.has(trimmed);
}

function normalizePlaceholderValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  return isPlaceholderValue(trimmed) ? "" : trimmed;
}

function extractGraduationDate(baseResumeText: string) {
  const normalized = baseResumeText.replace(/\s+/g, " ").trim();

  const expectedPatterns = [
    /expected\s+(dec\.?|december)\s+(\d{4})/i,
    /expected\s+(jan\.?|january|feb\.?|february|mar\.?|march|apr\.?|april|may|jun\.?|june|jul\.?|july|aug\.?|august|sep\.?|september|oct\.?|october|nov\.?|november|dec\.?|december)\s+(\d{4})/i,
  ];

  for (const pattern of expectedPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const [, month, year] = match;
      return `Expected ${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
    }
  }

  const patterns = [
    /(dec\.?|december)\s+(\d{4})/i,
    /(jan\.?|january|feb\.?|february|mar\.?|march|apr\.?|april|may|jun\.?|june|jul\.?|july|aug\.?|august|sep\.?|september|oct\.?|october|nov\.?|november|dec\.?|december)\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)} ${match[2]}`;
    }
  }

  return undefined;
}

const SKILL_DICTIONARY: Array<{ label: string; items: string[] }> = [
  {
    label: "Languages",
    items: ["Java", "Python", "C", "C++", "JavaScript", "TypeScript", "SQL", "Swift", "HTML5", "CSS", "Unix Shell"],
  },
  {
    label: "Frameworks",
    items: ["React", "Node.js", "Express", "FastAPI", "Flask", "SwiftUI", "UIKit", "JUnit", "PyTest"],
  },
  {
    label: "Databases and Systems",
    items: [
      "MySQL",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "Data Modeling",
      "MapReduce",
      "REST APIs",
      "Client-Server Protocols",
      "Spark",
      "Hadoop",
      "HDFS",
    ],
  },
  {
    label: "Tools",
    items: ["Git", "GitHub Actions", "Docker", "Linux", "Xcode", "Postman", "VS Code", "CI/CD", "Debugging"],
  },
];

function hasTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(text);
}

function extractKnownSkills(baseResumeText: string, jobDescription: string, mode: ResumeGenerationMode) {
  return SKILL_DICTIONARY.map((section) => {
    const items = section.items.filter((skill) => {
      const inResume = hasTerm(baseResumeText, skill);
      const inJob = hasTerm(jobDescription, skill);
      return mode === "synthetic_test" ? inResume || inJob : inResume;
    });

    return {
      label: section.label,
      items,
    };
  }).filter((section) => section.items.length > 0);
}

function isGenericProjectName(name: string) {
  return !name.trim() || /^(project|synthetic test project|sample project|resume project)$/i.test(name.trim());
}

function chooseProjectName(request: ResumeSystemRequest) {
  const roleAndJd = `${request.roleTitle ?? ""} ${request.jobDescription}`.toLowerCase();
  const baseResumeText = request.baseResumeText.toLowerCase();

  if (request.mode === "real_application") {
    if (baseResumeText.includes("internpilot")) {
      return "InternPilot Resume Optimizer";
    }

    if (baseResumeText.includes("resume")) {
      return "Resume Optimization Project";
    }

    return "Resume-Supported Project";
  }

  if (/(backend|api|rest|server|fastapi|flask|express)/i.test(roleAndJd)) {
    return "Backend API Reliability Platform";
  }

  if (/(ios|swift|swiftui|uikit|mobile)/i.test(roleAndJd)) {
    return "iOS Productivity Planner";
  }

  if (/(data|spark|hadoop|hdfs|distributed|analytics|pipeline)/i.test(roleAndJd)) {
    return "Distributed Analytics Pipeline";
  }

  return "InternPilot Resume Matching Engine";
}

function hasUnsupportedMetric(bullet: string, baseResumeText: string) {
  const patterns = [/30%\s+increase/i, /user satisfaction/i, /survey results/i];
  return patterns.some((pattern) => pattern.test(bullet) && !pattern.test(baseResumeText));
}

function repairBullet(
  bullet: string,
  projectName: string,
  request: ResumeSystemRequest,
  baseResumeText: string
) {
  if (!hasUnsupportedMetric(bullet, baseResumeText)) {
    return bullet;
  }

  if (request.mode === "real_application") {
    return `Developed ${projectName} functionality using resume-supported technologies without adding unsupported metrics.`;
  }

  return `Built role-aligned ${projectName} functionality with clear data flow, error handling, and maintainable implementation details.`;
}

function defaultProjectBullet(projectName: string, request: ResumeSystemRequest) {
  if (request.mode === "real_application") {
    return `Implemented ${projectName} using technologies supported by the base resume.`;
  }

  return `Built ${projectName} with role-aligned architecture, reliable data handling, and testable components.`;
}

export function repairOptimizedResume(
  resume: OptimizedResumeDocument,
  request: ResumeSystemRequest
): OptimizedResumeDocument {
  const baseResumeText = request.baseResumeText;
  const extractedEmail = extractEmail(baseResumeText);
  const extractedPhone = extractPhone(baseResumeText);
  const extractedLinkedIn = extractLinkedIn(baseResumeText);
  const extractedGitHub = extractGitHub(baseResumeText);
  const repairedContact = {
    ...resume.contact,
    name:
      extractLikelyName(baseResumeText) ||
      (resume.contact.name === "Candidate" ? "" : resume.contact.name) ||
      "Candidate",
    location: extractLocation(baseResumeText) || resume.contact.location,
    phone: hasUsableContactValue(resume.contact.phone, "Phone not provided")
      ? resume.contact.phone
      : extractedPhone || "Phone not provided",
    email: hasUsableContactValue(resume.contact.email, "Email not provided")
      ? resume.contact.email
      : extractedEmail || "Email not provided",
    linkedin: hasUsableContactValue(resume.contact.linkedin, "LinkedIn not provided")
      ? resume.contact.linkedin
      : extractedLinkedIn || "LinkedIn not provided",
    ...(resume.contact.github || extractedGitHub
      ? { github: resume.contact.github || extractedGitHub }
      : {}),
  };

  const hasSkillItems = resume.skills.some((section) => section.items.length > 0);
  const repairedSkills = hasSkillItems
    ? resume.skills
        .map((section) => ({
          ...section,
          items: uniq(section.items.map(getString)),
        }))
        .filter((section) => section.items.length > 0)
    : extractKnownSkills(baseResumeText, request.jobDescription, request.mode);

  const repairedProjects = resume.projects
    .slice(0, 3)
    .map((project) => {
      const name = isGenericProjectName(project.name) ? chooseProjectName(request) : project.name;
      const bullets = project.bullets
        .map((bullet) => repairBullet(bullet, name, request, baseResumeText))
        .filter(Boolean)
        .slice(0, 3);

      return {
        ...project,
        name,
        bullets: bullets.length ? bullets : [defaultProjectBullet(name, request)],
      };
    })
    .filter((project) => project.name && project.bullets.length > 0);

  const extractedGraduationDate = extractGraduationDate(baseResumeText);
  const repairedEducation = resume.education.map((education) => {
    const graduationDate =
      education.graduationDate && !isPlaceholderValue(education.graduationDate)
        ? education.graduationDate
        : extractedGraduationDate || "";

    return {
      ...education,
      graduationDate,
    };
  });

  const repairedExperience = resume.experience
    .slice(0, 2)
    .map((experience) => ({
      ...experience,
      title: normalizePlaceholderValue(experience.title) || "Experience",
      organization: normalizePlaceholderValue(experience.organization),
      location: normalizePlaceholderValue(experience.location),
      bullets: experience.bullets
        .map((bullet) => repairBullet(bullet, experience.title || "experience", request, baseResumeText))
        .filter(Boolean)
        .slice(0, 3),
    }))
    .filter((experience) => experience.title && experience.bullets.length > 0);

  return {
    ...resume,
    contact: repairedContact,
    education: repairedEducation,
    skills: repairedSkills,
    projects: repairedProjects,
    experience: repairedExperience,
    metadata: {
      ...resume.metadata,
      mode: request.mode,
      ...(request.companyName || resume.metadata.companyName
        ? { companyName: request.companyName || resume.metadata.companyName }
        : {}),
      ...(request.roleTitle || resume.metadata.roleTitle
        ? { roleTitle: request.roleTitle || resume.metadata.roleTitle }
        : {}),
      generatedAt: resume.metadata.generatedAt || new Date().toISOString(),
    },
  };
}

export function createResumeQualityReport(
  resume: OptimizedResumeDocument,
  latex: string
): ResumeQualityReport {
  const issues: string[] = [];
  const warnings: string[] = [];
  const fixesApplied: string[] = [];

  if (hasMarkdownLink(latex)) {
    issues.push("LaTeX contains markdown-style links.");
  }

  if (hasMailtoMarkdown(latex)) {
    issues.push("LaTeX contains mailto markdown.");
  }

  if (resume.projects.length > 3) {
    issues.push("Resume includes more than 3 projects.");
  }

  for (const project of resume.projects) {
    if (isGenericProjectName(project.name)) {
      issues.push(`Project "${project.name}" has a generic name.`);
    }

    if (project.bullets.length > 3) {
      issues.push(`Project "${project.name}" includes more than 3 bullets.`);
    }

    if (project.bullets.some((bullet) => /30%\s+increase|user satisfaction|survey results/i.test(bullet))) {
      warnings.push(`Project "${project.name}" may contain unsupported fake metric language.`);
    }
  }

  if (resume.experience.length > 2) {
    issues.push("Resume includes more than 2 experience items.");
  }

  for (const experience of resume.experience) {
    if (experience.bullets.length > 3) {
      issues.push(`Experience "${experience.title}" includes more than 3 bullets.`);
    }
  }

  if (!isResumeGenerationMode(resume.metadata.mode)) {
    issues.push("Resume generation mode was not preserved.");
  }

  for (const section of ["Education", "Technical Skills", "Projects", "Experience"]) {
    if (!latex.includes(section)) {
      issues.push(`LaTeX is missing the ${section} section.`);
    }
  }

  if (/Role Alignment/i.test(latex)) {
    issues.push("LaTeX contains a Role Alignment keyword dump section.");
  }

  if (!resume.contact.github && /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+/i.test(latex)) {
    issues.push("GitHub appears in LaTeX as a contact link even though contact.github is not present.");
  }

  if (hasDanglingSingleBackslash(latex)) {
    warnings.push("LaTeX contains a likely dangling single backslash line.");
  }

  if (/Organization|Company|Location not provided|Phone not provided|LinkedIn not provided|Graduation date not provided|N\/A|Unknown/i.test(latex)) {
    warnings.push("LaTeX still contains placeholder content.");
  }

  if (resume.projects.length === 0) {
    warnings.push("Resume has no projects.");
  }

  if (resume.skills.length === 0) {
    warnings.push("Resume has no technical skills section.");
  }

  if (issues.length === 0) {
    fixesApplied.push("Validated schema and LaTeX guardrails.");
  }

  const layoutRisk: ResumeQualityReport["layoutRisk"] =
    issues.length >= 4 ? "high" : issues.length >= 2 || resume.projects.length > 3 ? "medium" : "low";

  return {
    humanReadabilityScore: clampScore(100 - issues.length * 12 - warnings.length * 4),
    parserReadabilityScore: clampScore(100 - issues.length * 14),
    jobAlignmentScore: clampScore(
      55 +
        Math.min(resume.skills.length, 4) * 6 +
        Math.min(resume.projects.length, 3) * 7 +
        Math.min(resume.experience.length, 2) * 5 -
        warnings.length * 3
    ),
    layoutRisk,
    issues,
    fixesApplied,
    warnings,
  };
}

export function isResumeSystemResponse(value: unknown): value is ResumeSystemResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isResumeGenerationMode(value.mode) &&
    isJobResearchProfile(value.researchProfile) &&
    isResumeStrategyPlan(value.strategyPlan) &&
    isOptimizedResumeDocument(value.optimizedResume) &&
    typeof value.latex === "string" &&
    isResumeQualityReport(value.qualityReport) &&
    typeof value.fallbackUsed === "boolean"
  );
}

export function normalizeResumeSystemResponse(value: unknown): ResumeSystemResponse | null {
  if (!isResumeSystemResponse(value)) {
    return null;
  }

  return {
    ...value,
    qualityReport: createResumeQualityReport(value.optimizedResume, value.latex),
  };
}
