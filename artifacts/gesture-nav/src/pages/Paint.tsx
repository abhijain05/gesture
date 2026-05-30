import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useGestureContext } from "@/context/GestureContext";

const COLORS = [
  { id: "cyan",   hex: "#00d4ff", label: "Cyan"   },
  { id: "violet", hex: "#a855f7", label: "Violet" },
  { id: "green",  hex: "#22c55e", label: "Green"  },
  { id: "yellow", hex: "#facc15", label: "Yellow" },
  { id: "orange", hex: "#f97316", label: "Orange" },
  { id: "red",    hex: "#ef4444", label: "Red"    },
  { id: "pink",   hex: "#ec4899", label: "Pink"   },
  { id: "white",  hex: "#f1f5f9", label: "White"  },
];

const BRUSHES = [
  { id: "sm", size: 4,  label: "S" },
  { id: "md", size: 9,  label: "M" },
  { id: "lg", size: 18, label: "L" },
];

const DWELL_MS = 500;

export default function Paint() {
  const gestureContext = useGestureContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const palmClearedRef = useRef(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTargetRef = useRef<string | null>(null);

  const [selectedColor, setSelectedColor] = useState("#00d4ff");
  const [brushSize, setBrushSize] = useState(9);
  const [strokeCount, setStrokeCount] = useState(0);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const { width, height } = container.getBoundingClientRect();
      // Save existing drawing
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext("2d")?.drawImage(canvas, 0, 0);
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(tempCanvas, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
    setCleared(true);
    setLastAction("Canvas cleared!");
    setTimeout(() => setCleared(false), 600);
    setTimeout(() => setLastAction(null), 1500);
  }, []);

  // Tool dwell selection helper
  const startDwell = useCallback((toolId: string, onComplete: () => void) => {
    if (dwellTargetRef.current === toolId) return;
    dwellTargetRef.current = toolId;
    setHoveredTool(toolId);
    setDwellProgress(0);

    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);

    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(elapsed / DWELL_MS, 1);
      setDwellProgress(pct);
      if (pct < 1) {
        dwellTimerRef.current = setTimeout(tick, 16);
      } else {
        onComplete();
        dwellTargetRef.current = null;
        setHoveredTool(null);
        setDwellProgress(0);
      }
    };
    dwellTimerRef.current = setTimeout(tick, 16);
  }, []);

  const cancelDwell = useCallback((toolId: string) => {
    if (dwellTargetRef.current !== toolId) return;
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    dwellTargetRef.current = null;
    setHoveredTool(null);
    setDwellProgress(0);
  }, []);

  // Drawing loop driven by gesture context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { currentGesture, cursorPosition } = gestureContext;

    // OPEN_PALM = clear (debounced)
    if (currentGesture === "OPEN_PALM") {
      if (!palmClearedRef.current) {
        palmClearedRef.current = true;
        clearCanvas();
      }
      lastPosRef.current = null;
      return;
    } else {
      palmClearedRef.current = false;
    }

    if (currentGesture !== "POINT_FINGER" || !cursorPosition) {
      lastPosRef.current = null;
      return;
    }

    // Translate screen coords → canvas-local coords
    const rect = canvas.getBoundingClientRect();
    const x = cursorPosition.x - rect.left;
    const y = cursorPosition.y - rect.top;

    if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) {
      lastPosRef.current = null;
      return;
    }

    const prev = lastPosRef.current;

    if (!prev) {
      // Start new stroke — dot
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = selectedColor;
      ctx.fill();
      setStrokeCount((c) => c + 1);
    } else {
      // Continue stroke
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = selectedColor;
      ctx.shadowBlur = brushSize * 0.8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    lastPosRef.current = { x, y };

    // Check if cursor is hovering a tool button
    const toolEls = document.querySelectorAll<HTMLElement>("[data-tool-id]");
    toolEls.forEach((el) => {
      const toolId = el.dataset.toolId!;
      const elRect = el.getBoundingClientRect();
      const inside =
        cursorPosition.x >= elRect.left &&
        cursorPosition.x <= elRect.right &&
        cursorPosition.y >= elRect.top &&
        cursorPosition.y <= elRect.bottom;

      if (inside) {
        const colorMatch = COLORS.find((c) => `color-${c.id}` === toolId);
        const brushMatch = BRUSHES.find((b) => `brush-${b.id}` === toolId);
        const isClear = toolId === "clear";

        startDwell(toolId, () => {
          if (colorMatch) {
            setSelectedColor(colorMatch.hex);
            setLastAction(`Color: ${colorMatch.label}`);
            setTimeout(() => setLastAction(null), 1200);
          } else if (brushMatch) {
            setBrushSize(brushMatch.size);
            setLastAction(`Brush: ${brushMatch.label}`);
            setTimeout(() => setLastAction(null), 1200);
          } else if (isClear) {
            clearCanvas();
          }
        });
      } else {
        cancelDwell(toolId);
      }
    });
  }, [gestureContext, selectedColor, brushSize, clearCanvas, startDwell, cancelDwell]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-5 py-3 shrink-0 flex-wrap"
        style={{
          background: "rgba(7,11,22,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Page title */}
        <div className="flex items-center gap-2 mr-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
          <span className="text-xs font-bold tracking-widest" style={{ color: "#00d4ff", letterSpacing: "0.12em" }}>PAINT</span>
        </div>

        <div className="w-px h-5 opacity-20" style={{ background: "#fff" }} />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((color) => {
            const toolId = `color-${color.id}`;
            const isActive = selectedColor === color.hex;
            const isHovered = hoveredTool === toolId;
            return (
              <div key={color.id} className="relative" data-tool-id={toolId}>
                <button
                  onClick={() => setSelectedColor(color.hex)}
                  title={color.label}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: color.hex,
                    border: isActive
                      ? "2px solid #fff"
                      : isHovered
                      ? "2px solid rgba(255,255,255,0.5)"
                      : "2px solid rgba(255,255,255,0.1)",
                    boxShadow: isActive ? `0 0 10px ${color.hex}88` : "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    transform: isActive ? "scale(1.2)" : "scale(1)",
                    position: "relative",
                  }}
                />
                {/* Dwell ring */}
                {isHovered && (
                  <svg
                    style={{ position: "absolute", inset: -4, width: 30, height: 30, pointerEvents: "none" }}
                    viewBox="0 0 30 30"
                  >
                    <circle
                      cx="15" cy="15" r="13"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      strokeDasharray={`${dwellProgress * 81.7} 81.7`}
                      strokeLinecap="round"
                      transform="rotate(-90 15 15)"
                      opacity="0.8"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-px h-5 opacity-20" style={{ background: "#fff" }} />

        {/* Brush sizes */}
        <div className="flex items-center gap-1.5">
          {BRUSHES.map((brush) => {
            const toolId = `brush-${brush.id}`;
            const isActive = brushSize === brush.size;
            const isHovered = hoveredTool === toolId;
            return (
              <div key={brush.id} className="relative" data-tool-id={toolId}>
                <button
                  onClick={() => setBrushSize(brush.size)}
                  title={`Brush ${brush.label}`}
                  className="flex items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    background: isActive
                      ? "rgba(0,212,255,0.18)"
                      : isHovered
                      ? "rgba(0,212,255,0.08)"
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? "1px solid rgba(0,212,255,0.5)"
                      : "1px solid rgba(255,255,255,0.07)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: brush.size * 0.7 + 4,
                      height: brush.size * 0.7 + 4,
                      borderRadius: "50%",
                      background: isActive ? selectedColor : "#6b7280",
                      transition: "all 0.15s",
                    }}
                  />
                </button>
                {isHovered && (
                  <svg
                    style={{ position: "absolute", inset: -4, width: 38, height: 38, pointerEvents: "none" }}
                    viewBox="0 0 38 38"
                  >
                    <circle
                      cx="19" cy="19" r="17"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      strokeDasharray={`${dwellProgress * 106.8} 106.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 19 19)"
                      opacity="0.8"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-px h-5 opacity-20" style={{ background: "#fff" }} />

        {/* Clear button */}
        <div className="relative" data-tool-id="clear">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: hoveredTool === "clear" ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear
          </button>
          {hoveredTool === "clear" && (
            <svg
              style={{ position: "absolute", inset: -4, width: "calc(100% + 8px)", height: "calc(100% + 8px)", pointerEvents: "none" }}
              viewBox={`0 0 ${80} 32}`}
            />
          )}
        </div>

        {/* Stroke counter */}
        <div className="ml-auto text-xs font-mono" style={{ color: "#4b5563" }}>
          {strokeCount} strokes
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden"
        style={{ background: "rgba(0,0,0,0.55)", cursor: "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />

        {/* Clear flash overlay */}
        {cleared && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ background: "rgba(239,68,68,0.15)" }}
          />
        )}

        {/* Action toast */}
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-mono pointer-events-none"
            style={{
              background: "rgba(0,212,255,0.12)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
              backdropFilter: "blur(8px)",
            }}
          >
            {lastAction}
          </motion.div>
        )}

        {/* Empty state hint */}
        {strokeCount === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
          >
            <div
              className="text-6xl mb-4 opacity-10"
              style={{ filter: "drop-shadow(0 0 20px #00d4ff)" }}
            >
              ✋
            </div>
            <p className="text-sm font-mono opacity-20" style={{ color: "#00d4ff" }}>
              Point your finger to draw
            </p>
          </div>
        )}

        {/* Gesture legend */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-5 px-5 py-2.5 rounded-full pointer-events-none"
          style={{
            background: "rgba(7,11,22,0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {[
            { gesture: "☝️", action: "Draw",       color: "#00d4ff" },
            { gesture: "✌️", action: "Scroll",     color: "#f59e0b" },
            { gesture: "🖐️", action: "Clear all",  color: "#ef4444" },
          ].map(({ gesture, action, color }) => (
            <div key={action} className="flex items-center gap-1.5">
              <span style={{ fontSize: 14 }}>{gesture}</span>
              <span className="text-xs font-mono" style={{ color, opacity: 0.7 }}>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
