# Status (honest report)

## Verified (in the authoring sandbox, which had no network or npm install)
- `lib/engine/local.ts` runs and generates 3 directions; `components/Renderer.tsx` server-renders all of them, including selection state (smoke test with tsx + React).
- TypeScript syntax parses (no TS1xxx syntax errors).

## Implemented but NOT executed anywhere yet (needs `npm install` on your machine)
- Type-checking, `next build`, `vitest` (tests are written in `tests/engine.test.ts`), the Zod schemas and patch engine at runtime
- Next.js API routes, the editor UI (`app/page.tsx`), HTML / JSON / tokens / Next.js ZIP exports
- Gemini integration (`@google/genai`, `responseJsonSchema` from `z.toJSONSchema`): never called with a real key. If Gemini rejects the generated JSON schema (e.g. unions/records), simplify the schema in `lib/ai/gemini.ts`.
- Drizzle persistence (`npm run db:push`)
- `react-dom/server` inside the export route and `outputFileTracingIncludes` for copying source into the exported ZIP

## Not implemented
- Auth.js / accounts (projects are scoped to an anonymous cookie; this is not real authentication)
- Radix/shadcn and Framer Motion (plain Tailwind + CSS scroll-driven animations used; they need Chromium/Safari support and are skipped for reduced-motion)
- Per-device (mobile-only) overrides, drag-and-drop reordering (up/down buttons instead), version history UI (versions are stored in DB when configured), design-critique/accessibility review and contrast auto-fix (exists only in `prototype/`)
- Component types beyond nav/hero/features/testimonials/pricing/cta/footer (no tables, charts, kanban, forms, modals); no multi-step flows or real interactions
- Image generation, asset uploads, Playwright tests, lockfile, ESLint config, global rate limiting (in-memory only)
