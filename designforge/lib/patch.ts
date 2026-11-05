import { z } from "zod";
import { Project, SectionType, type Section } from "./spec";
import { defaultProps } from "./engine/local";
export const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("setProp"), id: z.string(), key: z.string(), value: z.string() }),
  z.object({ op: z.literal("setStyle"), id: z.string(), key: z.enum(["bg", "fg", "hs", "pd", "al", "hid"]), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ op: z.literal("setToken"), key: z.enum(["bg", "fg", "ac", "font", "r", "al", "hs", "up", "mo"]), value: z.union([z.string(), z.number()]) }),
  z.object({ op: z.literal("addSection"), pageId: z.string(), ty: SectionType, afterId: z.string().optional() }),
  z.object({ op: z.literal("removeSection"), id: z.string() }),
  z.object({ op: z.literal("moveSection"), id: z.string(), dir: z.enum(["up", "down"]) }),
  z.object({ op: z.literal("duplicateSection"), id: z.string() }),
]);
export type Op = z.infer<typeof Op>;
const rid = () => Math.random().toString(36).slice(2, 9);
/** Applies ops immutably and re-validates the whole project; throws on unknown ids or invalid values. */
export function applyPatch(project: Project, ops: Op[]): Project {
  const n = structuredClone(project);
  const find = (id: string) => {
    for (const pg of n.pages) { const i = pg.sections.findIndex((s) => s.id === id); if (i >= 0) return { pg, i, s: pg.sections[i] }; }
    throw new Error(`Unknown section id: ${id}`);
  };
  for (const o of ops) {
    if (o.op === "setProp") find(o.id).s.p[o.key] = o.value;
    else if (o.op === "setStyle") (find(o.id).s.st as Record<string, unknown>)[o.key] = o.value;
    else if (o.op === "setToken") (n.tokens as Record<string, unknown>)[o.key] = o.value;
    else if (o.op === "addSection") {
      const pg = n.pages.find((p) => p.id === o.pageId); if (!pg) throw new Error(`Unknown page: ${o.pageId}`);
      const sec: Section = { id: rid(), ty: o.ty, p: defaultProps(o.ty, n), st: {} };
      const at = o.afterId ? pg.sections.findIndex((s) => s.id === o.afterId) + 1 : Math.max(pg.sections.length - 1, 0);
      pg.sections.splice(at, 0, sec);
    } else if (o.op === "removeSection") { const { pg, i } = find(o.id); pg.sections.splice(i, 1); }
    else if (o.op === "moveSection") { const { pg, i } = find(o.id), j = o.dir === "up" ? i - 1 : i + 1; if (j >= 0 && j < pg.sections.length) [pg.sections[i], pg.sections[j]] = [pg.sections[j], pg.sections[i]]; }
    else { const { pg, i, s } = find(o.id); pg.sections.splice(i + 1, 0, { ...structuredClone(s), id: rid() }); }
  }
  return Project.parse(n);
}
