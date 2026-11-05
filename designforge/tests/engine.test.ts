import { describe, expect, it } from "vitest";
import { Project } from "@/lib/spec";
import { localGenerate } from "@/lib/engine/local";
import { localEdit } from "@/lib/engine/localEdit";
import { applyPatch } from "@/lib/patch";

describe("local engine", () => {
  it("generates three valid, distinct directions", () => {
    const ps = localGenerate("A premium restaurant site called Ember");
    expect(ps).toHaveLength(3);
    ps.forEach((p) => expect(() => Project.parse(p)).not.toThrow());
    expect(new Set(ps.map((p) => p.tokens.font)).size).toBeGreaterThan(1);
    expect(ps[0].brand).toBe("Ember");
  });
  it("targeted edits preserve unrelated sections", () => {
    const p = localGenerate("saas dashboard")[0], page = p.pages[0];
    const { ops } = localEdit("make the hero background navy and make the heading larger", p, page.id);
    const n = applyPatch(p, ops), hero = page.sections.find((s) => s.ty === "hero")!;
    expect(n.pages[0].sections.find((s) => s.id === hero.id)!.st.bg).toBe("#0b1b3a");
    expect(n.pages[0].sections.filter((s) => s.ty !== "hero")).toEqual(page.sections.filter((s) => s.ty !== "hero"));
    expect(n.pages[1]).toEqual(p.pages[1]);
  });
  it("rejects unknown ids and invalid values", () => {
    const p = localGenerate("portfolio")[0];
    expect(() => applyPatch(p, [{ op: "removeSection", id: "nope" }])).toThrow();
    expect(() => applyPatch(p, [{ op: "setToken", key: "ac", value: "red; background:url(x)" }])).toThrow();
  });
  it("add/remove/duplicate/move work", () => {
    const p = localGenerate("travel")[1], pid = p.pages[0].id, n0 = p.pages[0].sections.length;
    const a = applyPatch(p, [{ op: "addSection", pageId: pid, ty: "pricing" }]);
    expect(a.pages[0].sections).toHaveLength(n0 + 1);
    const id = a.pages[0].sections[1].id;
    expect(applyPatch(a, [{ op: "duplicateSection", id }]).pages[0].sections).toHaveLength(n0 + 2);
    expect(applyPatch(a, [{ op: "removeSection", id }]).pages[0].sections).toHaveLength(n0);
  });
});
