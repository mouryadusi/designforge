# DesignForge

Describe a website or app in plain language; get three rendered design directions, then refine them by chat or direct editing, and export real source code.

Two modes, always labelled in the UI:
- **Local engine** (no key needed): deterministic, rule-based generation and edit interpreter. Not an LLM; handles common requests only.
- **Gemini** (server-side `GEMINI_API_KEY`): Gemini returns JSON that is validated with Zod (`lib/spec.ts`, `lib/patch.ts`) before anything renders. No model-written code is ever executed.

## Run locally
```bash
npm install            # creates package-lock.json
cp .env.example .env.local   # add GEMINI_API_KEY (optional) and DATABASE_URL (optional)
npm run dev            # http://localhost:3000
npm test               # vitest (engine + patch tests)
npm run typecheck && npm run build
```
Optional database (Neon / Vercel Postgres / any PostgreSQL): set `DATABASE_URL`, then `npm run db:push`. Without it, projects persist in browser localStorage only.

## Deploy to Vercel
1. Push the repo to GitHub and import it in Vercel (framework: Next.js, no build overrides).
2. Environment variables: `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, `DATABASE_URL`). Never use a `NEXT_PUBLIC_` prefix for the key.
3. Run `npm run db:push` once against your production `DATABASE_URL` if you use the database.
4. `/api/generate` and `/api/edit` set `maxDuration = 60`; Hobby plans may cap lower, so lower it or upgrade if Gemini calls time out.

## Layout
`lib/spec.ts` schemas · `lib/patch.ts` patch ops · `lib/engine/` local engine · `lib/ai/gemini.ts` provider · `components/Renderer.tsx` trusted renderer (used by editor, HTML export and exported Next.js project) · `lib/export.ts` exports · `db/` Drizzle schema · `prototype/` the earlier single-file prototype (kept for reference).

See `docs/STATUS.md` for what is verified and what is not.
