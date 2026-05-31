import { useState, useEffect, useRef } from "react";
import { GestureUI5Auto } from "@workspace/gesture-ui5";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const keyStripped = key.replace(/-/g, "");
  for (const [alias, page] of Object.entries(ID_ALIAS)) {
    const aliasStripped = alias.replace(/-/g, "");
    if (aliasStripped === keyStripped) return page;
    if (aliasStripped.startsWith(keyStripped) || keyStripped.startsWith(aliasStripped)) return page;
  }
  return null;
}

export default function App() {
  const [page, setPage]         = useState<Page>("overview");
  const [status, setStatus]     = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [gesture, setGesture]   = useState<string>("NONE");
  const [fps, setFps]           = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const autoRef = useRef<GestureUI5Auto | null>(null);
  const pageRef = useRef<Page>(page);
  pageRef.current = page;
  const isMobile = useIsMobile();

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    const auto = new GestureUI5Auto({
      geminiKey: apiKey || undefined,
      onVoiceNavigate: (pageId, _pageName) => {
        const resolved = resolvePage(pageId);
        if (resolved) {
          setTimeout(() => setPage(resolved), 100);
        }
        return false;
      },
    });
    autoRef.current = auto;

    const eng = auto.getEngine();
    eng.on("ready",  () => setStatus("ready"));
    eng.on("error",  () => setStatus("error"));
    eng.on("change", (e) => setGesture(e.detail.gesture));
    eng.on("cursor", (e) => setFps((e.detail as any).fps ?? fps));

    setStatus("loading");
    auto.init().catch(() => setStatus("error"));

    const onPalm = () => setPage("overview");
    document.addEventListener("gesture:palm", onPalm);

    const onVoiceNav = (e: Event) => {
      const id = (e as CustomEvent<{ page?: string }>).detail?.page ?? "";
      const resolved = resolvePage(id);
      if (resolved) setPage(resolved);
    };
    document.addEventListener("gesture:voice:navigate", onVoiceNav);

    return () => {
      auto.destroy();
      autoRef.current = null;
      document.removeEventListener("gesture:palm", onPalm);
      document.removeEventListener("gesture:voice:navigate", onVoiceNav);
    };
  }, []);

  const isActive = status === "ready";
  const hasVoice = !!(import.meta.env.VITE_GEMINI_API_KEY);

  const navigate = (p: Page) => {
    setPage(p);
    setMobileNavOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", fontFamily: '"72", "72full", Arial, Helvetica, sans-serif', overflow: "hidden" }}>

      {/* ── SAP Shell Header ─────────────────────────────────────── */}
      <header style={{
        height: isMobile ? 52 : 48,
        background: "#1d2d3e",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 12px" : "0 20px",
        flexShrink: 0,
        gap: isMobile ? 8 : 12,
        zIndex: 200,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1, borderRadius: 4 }}
            aria-label="Menu"
          >
            ☰
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: "#0070f2", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, letterSpacing: "-0.5px", flexShrink: 0 }}>
            SAP
          </div>
          {!isMobile && <span style={{ fontWeight: 700, fontSize: 15 }}>Fiori Launchpad</span>}
          {isMobile && <span style={{ fontWeight: 700, fontSize: 14 }}>Fiori</span>}
        </div>

        <div style={{ flex: 1 }} />

        {/* Gesture status */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: isActive ? "rgba(16,126,62,.25)" : status === "loading" ? "rgba(233,115,12,.25)" : "rgba(255,255,255,.1)",
          border: `1px solid ${isActive ? "#107e3e" : status === "loading" ? "#e9730c" : "#444"}`,
          borderRadius: 14, padding: isMobile ? "3px 8px" : "3px 12px", fontSize: isMobile ? 11 : 12,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%",
            background: isActive ? "#4caf50" : status === "loading" ? "#ff9800" : "#666",
            animation: status === "loading" ? "pulse 1s ease-in-out infinite" : undefined,
            flexShrink: 0,
          }} />
          {!isMobile && (
            <span style={{ color: isActive ? "#a5d6a7" : status === "loading" ? "#ffcc80" : "#aaa" }}>
              {status === "loading" ? "Loading…" : isActive ? "Gesture Active" : "Gesture Off"}
            </span>
          )}
        </div>

        {isActive && gesture !== "NONE" && !isMobile && (
          <div style={{ background: "rgba(0,112,242,.3)", border: "1px solid #0070f2", borderRadius: 14, padding: "3px 12px", fontSize: 12, color: "#90caf9" }}>
            {GESTURE_LABEL[gesture] ?? gesture}
          </div>
        )}

        {hasVoice && !isMobile && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 14, padding: "3px 10px", fontSize: 11, color: "#aaa",
          }}>
            🎤 <span>Press <kbd style={{ background: "rgba(255,255,255,.12)", borderRadius: 3, padding: "1px 4px", fontSize: 10 }}>`</kbd> for voice</span>
          </div>
        )}

        {hasVoice && isMobile && (
          <button
            onClick={() => autoRef.current?.getVoice()?.toggle()}
            style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", opacity: 0.8, padding: "4px", lineHeight: 1 }}
            title="Voice command"
          >🎤</button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0070f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            JD
          </div>
          {!isMobile && <span style={{ fontSize: 13 }}>John Doe</span>}
        </div>
      </header>

      {/* ── Mobile slide-in drawer overlay ─────────────────────── */}
      {isMobile && mobileNavOpen && (
        <>
          <div
            onClick={() => setMobileNavOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 299 }}
          />
          <nav style={{
            position: "fixed", top: 52, left: 0, bottom: 0, width: 260,
            background: "#fff", zIndex: 300,
            boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column",
            animation: "slideIn .2s ease",
          }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#6a6d70", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>
              Applications
            </div>
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  data-gesture-nav={item.label}
                  onClick={() => navigate(item.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                    background: active ? "#e8f0fe" : "transparent",
                    border: "none",
                    borderLeftWidth: 3, borderLeftStyle: "solid",
                    borderLeftColor: active ? "#0070f2" : "transparent",
                    cursor: "pointer", fontSize: 15,
                    color: active ? "#0070f2" : "#1d2d3e",
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            {isActive && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa", fontSize: 12, color: "#6a6d70" }}>
                🤚 Gesture: {gesture === "NONE" ? "—" : gesture.replace(/_/g, " ")} · {fps} FPS
              </div>
            )}
          </nav>
        </>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Desktop Left Navigation ─────────────────────────────── */}
        {!isMobile && (
          <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #d9d9d9", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#6a6d70", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>
              Applications
            </div>
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  data-gesture-nav={item.label}
                  onClick={() => navigate(item.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "11px 16px",
                    display: "flex", alignItems: "center", gap: 10,
                    background: active ? "#e8f0fe" : "transparent",
                    border: "none",
                    borderLeftWidth: 3, borderLeftStyle: "solid",
                    borderLeftColor: active ? "#0070f2" : "transparent",
                    cursor: "pointer", fontSize: 14,
                    color: active ? "#0070f2" : "#1d2d3e",
                    fontWeight: active ? 700 : 400,
                    transition: "all .12s",
                  }}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6a6d70", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Gesture Engine
              </div>
              <StatusRow label="Status" value={isActive ? "Ready" : status === "loading" ? "Loading…" : "Off"} valueColor={isActive ? "#107e3e" : "#6a6d70"} />
              {isActive && <>
                <StatusRow label="Gesture" value={gesture === "NONE" ? "—" : gesture.replace(/_/g, " ")} />
                <StatusRow label="FPS" value={String(fps)} />
              </>}
              {hasVoice && (
                <div style={{ fontSize: 11, color: "#888", borderTop: "1px solid #eee", paddingTop: 6, marginTop: 4, display: "flex", gap: 5, alignItems: "center" }}>
                  🎤 <span>Press <b>`</b> or click mic</span>
                </div>
              )}
            </div>
          </nav>
        )}

        {/* ── Main Content ─────────────────────────────────────────── */}
        <main style={{ flex: 1, background: "#f5f6f7", overflowY: "auto", overflowX: "hidden" }} className="scrollbar-thin">
          {!isMobile && (
            <div style={{ padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e8e8e8", fontSize: 12, color: "#6a6d70", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Fiori Launchpad</span>
              <span>›</span>
              <span style={{ color: "#0070f2", fontWeight: 600 }}>
                {NAV_ITEMS.find((n) => n.id === page)?.label}
              </span>
            </div>
          )}

          {page === "overview"    && <Overview />}
          {page === "orders"      && <SalesOrders />}
          {page === "products"    && <Products />}
          {page === "reports"     && <Reports />}
          {page === "integration" && <IntegrationGuide />}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ─────────────────────────────── */}
      {isMobile && (
        <nav style={{
          display: "flex",
          height: 60,
          background: "#fff",
          borderTop: "1px solid #d9d9d9",
          flexShrink: 0,
          zIndex: 100,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
        }}>
          {NAV_ITEMS.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                data-gesture-nav={item.label}
                onClick={() => navigate(item.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  background: "transparent",
                  border: "none",
                  borderTop: active ? "2px solid #0070f2" : "2px solid transparent",
                  cursor: "pointer",
                  color: active ? "#0070f2" : "#6a6d70",
                  padding: "4px 0",
                  transition: "color .12s",
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
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
