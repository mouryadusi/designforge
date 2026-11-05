"use client";

import { useEffect, useState } from "react";
import { Renderer } from "@/components/Renderer";
import { applyPatch, type Op } from "@/lib/patch";
import { FONT_VALUES, type Project } from "@/lib/spec";

type Mode = "local" | "gemini" | "groq";

const VW = {
  d: "1040px",
  t: "768px",
  m: "390px",
} as const;

const SUGGEST = [
  "A premium restaurant site called Ember with reservations and reviews",
  "Modern SaaS analytics dashboard for startups",
  "Brutalist architecture studio portfolio",
  "Playful learning platform for students",
];

type StatusResponse = {
  gemini?: boolean;
  groq?: boolean;
};

async function call(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const error = (await r.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error.error ?? r.statusText);
  }

  return r;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("local");

  const [gem, setGem] = useState(false);
  const [groq, setGroq] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [vars, setVars] = useState<Project[]>([]);

  const [P, setP] = useState<Project | null>(null);
  const [hist, setHist] = useState<Project[]>([]);
  const [fut, setFut] = useState<Project[]>([]);

  const [pg, setPg] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const [vp, setVp] = useState<keyof typeof VW>("d");
  const [prev, setPrev] = useState(false);

  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [chat, setChat] = useState("");

  const [dbId, setDbId] = useState<string | undefined>();

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch("/api/status");
        if (!response.ok) throw new Error("Status unavailable");

        const data = (await response.json()) as StatusResponse;

        if (active) {
          setGem(Boolean(data.gemini));
          setGroq(Boolean(data.groq));
        }
      } catch {
        if (active) {
          setGem(false);
          setGroq(false);
        }
      } finally {
        if (active) setStatusLoaded(true);
      }

      try {
        const saved = localStorage.getItem("df:last");

        if (saved && active) {
          const project = JSON.parse(saved) as Project;

          if (project.pages?.length) {
            setP(project);
            setPg(project.pages[0].id);
          }
        }
      } catch (error) {
        console.error("Could not restore project:", error);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const say = (message: string) => {
    setLog((previous) => [
      ...previous.slice(-30),
      message,
    ]);
  };

  const providerName = (provider: Mode) => {
    switch (provider) {
      case "gemini":
        return "Gemini";
      case "groq":
        return "Groq";
      default:
        return "Local";
    }
  };

  const isConfigured = (provider: Mode) => {
    if (provider === "gemini") return gem;
    if (provider === "groq") return groq;
    return true;
  };

  const changeMode = (provider: Mode) => {
    if (!isConfigured(provider)) {
      say(`${providerName(provider)} is not configured.`);
      return;
    }

    setMode(provider);
    say(`AI provider changed to ${providerName(provider)}.`);
  };

  const persist = (project: Project, label?: string) => {
    try {
      localStorage.setItem("df:last", JSON.stringify(project));
    } catch {
      say("Could not save project locally.");
    }

    call("/api/projects", {
      id: dbId,
      spec: project,
      label,
    })
      .then((r) => r.json())
      .then((j: { id: string }) => setDbId(j.id))
      .catch(() => {});
  };

  const commit = (project: Project, label?: string) => {
    if (P) {
      setHist((previous) => [
        ...previous.slice(-49),
        P,
      ]);
      setFut([]);
    }

    setP(project);
    persist(project, label);
  };

  const patch = (ops: Op[], label?: string) => {
    if (!P) return;

    try {
      commit(applyPatch(P, ops), label);
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    }
  };

  async function generate() {
    if (busy || prompt.trim().length < 5) return;

    if (!isConfigured(mode)) {
      say(`${providerName(mode)} is not configured.`);
      return;
    }

    setBusy(true);
    setVars([]);

    try {
      const response = await call("/api/generate", {
        prompt: prompt.trim(),
        mode,
      });

      const result = (await response.json()) as {
        projects: Project[];
      };

      if (!result.projects?.length) {
        throw new Error("No projects were generated.");
      }

      setVars(result.projects);
      say(
        `Generated ${result.projects.length} directions using ${providerName(mode)}.`
      );
    } catch (error) {
      say(
        `Generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  async function edit() {
    if (!P || !chat.trim() || busy) return;

    if (!isConfigured(mode)) {
      say(`${providerName(mode)} is not configured.`);
      return;
    }

    setBusy(true);
    const instruction = chat.trim();

    try {
      const response = await call("/api/edit", {
        project: P,
        instruction,
        pageId: pg,
        selId: sel ?? undefined,
        mode,
      });

      const result = (await response.json()) as {
        project: Project;
        summary: string;
      };

      if (!result.project) {
        throw new Error("The AI did not return a project.");
      }

      commit(result.project, `Chat: ${instruction.slice(0, 40)}`);

      say(`You: ${instruction}`);
      say(result.summary || "Changes applied successfully.");

      setChat("");
    } catch (error) {
      say(
        `Edit failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportAs(
    fmt: "html" | "json" | "tokens" | "nextjs"
  ) {
    if (!P) return;

    try {
      const response = await call("/api/export", {
        project: P,
        fmt,
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      a.download = {
        html: "site.html",
        json: "design-spec.json",
        tokens: "tokens.json",
        nextjs: "nextjs-site.zip",
      }[fmt];

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      say(`${fmt.toUpperCase()} export completed.`);
    } catch (error) {
      say(
        `Export failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const open = (project: Project) => {
    setP(project);
    setPg(project.pages[0].id);
    setSel(null);
    setHist([]);
    setFut([]);

    persist(project, `Generated: ${project.vn}`);
  };

  const cur =
    P?.pages.find((page) => page.id === pg) ??
    P?.pages[0];

  const s = cur?.sections.find(
    (section) => section.id === sel
  );
  const ProviderButtons = () => (
    <>
      <button
        type="button"
        className={`b ${mode === "local" ? "on" : ""}`}
        onClick={() => changeMode("local")}
      >
        Local
      </button>

      <button
        type="button"
        className={`b ${mode === "gemini" ? "on" : ""}`}
        disabled={!statusLoaded || !gem}
        title={gem ? "Use Gemini" : "Configure GEMINI_API_KEY"}
        onClick={() => changeMode("gemini")}
      >
        Gemini
        {!statusLoaded ? " ..." : !gem ? " (not configured)" : ""}
      </button>

      <button
        type="button"
        className={`b ${mode === "groq" ? "on" : ""}`}
        disabled={!statusLoaded || !groq}
        title={groq ? "Use Groq AI" : "Configure GROQ_API_KEY"}
        onClick={() => changeMode("groq")}
      >
        Groq
        {!statusLoaded ? " ..." : !groq ? " (not configured)" : ""}
      </button>
    </>
  );

  if (!P) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
          {providerName(mode)} mode
        </span>

        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          From imagination to interface.
        </h1>

        <p className="mt-3 text-sm" style={{ color: "var(--mu)" }}>
          Create beautiful websites using your preferred AI engine.
        </p>

        <div className="my-4 flex flex-wrap gap-2">
          <ProviderButtons />
        </div>

        <textarea
          className="in"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the website or app you want..."
          disabled={busy}
        />

        <div className="my-3 flex flex-wrap gap-2">
          {SUGGEST.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              className="b text-xs"
              onClick={() => setPrompt(suggestion)}
              disabled={busy}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="b pr"
          disabled={busy || prompt.trim().length < 5}
          onClick={generate}
        >
          {busy
            ? "Generating..."
            : `Generate three directions with ${providerName(mode)}`}
        </button>

        <p className="mt-3 text-sm" style={{ color: "var(--mu)" }}>
          {log.at(-1)}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {vars.map((v) => (
            <div
              key={v.vn}
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: "var(--ln)",
                background: "var(--pn)",
              }}
            >
              <div
                style={{
                  height: 300,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 1040,
                    transform: "scale(.3)",
                    transformOrigin: "0 0",
                  }}
                >
                  <Renderer
                    project={v}
                    pageId={v.pages[0].id}
                    edit
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3">
                <b>{v.vn}</b>
                <button
                  type="button"
                  className="b pr"
                  onClick={() => open(v)}
                >
                  Choose
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const T = P.tokens;

  const Inp = (label: string, key: string, val: string) => (
    <>
      <label>{label}</label>
      <input
        className="in"
        value={val}
        onChange={(e) => {
          if (!sel) return;

          patch([
            {
              op: "setProp",
              id: sel,
              key,
              value: e.target.value,
            },
          ]);
        }}
      />
    </>
  );

  return (
    <div className="flex h-screen flex-col">
      <header
        className="flex items-center gap-2 overflow-x-auto border-b px-3 py-2"
        style={{
          borderColor: "var(--ln)",
          background: "var(--pn)",
        }}
      >
        <button
          type="button"
          className="b"
          onClick={() => {
            setP(null);
            setVars([]);
            setSel(null);
          }}
        >
          ←
        </button>

        <b>{P.brand}</b>

        <span className="rounded-full bg-amber-400 px-2 text-xs font-semibold text-black">
          {providerName(mode)}
        </span>

        {P.pages.map((page) => (
          <button
            type="button"
            key={page.id}
            className={`b ${page.id === cur?.id ? "on" : ""}`}
            onClick={() => {
              setPg(page.id);
              setSel(null);
            }}
          >
            {page.name}
          </button>
        ))}

        <span className="flex-1" />

        {(["d", "t", "m"] as const).map((key) => (
          <button
            type="button"
            key={key}
            className={`b ${vp === key ? "on" : ""}`}
            onClick={() => setVp(key)}
          >
            {{
              d: "Desktop",
              t: "Tablet",
              m: "Mobile",
            }[key]}
          </button>
        ))}

        <button
          type="button"
          className="b"
          disabled={!hist.length}
          onClick={() => {
            const previous = hist[hist.length - 1];

            setFut((f) => [P, ...f]);
            setP(previous);
            setHist((h) => h.slice(0, -1));
            persist(previous);
          }}
        >
          Undo
        </button>

        <button
          type="button"
          className="b"
          disabled={!fut.length}
          onClick={() => {
            const next = fut[0];

            setHist((h) => [...h, P]);
            setP(next);
            setFut((f) => f.slice(1));
            persist(next);
          }}
        >
          Redo
        </button>

        <button
          type="button"
          className={`b ${prev ? "on" : ""}`}
          onClick={() => setPrev(!prev)}
        >
          Preview
        </button>

        {(["html", "nextjs", "json", "tokens"] as const).map((fmt) => (
          <button
            type="button"
            key={fmt}
            className="b"
            onClick={() => exportAs(fmt)}
          >
            {{
              html: "HTML",
              nextjs: "Next.js ZIP",
              json: "Spec",
              tokens: "Tokens",
            }[fmt]}
          </button>
        ))}
      </header>
            <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_280px] max-md:grid-cols-1">
        {/* LEFT SIDEBAR */}
        <aside
          className="overflow-auto border-r p-3"
          style={{
            borderColor: "var(--ln)",
            background: "var(--pn)",
          }}
        >
          <h4>AI Agent</h4>

          <div className="my-2 flex flex-wrap gap-2">
            <ProviderButtons />
          </div>

          <p className="my-2 text-xs" style={{ color: "var(--mu)" }}>
            Active AI: {providerName(mode)}
          </p>

          <div
            style={{
              maxHeight: "40vh",
              overflow: "auto",
            }}
          >
            {log.map((message, index) => (
              <p
                key={index}
                className="my-1 rounded-lg p-2"
                style={{ background: "var(--bg)" }}
              >
                {message}
              </p>
            ))}
          </div>

          <input
            className="in mt-2"
            value={chat}
            placeholder="e.g. make hero navy, add pricing"
            onChange={(e) => setChat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") edit();
            }}
            disabled={busy}
          />

          <button
            type="button"
            className="b pr mt-2 w-full"
            disabled={busy || !chat.trim()}
            onClick={edit}
          >
            {busy
              ? "AI is working..."
              : `Apply changes with ${providerName(mode)}`}
          </button>
        </aside>

        {/* CENTER PREVIEW */}
        <div className="overflow-auto p-6">
          <div
            className="mx-auto overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
            style={{
              width: VW[vp],
              maxWidth: "100%",
            }}
          >
            {cur && (
              <Renderer
                project={P}
                pageId={cur.id}
                selId={sel}
                edit={!prev}
                onSelect={setSel}
                onNav={(id) => {
                  setPg(id);
                  setSel(null);
                }}
              />
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside
          className="overflow-auto border-l p-3"
          style={{
            borderColor: "var(--ln)",
            background: "var(--pn)",
          }}
        >
          <h4>Layers</h4>

          {cur?.sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={`b mb-1 w-full text-left ${
                section.id === sel ? "on" : ""
              }`}
              onClick={() => setSel(section.id)}
            >
              {section.ty}
              {section.st.hid ? " (hidden)" : ""}
            </button>
          ))}

          <select
            className="in mt-2"
            value=""
            onChange={(e) => {
              if (!e.target.value || !cur) return;

              patch([
                {
                  op: "addSection",
                  pageId: cur.id,
                  ty: e.target.value as never,
                  afterId: sel ?? undefined,
                },
              ]);
            }}
          >
            <option value="">Add section...</option>

            {[
              "hero",
              "features",
              "testimonials",
              "pricing",
              "cta",
            ].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {s && (
            <>
              <h4>{s.ty}</h4>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="b"
                  onClick={() =>
                    patch([
                      {
                        op: "moveSection",
                        id: s.id,
                        dir: "up",
                      },
                    ])
                  }
                >
                  ↑
                </button>

                <button
                  type="button"
                  className="b"
                  onClick={() =>
                    patch([
                      {
                        op: "moveSection",
                        id: s.id,
                        dir: "down",
                      },
                    ])
                  }
                >
                  ↓
                </button>

                <button
                  type="button"
                  className="b"
                  onClick={() =>
                    patch([
                      {
                        op: "duplicateSection",
                        id: s.id,
                      },
                    ])
                  }
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  className="b"
                  onClick={() => {
                    patch([
                      {
                        op: "removeSection",
                        id: s.id,
                      },
                    ]);
                    setSel(null);
                  }}
                >
                  Delete
                </button>

                <button
                  type="button"
                  className="b"
                  onClick={() =>
                    patch([
                      {
                        op: "setStyle",
                        id: s.id,
                        key: "hid",
                        value: !s.st.hid,
                      },
                    ])
                  }
                >
                  {s.st.hid ? "Show" : "Hide"}
                </button>
              </div>

              {Object.entries(s.p).map(([key, value]) =>
                key === "items" ? (
                  <div key={key}>
                    <label>Items (a|b per line)</label>
                    <textarea
                      className="in"
                      rows={5}
                      value={value}
                      onChange={(e) =>
                        patch([
                          {
                            op: "setProp",
                            id: s.id,
                            key,
                            value: e.target.value,
                          },
                        ])
                      }
                    />
                  </div>
                ) : (
                  <div key={key}>
                    {Inp(key, key, value)}
                  </div>
                )
              )}

              <label>Background</label>
              <input
                type="color"
                className="w-full"
                value={s.st.bg ?? T.bg}
                onChange={(e) =>
                  patch([
                    {
                      op: "setStyle",
                      id: s.id,
                      key: "bg",
                      value: e.target.value,
                    },
                  ])
                }
              />

              <label>Text colour</label>
              <input
                type="color"
                className="w-full"
                value={s.st.fg ?? T.fg}
                onChange={(e) =>
                  patch([
                    {
                      op: "setStyle",
                      id: s.id,
                      key: "fg",
                      value: e.target.value,
                    },
                  ])
                }
              />

              <label>Heading size</label>
              <input
                type="range"
                className="w-full"
                min={20}
                max={120}
                value={s.st.hs ?? T.hs}
                onChange={(e) =>
                  patch([
                    {
                      op: "setStyle",
                      id: s.id,
                      key: "hs",
                      value: Number(e.target.value),
                    },
                  ])
                }
              />

              <label>Padding</label>
              <input
                type="range"
                className="w-full"
                min={8}
                max={200}
                value={s.st.pd ?? 72}
                onChange={(e) =>
                  patch([
                    {
                      op: "setStyle",
                      id: s.id,
                      key: "pd",
                      value: Number(e.target.value),
                    },
                  ])
                }
              />
            </>
          )}

          {/* DESIGN TOKENS */}
          <h4>Design tokens</h4>

          <label>Accent</label>
          <input
            type="color"
            className="w-full"
            value={T.ac}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "ac",
                  value: e.target.value,
                },
              ])
            }
          />

          <label>Page background</label>
          <input
            type="color"
            className="w-full"
            value={T.bg}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "bg",
                  value: e.target.value,
                },
              ])
            }
          />

          <label>Page text</label>
          <input
            type="color"
            className="w-full"
            value={T.fg}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "fg",
                  value: e.target.value,
                },
              ])
            }
          />

          <label>Radius</label>
          <input
            type="range"
            className="w-full"
            min={0}
            max={32}
            value={T.r}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "r",
                  value: Number(e.target.value),
                },
              ])
            }
          />

          <label>Font</label>
          <select
            className="in"
            value={T.font}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "font",
                  value: e.target.value,
                },
              ])
            }
          >
            {FONT_VALUES.map((font) => (
              <option key={font} value={font}>
                {font.split(",")[0].replace(/"/g, "")}
              </option>
            ))}
          </select>

          <label>Scroll motion (Preview)</label>
          <select
            className="in"
            value={T.mo}
            onChange={(e) =>
              patch([
                {
                  op: "setToken",
                  key: "mo",
                  value: e.target.value,
                },
              ])
            }
          >
            {["none", "up", "fade", "clip", "scale"].map(
              (motion) => (
                <option key={motion} value={motion}>
                  {motion}
                </option>
              )
            )}
          </select>
        </aside>
      </div>
    </div>
  );
}

