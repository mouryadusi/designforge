import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createElement } from "react";
import { DF_CSS } from "./css";
import type { Project } from "./spec";

export async function toHtml(p: Project): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { Renderer } = await import("@/components/Renderer");
  const pages = p.pages.map((g, i) => `<main class="pg${i ? "" : " on"}" id="${g.id}">${renderToStaticMarkup(createElement(Renderer, { project: p, pageId: g.id }))}</main>`).join("");
  const title = p.brand.replace(/[<>&"]/g, "");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box}body{margin:0}.pg{display:none}.pg.on{display:block}${DF_CSS}</style></head><body>${pages}<script>document.addEventListener("click",function(e){var a=e.target.closest("[data-pg]");if(a)document.querySelectorAll(".pg").forEach(function(x){x.classList.toggle("on",x.id===a.dataset.pg)})})</script></body></html>`;
}
const src = (f: string) => readFile(path.join(process.cwd(), f), "utf8");
/** A standalone Next.js project that renders the exact same Renderer + spec used in the editor. */
export async function toNextZip(p: Project): Promise<Buffer> {
  const z = new JSZip(), root = z.folder(p.brand.replace(/[^\w-]+/g, "-").toLowerCase() || "site")!;
  root.file("package.json", JSON.stringify({ name: "exported-site", private: true, scripts: { dev: "next dev", build: "next build", start: "next start" }, dependencies: { next: "^15.3.0", react: "^19.0.0", "react-dom": "^19.0.0", zod: "^4.0.0" }, devDependencies: { typescript: "^5.6.0", "@types/react": "^19.0.0", "@types/node": "^22.0.0" } }, null, 2));
  root.file("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["dom", "esnext"], strict: true, skipLibCheck: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", noEmit: true, plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["**/*.ts", "**/*.tsx"], exclude: ["node_modules"] }, null, 2));
  root.file("next.config.mjs", "export default {};\n");
  root.file("data/project.json", JSON.stringify(p, null, 2));
  for (const f of ["components/Renderer.tsx", "lib/spec.ts", "lib/css.ts"]) root.file(f, await src(f));
  root.file("app/layout.tsx", `export const metadata = { title: ${JSON.stringify(p.brand)} };\nexport default function Layout({ children }: { children: React.ReactNode }) {\n  return (<html lang="en"><body style={{ margin: 0 }}>{children}</body></html>);\n}\n`);
  root.file("app/page.tsx", `"use client";\nimport { useState } from "react";\nimport { Renderer } from "@/components/Renderer";\nimport type { Project } from "@/lib/spec";\nimport data from "@/data/project.json";\nconst project = data as unknown as Project;\nexport default function Page() {\n  const [pg, setPg] = useState(project.pages[0].id);\n  return <Renderer project={project} pageId={pg} onNav={setPg} />;\n}\n`);
  root.file("README.md", `# ${p.brand}\n\nExported from DesignForge. Edit \`data/project.json\` (design spec) or \`components/Renderer.tsx\`.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nDesign tokens: \`data/project.json\` → \`tokens\`. Motion uses CSS scroll-driven animations and is disabled for reduced-motion users.\n`);
  return z.generateAsync({ type: "nodebuffer" });
}
