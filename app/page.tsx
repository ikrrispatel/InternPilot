"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { analyzeResumeJobFit } from "./match-analysis";

type OutputKey = "resume" | "coverLetter" | "outreachEmail";

type ExtractionStatus = "idle" | "loading" | "success" | "error";

type ResumeExtractionResult = {
  pageCount: number;
  text: string;
};

type Draft = {
  key: OutputKey;
  title: string;
  fileName: string;
  body: string;
};

const outputOptions: Array<{
  key: OutputKey;
  label: string;
  description: string;
}> = [
  {
    key: "resume",
    label: "Tailored resume",
    description: "A job-specific resume draft based on the uploaded PDF.",
  },
  {
    key: "coverLetter",
    label: "Cover letter",
    description: "A concise letter grounded in the resume and job post.",
  },
  {
    key: "outreachEmail",
    label: "Outreach / referral email",
    description: "A short note for a contact or potential referrer.",
  },
];

const initialSelections: Record<OutputKey, boolean> = {
  resume: true,
  coverLetter: true,
  outreachEmail: true,
};

function isPdfTextItem(item: unknown): item is { hasEOL: boolean; str: string } {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof item.str === "string" &&
    "hasEOL" in item &&
    typeof item.hasEOL === "boolean"
  );
}

function isTextContentChunk(chunk: unknown): chunk is { items: unknown[] } {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "items" in chunk &&
    Array.isArray(chunk.items)
  );
}

async function readPageTextItems(page: {
  streamTextContent: () => ReadableStream<unknown>;
}) {
  const stream = page.streamTextContent();
  const reader = stream.getReader();
  const items: unknown[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (isTextContentChunk(value)) {
        items.push(...value.items);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return items;
}

function getFriendlyExtractionError(error: unknown) {
  if (!(error instanceof Error)) {
    return "PDF extraction failed. Try exporting the resume as a text-based PDF and upload it again.";
  }

  const message = error.message || "Unknown PDF extraction error.";

  if (message.toLowerCase().includes("password")) {
    return "This PDF appears to be password-protected. Upload an unlocked resume PDF.";
  }

  if (message.toLowerCase().includes("invalid pdf")) {
    return "This file could not be read as a valid PDF. Try re-exporting the resume as a PDF and upload it again.";
  }

  return `PDF extraction failed: ${message}`;
}

async function extractTextFromPdf(file: File): Promise<ResumeExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/webpack.mjs");
  const fileBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(fileBuffer);
  const loadingTask = pdfjs.getDocument({
    data: pdfData,
    disableAutoFetch: true,
    disableRange: true,
    disableStream: true,
  });
  const pdfDocument = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textItems = await readPageTextItems(page);
    const pageText = textItems
      .map((item) => {
        if (!isPdfTextItem(item)) {
          return "";
        }

        return item.hasEOL ? `${item.str}\n` : item.str;
      })
      .join(" ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  await pdfDocument.destroy();
  return {
    pageCount: pdfDocument.numPages,
    text: pages.join("\n\n").trim(),
  };
}

function firstMeaningfulLine(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
}

function companyFromUrl(url: string) {
  if (!url.trim()) {
    return "Company not provided";
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || "Company not provided";
  } catch {
    return url.trim();
  }
}

function makeFileName(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadDraft(draft: Draft) {
  const blob = new Blob([draft.body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${draft.fileName}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [selectedOutputs, setSelectedOutputs] = useState(initialSelections);
  const [editInstructions, setEditInstructions] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [revision, setRevision] = useState(1);
  const [resumeText, setResumeText] = useState("");
  const [resumePageCount, setResumePageCount] = useState(0);
  const [resumeExtractionStatus, setResumeExtractionStatus] =
    useState<ExtractionStatus>("idle");
  const [resumeExtractionError, setResumeExtractionError] = useState("");

  const selectedCount = Object.values(selectedOutputs).filter(Boolean).length;
  const hasResumeFile = Boolean(resumeFile);
  const hasJobDescription = jobDescription.trim().length > 0;
  const canGenerate = hasResumeFile && hasJobDescription && selectedCount > 0;
  const roleSignal = firstMeaningfulLine(jobDescription) ?? "Role from pasted job description";
  const companySignal = companyFromUrl(companyUrl);
  const resumeTextPreview =
    resumeText.length > 1200 ? `${resumeText.slice(0, 1200).trim()}...` : resumeText;

  const analysisState = !hasResumeFile
    ? "idle"
    : resumeExtractionStatus === "loading"
      ? "loading"
      : resumeExtractionStatus === "error"
        ? "error"
        : hasJobDescription && resumeText.trim().length > 0
          ? "ready"
          : "idle";

  const matchAnalysis = useMemo(() => {
    return analyzeResumeJobFit(resumeText, jobDescription);
  }, [jobDescription, resumeText]);

  const drafts = useMemo<Draft[]>(() => {
    if (!hasGenerated) {
      return [];
    }

    const sourceName = resumeFile?.name ?? "Uploaded resume PDF";
    const instructionText = editInstructions.trim() || "No extra edit instructions provided.";
    const commonHeader = [
      "InternPilot Mock Draft",
      `Source resume: ${sourceName}`,
      `Job signal: ${roleSignal}`,
      `Company signal: ${companySignal}`,
      `Revision: ${revision}`,
      "",
      "Truthfulness rule: keep only facts that appear in the uploaded resume. Do not add jobs, dates, metrics, skills, awards, education, tools, or claims that are not already supported.",
      "",
    ].join("\n");

    const allDrafts: Draft[] = [
      {
        key: "resume",
        title: "Tailored Resume",
        fileName: makeFileName("tailored-resume"),
        body: `${commonHeader}SUMMARY\nRewrite the candidate's existing summary around the job description's language, while preserving only verified resume facts.\n\nEXPERIENCE\nReorder and lightly tailor existing bullets from the uploaded resume toward the role. Keep dates, employers, projects, tools, and metrics exactly supported by the source resume.\n\nSKILLS\nPrioritize matching skills already present in the resume. Omit anything that appears only in the job description.\n\nEDIT INSTRUCTIONS\n${instructionText}\n`,
      },
      {
        key: "coverLetter",
        title: "Cover Letter",
        fileName: makeFileName("cover-letter"),
        body: `${commonHeader}Dear Hiring Team,\n\nI am interested in the opportunity described in the pasted job description. My resume should be used as the only source of truth for specific experience, skills, education, tools, dates, and accomplishments.\n\nIn the final AI-enabled version, this letter will connect verified resume evidence to the needs of the role without inventing unsupported claims. It will stay concise, direct, and ready to edit before submission.\n\nThank you for your consideration.\n\nSincerely,\nCandidate Name\n\nEDIT INSTRUCTIONS\n${instructionText}\n`,
      },
      {
        key: "outreachEmail",
        title: "Outreach / Referral Email",
        fileName: makeFileName("outreach-referral-email"),
        body: `${commonHeader}Subject: Interest in ${roleSignal}\n\nHi [Name],\n\nI hope you are doing well. I am interested in the ${roleSignal} opportunity and would appreciate any guidance you might be willing to share about the role or team.\n\nI have attached my resume and would be grateful if you are open to taking a quick look. I will only represent experience and skills that are supported by my resume.\n\nBest,\nCandidate Name\n\nEDIT INSTRUCTIONS\n${instructionText}\n`,
      },
    ];

    return allDrafts.filter((draft) => selectedOutputs[draft.key]);
  }, [
    companySignal,
    editInstructions,
    hasGenerated,
    jobDescription,
    resumeFile?.name,
    revision,
    roleSignal,
    selectedOutputs,
  ]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setResumeFile(file);
    setHasGenerated(false);
    setResumeText("");
    setResumePageCount(0);
    setResumeExtractionError("");

    if (!file) {
      setResumeExtractionStatus("idle");
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setResumeExtractionStatus("error");
      setResumeExtractionError("Please upload a PDF resume file.");
      return;
    }

    setResumeExtractionStatus("loading");

    try {
      const extraction = await extractTextFromPdf(file);

      if (!extraction.text) {
        setResumeExtractionStatus("error");
        setResumeExtractionError(
          "The PDF loaded, but no readable text was found. Try a text-based PDF instead of a scanned image."
        );
        return;
      }

      setResumeText(extraction.text);
      setResumePageCount(extraction.pageCount);
      setResumeExtractionStatus("success");
    } catch (error) {
      setResumeExtractionStatus("error");
      setResumeExtractionError(getFriendlyExtractionError(error));
    }
  }

  function handleOutputChange(key: OutputKey) {
    setSelectedOutputs((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setHasGenerated(false);
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canGenerate) {
      return;
    }

    setRevision(1);
    setHasGenerated(true);
  }

  function handleRegenerate() {
    if (!canGenerate) {
      return;
    }

    setRevision((current) => current + 1);
    setHasGenerated(true);
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-6 text-[#1d2523] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-[#d9d2c1] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2b6f63]">
              InternPilot
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold text-[#17211f] sm:text-4xl">
              Truthful job-application document generator
            </h1>
          </div>
          <div className="max-w-xl rounded border border-[#d9d2c1] bg-white px-4 py-3 text-sm text-[#4f5d58]">
            Milestone 3 adds a local resume/JD match analysis panel. No AI, database, auth, or networked document generation is connected.
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <form
            className="flex flex-col gap-5 rounded border border-[#d9d2c1] bg-white p-5 shadow-sm"
            onSubmit={handleGenerate}
          >
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#17211f]">Inputs</h2>
                <p className="mt-1 text-sm text-[#5a655f]">
                  Upload the base resume PDF and paste the job description.
                </p>
              </div>

              <label className="flex cursor-pointer flex-col gap-2 rounded border border-dashed border-[#aeb8b2] bg-[#fbfaf7] p-4 transition hover:border-[#2b6f63]">
                <span className="text-sm font-semibold text-[#26302d]">Base resume PDF</span>
                <input
                  accept="application/pdf"
                  className="block w-full text-sm text-[#4f5d58] file:mr-4 file:rounded file:border-0 file:bg-[#2b6f63] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#245b52]"
                  onChange={handleFileChange}
                  type="file"
                />
                {resumeFile ? (
                  <span className="text-sm text-[#2b6f63]">{resumeFile.name}</span>
                ) : (
                  <span className="text-sm text-[#6f7873]">PDF only for this MVP.</span>
                )}
              </label>

              {resumeExtractionStatus !== "idle" ? (
                <div className="rounded border border-[#d9d2c1] bg-[#fbfaf7] p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-semibold text-[#26302d]">
                      Extracted resume text
                    </h3>
                    {resumeExtractionStatus === "loading" ? (
                      <span className="w-fit rounded bg-[#fff1e8] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f431d]">
                        Extracting
                      </span>
                    ) : null}
                    {resumeExtractionStatus === "success" ? (
                      <span className="w-fit rounded bg-[#e3f0ec] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#2b6f63]">
                        {resumePageCount.toLocaleString()} {resumePageCount === 1 ? "page" : "pages"} |{" "}
                        {resumeText.length.toLocaleString()} chars
                      </span>
                    ) : null}
                  </div>

                  {resumeExtractionStatus === "loading" ? (
                    <p className="mt-3 text-sm text-[#5f6a65]">
                      Reading text from the uploaded PDF...
                    </p>
                  ) : null}

                  {resumeExtractionStatus === "error" ? (
                    <p className="mt-3 rounded border border-[#e2b79d] bg-white px-3 py-2 text-sm text-[#8f431d]">
                      {resumeExtractionError}
                    </p>
                  ) : null}

                  {resumeExtractionStatus === "success" ? (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-[#26302d]">
                        Text preview
                      </p>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-sm leading-6 text-[#26302d]">
                        {resumeTextPreview}
                      </pre>
                      {resumeText.length > resumeTextPreview.length ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-[#2b6f63]">
                            View full extracted text
                          </summary>
                          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-sm leading-6 text-[#26302d]">
                            {resumeText}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="mt-3 text-xs leading-5 text-[#6f7873]">
                    This text is the source-of-truth preview for future tailoring. InternPilot should not add facts that are not supported by the uploaded resume.
                  </p>
                </div>
              ) : null}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#26302d]">Job description</span>
                <textarea
                  className="min-h-56 resize-y rounded border border-[#cfc7b6] bg-[#fbfaf7] px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#8a918c] focus:border-[#2b6f63] focus:ring-2 focus:ring-[#2b6f63]/20"
                  onChange={(event) => {
                    setJobDescription(event.target.value);
                    setHasGenerated(false);
                  }}
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#26302d]">Company URL</span>
                <input
                  className="rounded border border-[#cfc7b6] bg-[#fbfaf7] px-3 py-3 text-sm outline-none transition placeholder:text-[#8a918c] focus:border-[#2b6f63] focus:ring-2 focus:ring-[#2b6f63]/20"
                  onChange={(event) => {
                    setCompanyUrl(event.target.value);
                    setHasGenerated(false);
                  }}
                  placeholder="https://company.com"
                  type="url"
                  value={companyUrl}
                />
              </label>
            </section>

            <section className="flex flex-col gap-3 border-t border-[#ece6d8] pt-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-[#17211f]">Resume / JD match analysis</h2>
                <p className="text-sm text-[#5a655f]">
                  A local, deterministic review of the extracted resume text against the pasted job description.
                </p>
              </div>

              <div className="rounded border border-[#d9d2c1] bg-[#fbfaf7] p-4">
                {analysisState === "loading" ? (
                  <div className="rounded border border-[#d9d2c1] bg-white p-4 text-sm text-[#4f5d58]">
                    Extracting resume text...
                  </div>
                ) : null}

                {analysisState === "error" ? (
                  <div className="rounded border border-[#e2b79d] bg-white p-4 text-sm text-[#8f431d]">
                    Analysis unavailable because extracted text could not be read from the resume PDF.
                  </div>
                ) : null}

                {analysisState === "ready" ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#26302d]">Fit label</p>
                        <p className="text-xl font-semibold text-[#17211f]">{matchAnalysis.fitLabel}</p>
                      </div>
                      <div className="rounded bg-white px-3 py-2 text-sm text-[#4f5d58]">
                        {matchAnalysis.summary}
                      </div>
                    </div>

                    <div className="mt-4 rounded border border-[#d9d2c1] bg-white p-3">
                      <p className="text-sm font-semibold text-[#26302d]">Matched signals</p>
                      <ul className="mt-2 space-y-2 text-sm text-[#2f3a35]">
                        {matchAnalysis.matchedSignals.length > 0 ? (
                          matchAnalysis.matchedSignals.map((signal) => (
                            <li className="rounded border border-[#dce9e4] bg-[#f4fbf8] px-3 py-2" key={signal.id}>
                              <div className="font-semibold text-[#17211f]">{signal.label}</div>
                              {signal.evidence ? (
                                <div className="mt-1 text-xs text-[#4f5d58]">Evidence: {signal.evidence}</div>
                              ) : null}
                            </li>
                          ))
                        ) : (
                          <li className="text-[#6f7873]">No matched signals were detected yet.</li>
                        )}
                      </ul>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded border border-[#d9d2c1] bg-white p-3">
                        <p className="text-sm font-semibold text-[#26302d]">Missing or weak signals</p>
                        <ul className="mt-2 space-y-2 text-sm text-[#2f3a35]">
                          {matchAnalysis.missingOrWeakSignals.length > 0 ? (
                            matchAnalysis.missingOrWeakSignals.map((signal) => (
                              <li className="rounded border border-[#f1e4d8] bg-[#fffaf6] px-3 py-2" key={signal.id}>
                                <div className="font-semibold text-[#17211f]">{signal.label}</div>
                                <div className="mt-1 text-xs text-[#7c5a3d]">{signal.note}</div>
                              </li>
                            ))
                          ) : (
                            <li className="text-[#6f7873]">No material gaps were flagged.</li>
                          )}
                        </ul>
                      </div>

                      <div className="rounded border border-[#d9d2c1] bg-white p-3">
                        <p className="text-sm font-semibold text-[#26302d]">Relevant resume evidence</p>
                        <ul className="mt-2 space-y-2 text-sm text-[#2f3a35]">
                          {matchAnalysis.relevantEvidence.length > 0 ? (
                            matchAnalysis.relevantEvidence.map((item) => (
                              <li className="rounded border border-[#dce9e4] bg-[#f4fbf8] px-3 py-2" key={item.label}>
                                <div className="font-semibold text-[#17211f]">{item.label}</div>
                                <div className="mt-1 text-xs text-[#4f5d58]">{item.evidence}</div>
                              </li>
                            ))
                          ) : (
                            <li className="text-[#6f7873]">Resume evidence will appear once matching terms are found.</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 rounded border border-[#e2b79d] bg-[#fff8f0] p-3">
                      <p className="text-sm font-semibold text-[#8f431d]">Truthfulness warnings</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#8f431d]">
                        {matchAnalysis.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}

                {analysisState === "idle" ? (
                  <div className="rounded border border-[#d9d2c1] bg-white p-4 text-sm text-[#4f5d58]">
                    Upload a resume PDF and paste a job description to see a local match analysis.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-[#ece6d8] pt-5">
              <h2 className="text-lg font-semibold text-[#17211f]">Outputs</h2>
              <div className="grid gap-3">
                {outputOptions.map((option) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded border border-[#d9d2c1] bg-[#fbfaf7] p-3 transition hover:border-[#2b6f63]"
                    key={option.key}
                  >
                    <input
                      checked={selectedOutputs[option.key]}
                      className="mt-1 h-4 w-4 accent-[#2b6f63]"
                      onChange={() => handleOutputChange(option.key)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[#26302d]">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-sm text-[#5f6a65]">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-[#ece6d8] pt-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[#26302d]">Edit instructions</span>
                <textarea
                  className="min-h-28 resize-y rounded border border-[#cfc7b6] bg-[#fbfaf7] px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#8a918c] focus:border-[#2b6f63] focus:ring-2 focus:ring-[#2b6f63]/20"
                  onChange={(event) => setEditInstructions(event.target.value)}
                  placeholder="Example: Make the cover letter warmer and keep the outreach email under 120 words."
                  value={editInstructions}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded bg-[#2b6f63] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#245b52] disabled:cursor-not-allowed disabled:bg-[#aeb8b2]"
                  disabled={!canGenerate}
                  type="submit"
                >
                  Generate
                </button>
                <button
                  className="rounded border border-[#b75f2a] px-4 py-3 text-sm font-semibold text-[#8f431d] transition hover:bg-[#fff1e8] disabled:cursor-not-allowed disabled:border-[#d7c6bb] disabled:text-[#a89990]"
                  disabled={!canGenerate}
                  onClick={handleRegenerate}
                  type="button"
                >
                  Regenerate
                </button>
              </div>

              {!canGenerate ? (
                <p className="text-sm text-[#8f431d]">
                  Add a PDF, paste a job description, and select at least one output.
                </p>
              ) : null}
            </section>
          </form>

          <section className="flex min-h-[640px] flex-col rounded border border-[#d9d2c1] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#ece6d8] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#17211f]">Preview</h2>
                <p className="mt-1 text-sm text-[#5a655f]">
                  Mock drafts appear here after generation.
                </p>
              </div>
              {hasGenerated ? (
                <span className="w-fit rounded bg-[#e3f0ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2b6f63]">
                  Revision {revision}
                </span>
              ) : null}
            </div>

            {drafts.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {drafts.map((draft) => (
                  <article
                    className="rounded border border-[#d9d2c1] bg-[#fbfaf7] p-4"
                    key={draft.key}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-semibold text-[#17211f]">{draft.title}</h3>
                      <button
                        className="rounded border border-[#2b6f63] px-3 py-2 text-sm font-semibold text-[#2b6f63] transition hover:bg-[#e3f0ec]"
                        onClick={() => downloadDraft(draft)}
                        type="button"
                      >
                        Download
                      </button>
                    </div>
                    <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-white p-4 text-sm leading-6 text-[#26302d]">
                      {draft.body}
                    </pre>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid flex-1 place-items-center py-12 text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded bg-[#e3f0ec] text-lg font-bold text-[#2b6f63]">
                    IP
                  </div>
                  <h3 className="text-lg font-semibold text-[#17211f]">Ready for a mock run</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a655f]">
                    The first checkpoint proves the product flow: collect inputs,
                    choose documents, generate previews, edit instructions, regenerate,
                    and download text files.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
