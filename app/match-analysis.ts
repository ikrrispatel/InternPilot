export type FitLabel = "Strong Fit" | "Moderate Fit" | "Reach" | "Weak Fit";

export type AnalysisStatus = "matched" | "missing" | "weak";

export type MatchSignal = {
  id: string;
  label: string;
  status: AnalysisStatus;
  evidence: string | null;
  note: string;
};

export type MatchAnalysis = {
  fitLabel: FitLabel;
  summary: string;
  matchedSignals: MatchSignal[];
  missingOrWeakSignals: MatchSignal[];
  relevantEvidence: Array<{ label: string; evidence: string }>;
  warnings: string[];
};

type CategoryDefinition = {
  id: string;
  label: string;
  jdTerms: string[];
  resumeTerms: string[];
  priority: "required" | "preferred";
};

const categoryDefinitions: CategoryDefinition[] = [
  {
    id: "cs-enrollment",
    label: "CS enrollment / degree",
    jdTerms: ["computer science", "cs", "computer engineering", "degree", "bsc", "bs"],
    resumeTerms: ["computer science", "cs", "computer engineering", "bsc", "bs", "major", "degree", "undergraduate"],
    priority: "required",
  },
  {
    id: "python",
    label: "Python",
    jdTerms: ["python"],
    resumeTerms: ["python", "pandas", "numpy", "scikit", "flask", "fastapi", "django"],
    priority: "required",
  },
  {
    id: "cpp",
    label: "C++",
    jdTerms: ["c++", "c/c++", "c plus plus", "cpp"],
    resumeTerms: ["c++", "c/c++", "c plus plus", "cpp", "stl"],
    priority: "required",
  },
  {
    id: "java",
    label: "Java",
    jdTerms: ["java"],
    resumeTerms: ["java", "spring"],
    priority: "preferred",
  },
  {
    id: "data-structures",
    label: "Data Structures & Algorithms",
    jdTerms: ["data structures", "algorithms", "dsa", "leetcode", "competitive programming"],
    resumeTerms: ["data structures", "algorithms", "dsa", "leetcode", "competitive programming", "graphs", "trees", "binary search"],
    priority: "required",
  },
  {
    id: "backend",
    label: "Backend / APIs",
    jdTerms: ["backend", "api", "apis", "rest", "grpc", "server"],
    resumeTerms: ["backend", "api", "apis", "rest", "grpc", "server"],
    priority: "required",
  },
  {
    id: "git",
    label: "Git / GitHub",
    jdTerms: ["git", "github", "version control"],
    resumeTerms: ["git", "github", "version control"],
    priority: "required",
  },
  {
    id: "docker-linux",
    label: "Docker / Linux",
    jdTerms: ["docker", "linux", "ubuntu", "bash"],
    resumeTerms: ["docker", "linux", "ubuntu", "bash", "shell"],
    priority: "preferred",
  },
  {
    id: "cloud",
    label: "Cloud / AWS",
    jdTerms: ["aws", "cloud", "ec2", "s3", "lambda", "azure", "gcp"],
    resumeTerms: ["aws", "cloud", "ec2", "s3", "lambda", "azure", "gcp"],
    priority: "preferred",
  },
  {
    id: "data-analysis",
    label: "Data analysis / retrieval / evaluation",
    jdTerms: ["retrieval", "evaluation", "data analysis", "benchmark", "metrics", "analytics"],
    resumeTerms: ["retrieval", "evaluation", "data analysis", "benchmark", "metrics", "analytics"],
    priority: "required",
  },
  {
    id: "deep-learning",
    label: "Deep learning frameworks",
    jdTerms: ["pytorch", "tensorflow", "keras", "jax", "transformers", "deep learning"],
    resumeTerms: ["pytorch", "tensorflow", "keras", "jax", "transformers"],
    priority: "preferred",
  },
  {
    id: "gpu-cuda",
    label: "GPU / CUDA",
    jdTerms: ["cuda", "gpu", "gpu clusters"],
    resumeTerms: ["cuda", "gpu"],
    priority: "preferred",
  },
  {
    id: "hpc",
    label: "HPC / large-scale computing",
    jdTerms: ["hpc", "high performance computing", "large scale", "distributed systems", "parallel computing", "mpi"],
    resumeTerms: ["hpc", "high performance computing", "large scale", "distributed systems", "parallel computing", "mpi"],
    priority: "preferred",
  },
  {
    id: "profiling",
    label: "Profiling / performance optimization",
    jdTerms: ["profiling", "perf", "performance optimization", "benchmarking", "optimization"],
    resumeTerms: ["profiling", "perf", "performance optimization", "benchmarking", "optimization"],
    priority: "preferred",
  },
  {
    id: "opensource",
    label: "GitHub project work",
    jdTerms: ["open source", "coding competitions", "hackathons", "competitive programming", "github"],
    resumeTerms: ["github", "github actions", "repository", "repo"],
    priority: "preferred",
  },
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  const normalizedText = normalizeText(text);

  return terms.some((term) => {
    const lowerTerm = term.toLowerCase();
    const normalizedTerm = normalizeText(term);

    if (["c++", "c/c++", "c plus plus", "cpp"].includes(lowerTerm)) {
      return (
        /(^|[^a-z0-9])c\+\+([^a-z0-9]|$)/i.test(text) ||
        /c\s*\/\s*c\+\+/i.test(text) ||
        /c\s*plus\s*plus/i.test(text) ||
        /\bcpp\b/i.test(text)
      );
    }

    return lowerText.includes(lowerTerm) || normalizedText.includes(normalizedTerm);
  });
}

function findEvidenceSnippet(resumeText: string, terms: string[]) {
  const lines = resumeText
    .split(/\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchingLine = lines.find((line) => containsAny(line, terms));

  if (!matchingLine) {
    return null;
  }

  const compactLine = matchingLine.replace(/\s+/g, " ").trim();
  return compactLine.length > 180 ? `${compactLine.slice(0, 177)}...` : compactLine;
}

function categoryIsRelevant(jdText: string, definition: CategoryDefinition) {
  return containsAny(jdText, definition.jdTerms);
}

export function analyzeResumeJobFit(resumeText: string, jobDescription: string): MatchAnalysis {
  const normalizedResume = normalizeText(resumeText);
  const normalizedJobDescription = normalizeText(jobDescription);
  const isNvidiaPosting = /nvidia/.test(normalizedJobDescription);

  if (!normalizedResume || !normalizedJobDescription) {
    return {
      fitLabel: "Weak Fit",
      summary: "Upload a resume PDF and paste a job description to see a local match analysis.",
      matchedSignals: [],
      missingOrWeakSignals: [],
      relevantEvidence: [],
      warnings: ["The analysis is based on visible resume text only."],
    };
  }

  const relevantCategories = isNvidiaPosting
    ? categoryDefinitions
    : categoryDefinitions.filter((category) => categoryIsRelevant(normalizedJobDescription, category));

  const signals: MatchSignal[] = relevantCategories.map((category) => {
    const matched = containsAny(resumeText, category.resumeTerms);
    const evidence = matched ? findEvidenceSnippet(resumeText, category.resumeTerms) : null;
    const note = matched
      ? "Evidence appears in the extracted resume text."
      : category.priority === "required"
        ? "This signal is not supported by the extracted resume text."
        : "This is a useful bonus signal that is not clearly supported by the resume.";

    return {
      id: category.id,
      label: category.label,
      status: matched ? "matched" : category.priority === "required" ? "missing" : "weak",
      evidence,
      note,
    };
  });

  const matchedSignals = signals.filter((signal) => signal.status === "matched");
  const missingOrWeakSignals = signals.filter((signal) => signal.status !== "matched");
  const relevantEvidence = matchedSignals
    .filter((signal): signal is MatchSignal & { evidence: string } => Boolean(signal.evidence))
    .map((signal) => ({ label: signal.label, evidence: signal.evidence as string }));

  const matchedCount = matchedSignals.length;
  const weakCount = missingOrWeakSignals.length;

  let fitLabel: FitLabel = "Weak Fit";

  if (isNvidiaPosting) {
    if (matchedCount >= 5 && weakCount <= 4) {
      fitLabel = "Moderate Fit";
    } else if (matchedCount >= 3) {
      fitLabel = "Reach";
    }
  } else if (matchedCount >= 6 && weakCount <= 5) {
    fitLabel = "Strong Fit";
  } else if (matchedCount >= 4 && weakCount <= 7) {
    fitLabel = "Moderate Fit";
  } else if (matchedCount >= 2) {
    fitLabel = "Reach";
  }

  const warnings = [
    "InternPilot will not add missing skills to generated documents unless they are supported by the resume.",
    missingOrWeakSignals.length > 0
      ? "Several role-specific signals are missing or weak, so generated text should avoid implying experience that the resume does not show."
      : "The analysis is grounded only in the extracted resume text and the pasted job description.",
  ];

  const summary = isNvidiaPosting
    ? `This review finds ${matchedCount} matched signals and ${weakCount} missing or weak signals for the NVIDIA-style role.`
    : `This review finds ${matchedCount} matched signals and ${weakCount} missing or weak signals for the pasted role.`;

  return {
    fitLabel,
    summary,
    matchedSignals,
    missingOrWeakSignals,
    relevantEvidence,
    warnings,
  };
}
