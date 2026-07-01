# Resume System Plan

InternPilot will move from freeform LaTeX generation to schema-first resume generation.

## Why Schema-First

Freeform LaTeX generation makes it too easy for a model to mix layout, content,
strategy, and unsupported claims in one step. A schema-first system separates
the candidate facts from the final rendering layer. That gives InternPilot a
clear place to validate truthfulness, cap section length, preserve mode, and
reject risky output before a resume is ever rendered.

The goal is to make generated resumes more reliable for both humans and parsers:
the model proposes structured resume data, then deterministic code renders that
data into a compact LaTeX resume.

## Architecture

The planned flow is:

1. Base resume + job description
2. Research profile
3. Strategy plan
4. Optimized resume JSON
5. Deterministic LaTeX renderer
6. Quality gate
7. Output

The model should reason about the role and produce structured JSON. It should
not write final LaTeX directly. The renderer owns formatting, section order,
caps, escaping, and one-page-oriented layout rules.

## Generation Modes

`real_application` mode is truth-preserving. It cannot fabricate experience,
skills, tools, dates, education, metrics, projects, certifications, awards, or
claims that are not supported by the base resume.

`synthetic_test` mode is for internal evaluation. It may synthesize plausible
test content so InternPilot can evaluate schemas, renderers, quality checks,
and packet workflows without pretending the content is real.

## Deterministic Renderer

The LaTeX renderer takes `OptimizedResumeDocument` JSON and produces the final
resume. It escapes LaTeX special characters, avoids markdown links, caps project
and experience counts, and avoids freeform sections such as Role Alignment. This
keeps the resume visually believable, parser-readable, and easier to test.

## Quality Gate

The quality gate checks the rendered LaTeX and optimized resume JSON for common
failure modes:

- markdown links or mailto markdown
- too many projects
- too many bullets
- missing core sections
- accidental Role Alignment keyword dumps
- GitHub appearing when no GitHub contact was provided
- layout risk signals

The quality report should travel with the resume output so UI and API consumers
can show warnings before a user relies on the result.

## Future Milestones

- UI integration
- PDF compile feedback loop
- screenshot/PDF preview
- research layer
- project inspiration layer
- batch application packet generation
