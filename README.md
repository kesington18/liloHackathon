# Codebase Compass

An AI-powered onboarding assistant for unfamiliar codebases. Point it at any public or private GitHub repository and get a guided walkthrough, a security risk scan, and concrete improvement suggestions — in minutes, on a fully free stack.

Built for the **Unfamiliar Codebase** track: *build the skill of jumping into and navigating code you didn't write.*

**🔗 Live demo:** [reveal-lilo-hackathon-9fexio3mg-kesington18s-projects.vercel.app/dashboard](https://reveal-lilo-hackathon-9fexio3mg-kesington18s-projects.vercel.app/dashboard)

---

## What it does

1. **Codebase Walkthrough** — a plain-English overview of what the app does, its detected tech stack, an ordered file-by-file tour of how a request flows through the system, and an auto-generated Mermaid.js system architecture diagram.
2. **Risk Radar** — a security scan tied to exact files and line numbers (hardcoded secrets, insecure auth, missing validation, injection risk, and more), each finding paired with a ready-to-use suggested code fix.
3. **Further Improvements** — performance, code quality, and missing-feature suggestions grounded in the actual code, not generic advice.

Additional touches:
- **Recent repos memory** — previously analyzed repos are remembered and re-analyzable with one click.
- **Works on any repo** — public or private (via an optional GitHub personal access token).
- **Runs entirely on a free stack** — no paid API credits required for embeddings or reasoning.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Database | Supabase Postgres with `pgvector` |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| Reasoning / AI agent | Google Gemini via the Vercel AI SDK (`generateObject`) |
| Repo ingestion | GitHub REST API |
| Diagramming | Mermaid.js |
| Schema validation | Zod |

---

## How it works

```
GitHub repo
   │  (GitHub REST API, concurrent fetch)
   ▼
Chunking (logical, overlapping line-range chunks)
   │
   ▼
Embeddings (Gemini, 768-dim vectors)
   │
   ▼
Supabase Postgres + pgvector (code_embeddings table)
   │
   ▼
AI reasoning layer (Vercel AI SDK, generateObject + Zod schemas)
   │
   ├── Codebase Walkthrough (+ Mermaid diagram)
   ├── Risk Radar (security findings + suggested fixes)
   └── Further Improvements (performance / quality / missing features)
   │
   ▼
Dashboard (/dashboard)
```

---

## Project structure

```
src/
  app/
    dashboard/
      page.tsx                  # Main UI — repo input, recent repos, all 3 analysis sections
    api/
      ingest/route.ts           # Local-filesystem ingestion (original starter feature)
      ingest-remote/route.ts    # Remote GitHub repo ingestion (fetch → chunk → embed → store)
      analyze/
        map/route.ts            # Codebase Walkthrough endpoint
        security/route.ts       # Risk Radar endpoint
        improvements/route.ts   # Further Improvements endpoint
        run/route.ts            # Runs all 3 analyses in parallel, shares one context fetch
      repo-history/route.ts     # Recently analyzed repos
  lib/
    agent/
      model.ts                  # Shared Gemini reasoning model config
      context.ts                # Loads full ingested codebase context from Supabase
      auth.ts                   # Shared secret-based auth for manual/debug endpoints
      runMapAnalysis.ts
      runSecurityAnalysis.ts
      runFurtherImprovements.ts
    ingestion/
      config.ts                 # Included extensions, ignored dirs, chunking + embedding config
      walk.ts                   # Local filesystem walker
      chunk.ts                  # Line-range chunking logic
      github.ts                 # GitHub API — file listing + concurrent content fetch
    supabase/
      client.ts / server.ts / service.ts / middleware.ts
supabase/
  migrations/                   # code_embeddings, repo_history, match_code()
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project (free tier).
2. In **Project Settings → API**, copy your Project URL, `anon` key, and `service_role` key.
3. In the SQL Editor, run the migrations in `supabase/migrations/` — this creates the `code_embeddings` table (with a `vector(768)` column and `match_code()` similarity function) and the `repo_history` table.

### 3. Get a free Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Create a key — no credit card required.

### 4. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
INGEST_SECRET=            # any random string — protects manual/debug ingest & analyze routes
GITHUB_TOKEN=              # optional — raises GitHub API rate limits, needed for private repos
```

### 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard`, paste a GitHub repo (`owner/repo` or a full URL), and click **Load & Analyze**.

---

## Notes & limitations

- **Single active repo model.** Loading a new repo clears previously ingested embeddings — this keeps analysis scoped to exactly one repo at a time, by design, for this version.
- **File cap.** Remote ingestion caps at 60 files per repo to stay within GitHub API rate limits and keep analysis fast for a demo. Adjust `MAX_REMOTE_FILES` in `src/app/api/ingest-remote/route.ts` if needed.
- **GitHub rate limits.** Unauthenticated requests are capped at 60/hour; a personal access token raises this to 5,000/hour and is required for private repos.
- **Embeddings are Gemini-specific.** The reasoning layer is provider-agnostic via the Vercel AI SDK and can be swapped to another model with a one-line change in `src/lib/agent/model.ts`.

---

## Roadmap

- Multi-repo comparisons
- Richer, component-level system diagrams
- Monetization insight suggestions, as a natural extension of the improvement engine
- Git history storyteller — explain why a file looks the way it does, using its commit history