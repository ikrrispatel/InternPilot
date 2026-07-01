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

export function escapeLatex(value: string): string {
  return value.replace(/[\\&%$#_{}~^]/g, (character) => LATEX_SPECIAL_CHARACTERS[character]);
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
      const schoolLine = [item.school, item.location].filter(Boolean);
      const degreeLine = [item.degree, item.graduationDate].filter(Boolean);

      if (schoolLine.length) {
        lines.push(
          item.location
            ? `\\textbf{${escapeLatex(item.school)}} \\hfill ${escapeLatex(item.location)} \\\\`
            : `\\textbf{${escapeLatex(item.school)}} \\\\`
        );
      }

      if (degreeLine.length) {
        lines.push(
          item.graduationDate
            ? `${escapeLatex(item.degree)} \\hfill ${escapeLatex(item.graduationDate)}`
            : escapeLatex(item.degree)
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
        `\\textbf{${escapeLatex(section.label)}}: ${escapeLatex(section.items.join(", "))} \\\\`
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
      const dates = [item.startDate, item.endDate].filter(Boolean).join(" -- ");
      const heading = `\\textbf{${escapeLatex(item.title)}} | ${escapeLatex(item.organization)}${
        item.location ? ` \\hfill ${escapeLatex(item.location)}` : ""
      }`;
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
        return `${escapeLatex(certification.name)} -- ${escapeLatex(certification.issuer)} \\\\`;
      }

      return `${escapeLatex(certification.name)} \\\\`;
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
    resume.contact.location,
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
    resolvedOptions.includeGithubInHeader ? resume.contact.github : undefined,
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

  return [
    "\\documentclass[letterpaper,10pt]{article}",
    "\\usepackage[margin=0.55in]{geometry}",
    "\\usepackage{enumitem}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt}",
    "\\begin{document}",
    "\\begin{center}",
    `{\\Large \\textbf{${escapeLatex(resume.contact.name)}}}\\\\`,
    contactItems.map(escapeLatex).join(" $|$ "),
    "\\end{center}",
    sections.join("\n\n"),
    "\\end{document}",
  ].join("\n");
}
