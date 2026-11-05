# DesignForge - guide for coding agents
Goal: AI design agent. Prompt -> Zod-validated JSON UI spec -> trusted React renderer -> editable canvas -> export.
Stack: Next.js App Router, TypeScript strict, Tailwind, Radix, Framer Motion, Drizzle + Neon, Auth.js (magic link, Google, GitHub; no passwords), R2/MinIO, Inngest, Upstash, Claude API, Vitest, Playwright. No Prisma.
Rules: never execute model-generated code; edits are structured patches; label demo mode honestly; verify before claiming.
Reference implementation of the spec model, renderer, motion runtime (RT) and edit commands: src/designforge-workspace.html. Port these to TypeScript modules first.
