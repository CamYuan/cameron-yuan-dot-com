# cameron-yuan-dot-com — Portfolio Site Design

## Goal

A personal portfolio site for Cameron Yuan, primarily aimed at recruiters/hiring
managers evaluating him for AI-native roles. The site must prove hands-on
LangChain/LangGraph fluency through a real, working demo — not just claim it in
prose — while using his platform-engineering/microservices background
(Mastercard, Edward Jones) as supporting credibility rather than a competing
headline.

## Audience & positioning

- **Primary audience**: recruiters/hiring managers, assumed non-technical to
  moderately technical. Copy and visuals should be warm and approachable, not
  dense or jargon-first.
- **Positioning**: AI-native work is the headline. Microservices/platform depth
  (190 services at Mastercard, hexagonal architecture, $6M CI/CD savings) shows
  up as evidence that the AI work is production-grade, not a differentiator
  competing for top billing.

## Visual direction

Warm & Playful: cream/orange palette, rounded cards and pills, conversational
copy ("👋 hey, I'm Cameron"), soft drop shadows. Chosen over a Terminal/Hacker
or Technical Dashboard direction specifically because the target audience
skews less technical — playful and legible beats dense and impressive-looking.

A shared small design system (card, pill, button styles) is used across all
four pages so the site reads as one coherent product, not four different
pages bolted together.

## Site structure

Multi-page Next.js (App Router) site, TypeScript throughout, deployed on
Vercel with auto-deploy from `main`.

- **Home** — hero (name/title in the warm/playful style) + the interactive
  "interview my agent" LangGraph demo (see below) as the centerpiece.
- **Projects** — card grid of real projects. Candidates: Mastercard platform
  work, Nucleus, AutoEtsy, Gaka. Final inclusion list still open — draft with
  all four AI-relevant projects (excluding the NFT venture, which isn't
  AI-related) and trim during implementation review.
- **Experience** — timeline/card view of resume experience (Mastercard, Edward
  Jones roles), sourced from the same structured data file the `ExperienceAgent`
  tool reads, so there's one source of truth rather than duplicated content.
- **Contact** — email, LinkedIn, GitHub, and a nudge back to the Home page
  demo.

## The centerpiece demo: "interview my agent"

A real LangGraph.js `StateGraph` running server-side in a Next.js API route
(`/api/interview`), visualized on the Home page as an animated node pipeline
matching the Warm & Playful visual style.

### Graph shape

1. **Router node** — classifies the visitor's free-text question into
   **one or more** of: `experience`, `projects`, `skills`, `general`
   (multi-label, not single-label). Multi-label matters because real
   questions cross categories — e.g. "have you worked with microservices?"
   needs both `experience` (Mastercard's 190 services) and `projects`
   (Nucleus's worktree architecture) to answer well.
2. **Specialist nodes** (`ExperienceAgent`, `ProjectsAgent`, `SkillsAgent`) —
   run in parallel for every label the Router matched. Each has one bound
   tool: a lookup function over a small structured JSON file scoped to that
   domain (derived from the existing resume data), so answers are grounded
   rather than hallucinated.
3. **General node** — handles small talk / out-of-scope questions with a
   short redirect ("ask me about my experience, projects, or skills"). Always
   available as a fallback path so an odd or misclassified question never
   dead-ends the graph.
4. **Synthesizer node** — merges the outputs of whichever specialist nodes
   ran into one coherent answer with per-fact source citations (e.g.
   "microservices → 190 services at Mastercard [cite], hexagonal architecture
   migration at Edward Jones [cite]"). Skipped visually when only one
   specialist node matched, so the common single-topic case stays snappy
   rather than showing an unnecessary merge step.

This is a genuine supervisor / fan-out-fan-in pattern — one of the LangGraph
patterns technical interviewers specifically look for — chosen over a single
tool-calling node because it's both more correct (handles cross-cutting
questions properly) and a stronger demonstration of real graph orchestration.

### Frontend visualization

- Nodes animate through three visual states: idle → active (glow/pulse, per
  the Warm & Playful mockup's highlighted-node treatment) → done (checkmark).
- State transitions are driven by streamed events from `/api/interview`
  (Server-Sent Events or Vercel's streaming response), so the Router →
  matched specialist(s) → Synthesizer sequence lights up in real time as the
  graph actually executes — not a canned animation.
- For multi-node matches, all matched specialist nodes light up
  simultaneously to visually communicate the fan-out.
- Final answer text and citation pill(s) render once the terminal node
  (Synthesizer, or the single specialist if only one matched) completes.

### Model provider

OpenRouter free-tier model, called through a thin provider interface so
swapping to the Claude API is a config change, not a rewrite, if the free
tier proves too unreliable or too weak in practice once the demo is live.

**Known trade-off (accepted deliberately)**: free-tier models are more likely
to be rate-limited, rotate in availability, or produce weaker output than a
paid model. This risk was raised and the user chose to proceed with
OpenRouter's free tier for cost reasons, with the provider-swap escape hatch
as the mitigation if it becomes a real problem post-launch.

## Error handling & resilience

- LLM call failure or timeout (rate limit, model unavailable) → a graceful
  in-chat fallback message ("my agent's a little overloaded — try again in a
  moment"), not a broken UI. Graph state resets cleanly for the next attempt.
- Router misclassification is structurally handled by the always-available
  `general` fallback path.
- Basic per-IP rate limiting on `/api/interview` (in-memory or Vercel KV
  counter) to bound abuse even against a free model.

## Testing

- Vitest unit tests for the tool functions (resume-data lookups) and the
  Router's classification logic (sample questions → expected label sets,
  including multi-label cases like the microservices example above).
- Integration tests hitting `/api/interview` with mocked LLM responses to
  verify graph wiring (fan-out/join behavior, correct citations attached)
  without spending real API calls in CI.
- The pipeline animation itself is verified manually in a real browser before
  the feature is considered done — no automated test for the animation.

## Deployment

- Vercel, connected to the `cameron-yuan-dot-com` GitHub repo, auto-deploy on
  push to `main`.
- OpenRouter API key stored as a Vercel environment variable, never
  committed to the repo.

## Explicitly out of scope for this spec

- Which exact projects appear on the Projects page beyond the draft
  candidate list — left open, to be finalized during implementation.
- Any backend/service beyond the single Next.js app — no separate
  microservice was introduced for this demo; the "microservices" story is
  told through the Experience/Projects content, not through the site's own
  architecture.
