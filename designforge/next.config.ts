import type { NextConfig } from "next";
// The export route copies these source files into exported Next.js projects.
const config: NextConfig = { outputFileTracingIncludes: { "/api/export": ["./components/Renderer.tsx", "./lib/spec.ts", "./lib/css.ts"] } };
export default config;
