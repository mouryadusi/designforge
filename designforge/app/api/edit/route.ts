import { z } from "zod";
import { allow, err, Mode } from "@/lib/api";
import { Project } from "@/lib/spec";
import { applyPatch } from "@/lib/patch";
import { localEdit } from "@/lib/engine/localEdit";
import { geminiEdit, Unavailable } from "@/lib/ai/gemini";
export const maxDuration = 60;
const Body = z.object({ project: Project, instruction: z.string().min(2).max(1500), pageId: z.string(), selId: z.string().optional(), mode: Mode });
export async function POST(req: Request) {
  if (!allow(req, 30)) return err("Rate limit exceeded.", 429);
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err("Invalid request body.", 400);
  const { project, instruction, pageId, selId, mode } = b.data;
  try {
    const r = mode === "gemini" ? await geminiEdit(project, instruction, pageId, selId) : localEdit(instruction, project, pageId);
    const next = r.ops.length ? applyPatch(project, r.ops) : project; // validates ops, throws on hallucinated ids/values
    return Response.json({ mode, project: next, summary: r.summary, ops: r.ops });
  } catch (e) {
    if (e instanceof Unavailable) return err(e.message, 503);
    return err(e instanceof Error ? e.message : "Edit failed", 422);
  }
}
