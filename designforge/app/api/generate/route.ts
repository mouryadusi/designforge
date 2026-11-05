import { z } from "zod";
import { allow, err, Mode } from "@/lib/api";
import { localGenerate } from "@/lib/engine/local";
import { geminiGenerate, Unavailable } from "@/lib/ai/gemini";
export const maxDuration = 60;
const Body = z.object({ prompt: z.string().min(5).max(4000), mode: Mode });
export async function POST(req: Request) {
  if (!allow(req)) return err("Rate limit exceeded. Try again in a minute.", 429);
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err("Invalid request body.", 400);
  try {
    const projects = b.data.mode === "gemini" ? await geminiGenerate(b.data.prompt) : localGenerate(b.data.prompt);
    return Response.json({ mode: b.data.mode, projects });
  } catch (e) {
    if (e instanceof Unavailable) return err(e.message, 503);
    return err(e instanceof Error ? e.message : "Generation failed", 502);
  }
}
