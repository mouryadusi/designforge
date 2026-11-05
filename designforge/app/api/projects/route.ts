import { cookies } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { err } from "@/lib/api";
import { Project } from "@/lib/spec";
import { projects, projectVersions } from "@/db/schema";
// NOTE: no Auth.js yet. Projects are scoped to an anonymous httpOnly cookie id, which isolates browsers but is NOT account auth.
async function owner() {
  const c = await cookies(); let id = c.get("df_uid")?.value;
  if (!id) { id = crypto.randomUUID(); c.set("df_uid", id, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 31_536_000, path: "/" }); }
  return id;
}
export async function GET() {
  const d = db(); if (!d) return err("Database not configured", 503);
  const rows = await d.select().from(projects).where(eq(projects.ownerId, await owner())).orderBy(desc(projects.updatedAt)).limit(50);
  return Response.json({ projects: rows });
}
const Body = z.object({ id: z.string().uuid().optional(), spec: Project, label: z.string().max(80).optional() });
export async function POST(req: Request) {
  const d = db(); if (!d) return err("Database not configured", 503);
  const b = Body.safeParse(await req.json().catch(() => null)); if (!b.success) return err("Invalid project.", 400);
  const ownerId = await owner(), { id, spec, label } = b.data;
  let pid = id;
  if (id) {
    const r = await d.update(projects).set({ spec, name: spec.brand, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.ownerId, ownerId))).returning({ id: projects.id });
    if (!r.length) return err("Project not found.", 404);
  } else pid = (await d.insert(projects).values({ ownerId, name: spec.brand, spec }).returning({ id: projects.id }))[0].id;
  if (label) await d.insert(projectVersions).values({ projectId: pid!, label, spec });
  return Response.json({ id: pid });
}
