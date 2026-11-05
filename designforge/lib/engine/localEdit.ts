import type { Project } from "../spec";
import type { Op } from "../patch";
import { FONTS, PRE } from "./local";
const COL: Record<string, string> = { navy: "#0b1b3a", cream: "#f6f0e4", amber: "#E79C41", indigo: "#150C5D", blue: "#2115B2", plum: "#3F214B", purple: "#A55DD0", terracotta: "#B75D41", pink: "#F0D7E5", black: "#0a0a0a", white: "#ffffff", green: "#1f6f50", red: "#c0392b" };
const DARK = /navy|black|plum|indigo|blue|green|red|terracotta/;
const TY = [["hero", "hero"], ["feature", "features"], ["testimonial", "testimonials"], ["review", "testimonials"], ["pricing", "pricing"], ["call to action", "cta"], ["cta", "cta"], ["footer", "footer"]] as const;
/** Rule-based, multi-clause edit interpreter. Emits validated patch ops; it is not a language model. */
export function localEdit(text: string, P: Project, pageId: string): { ops: Op[]; summary: string } {
  const ops: Op[] = [], notes: string[] = [], page = P.pages.find((p) => p.id === pageId) ?? P.pages[0];
  for (const c of text.split(/,|;|\band\b|\bthen\b/i).map((x) => x.trim()).filter((x) => x.length > 2)) {
    const l = c.toLowerCase(), ty = TY.find(([k]) => l.includes(k))?.[1], col = Object.keys(COL).find((k) => l.includes(k));
    const target = page.sections.find((s) => s.ty === (ty ?? "hero")), preset = Object.keys(PRE).find((k) => l.includes(k));
    if (/dark/.test(l) && /(theme|mode)/.test(l)) { ops.push({ op: "setToken", key: "bg", value: "#0b0b0f" }, { op: "setToken", key: "fg", value: "#f5f5f7" }); notes.push("Switched the global tokens to a dark theme."); }
    else if (/\badd\b/.test(l) && ty && ty !== "footer") { ops.push({ op: "addSection", pageId: page.id, ty }); notes.push(`Added a ${ty} section.`); }
    else if (/(remove|delete)/.test(l) && ty && target) { ops.push({ op: "removeSection", id: target.id }); notes.push(`Removed the ${ty} section.`); }
    else if (preset && /(direction|style|feel|look|inspired|identity|personality)/.test(l)) { for (const [k, v] of Object.entries(PRE[preset])) ops.push({ op: "setToken", key: k as never, value: v as never }); notes.push(`Applied a ${preset} visual direction across all pages; content is unchanged.`); }
    else if (/(background|bg)/.test(l) && col && target) { ops.push({ op: "setStyle", id: target.id, key: "bg", value: COL[col] }, { op: "setStyle", id: target.id, key: "fg", value: DARK.test(col) ? "#ffffff" : "#111111" }); notes.push(`Set the ${target.ty} background to ${col} with readable text.`); }
    else if (/(accent|primary)/.test(l) && col) { ops.push({ op: "setToken", key: "ac", value: COL[col] }); notes.push(`Accent colour is now ${col}.`); }
    else if (/(larger|bigger|increase)/.test(l) && target) { ops.push({ op: "setStyle", id: target.id, key: "hs", value: Math.min(140, Math.round((target.st.hs ?? P.tokens.hs) * 1.2)) }); notes.push(`Enlarged the ${target.ty} heading.`); }
    else if (/(smaller|reduce|compact)/.test(l) && target) { ops.push({ op: "setStyle", id: target.id, key: "hs", value: Math.max(16, Math.round((target.st.hs ?? P.tokens.hs) * 0.8)) }); notes.push(`Reduced the ${target.ty} heading.`); }
    else if (/(breathing|spacing|padding|airy)/.test(l) && target) { ops.push({ op: "setStyle", id: target.id, key: "pd", value: Math.min(240, (target.st.pd ?? 72) + 36) }); notes.push(`Added space around the ${target.ty} section.`); }
    else if (/(typograph|font)/.test(l)) { const f = /(mono|technical)/.test(l) ? FONTS.mono : /(modern|clean|sans)/.test(l) ? FONTS.sans : FONTS.serif; ops.push({ op: "setToken", key: "font", value: f }); notes.push("Changed the typeface globally."); }
    else if (/(animat|motion|reveal|scroll)/.test(l)) { ops.push({ op: "setToken", key: "mo", value: /clip/.test(l) ? "clip" : /fade/.test(l) ? "fade" : "up" }); notes.push("Enabled scroll-reveal motion (plays in Preview and exports; skipped under reduced motion)."); }
  }
  return { ops, summary: notes.join(" ") || "The local engine could not map that request to an edit. Switch to Gemini mode for open-ended instructions." };
}
