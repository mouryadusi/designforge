import { z } from "zod";
const hits = new Map<string, number[]>();
/** In-memory sliding window. Per-instance only: on Vercel use Upstash/KV for a global limit. */
export function allow(req: Request, max = 12, windowMs = 60_000) {
  const k = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon", now = Date.now();
  const a = (hits.get(k) ?? []).filter((t) => now - t < windowMs); a.push(now); hits.set(k, a);
  return a.length <= max;
}
export const Mode = z.enum(["local", "gemini"]);
export const err = (m: string, status: number) => Response.json({ error: m }, { status });
