// Deterministic local design engine. Not an LLM: keyword/rule based composition. Works with no API key.
import type { Project, Section, SectionType, Tokens } from "../spec";
export const FONTS = { serif: "Georgia,serif", sans: "Inter,system-ui,sans-serif", mono: '"IBM Plex Mono",ui-monospace,monospace' } as const;
const rid = () => Math.random().toString(36).slice(2, 9);
type Ind = { rx: RegExp; kind: string; tag: string; items: string[]; cta: string };
const IND: Ind[] = [
  { rx: /restaurant|food|cafe|dining|bistro/, kind: "dining", tag: "Reserve a table. Stay for the evening.", items: ["Seasonal menu|Dishes that follow the market.", "Private dining|Rooms for twelve to eighty.", "Reservations|Book in under a minute."], cta: "Book a table" },
  { rx: /shop|store|fashion|ecommerce|e-commerce|clothing/, kind: "store", tag: "Objects made to be kept.", items: ["New arrivals|Fresh pieces every week.", "Free returns|Thirty days, no questions.", "Made well|Materials we stand behind."], cta: "Shop now" },
  { rx: /saas|dashboard|analytics|software|platform/, kind: "software", tag: "See every number that matters.", items: ["Live dashboards|Metrics update in real time.", "Team workspaces|Share views with one link.", "Secure by default|SSO and audit logs included."], cta: "Start free" },
  { rx: /travel|hotel|trip|booking|flight/, kind: "travel", tag: "Plan the trip you keep imagining.", items: ["Curated stays|Places worth the journey.", "Flexible booking|Change plans without fees.", "Local guides|Advice from people who live there."], cta: "Find a trip" },
  { rx: /school|learn|course|education|student/, kind: "learning", tag: "Learn at your own pace.", items: ["Short lessons|Ten minutes a day is enough.", "Live mentors|Questions answered the same day.", "Real projects|Build a portfolio as you go."], cta: "Start learning" },
  { rx: /health|clinic|doctor|medical|appointment/, kind: "care", tag: "Care that fits your schedule.", items: ["Easy booking|Appointments in a few taps.", "Trusted doctors|Verified and reviewed.", "Private records|Your data stays yours."], cta: "Book a visit" },
  { rx: /portfolio|designer|photograph|studio|artist|architect/, kind: "studio", tag: "Selected work, thoughtfully made.", items: ["Brand identity|Systems that scale.", "Web design|Interfaces with character.", "Art direction|Ideas carried through."], cta: "See the work" },
];
const DEF: Ind = { rx: /$^/, kind: "work", tag: "Something people will want to use.", items: ["Clear|Easy to understand at a glance.", "Fast|Built to feel immediate.", "Considered|Details handled with care."], cta: "Get started" };
const TST = "Exactly what we hoped for.|Priya S.\nSimple, quick and genuinely lovely.|Daniel R.\nI would recommend it to anyone.|Mei L.";
const PRC = "Starter|$0|For trying things out\nStandard|$24|For everyday use\nStudio|$79|For teams";
export const PRE: Record<string, Partial<Tokens>> = {
  luxury: { bg: "#0e0b0a", fg: "#e9dfcf", ac: "#c9a24a", font: FONTS.serif, r: 0, up: 0, al: "center", hs: 60, mo: "clip" },
  editorial: { bg: "#f6f0e4", fg: "#111111", ac: "#B75D41", font: FONTS.serif, r: 0, up: 0, al: "left", hs: 58, mo: "fade" },
  brutalist: { bg: "#ffffff", fg: "#000000", ac: "#ff3b00", font: FONTS.mono, r: 0, up: 1, al: "left", hs: 72, mo: "up" },
  playful: { bg: "#fff7ec", fg: "#2b2250", ac: "#d6336c", font: FONTS.sans, r: 24, up: 0, al: "center", hs: 50, mo: "scale" },
  futuristic: { bg: "#05060f", fg: "#cfe8ff", ac: "#00b8d4", font: FONTS.mono, r: 10, up: 0, al: "left", hs: 60, mo: "fade" },
  minimal: { bg: "#ffffff", fg: "#111111", ac: "#111111", font: FONTS.sans, r: 0, up: 0, al: "left", hs: 56, mo: "none" },
};
export function defaultProps(ty: SectionType, b: { brand: string; cta: string; feat: string }): Record<string, string> {
  switch (ty) {
    case "nav": return { brand: b.brand };
    case "hero": return { title: "A new headline", sub: "Supporting copy goes here.", cta: b.cta };
    case "features": return { title: "What you get", items: b.feat };
    case "testimonials": return { title: "Kind words", items: TST };
    case "pricing": return { title: "Simple pricing", items: PRC };
    case "cta": return { title: "Ready when you are.", cta: b.cta };
    default: return { title: `© 2026 ${b.brand}` };
  }
}
const DIRS: { n: string; t: Tokens }[] = [
  { n: "Minimal Editorial", t: { bg: "#f6f0e4", fg: "#111111", ac: "#B75D41", font: FONTS.serif, r: 0, al: "left", hs: 56, up: 0, mo: "fade" } },
  { n: "Premium Contemporary", t: { bg: "#ffffff", fg: "#1d1d1f", ac: "#2115B2", font: FONTS.sans, r: 14, al: "center", hs: 52, up: 0, mo: "up" } },
  { n: "Bold Experimental", t: { bg: "#0d0a1f", fg: "#F0D7E5", ac: "#E79C41", font: FONTS.mono, r: 0, al: "left", hs: 68, up: 1, mo: "clip" } },
];
export function localGenerate(prompt: string): Project[] {
  const l = prompt.toLowerCase(), I = IND.find((x) => x.rx.test(l)) ?? DEF;
  const m = prompt.match(/(?:called|named)\s+([A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,2})/);
  const brand = m ? m[1].trim() : `Nova ${I.kind[0].toUpperCase()}${I.kind.slice(1)}`;
  const preset = Object.keys(PRE).find((k) => l.includes(k));
  return DIRS.map((d, vi) => {
    const b = { brand, cta: I.cta, feat: I.items.join("\n") };
    const S = (ty: SectionType, p?: Record<string, string>): Section => ({ id: rid(), ty, p: p ?? defaultProps(ty, b), st: {} });
    const hero = () => S("hero", { title: I.tag, sub: `A ${d.n.toLowerCase()} direction for ${brand}.`, cta: I.cta });
    const home = vi === 0 ? [S("nav"), hero(), S("features"), S("testimonials"), S("cta"), S("footer")] : vi === 1 ? [S("nav"), hero(), S("features"), S("pricing"), S("testimonials"), S("cta"), S("footer")] : [S("nav"), hero(), S("features"), S("cta"), S("footer")];
    const about = [S("nav"), S("hero", { title: `About ${brand}`, sub: "Who we are and why we build.", cta: "Contact us" }), S("testimonials"), S("footer")];
    return { vn: d.n, ...b, tokens: { ...d.t, ...(vi === 0 && preset ? PRE[preset] : {}) } as Tokens, pages: [{ id: "home", name: "Home", sections: home }, { id: "about", name: "About", sections: about }] };
  });
}
