# Milestone 5 Plan: Optimized Synthetic Application Packet Generator

## Product Goal
Milestone 5 upgrades InternPilot from basic draft generation into a schema-first optimized packet generator.

Given:
- one base candidate resume
- one job description
- optional company URL or company context

InternPilot generates one best optimized synthetic application packet:
1. optimized synthetic resume
2. optimized cover letter / CV
3. optimized cold outreach email

The output should be generated as structured data first, then rendered into clean text previews.

## Important Product Boundaries
Do not add these in Milestone 5:
- ATS wording
- scoring
- variants
- benchmark language
- live scraping
- bulk generation
- PDF export
- Jake’s Resume export
- Overleaf integration
- project roadmap language
- “build this later” output

The product language should stay focused on:
- “Generate one optimized application packet.”

## Current InternPilot Flow Must Stay
The existing flow remains:
1. Upload resume PDF
2. Extract resume text
3. Paste job description
4. Optional company URL/context
5. Select outputs
6. Generate existing resume / cover letter / outreach drafts

Milestone 5 adds a secondary optimized packet path. It must not break or replace the current Milestone 4 generation route.

## JSON Resume-Inspired Architecture
InternPilot should use a JSON Resume-inspired internal schema, but should not install or depend on JSON Resume packages yet.

Use JSON Resume as an architectural model:
- structured resume object
- predictable sections
- validation before rendering
- render text from structured data
- future compatibility with HTML/PDF/LaTeX export

Milestone 5 should define an internal resume object similar to:

```ts
type OptimizedResumeJson = {
  basics: {
    name: string;
    label?: string;
    email?: string;
    phone?: string;
    location?: string;
    url?: string;
    summary?: string;
  };
  education: Array<{
    institution: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    courses?: string[];
    highlights?: string[];
  }>;
  skills: Array<{
    name: string;
    level?: string;
    keywords: string[];
  }>;
  projects: Array<{
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    url?: string;
    keywords: string[];
    highlights: string[];
  }>;
  work: Array<{
    name: string;
    position: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights: string[];
  }>;
  certificates: Array<{
    name: string;
    issuer?: string;
    date?: string;
    url?: string;
  }>;
};
```

This does not need to perfectly match JSON Resume v1.0.0 yet. It should be a practical subset optimized for InternPilot.

## Base Resume Role
The uploaded resume acts as the candidate baseline/seed.

It provides:
- base identity structure
- education structure
- current style/context
- starting technical profile
- existing section ordering
- rough candidate level

For Milestone 5, the optimized packet generator may synthesize optimized packet content based on the job description and company context.

It may synthesize:
- project names
- project technologies
- project bullets
- skills
- project dates
- impact metrics
- experience framing
- coursework emphasis
- keyword strategy
- resume summary
- cover letter positioning
- cold outreach positioning

## Internal Consistency Rules
The generated packet must be internally coherent.

Rules:
1. Skills listed in the skills section must be supported by projects or work inside the generated resume JSON.
2. Project bullets must match the project tech stack.
3. Dates must be plausible.
4. Impact metrics must sound realistic and consistent with the candidate level.
5. Cover letter / CV must align with the optimized resume JSON.
6. Cold outreach email must align with the optimized resume JSON.
7. No contradictions across resume, cover letter, and outreach email.
8. The rendered resume text must be derived from optimizedResumeJson, not separately hallucinated.

## Milestone 5 UI Placement
Add a new secondary section below the existing generated output area.

Section title:
- “Generate optimized application packet”

Button:
- “Generate optimized packet”

Result panel title:
- “Optimized Application Packet”

The result panel should contain:
1. Packet Summary
2. Optimized Resume
3. Cover Letter / CV
4. Cold Outreach Email
5. Changed Sections Summary
6. Warnings / fallback notice only if needed

Do not put extra labels inside the generated resume text.

## API Design
Create a new route:
- app/api/optimized-packet/route.ts

Do not modify app/api/generate/route.ts unless absolutely required.

### Request Shape
```ts
type OptimizedPacketRequest = {
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
```

### Response Shape
```ts
type OptimizedPacketResponse = {
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
```

## OpenAI Prompt Strategy
Use one structured JSON response.

The model should behave like:
- recruiter
- hiring manager
- market researcher
- technical resume strategist

The prompt should instruct the model to:
1. Treat the uploaded resume as a candidate baseline/seed.
2. Analyze the job description deeply.
3. Infer role type, company type, and likely hiring expectations.
4. Generate one strongest optimized synthetic packet.
5. Use a JSON Resume-inspired structure.
6. Keep the packet internally coherent.
7. Derive renderedResumeText from optimizedResumeJson.
8. Generate cover letter / CV from optimizedResumeJson.
9. Generate cold outreach email from optimizedResumeJson and company type.
10. Return valid JSON only.

The prompt should not ask for multiple options.

## Company-Type Outreach Logic
Cold outreach should adapt based on company type.

### Big Company Recruiter / HR
Tone:
- polished
- concise
- role-aligned
- professional

Focus:
- relevant skills
- role fit
- interest in team/company
- request for guidance or consideration

### Technical Hiring Manager
Tone:
- technical
- evidence-heavy
- concise

Focus:
- projects
- technical stack
- role-relevant engineering work
- why the candidate can contribute

### Startup Founder
Tone:
- short
- direct
- high-signal
- value-first

Focus:
- what the candidate can build
- why the company/problem is interesting
- proof of execution
- low-friction ask

### YC-Style Startup
Tone:
- very short
- sharp
- no fluff

Focus:
- execution ability
- project proof
- direct relevance
- fast ask

## NVIDIA Test Behavior
For the NVIDIA Software Performance at Scale test, the optimized synthetic packet should emphasize:
- CUDA / GPU programming
- C++ performance work
- Python benchmarking
- deep learning framework exposure
- PyTorch inference
- profiling / benchmarking
- large-scale workload analysis
- distributed metrics/log analysis
- backend systems and APIs
- Linux / Docker / cloud
- GitHub Actions / developer tooling

The optimizedResumeJson should contain project/work/skills evidence that supports those themes internally.

## Validation Strategy
Before rendering in the UI, validate:
1. Response is parseable JSON.
2. Required top-level keys exist.
3. optimizedResumeJson exists.
4. renderedResumeText is a non-empty string.
5. coverLetter is a non-empty string.
6. coldOutreachEmail is a non-empty string.
7. optimizedResumeJson.basics exists.
8. optimizedResumeJson.education is an array.
9. optimizedResumeJson.skills is an array.
10. optimizedResumeJson.projects is an array.
11. optimizedResumeJson.work is an array.
12. changedSectionsSummary is an array.
13. No obvious mismatch between skills and project/work evidence.

Do not crash the UI if validation fails.

## Fallback Behavior
If optimized packet generation fails:
- return a degraded fallback packet using the existing current generation behavior
- mark fallbackUsed: true
- show a clear fallback notice outside the generated document text
- keep the UI usable
- do not break the existing main flow

## Rendering Strategy
Milestone 5 should render plain text only.

Rendering order:
1. optimizedResumeJson
2. deterministic local renderer
3. renderedResumeText
4. UI preview

The renderer should build resume text from the structured object.

Do not let the model generate one resume JSON and a separate unrelated resume text.

## Files Likely Affected
Expected files:
- app/page.tsx
- app/api/optimized-packet/route.ts
- optional shared schema/types file, such as:
  - app/optimized-packet-types.ts
  - app/resume-schema.ts
  - lib/optimized-packet.ts

Avoid changing:
- app/api/generate/route.ts
- app/match-analysis.ts
unless there is a strong reason.

## Token and Cost Control
Milestone 5 will cost more than current generation because the response is larger.

Cost controls:
- one request per Generate Optimized Packet click
- no auto-regeneration
- no multiple variants
- concise schema
- compact JSON
- no live scraping
- no chained research calls
- no PDF generation
- no bulk mode

## Acceptance Criteria
Milestone 5 is accepted only if:
1. Existing Milestone 4 generation still works.
2. A new optimized packet section appears without breaking the main flow.
3. User can click “Generate optimized packet.”
4. The app calls app/api/optimized-packet/route.ts.
5. The API returns structured JSON.
6. The UI renders one optimized resume.
7. The UI renders one cover letter / CV.
8. The UI renders one cold outreach email.
9. The optimized resume text is derived from optimizedResumeJson.
10. The packet is internally coherent.
11. Fallback works if OpenAI fails.
12. Typecheck passes.
13. Build passes.
14. No PDF/Jake/Overleaf/export work is added.
15. No scoring, variants, or benchmark language is added.

## What Waits Until Later
Later milestones can add:
- live company research
- company website analysis
- public project-pattern research
- GitHub project inspiration
- LinkedIn-style candidate pattern research
- Reddit/forum/news/YouTube signal analysis
- PDF export
- Jake’s Resume export
- Overleaf-style LaTeX export
- HTML rendering
- JSON Resume package validation
- JSON Resume theme rendering
- bulk generation
- variant generation

## Milestone 5 Implementation Order
1. Commit Milestone 4 if not already committed.
2. Finalize this plan.
3. Add shared types/schema.
4. Add app/api/optimized-packet/route.ts.
5. Add deterministic renderer from optimizedResumeJson to text.
6. Add UI button and result panel.
7. Test with NVIDIA JD.
8. Validate internal consistency manually.
9. Run typecheck.
10. Run build.
11. Review before commit.
