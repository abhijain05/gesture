import { useGestureContext } from "@/context/GestureContext";
import { useLocation } from "wouter";

const GESTURE_LABELS: Record<string, { label: string; color: string; glyph: string }> = {
  POINT_FINGER: { label: "POINT", color: "#00d4ff", glyph: "☛" },
  PINCH: { label: "PINCH", color: "#a855f7", glyph: "✦" },
  OPEN_PALM: { label: "PALM", color: "#22c55e", glyph: "✋" },
  NONE: { label: "IDLE", color: "#4b5563", glyph: "○" },
};

const PAGE_LABELS: Record<string, string> = {
  "/": "HOME",
  "/dashboard": "DASHBOARD",
  "/reports": "REPORTS",
  "/analytics": "ANALYTICS",
  "/settings": "SETTINGS",
};

export function GestureStatusBar() {
  const { currentGesture, confidence, fps } = useGestureContext();
  const [location] = useLocation();

  const info = GESTURE_LABELS[currentGesture] ?? GESTURE_LABELS["NONE"];
  const pageLabel = PAGE_LABELS[location] ?? location.toUpperCase().replace("/", "");

  return (
    <div
      className="fixed right-4 z-40"
      style={{ top: 185, width: 220 }}
      data-testid="gesture-status-bar"
    >
      <div
        className="rounded-xl border border-white/5 px-3 py-2.5 flex flex-col gap-2"
        style={{
          background: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 14, color: info.color, lineHeight: 1 }}>{info.glyph}</span>
            <span
              className="font-mono text-xs tracking-widest font-semibold"
              style={{ color: info.color }}
              data-testid="gesture-label"
            >
              {info.label}
            </span>
          </div>
          <span
            className="font-mono text-xs"
            style={{ color: "#374151", fontSize: "10px" }}
            data-testid="fps-counter"
          >
            {fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${confidence * 100}%`,
                background: info.color,
                boxShadow: `0 0 6px ${info.color}`,
              }}
            />
          </div>
          <span
            className="font-mono text-xs shrink-0"
            style={{ color: "#6b7280", fontSize: "10px", minWidth: 28, textAlign: "right" }}
          >
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 pt-0.5 border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="w-1 h-1 rounded-full" style={{ background: "#00d4ff", boxShadow: "0 0 4px #00d4ff" }} />
          <span
            className="font-mono tracking-widest text-muted-foreground"
            style={{ fontSize: "9px" }}
            data-testid="current-page-label"
          >
            {pageLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
