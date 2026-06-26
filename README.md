# InternPilot

Schema-first AI application packet generation from resume PDFs and job descriptions.

**InternPilot turns a base resume and role description into a structured packet: optimized resume, cover letter/CV, and outreach email.**

## Current status

- Local MVP
- Active development
- OpenAI-backed generation working
- Optimized packet flow working
- Export and research layers planned

Workflow: Resume PDF → Text Extraction → JD Analysis → Optimized Resume JSON → Rendered Resume → Cover Letter → Outreach Email

![Next.js](https://img.shields.io/badge/Next.js-16.x-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?logo=openai)
![Local MVP](https://img.shields.io/badge/Local-MVP-4CAF50)
![Status](https://img.shields.io/badge/Status-Active%20Development-FF9800)

## Table of contents

- [Why InternPilot](#why-internpilot)
- [Features](#features)
- [Visual tour](#visual-tour)
- [Demo flow](#demo-flow)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Repository layout](#repository-layout)
- [Milestones](#milestones)
- [Roadmap](#roadmap)
- [Safety and usage note](#safety-and-usage-note)

## Why InternPilot

Traditional application prep often involves a slow, repetitive loop of manual rewrites, inconsistent cover letters, and fragmented resume data. InternPilot is designed to make that workflow more structured and repeatable.

| Traditional workflow | InternPilot |
| --- | --- |
| Manually rewriting resumes is slow and repetitive | Uses a schema-first packet generation flow |
| Cover letters and outreach messages are inconsistent | Produces a structured resume, letter, and outreach email together |
| Resume data is often unstructured and hard to reuse | Keeps the output grounded in a consistent internal schema |
| Tailoring work is fragmented across tools | Coordinates the packet from a single workflow |

## Features

Current working features:

- PDF resume upload
- PDF text extraction
- local resume / JD match analysis
- OpenAI draft generation
- optimized synthetic packet generation
- JSON Resume-inspired internal schema
- deterministic resume rendering
- fallback handling

## Visual tour

Screenshots will be added after the UI stabilizes.

## Demo flow

1. Upload a resume PDF.
2. Paste a job description.
3. Review the local match analysis.
4. Generate standard drafts.
5. Generate an optimized application packet.
6. Review the optimized resume, cover letter / CV content, and outreach email.

## Architecture

```text
Input layer
PDF Resume
→ Text Extraction

Analysis layer
→ Match Analysis

Generation layer
→ Optimized Packet API
→ Optimized Resume JSON

Structured packet layer
→ Resume / Cover Letter / Outreach Content

Rendering layer
→ Deterministic Resume Renderer
→ Preview Output
```

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI API
- pdfjs-dist
- JSON Resume-inspired internal schema

## Local setup

```bash
git clone https://github.com/ikrrispatel/InternPilot.git
cd InternPilot
npm install
cp .env.example .env.local
npm run dev
```

Open the local app at http://localhost:3000.

OPENAI_API_KEY is required for OpenAI-backed generation.

## Environment variables

```env
OPENAI_API_KEY=your_key_here
```

## Repository layout

```text
app/
app/page.tsx
app/api/generate/route.ts
app/api/optimized-packet/route.ts
lib/optimized-packet.ts
docs/
docs/milestone-5-plan.md
types/
```

## Milestones

Completed milestones:

- Milestone 1: mock generation UI
- Milestone 2: resume PDF text extraction
- Milestone 3: resume / JD match analysis
- Milestone 4: OpenAI draft generation
- Milestone 5: optimized synthetic packet generation
- Milestone 6: repository polish

## Roadmap

Next:

- Optimized packet copy / download controls
- Separate Draft Mode and Optimized Packet Mode

Later:

- researchProfile layer
- project inspiration layer
- JSON Resume export
- HTML / PDF / LaTeX export

## Safety and usage note

InternPilot is a software prototype for experimenting with AI-generated application packet workflows. The generated content is intended to support drafting and review, and users are responsible for how it is reviewed, edited, and used.
