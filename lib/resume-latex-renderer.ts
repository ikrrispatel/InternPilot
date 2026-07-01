import type { OptimizedResumeDocument } from "./resume-system";

export type ResumeLatexRenderOptions = {
  includeGithubInHeader: boolean;
  maxProjects: number;
  maxProjectBullets: number;
  maxExperienceItems: number;
  maxExperienceBullets: number;
  includeCertifications: boolean;
  templateStyle: "compact_jake";
};

export const DEFAULT_RESUME_LATEX_OPTIONS: ResumeLatexRenderOptions = {
  includeGithubInHeader: false,
  maxProjects: 3,
  maxProjectBullets: 3,
  maxExperienceItems: 2,
  maxExperienceBullets: 3,
  includeCertifications: true,
  templateStyle: "compact_jake",
};

const LATEX_SPECIAL_CHARACTERS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  "$": "\\$",
  "#": "\\#",
  "_": "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

const LATEX_LINE_BREAK = "\\\\";

export function escapeLatex(value: string): string {
  return value.replace(/[\\&%$#_{}~^]/g, (character) => LATEX_SPECIAL_CHARACTERS[character]);
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

function cleanText(value: string | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  return isPlaceholderValue(trimmed) ? "" : trimmed;
}

function renderBulletList(bullets: string[]) {
  if (bullets.length === 0) {
    return "";
  }

  return [
    "\\begin{itemize}",
    ...bullets.map((bullet) => `  \\item ${escapeLatex(bullet)}`),
    "\\end{itemize}",
  ].join("\n");
}

function renderEducation(resume: OptimizedResumeDocument) {
  const education = resume.education.filter(
    (item) => item.school || item.location || item.degree || item.graduationDate
  );

  if (education.length === 0) {
    return "";
  }

  return [
    "\\section*{Education}",
    ...education.flatMap((item) => {
      const lines: string[] = [];
      const schoolLine = [cleanText(item.school), cleanText(item.location)].filter(Boolean);
      const graduationDate = cleanText(item.graduationDate);
      const degreeLine = [cleanText(item.degree), graduationDate].filter(Boolean);

      if (schoolLine.length) {
        const school = cleanText(item.school);
        const location = cleanText(item.location);
        lines.push(
          location
            ? `\\textbf{${escapeLatex(school)}} \\hfill ${escapeLatex(location)} ${LATEX_LINE_BREAK}`
            : `\\textbf{${escapeLatex(school)}} ${LATEX_LINE_BREAK}`
        );
      }

      if (degreeLine.length) {
        const degree = cleanText(item.degree);
        const date = graduationDate;
        const shouldBreak = Boolean(item.gpa || item.honors?.length || item.coursework?.length);
        lines.push(
          date
            ? `${escapeLatex(degree)} \\hfill ${escapeLatex(date)}${shouldBreak ? ` ${LATEX_LINE_BREAK}` : ""}`
            : `${escapeLatex(degree)}${shouldBreak ? ` ${LATEX_LINE_BREAK}` : ""}`
        );
      }

      if (item.gpa) {
        lines.push(`GPA: ${escapeLatex(item.gpa)}`);
      }

      if (item.honors?.length) {
        lines.push(`Honors: ${escapeLatex(item.honors.join(", "))}`);
      }

      if (item.coursework?.length) {
        lines.push(`Coursework: ${escapeLatex(item.coursework.join(", "))}`);
      }

      return lines;
    }),
  ].join("\n");
}

function renderSkills(resume: OptimizedResumeDocument) {
  const skills = resume.skills.filter((section) => section.items.length > 0);

  if (skills.length === 0) {
    return "";
  }

  return [
    "\\section*{Technical Skills}",
    ...skills.map(
      (section) =>
        `\\textbf{${escapeLatex(section.label)}}: ${escapeLatex(section.items.join(", "))} ${LATEX_LINE_BREAK}`
    ),
  ].join("\n");
}

function renderProjects(resume: OptimizedResumeDocument, options: ResumeLatexRenderOptions) {
  const projects = resume.projects
    .filter((project) => project.name || project.bullets.length > 0)
    .slice(0, options.maxProjects);

  if (projects.length === 0) {
    return "";
  }

  return [
    "\\section*{Projects}",
    ...projects.flatMap((project) => {
      const dates = [project.startDate, project.endDate].filter(Boolean).join(" -- ");
      const heading = `\\textbf{${escapeLatex(project.name)}}${
        project.technologies.length ? ` | ${escapeLatex(project.technologies.join(", "))}` : ""
      }${dates ? ` \\hfill ${escapeLatex(dates)}` : ""}`;
      return [
        heading,
        renderBulletList(project.bullets.slice(0, options.maxProjectBullets)),
      ].filter(Boolean);
    }),
  ].join("\n");
}

function renderExperience(resume: OptimizedResumeDocument, options: ResumeLatexRenderOptions) {
  const experience = resume.experience
    .filter((item) => item.title || item.organization || item.location || item.bullets.length > 0)
    .slice(0, options.maxExperienceItems);

  if (experience.length === 0) {
    return "";
  }

  return [
    "\\section*{Experience}",
    ...experience.flatMap((item) => {
      const title = cleanText(item.title);
      const organization = cleanText(item.organization);
      const location = cleanText(item.location);
      const dates = [item.startDate, item.endDate].filter(Boolean).join(" -- ");
      const headingParts = [title, organization].filter(Boolean);
      const heading = headingParts.length
        ? `\\textbf{${escapeLatex(headingParts.join(" | "))}}${location ? ` \\hfill ${escapeLatex(location)}` : ""}`
        : location
          ? `\\textbf{${escapeLatex(location)}}`
          : "";
      return [
        heading,
        dates ? `\\textit{${escapeLatex(dates)}}` : "",
        renderBulletList(item.bullets.slice(0, options.maxExperienceBullets)),
      ].filter(Boolean);
    }),
  ].join("\n");
}

function renderCertifications(resume: OptimizedResumeDocument) {
  const certifications = resume.certifications.filter((certification) => certification.name);

  if (certifications.length === 0) {
    return "";
  }

  return [
    "\\section*{Certifications}",
    ...certifications.map((certification) => {
      if (certification.issuer) {
        return `${escapeLatex(certification.name)} -- ${escapeLatex(certification.issuer)} ${LATEX_LINE_BREAK}`;
      }

      return `${escapeLatex(certification.name)} ${LATEX_LINE_BREAK}`;
    }),
  ].join("\n");
}

export function renderResumeLatex(
  resume: OptimizedResumeDocument,
  options?: Partial<ResumeLatexRenderOptions>
): string {
  const resolvedOptions: ResumeLatexRenderOptions = {
    ...DEFAULT_RESUME_LATEX_OPTIONS,
    ...options,
    templateStyle: "compact_jake",
  };

  const contactItems = [
    cleanText(resume.contact.location),
    cleanText(resume.contact.phone),
    cleanText(resume.contact.email),
    cleanText(resume.contact.linkedin),
    resolvedOptions.includeGithubInHeader ? cleanText(resume.contact.github) : undefined,
  ].filter((item): item is string => Boolean(item));

  const sections = [
    renderEducation(resume),
    renderSkills(resume),
    renderProjects(resume, resolvedOptions),
    renderExperience(resume, resolvedOptions),
  ].filter(Boolean);

  if (resolvedOptions.includeCertifications) {
    const certifications = renderCertifications(resume);

    if (certifications) {
      sections.push(certifications);
    }
  }

  const nameLine = `{\\Large \\textbf{${escapeLatex(resume.contact.name)}}}${LATEX_LINE_BREAK}`;
  const contactLine = contactItems.length
    ? `${contactItems.map(escapeLatex).join(" $|$ ")}${LATEX_LINE_BREAK}`
    : LATEX_LINE_BREAK;

  return [
    "\\documentclass[letterpaper,10pt]{article}",
    "\\usepackage[margin=0.55in]{geometry}",
    "\\usepackage{enumitem}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt}",
    "\\begin{document}",
    "\\begin{center}",
    nameLine,
    contactLine,
    "\\end{center}",
    sections.join("\n\n"),
    "\\end{document}",
  ].join("\n");
}
