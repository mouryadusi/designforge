import type { ReactNode } from "react";
import { DF_CSS } from "@/lib/css";
import type { Project, Section } from "@/lib/spec";

type Props = { project: Project; pageId: string; selId?: string | null; edit?: boolean; onSelect?: (id: string) => void; onNav?: (id: string) => void };

function view(s: Section, project: Project, hs: number, onNav?: (id: string) => void): ReactNode {
  const t = project.tokens, al = s.st.al ?? t.al, fg = s.st.fg ?? t.fg;
  const items = (s.p.items ?? "").split("\n").filter(Boolean).map((x) => x.split("|"));
  const card = { border: `1px solid ${fg}33`, borderRadius: t.r, padding: 24 };
  const H = (z: number) => <h2 style={{ margin: 0, fontSize: `min(${z}px,${z > 40 ? 9 : 6}cqi)`, lineHeight: 1.05, letterSpacing: "-.02em", fontWeight: t.up ? 700 : 600, textTransform: t.up ? "uppercase" : undefined }}>{s.p.title}</h2>;
  const B = () => <button className="df-bt" style={{ background: t.ac, color: "#fff", borderRadius: t.r ? 980 : 0 }}>{s.p.cta}</button>;
  switch (s.ty) {
    case "nav": return <div className="df-nv"><b style={{ fontSize: 18 }}>{s.p.brand}</b><span>{project.pages.map((g) => <a key={g.id} data-pg={g.id} onClick={() => onNav?.(g.id)}>{g.name}</a>)}</span></div>;
    case "hero": return <>{H(hs)}<p style={{ fontSize: 19, opacity: 0.7, maxWidth: "34em", margin: `18px ${al === "center" ? "auto" : 0} 0` }}>{s.p.sub}</p>{B()}</>;
    case "features": return <>{H(hs * 0.6)}<div className="df-g">{items.map((a, i) => <div key={i} style={card}><b>{a[0]}</b><p style={{ opacity: 0.7, margin: "8px 0 0" }}>{a[1]}</p></div>)}</div></>;
    case "testimonials": return <>{H(hs * 0.6)}<div className="df-g">{items.map((a, i) => <div key={i} style={card}><p style={{ margin: "0 0 12px" }}>“{a[0]}”</p><small style={{ opacity: 0.6 }}>{a[1]}</small></div>)}</div></>;
    case "pricing": return <>{H(hs * 0.6)}<div className="df-g">{items.map((a, i) => <div key={i} style={card}><b>{a[0]}</b><div style={{ fontSize: 36, fontWeight: 600, margin: "6px 0" }}>{a[1]}</div><span style={{ opacity: 0.7 }}>{a[2]}</span></div>)}</div></>;
    case "cta": return <>{H(hs * 0.7)}{B()}</>;
    default: return <small style={{ opacity: 0.6 }}>{s.p.title}</small>;
  }
}

export function Renderer({ project, pageId, selId, edit, onSelect, onNav }: Props) {
  const t = project.tokens, page = project.pages.find((p) => p.id === pageId) ?? project.pages[0];
  return (
    <div className="df-root" data-mo={t.mo} data-edit={edit ? "" : undefined}>
      <style>{DF_CSS}</style>
      {page.sections.filter((s) => edit || !s.st.hid).map((s) => (
        <section key={s.id} className={edit && s.id === selId ? "df-sel" : undefined} onClick={edit ? () => onSelect?.(s.id) : undefined}
          style={{ background: s.st.bg ?? t.bg, color: s.st.fg ?? t.fg, fontFamily: t.font, textAlign: s.ty === "nav" || s.ty === "footer" ? "left" : (s.st.al ?? t.al), padding: s.ty === "nav" ? "18px 6%" : s.ty === "footer" ? "28px 6%" : `${s.st.pd ?? 72}px 6%`, opacity: s.st.hid ? 0.25 : 1 }}>
          {view(s, project, s.st.hs ?? t.hs, onNav)}
        </section>
      ))}
    </div>
  );
}
