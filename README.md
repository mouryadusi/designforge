# DesignForge (single-file prototype)
Open `src/designforge-workspace.html` in a browser. No build step.

## Implemented (syntax-checked only; not browser-tested)
- Prompt -> 3 rendered directions via a LOCAL rule-based generator (DEMO MODE, no Claude API).
- Creative direction detection: cinematic/luxury, brutalist, playful, minimal, futuristic, retro, organic.
- Motion (fade/up/clip/scale reveals), cursors (glow, magnetic, VIEW label), loader/greeting, smooth/parallax scroll, hover lift. Run in Preview and HTML export; reduced-motion respected; custom cursor only on fine pointers.
- Canvas editing, tokens, pages, viewports, undo/redo, versions (localStorage), HTML + JSON export.

## NOT implemented
Next.js/TypeScript/Tailwind/Radix, Drizzle/Neon, Auth.js, R2/MinIO, Inngest, Upstash, real Claude and image-provider integrations, React/Next.js/ZIP export, 3D/WebGL, tests (Vitest/Playwright).
See CLAUDE.md for the target architecture and `.env.example` for required variables.
