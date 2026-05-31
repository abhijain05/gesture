import { useState, useEffect, useRef } from "react";
import { useGestureEngine } from "@/hooks/useGestureEngine";
import { VoiceCommandEngine } from "@workspace/gesture-core";
import Overview from "@/pages/Overview";
import SalesOrders from "@/pages/SalesOrders";
import Products from "@/pages/Products";
import Reports from "@/pages/Reports";
import IntegrationGuide from "@/pages/IntegrationGuide";

type Page = "overview" | "orders" | "products" | "reports" | "integration";

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "orders", label: "Sales Orders", icon: "📋" },
  { id: "products", label: "Products", icon: "📦" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "integration", label: "Integration Guide", icon: "🤚" },
];

const GESTURE_LABEL: Record<string, string> = {
  POINT_FINGER: "☝️ Pointing",
  PINCH: "🤏 Pinch",
  OPEN_PALM: "🖐 Palm",
  TWO_FINGER: "✌️ Scroll",
  NONE: "No gesture",
};

const PAGE_IDS: Record<string, Page> = {
  overview: "overview",
  orders: "orders",
  "sales-orders": "orders",
  "salesorders": "orders",
  products: "products",
  reports: "reports",
  integration: "integration",
  "integration-guide": "integration",
};

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const { gestureState, status } = useGestureEngine(true);
  const pageRef = useRef<Page>(page);
  pageRef.current = page;

  // Resolve a voice-provided page name/id to our Page type
  const resolvePage = (raw: string | undefined): Page | null => {
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
    if (PAGE_IDS[key]) return PAGE_IDS[key];
    // fuzzy: match any nav item label
    const match = NAV_ITEMS.find((n) =>
      n.label.toLowerCase().includes(raw.toLowerCase()) ||
      raw.toLowerCase().includes(n.label.toLowerCase())
    );
    return match?.id ?? null;
  };

  useEffect(() => {
    // Palm → home
    const onPalm = () => setPage("overview");
    document.addEventListener("gesture:palm", onPalm);

    // Voice navigation
    const onVoiceNav = (e: Event) => {
      const page = (e as CustomEvent<{ page?: string }>).detail?.page;
      const resolved = resolvePage(page);
      if (resolved) setPage(resolved);
    };
    document.addEventListener("gesture:voice:navigate", onVoiceNav);

    return () => {
      document.removeEventListener("gesture:palm", onPalm);
      document.removeEventListener("gesture:voice:navigate", onVoiceNav);
    };
  }, []);

  // Initialize VoiceCommandEngine once
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) return;

    const engine = new VoiceCommandEngine({
      geminiApiKey: apiKey,
      pages: NAV_ITEMS.map((n) => ({ name: n.label, id: n.id })),
      getCurrentPage: () => pageRef.current,
    });

    return () => engine.destroy();
  }, []);

  const gesture = gestureState.currentGesture;
  const isActive = status === "ready";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: '"72", "72full", Arial, Helvetica, sans-serif' }}>
      {/* SAP Shell Header */}
      <header style={{
        height: 48,
        background: "#1d2d3e",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        flexShrink: 0,
        gap: 16,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, background: "#0070f2", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, letterSpacing: "-0.5px" }}>
            SAP
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.01em" }}>Fiori Launchpad</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          background: isActive ? "rgba(16,126,62,0.25)" : status === "loading" ? "rgba(233,115,12,0.25)" : "rgba(255,255,255,0.1)",
          border: `1px solid ${isActive ? "#107e3e" : status === "loading" ? "#e9730c" : "#444"}`,
          borderRadius: 14, padding: "3px 12px", fontSize: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "#4caf50" : status === "loading" ? "#ff9800" : "#666",
            animation: status === "loading" ? "pulse 1s ease-in-out infinite" : undefined }} />
          <span style={{ color: isActive ? "#a5d6a7" : status === "loading" ? "#ffcc80" : "#aaa" }}>
            {status === "loading" ? "Loading MediaPipe…" : isActive ? "Gesture Active" : "Gesture Off"}
          </span>
        </div>
        {isActive && gesture !== "NONE" && (
          <div style={{ background: "rgba(0,112,242,0.3)", border: "1px solid #0070f2", borderRadius: 14, padding: "3px 12px", fontSize: 12, color: "#90caf9" }}>
            {GESTURE_LABEL[gesture]}
          </div>
        )}
        {/* Voice hint in header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 14, padding: "3px 10px", fontSize: 11, color: "#aaa",
        }}>
          🎤 <span>Press <kbd style={{ background: "rgba(255,255,255,0.12)", borderRadius: 3, padding: "1px 4px", fontSize: 10 }}>`</kbd> for voice</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0070f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
            JD
          </div>
          <span style={{ fontSize: 13 }}>John Doe</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Navigation */}
        <nav style={{ width: 220, background: "#fff", borderRight: "1px solid #d9d9d9", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px 8px", fontSize: 11, fontWeight: 700, color: "#6a6d70", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #f0f0f0" }}>
            Applications
          </div>
          {NAV_ITEMS.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                data-gesture-dwell
                onClick={() => setPage(item.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: active ? "#e8f0fe" : "transparent",
                  borderLeft: `3px solid ${active ? "#0070f2" : "transparent"}`,
                  border: "none",
                  borderLeftWidth: 3,
                  borderLeftStyle: "solid",
                  borderLeftColor: active ? "#0070f2" : "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: active ? "#0070f2" : "#1d2d3e",
                  fontWeight: active ? 700 : 400,
                  transition: "all 0.12s",
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Gesture + Voice status panel */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6a6d70", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gesture Engine
            </div>
            <div style={{ fontSize: 12, color: "#1d2d3e", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>Status</span>
              <span style={{ fontWeight: 600, color: isActive ? "#107e3e" : "#6a6d70" }}>
                {isActive ? "Ready" : status === "loading" ? "Loading…" : "Off"}
              </span>
            </div>
            {isActive && (
              <>
                <div style={{ fontSize: 12, color: "#1d2d3e", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Gesture</span>
                  <span style={{ fontWeight: 600 }}>{gesture === "NONE" ? "—" : gesture.replace("_", " ")}</span>
                </div>
                <div style={{ fontSize: 12, color: "#1d2d3e", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>FPS</span>
                  <span style={{ fontWeight: 600 }}>{gestureState.fps}</span>
                </div>
              </>
            )}
            <div style={{ fontSize: 11, color: "#888", borderTop: "1px solid #eee", paddingTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
              🎤 <span>Voice: press <b>`</b> or click mic</span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, background: "#f5f6f7", overflowY: "auto" }} className="scrollbar-thin">
          {/* Breadcrumb bar */}
          <div style={{ padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e8e8e8", fontSize: 12, color: "#6a6d70", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Fiori Launchpad</span>
            <span>›</span>
            <span style={{ color: "#0070f2", fontWeight: 600 }}>
              {NAV_ITEMS.find((n) => n.id === page)?.label}
            </span>
          </div>

          {page === "overview" && <Overview />}
          {page === "orders" && <SalesOrders />}
          {page === "products" && <Products />}
          {page === "reports" && <Reports />}
          {page === "integration" && <IntegrationGuide />}
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
