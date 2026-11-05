# DesignForge: what this package is and is not

This is a single-file browser prototype (src/designforge-workspace.html), not the Next.js production stack.

Implemented (script syntax-checked only; NOT browser- or Playwright-tested):
- Local rule-based engine (no AI API): multi-clause chat edits, visual-direction presets, colour/size/spacing/section edits, motion/cursor/loader/greeting commands
- Three generated directions, JSON-spec renderer, direct editing, undo/redo, versions, HTML + JSON export
- Design review: contrast, empty text, button labels, navigation, with contrast auto-fix

Not implemented: Next.js/TypeScript/Tailwind/Radix repo, Claude API provider, image-generation provider, Drizzle/Neon, Auth.js, R2/MinIO, Inngest, Upstash, React/Next.js export, per-device (mobile-only) overrides, Vitest/Playwright tests.
