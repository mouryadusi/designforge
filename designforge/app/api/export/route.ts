import { z } from "zod";
import { allow, err } from "@/lib/api";
import { Project } from "@/lib/spec";
import { toHtml, toNextZip } from "@/lib/export";
export const runtime = "nodejs";
const Body = z.object({ project: Project, fmt: z.enum(["html", "json", "tokens", "nextjs"]) });
export async function POST(req: Request) {
  if (!allow(req, 30)) return err("Rate limit exceeded.", 429);
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err("Invalid project or format.", 400);
  const { project: p, fmt } = b.data;
  try {
    if (fmt === "html") return new Response(await toHtml(p), { headers: { "content-type": "text/html; charset=utf-8", "content-disposition": 'attachment; filename="site.html"' } });
    if (fmt === "json") return new Response(JSON.stringify(p, null, 2), { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="design-spec.json"' } });
    if (fmt === "tokens") return new Response(JSON.stringify(p.tokens, null, 2), { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="tokens.json"' } });
    return new Response(new Uint8Array(await toNextZip(p)), { headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="nextjs-site.zip"' } });
  } catch (e) { return err(e instanceof Error ? e.message : "Export failed", 500); }
}
