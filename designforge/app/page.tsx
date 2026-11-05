"use client";
import { useEffect, useState } from "react";
import { Renderer } from "@/components/Renderer";
import { applyPatch, type Op } from "@/lib/patch";
import { FONT_VALUES, type Project } from "@/lib/spec";

type Mode = "local" | "gemini","groq";
const VW = { d: "1040px", t: "768px", m: "390px" } as const;
const SUGGEST = ["A premium restaurant site called Ember with reservations and reviews", "Modern SaaS analytics dashboard for startups", "Brutalist architecture studio portfolio", "Playful learning platform for students"];

async function call(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? r.statusText);
  return r;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("local"), [gem, setGem] = useState(false);
  const [prompt, setPrompt] = useState(""), [vars, setVars] = useState<Project[]>([]);
  const [P, setP] = useState<Project | null>(null), [hist, setHist] = useState<Project[]>([]), [fut, setFut] = useState<Project[]>([]);
  const [pg, setPg] = useState(""), [sel, setSel] = useState<string | null>(null), [vp, setVp] = useState<keyof typeof VW>("d"), [prev, setPrev] = useState(false);
  const [busy, setBusy] = useState(false), [log, setLog] = useState<string[]>([]), [chat, setChat] = useState(""), [dbId, setDbId] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((j: { gemini: boolean }) => setGem(j.gemini)).catch(() => {});
    try { const s = localStorage.getItem("df:last"); if (s) { const j = JSON.parse(s) as Project; setP(j); setPg(j.pages[0].id); } } catch {}
  }, []);

  const say = (m: string) => setLog((l) => [...l.slice(-30), m]);
  const persist = (n: Project, label?: string) => {
    try { localStorage.setItem("df:last", JSON.stringify(n)); } catch {}
    call("/api/projects", { id: dbId, spec: n, label }).then((r) => r.json()).then((j: { id: string }) => setDbId(j.id)).catch(() => {}); // 503 without DATABASE_URL: localStorage only
  };
  const commit = (n: Project, label?: string) => { if (P) { setHist((h) => [...h.slice(-49), P]); setFut([]); } setP(n); persist(n, label); };
  const patch = (ops: Op[], label?: string) => { if (!P) return; try { commit(applyPatch(P, ops), label); } catch (e) { say(String(e)); } };

  async function generate() {
    setBusy(true); setVars([]);
    try { const j = await (await call("/api/generate", { prompt, mode })).json() as { projects: Project[] }; setVars(j.projects); say(`Generated 3 directions (${mode} mode).`); }
    catch (e) { say(`Generation failed: ${e instanceof Error ? e.message : e}`); } finally { setBusy(false); }
  }
  async function edit() {
    if (!P || !chat.trim()) return; setBusy(true);
    try {
      const j = await (await call("/api/edit", { project: P, instruction: chat, pageId: pg, selId: sel ?? undefined, mode })).json() as { project: Project; summary: string };
      commit(j.project, `Chat: ${chat.slice(0, 40)}`); say(`You: ${chat}`); say(j.summary); setChat("");
    } catch (e) { say(`Edit failed: ${e instanceof Error ? e.message : e}`); } finally { setBusy(false); }
  }
  async function exportAs(fmt: "html" | "json" | "tokens" | "nextjs") {
    if (!P) return;
    try { const r = await call("/api/export", { project: P, fmt }); const u = URL.createObjectURL(await r.blob()), a = document.createElement("a"); a.href = u; a.download = ({ html: "site.html", json: "design-spec.json", tokens: "tokens.json", nextjs: "nextjs-site.zip" })[fmt]; a.click(); URL.revokeObjectURL(u); }
    catch (e) { say(`Export failed: ${e instanceof Error ? e.message : e}`); }
  }
  const open = (p: Project) => { setP(p); setPg(p.pages[0].id); setSel(null); setHist([]); setFut([]); persist(p, `Generated: ${p.vn}`); };
  const cur = P?.pages.find((x) => x.id === pg) ?? P?.pages[0], s = cur?.sections.find((x) => x.id === sel);

  if (!P) return (
    <main className="mx-auto max-w-5xl p-8">
      <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">{mode === "gemini" ? "Gemini mode" : "Local engine · no AI model"}</span>
      <h1 className="mt-3 text-5xl font-semibold tracking-tight">From imagination to interface.</h1>
      <div className="my-4 flex gap-2">
        <button className={`b ${mode === "local" ? "on" : ""}`} onClick={() => setMode("local")}>Local</button>
        <button className={`b ${mode === "gemini" ? "on" : ""}`} disabled={!gem} title={gem ? "" : "Set GEMINI_API_KEY on the server"} onClick={() => setMode("gemini")}>Gemini{gem ? "" : " (not configured)"}</button>
      </div>
      <textarea className="in" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the website or app you want…" />
      <div className="my-3 flex flex-wrap gap-2">{SUGGEST.map((x) => <button key={x} className="b text-xs" onClick={() => setPrompt(x)}>{x}</button>)}</div>
      <button className="b pr" disabled={busy || prompt.trim().length < 5} onClick={generate}>{busy ? "Generating…" : "Generate three directions"}</button>
      <p className="mt-3 text-sm" style={{ color: "var(--mu)" }}>{log.at(-1)}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {vars.map((v) => (
          <div key={v.vn} className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--ln)", background: "var(--pn)" }}>
            <div style={{ height: 300, overflow: "hidden", pointerEvents: "none" }}><div style={{ width: 1040, transform: "scale(.3)", transformOrigin: "0 0" }}><Renderer project={v} pageId={v.pages[0].id} edit /></div></div>
            <div className="flex items-center justify-between p-3"><b>{v.vn}</b><button className="b pr" onClick={() => open(v)}>Choose</button></div>
          </div>
        ))}
      </div>
    </main>
  );

  const T = P.tokens;
  const Inp = (label: string, key: string, val: string) => <><label>{label}</label><input className="in" value={val} onChange={(e) => sel && patch([{ op: "setProp", id: sel, key, value: e.target.value }])} /></>;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-2 overflow-x-auto border-b px-3 py-2" style={{ borderColor: "var(--ln)", background: "var(--pn)" }}>
        <button className="b" onClick={() => { setP(null); setVars([]); }}>←</button><b>{P.brand}</b>
        <span className="rounded-full bg-amber-400 px-2 text-xs font-semibold text-black">{mode === "gemini" ? "Gemini" : "Local engine"}</span>
        {P.pages.map((x) => <button key={x.id} className={`b ${x.id === cur?.id ? "on" : ""}`} onClick={() => { setPg(x.id); setSel(null); }}>{x.name}</button>)}
        <span className="flex-1" />
        {(["d", "t", "m"] as const).map((k) => <button key={k} className={`b ${vp === k ? "on" : ""}`} onClick={() => setVp(k)}>{{ d: "Desktop", t: "Tablet", m: "Mobile" }[k]}</button>)}
        <button className="b" disabled={!hist.length} onClick={() => { setFut((f) => [P, ...f]); setP(hist.at(-1)!); setHist((h) => h.slice(0, -1)); }}>Undo</button>
        <button className="b" disabled={!fut.length} onClick={() => { setHist((h) => [...h, P]); setP(fut[0]); setFut((f) => f.slice(1)); }}>Redo</button>
        <button className={`b ${prev ? "on" : ""}`} onClick={() => setPrev(!prev)}>Preview</button>
        {(["html", "nextjs", "json", "tokens"] as const).map((f) => <button key={f} className="b" onClick={() => exportAs(f)}>{{ html: "HTML", nextjs: "Next.js ZIP", json: "Spec", tokens: "Tokens" }[f]}</button>)}
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_280px] max-md:grid-cols-1">
        <aside className="overflow-auto border-r p-3" style={{ borderColor: "var(--ln)", background: "var(--pn)" }}>
          <h4>Agent</h4>
          <div className="my-2 flex gap-2"><button className={`b ${mode === "local" ? "on" : ""}`} onClick={() => setMode("local")}>Local</button><button className={`b ${mode === "gemini" ? "on" : ""}`} disabled={!gem} onClick={() => setMode("gemini")}>Gemini</button></div>
          <div style={{ maxHeight: "40vh", overflow: "auto" }}>{log.map((m, i) => <p key={i} className="my-1 rounded-lg p-2" style={{ background: "var(--bg)" }}>{m}</p>)}</div>
          <input className="in mt-2" value={chat} placeholder="e.g. make the hero background navy, add pricing" onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && edit()} disabled={busy} />
        </aside>
        <div className="overflow-auto p-6"><div className="mx-auto overflow-hidden rounded-xl bg-white shadow-2xl transition-all" style={{ width: VW[vp], maxWidth: "100%" }}>
          <Renderer project={P} pageId={cur!.id} selId={sel} edit={!prev} onSelect={setSel} onNav={(id) => { setPg(id); setSel(null); }} />
        </div></div>
        <aside className="overflow-auto border-l p-3" style={{ borderColor: "var(--ln)", background: "var(--pn)" }}>
          <h4>Layers</h4>
          {cur?.sections.map((x) => <button key={x.id} className={`b mb-1 w-full text-left ${x.id === sel ? "on" : ""}`} onClick={() => setSel(x.id)}>{x.ty}{x.st.hid ? " (hidden)" : ""}</button>)}
          <select className="in mt-2" value="" onChange={(e) => e.target.value && patch([{ op: "addSection", pageId: cur!.id, ty: e.target.value as never, afterId: sel ?? undefined }])}>
            <option value="">Add section…</option>{["hero", "features", "testimonials", "pricing", "cta"].map((t) => <option key={t}>{t}</option>)}
          </select>
          {s && <>
            <h4>{s.ty}</h4>
            <div className="flex flex-wrap gap-1">
              <button className="b" onClick={() => patch([{ op: "moveSection", id: s.id, dir: "up" }])}>↑</button><button className="b" onClick={() => patch([{ op: "moveSection", id: s.id, dir: "down" }])}>↓</button>
              <button className="b" onClick={() => patch([{ op: "duplicateSection", id: s.id }])}>Duplicate</button><button className="b" onClick={() => { patch([{ op: "removeSection", id: s.id }]); setSel(null); }}>Delete</button>
              <button className="b" onClick={() => patch([{ op: "setStyle", id: s.id, key: "hid", value: !s.st.hid }])}>{s.st.hid ? "Show" : "Hide"}</button>
            </div>
            {Object.entries(s.p).map(([k, v]) => k === "items" ? <div key={k}><label>items (a|b per line)</label><textarea className="in" rows={5} value={v} onChange={(e) => patch([{ op: "setProp", id: s.id, key: k, value: e.target.value }])} /></div> : <div key={k}>{Inp(k, k, v)}</div>)}
            <label>Background</label><input type="color" className="w-full" value={s.st.bg ?? T.bg} onChange={(e) => patch([{ op: "setStyle", id: s.id, key: "bg", value: e.target.value }])} />
            <label>Text colour</label><input type="color" className="w-full" value={s.st.fg ?? T.fg} onChange={(e) => patch([{ op: "setStyle", id: s.id, key: "fg", value: e.target.value }])} />
            <label>Heading size</label><input type="range" className="w-full" min={20} max={120} value={s.st.hs ?? T.hs} onChange={(e) => patch([{ op: "setStyle", id: s.id, key: "hs", value: +e.target.value }])} />
            <label>Padding</label><input type="range" className="w-full" min={8} max={200} value={s.st.pd ?? 72} onChange={(e) => patch([{ op: "setStyle", id: s.id, key: "pd", value: +e.target.value }])} />
          </>}
          <h4>Design tokens</h4>
          <label>Accent</label><input type="color" className="w-full" value={T.ac} onChange={(e) => patch([{ op: "setToken", key: "ac", value: e.target.value }])} />
          <label>Page background</label><input type="color" className="w-full" value={T.bg} onChange={(e) => patch([{ op: "setToken", key: "bg", value: e.target.value }])} />
          <label>Page text</label><input type="color" className="w-full" value={T.fg} onChange={(e) => patch([{ op: "setToken", key: "fg", value: e.target.value }])} />
          <label>Radius</label><input type="range" className="w-full" min={0} max={32} value={T.r} onChange={(e) => patch([{ op: "setToken", key: "r", value: +e.target.value }])} />
          <label>Font</label><select className="in" value={T.font} onChange={(e) => patch([{ op: "setToken", key: "font", value: e.target.value }])}>{FONT_VALUES.map((f) => <option key={f} value={f}>{f.split(",")[0].replace(/"/g, "")}</option>)}</select>
          <label>Scroll motion (Preview)</label><select className="in" value={T.mo} onChange={(e) => patch([{ op: "setToken", key: "mo", value: e.target.value }])}>{["none", "up", "fade", "clip", "scale"].map((m) => <option key={m}>{m}</option>)}</select>
        </aside>
      </div>
    </div>
  );
}
