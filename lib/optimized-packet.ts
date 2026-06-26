export type OptimizedResumeBasics = {
  name: string;
  label?: string;
  email?: string;
  phone?: string;
  location?: string;
  url?: string;
  summary?: string;
};

export type OptimizedResumeEducationItem = {
  institution: string;
  area?: string;
  studyType?: string;
  startDate?: string;
  endDate?: string;
  score?: string;
  courses?: string[];
  highlights?: string[];
};

export type OptimizedResumeSkill = {
  name: string;
  level?: string;
  keywords: string[];
};

export type OptimizedResumeProject = {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  keywords: string[];
  highlights: string[];
};

export type OptimizedResumeWorkItem = {
  name: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights: string[];
};

export type OptimizedResumeCertificate = {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
};

export type OptimizedResumeJson = {
  basics: OptimizedResumeBasics;
  education: OptimizedResumeEducationItem[];
  skills: OptimizedResumeSkill[];
  projects: OptimizedResumeProject[];
  work: OptimizedResumeWorkItem[];
  certificates?: OptimizedResumeCertificate[];
};

export type OptimizedPacketRequest = {
  resumeText: string;
  jobDescription: string;
  companyUrl?: string;
  companyContext?: string;
  editInstructions?: string;
  matchAnalysis?: {
    fitLabel?: string;
    summary?: string;
    matchedSignals?: Array<{ label: string }>;
    missingOrWeakSignals?: Array<{ label: string }>;
  };
};

export type OptimizedPacketResponse = {
  normalizedResumeJson: OptimizedResumeJson;
  optimizedResumeJson: OptimizedResumeJson;
  renderedResumeText: string;
  coverLetter: string;
  coldOutreachEmail: string;
  researchRationale: string;
  changedSectionsSummary: string[];
  warnings: string[];
  fallbackUsed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOptimizedResumeBasics(value: unknown): value is OptimizedResumeBasics {
  return isRecord(value) && isNonEmptyString(value.name);
}

function isOptimizedResumeEducationItem(value: unknown): value is OptimizedResumeEducationItem {
  return isRecord(value) && isNonEmptyString(value.institution);
}

function isOptimizedResumeSkill(value: unknown): value is OptimizedResumeSkill {
  return isRecord(value) && isNonEmptyString(value.name) && isStringArray(value.keywords);
}

function isOptimizedResumeProject(value: unknown): value is OptimizedResumeProject {
  return isRecord(value) && isNonEmptyString(value.name) && isStringArray(value.keywords) && isStringArray(value.highlights);
}

function isOptimizedResumeWorkItem(value: unknown): value is OptimizedResumeWorkItem {
  return isRecord(value) && isNonEmptyString(value.name) && isNonEmptyString(value.position) && isStringArray(value.highlights);
}

function isOptimizedResumeCertificate(value: unknown): value is OptimizedResumeCertificate {
  return isRecord(value) && isNonEmptyString(value.name);
}

function isOptimizedResumeJson(value: unknown): value is OptimizedResumeJson {
  if (!isRecord(value)) {
    return false;
  }

  if (!isOptimizedResumeBasics(value.basics)) {
    return false;
  }

  if (!Array.isArray(value.education) || !value.education.every(isOptimizedResumeEducationItem)) {
    return false;
  }

  if (!Array.isArray(value.skills) || !value.skills.every(isOptimizedResumeSkill)) {
    return false;
  }

  if (!Array.isArray(value.projects) || !value.projects.every(isOptimizedResumeProject)) {
    return false;
  }

  if (!Array.isArray(value.work) || !value.work.every(isOptimizedResumeWorkItem)) {
    return false;
  }

  if ("certificates" in value && value.certificates !== undefined && (!Array.isArray(value.certificates) || !value.certificates.every(isOptimizedResumeCertificate))) {
    return false;
  }

  return true;
}

export function validateOptimizedPacketResponse(value: unknown): value is OptimizedPacketResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (!isOptimizedResumeJson(value.optimizedResumeJson)) {
    return false;
  }

  if (!isOptimizedResumeJson(value.normalizedResumeJson)) {
    return false;
  }

  if (!isNonEmptyString(value.renderedResumeText)) {
    return false;
  }

  if (!isNonEmptyString(value.coverLetter)) {
    return false;
  }

  if (!isNonEmptyString(value.coldOutreachEmail)) {
    return false;
  }

  if (!isNonEmptyString(value.researchRationale)) {
    return false;
  }

  if (!isStringArray(value.changedSectionsSummary)) {
    return false;
  }

  if (!isStringArray(value.warnings)) {
    return false;
  }

  if (typeof value.fallbackUsed !== "boolean") {
    return false;
  }

  return true;
}

function formatLine(value?: string) {
  return value?.trim() ? value.trim() : null;
}

export function renderOptimizedResumeText(resume: OptimizedResumeJson): string {
  const lines: string[] = [];
  const basics = resume.basics;

  const nameLine = basics.label?.trim() ? `${basics.name.trim()} | ${basics.label.trim()}` : basics.name.trim();
  lines.push(nameLine);

  const contactLines = [formatLine(basics.email), formatLine(basics.phone), formatLine(basics.location), formatLine(basics.url)]
    .filter((entry): entry is string => Boolean(entry));

  if (contactLines.length > 0) {
    lines.push(contactLines.join(" | "));
  }

  if (basics.summary?.trim()) {
    lines.push("");
    lines.push(basics.summary.trim());
  }

  lines.push("");
  lines.push("EDUCATION");
  for (const education of resume.education) {
    const parts = [education.institution, education.studyType, education.area].filter((entry): entry is string => Boolean(entry));
    const heading = parts.join(" — ");
    const dates = [education.startDate, education.endDate].filter((entry): entry is string => Boolean(entry)).join(" — ");
    if (heading) {
      lines.push(`- ${heading}${dates ? ` (${dates})` : ""}`);
    }
    if (education.score?.trim()) {
      lines.push(`  Score: ${education.score.trim()}`);
    }
    if (education.courses && education.courses.length > 0) {
      const courses = education.courses.filter((course) => course.trim().length > 0);
      if (courses.length > 0) {
        lines.push(`  Courses: ${courses.join(", ")}`);
      }
    }
    if (education.highlights && education.highlights.length > 0) {
      for (const highlight of education.highlights) {
        lines.push(`  • ${highlight.trim()}`);
      }
    }
  }

  lines.push("");
  lines.push("TECHNICAL SKILLS");
  for (const skill of resume.skills) {
    const keywords = skill.keywords.filter((entry) => entry.trim().length > 0);
    const suffix = keywords.length > 0 ? `: ${keywords.join(", ")}` : "";
    lines.push(`- ${skill.name}${suffix}`);
  }

  lines.push("");
  lines.push("PROJECTS");
  for (const project of resume.projects) {
    const dates = [project.startDate, project.endDate].filter((entry): entry is string => Boolean(entry)).join(" — ");
    const projectHeading = [project.name, dates ? `(${dates})` : null].filter(Boolean).join(" ");
    lines.push(`- ${projectHeading}`);
    if (project.description?.trim()) {
      lines.push(`  ${project.description.trim()}`);
    }
    if (project.keywords.length > 0) {
      lines.push(`  Tech: ${project.keywords.join(", ")}`);
    }
    for (const highlight of project.highlights) {
      lines.push(`  • ${highlight.trim()}`);
    }
  }

  lines.push("");
  lines.push("EXPERIENCE");
  for (const work of resume.work) {
    const dates = [work.startDate, work.endDate].filter((entry): entry is string => Boolean(entry)).join(" — ");
    const heading = [work.name, work.position].filter((entry): entry is string => Boolean(entry)).join(" — ");
    lines.push(`- ${heading}${dates ? ` (${dates})` : ""}`);
    if (work.location?.trim()) {
      lines.push(`  ${work.location.trim()}`);
    }
    if (work.summary?.trim()) {
      lines.push(`  ${work.summary.trim()}`);
    }
    for (const highlight of work.highlights) {
      lines.push(`  • ${highlight.trim()}`);
    }
  }

  if (resume.certificates && resume.certificates.length > 0) {
    lines.push("");
    lines.push("CERTIFICATIONS");
    for (const certificate of resume.certificates) {
      const details = [certificate.name, certificate.issuer, certificate.date].filter((entry): entry is string => Boolean(entry)).join(" — ");
      lines.push(`- ${details}`);
    }
  }

  return lines.join("\n").trim();
}
