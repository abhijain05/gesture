import { useState, useEffect, useRef, useCallback } from "react";
import { GestureUI5Auto } from "@workspace/gesture-ui5";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWakeWord } from "@/hooks/useWakeWord";
import Overview from "@/pages/Overview";
import SalesOrders from "@/pages/SalesOrders";
import Products from "@/pages/Products";
import Reports from "@/pages/Reports";
import IntegrationGuide from "@/pages/IntegrationGuide";

type Page = "overview" | "orders" | "products" | "reports" | "integration";

const NAV_ITEMS: { id: Page; label: string; shortLabel: string; icon: string }[] = [
  { id: "overview",    label: "Overview",         shortLabel: "Home",     icon: "🏠" },
  { id: "orders",      label: "Sales Orders",      shortLabel: "Orders",   icon: "📋" },
  { id: "products",    label: "Products",          shortLabel: "Products", icon: "📦" },
  { id: "reports",     label: "Reports",           shortLabel: "Reports",  icon: "📊" },
  { id: "integration", label: "Integration Guide", shortLabel: "Guide",    icon: "🤚" },
];

const GESTURE_LABEL: Record<string, string> = {
  POINT_FINGER: "☝️ Pointing",
  PINCH:        "🤏 Pinch",
  OPEN_PALM:    "🖐 Palm",
  TWO_FINGER:   "✌️ Scroll",
  NONE:         "No gesture",
};

const ID_ALIAS: Record<string, Page> = {
  "sales-orders":      "orders",
  "salesorders":       "orders",
  "sales-order":       "orders",
  "salesorder":        "orders",
  "orders":            "orders",
  "order":             "orders",
  "integration-guide": "integration",
  "integrationguide":  "integration",
  "integration":       "integration",
  "overview":          "overview",
  "home":              "overview",
  "main":              "overview",
  "products":          "products",
  "product":           "products",
  "reports":           "reports",
  "report":            "reports",
  "report-tab":        "reports",
  "reporting":         "reports",
};

function resolvePage(raw: string): Page | null {
  const key = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
  if (ID_ALIAS[key]) return ID_ALIAS[key];
  const stripped = key.replace(/-/g, "");
  for (const [alias, p] of Object.entries(ID_ALIAS)) {
    const a = alias.replace(/-/g, "");
    if (a === stripped || a.startsWith(stripped) || stripped.startsWith(a)) return p;
  }
  return null;
}

export default function App() {
  const [page, setPage]           = useState<Page>("overview");
  const [status, setStatus]       = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [gesture, setGesture]     = useState("NONE");
  const [fps, setFps]             = useState(0);
  const [mobileNavOpen, setMobileNavOpen]     = useState(false);
  const [wakeSettingsOpen, setWakeSettingsOpen] = useState(false);
  const [newWord, setNewWord]     = useState("");

  const autoRef  = useRef<GestureUI5Auto | null>(null);
  const isMobile = useIsMobile();
  const isInIframe = window !== window.top;

  // ── Wake word (no-Gemini navigation) ────────────────────────────────
  const handleVoiceCommand = useCallback((transcript: string) => {
    const resolved = resolvePage(transcript);
    if (resolved) setPage(resolved);
  }, []);

  const {
    words, state: wakeState, lastHeard, supported: wakeSupported,
    start: startWake, stop: stopWake, addWord, removeWord,
  } = useWakeWord(handleVoiceCommand);

  // ── Gesture engine ────────────────────────────────────────────────────
  // start() is called only after the gesture engine fires "ready",
  // so the wake word never races with MediaPipe camera acquisition.
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    const auto = new GestureUI5Auto({
      geminiKey: apiKey || undefined,
      onVoiceNavigate: (pageId) => {
        const r = resolvePage(pageId);
        if (r) setTimeout(() => setPage(r), 100);
        return false;
      },
    });
    autoRef.current = auto;

    const eng = auto.getEngine();
    eng.on("ready", () => {
      setStatus("ready");
      startWake(); // camera is up — now safe to start mic
    });
    eng.on("error",  () => setStatus("error"));
    eng.on("change", (e) => setGesture(e.detail.gesture));
    eng.on("cursor", (e) => setFps((e.detail as any).fps ?? 0));

    setStatus("loading");
    auto.init().catch(() => setStatus("error"));

    const onPalm    = () => setPage("overview");
    const onVoiceNav = (e: Event) => {
      const id = (e as CustomEvent<{ page?: string }>).detail?.page ?? "";
      const r  = resolvePage(id);
      if (r) setPage(r);
    };
    document.addEventListener("gesture:palm",           onPalm);
    document.addEventListener("gesture:voice:navigate", onVoiceNav);

    return () => {
      stopWake();
      auto.destroy();
      autoRef.current = null;
      document.removeEventListener("gesture:palm",           onPalm);
      document.removeEventListener("gesture:voice:navigate", onVoiceNav);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = status === "ready";
  const hasVoice = !!(import.meta.env.VITE_GEMINI_API_KEY);

  const navigate = (p: Page) => { setPage(p); setMobileNavOpen(false); };

  // ── Wake word UI helpers ─────────────────────────────────────────────
  const wakeLabel: Record<typeof wakeState, string> = {
    inactive:          "Wake word off",
    "listening-wake":    `Say "${words[0] ?? "tarang"}"`,
    "listening-command": "Listening…",
    processing:        "Processing…",
  };
  const wakeColor: Record<typeof wakeState, string> = {
    inactive:          "#666",
    "listening-wake":    "#4caf50",
    "listening-command": "#0070f2",
    processing:        "#ff9800",
  };
  const isListeningCmd = wakeState === "listening-command";
  const isProcessing   = wakeState === "processing";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", fontFamily: '"72","72full",Arial,Helvetica,sans-serif', overflow: "hidden" }}>

      {/* ── Iframe warning ─────────────────────────────────────────── */}
      {isInIframe && wakeSupported && (
        <div style={{ background: "#fff3cd", borderBottom: "1px solid #ffc107", padding: "7px 20px", fontSize: 12, color: "#856404", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span>⚠️ <b>Wake word needs a standalone tab</b> — Chrome blocks speech recognition in iframes.</span>
          <a href={window.location.href} target="_blank" rel="noopener noreferrer"
            style={{ background: "#ffc107", color: "#000", borderRadius: 6, padding: "3px 10px", fontWeight: 700, fontSize: 11, textDecoration: "none", flexShrink: 0 }}>
            Open in new tab ↗
          </a>
        </div>
      )}

      {/* ── Listening overlay ──────────────────────────────────────── */}
      {(isListeningCmd || isProcessing) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "32px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 48 }}>{isListeningCmd ? "🎤" : "⚙️"}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1d2d3e" }}>{isListeningCmd ? "Listening…" : "Processing…"}</div>
            <div style={{ fontSize: 14, color: "#6a6d70", textAlign: "center" }}>
              {isListeningCmd ? 'Say a page name — e.g. "Overview", "Reports"' : "Interpreting your command"}
            </div>
            {isListeningCmd && (
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 32 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: 6, background: "#0070f2", borderRadius: 3, animation: `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`, minHeight: 8 }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Wake word settings modal ───────────────────────────────── */}
      {wakeSettingsOpen && (
        <div onClick={() => setWakeSettingsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "28px 32px", width: 380, maxWidth: "90vw", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#1d2d3e" }}>🎤 Wake Words</span>
              <button onClick={() => setWakeSettingsOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: "#6a6d70", margin: "0 0 16px" }}>
              Say any of these words to start voice navigation — no button needed.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {words.map(w => (
                <div key={w} style={{ display: "flex", alignItems: "center", gap: 6, background: "#e8f0fe", borderRadius: 20, padding: "5px 12px 5px 14px", fontSize: 13, color: "#0070f2", fontWeight: 600 }}>
                  {w}
                  <button onClick={() => removeWord(w)} style={{ background: "rgba(0,112,242,0.15)", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, color: "#0070f2", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newWord} onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newWord.trim()) { addWord(newWord); setNewWord(""); } }}
                placeholder="Add wake word…"
                style={{ flex: 1, border: "1.5px solid #d0d7e3", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", color: "#1d2d3e" }} />
              <button onClick={() => { if (newWord.trim()) { addWord(newWord); setNewWord(""); } }}
                style={{ background: "#0070f2", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>
            {lastHeard && <p style={{ marginTop: 12, fontSize: 12, color: "#6a6d70" }}>Last heard: <i>"{lastHeard}"</i></p>}
            {!wakeSupported && <p style={{ fontSize: 12, color: "#e9730c", marginTop: 14 }}>⚠️ Speech recognition not supported. Use Chrome or Edge.</p>}
          </div>
        </div>
      )}

      {/* ── SAP Shell Header ─────────────────────────────────────── */}
      <header style={{ height: isMobile ? 52 : 48, background: "#1d2d3e", color: "#fff", display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 20px", flexShrink: 0, gap: isMobile ? 8 : 12, zIndex: 200, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        {isMobile && (
          <button onClick={() => setMobileNavOpen(o => !o)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1, borderRadius: 4 }} aria-label="Menu">☰</button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: "#0070f2", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, letterSpacing: "-0.5px", flexShrink: 0 }}>SAP</div>
          {!isMobile && <span style={{ fontWeight: 700, fontSize: 15 }}>Fiori Launchpad</span>}
          {isMobile  && <span style={{ fontWeight: 700, fontSize: 14 }}>Fiori</span>}
        </div>
        <div style={{ flex: 1 }} />

        {/* Gesture status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: isActive ? "rgba(16,126,62,.25)" : status === "loading" ? "rgba(233,115,12,.25)" : "rgba(255,255,255,.1)", border: `1px solid ${isActive ? "#107e3e" : status === "loading" ? "#e9730c" : "#444"}`, borderRadius: 14, padding: isMobile ? "3px 8px" : "3px 12px", fontSize: isMobile ? 11 : 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "#4caf50" : status === "loading" ? "#ff9800" : "#666", animation: status === "loading" ? "pulse 1s ease-in-out infinite" : undefined, flexShrink: 0 }} />
          {!isMobile && <span style={{ color: isActive ? "#a5d6a7" : status === "loading" ? "#ffcc80" : "#aaa" }}>{status === "loading" ? "Loading…" : isActive ? "Gesture Active" : "Gesture Off"}</span>}
        </div>

        {isActive && gesture !== "NONE" && !isMobile && (
          <div style={{ background: "rgba(0,112,242,.3)", border: "1px solid #0070f2", borderRadius: 14, padding: "3px 12px", fontSize: 12, color: "#90caf9" }}>{GESTURE_LABEL[gesture] ?? gesture}</div>
        )}

        {/* Wake word badge */}
        {wakeSupported && (
          <button onClick={() => setWakeSettingsOpen(true)} title={`Wake words: ${words.join(", ")} — click to manage`}
            style={{ display: "flex", alignItems: "center", gap: 5, background: wakeState !== "inactive" ? "rgba(0,112,242,.2)" : "rgba(255,255,255,.07)", border: `1px solid ${wakeColor[wakeState]}`, borderRadius: 14, padding: isMobile ? "3px 8px" : "3px 12px", fontSize: isMobile ? 11 : 12, cursor: "pointer", color: "#fff", transition: "all .2s" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: wakeColor[wakeState], animation: wakeState === "listening-wake" ? "pulse 2s ease-in-out infinite" : wakeState === "listening-command" ? "pulse 0.5s ease-in-out infinite" : undefined, flexShrink: 0 }} />
            {!isMobile && <span style={{ color: wakeColor[wakeState] }}>{wakeLabel[wakeState]}</span>}
            <span style={{ fontSize: 10, opacity: 0.6 }}>⚙️</span>
          </button>
        )}

        {hasVoice && !isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, padding: "3px 10px", fontSize: 11, color: "#aaa" }}>
            🎤 <span>Press <kbd style={{ background: "rgba(255,255,255,.12)", borderRadius: 3, padding: "1px 4px", fontSize: 10 }}>`</kbd> for AI voice</span>
          </div>
        )}
        {hasVoice && isMobile && <div style={{ fontSize: 18, cursor: "pointer", opacity: 0.8 }}>🎤</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0070f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>JD</div>
          {!isMobile && <span style={{ fontSize: 13 }}>John Doe</span>}
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      {isMobile && mobileNavOpen && (
        <>
          <div onClick={() => setMobileNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 299 }} />
          <nav style={{ position: "fixed", top: 52, left: 0, bottom: 0, width: 260, background: "#fff", zIndex: 300, boxShadow: "4px 0 24px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", animation: "slideIn .2s ease" }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#6a6d70", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>Applications</div>
            {NAV_ITEMS.map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} data-gesture-nav={item.label} onClick={() => navigate(item.id)}
                  style={{ width: "100%", textAlign: "left", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, background: active ? "#e8f0fe" : "transparent", border: "none", borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: active ? "#0070f2" : "transparent", cursor: "pointer", fontSize: 15, color: active ? "#0070f2" : "#1d2d3e", fontWeight: active ? 700 : 400 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>{item.label}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            {isActive && <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa", fontSize: 12, color: "#6a6d70" }}>🤚 {gesture === "NONE" ? "—" : gesture.replace(/_/g, " ")} · {fps} FPS</div>}
          </nav>
        </>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Desktop Nav ─────────────────────────────────────────── */}
        {!isMobile && (
          <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #d9d9d9", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#6a6d70", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>Applications</div>
            {NAV_ITEMS.map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} data-gesture-nav={item.label} onClick={() => navigate(item.id)}
                  style={{ width: "100%", textAlign: "left", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, background: active ? "#e8f0fe" : "transparent", border: "none", borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: active ? "#0070f2" : "transparent", cursor: "pointer", fontSize: 14, color: active ? "#0070f2" : "#1d2d3e", fontWeight: active ? 700 : 400, transition: "all .12s" }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>{item.label}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6a6d70", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gesture Engine</div>
              <StatusRow label="Status" value={isActive ? "Ready" : status === "loading" ? "Loading…" : "Off"} valueColor={isActive ? "#107e3e" : "#6a6d70"} />
              {isActive && <>
                <StatusRow label="Gesture" value={gesture === "NONE" ? "—" : gesture.replace(/_/g, " ")} />
                <StatusRow label="FPS"     value={String(fps)} />
              </>}
              {wakeSupported && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6a6d70", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Wake Words</div>
                  <StatusRow label="Status" value={wakeState === "listening-wake" ? "Listening" : wakeState === "listening-command" ? "Activated!" : wakeState === "processing" ? "Processing" : "Off"} valueColor={wakeColor[wakeState]} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {words.map(w => <span key={w} style={{ background: "#e8f0fe", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "#0070f2", fontWeight: 600 }}>{w}</span>)}
                  </div>
                  {lastHeard && <div style={{ marginTop: 5, fontSize: 11, color: "#1d2d3e", background: "#f5f6f7", borderRadius: 6, padding: "3px 7px" }}>🎤 <i>"{lastHeard}"</i></div>}
                  <button onClick={() => setWakeSettingsOpen(true)} style={{ marginTop: 6, fontSize: 11, color: "#0070f2", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>+ Add / edit words</button>
                </div>
              )}
              {hasVoice && <div style={{ fontSize: 11, color: "#888", borderTop: "1px solid #eee", paddingTop: 6, marginTop: 4, display: "flex", gap: 5, alignItems: "center" }}>🎤 <span>Press <b>`</b> or click mic</span></div>}
            </div>
          </nav>
        )}

        {/* ── Main Content ─────────────────────────────────────────── */}
        <main style={{ flex: 1, background: "#f5f6f7", overflowY: "auto", overflowX: "hidden" }} className="scrollbar-thin">
          {!isMobile && (
            <div style={{ padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e8e8e8", fontSize: 12, color: "#6a6d70", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Fiori Launchpad</span><span>›</span>
              <span style={{ color: "#0070f2", fontWeight: 600 }}>{NAV_ITEMS.find(n => n.id === page)?.label}</span>
            </div>
          )}
          {page === "overview"    && <Overview />}
          {page === "orders"      && <SalesOrders />}
          {page === "products"    && <Products />}
          {page === "reports"     && <Reports />}
          {page === "integration" && <IntegrationGuide />}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      {isMobile && (
        <nav style={{ display: "flex", height: 60, background: "#fff", borderTop: "1px solid #d9d9d9", flexShrink: 0, zIndex: 100, boxShadow: "0 -2px 8px rgba(0,0,0,0.08)" }}>
          {NAV_ITEMS.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} data-gesture-nav={item.label} onClick={() => navigate(item.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "transparent", border: "none", borderTop: active ? "2px solid #0070f2" : "2px solid transparent", cursor: "pointer", color: active ? "#0070f2" : "#6a6d70", padding: "4px 0", transition: "color .12s" }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      <style>{`
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideIn  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes waveBar  { from{height:8px} to{height:28px} }
      `}</style>
    </div>
  );
}

function StatusRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ fontSize: 12, color: "#1d2d3e", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}
