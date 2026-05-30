import { useRef, useEffect } from "react";
import { useHandTracking } from "@/hooks/useHandTracking";
import { useGestureContext } from "@/context/GestureContext";

export function WebcamPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, errorMessage } = useHandTracking(videoRef, canvasRef);
  const { confidence, currentGesture, isTracking } = useGestureContext();

  return (
    <div
      className="fixed top-4 right-4 z-40 flex flex-col gap-1"
      data-testid="webcam-panel"
    >
      <div
        className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl"
        style={{
          width: 220,
          height: 165,
          background: "rgba(7,11,20,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 30px rgba(0,212,255,0.08), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div
              className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
            />
            <span className="text-xs text-muted-foreground font-mono">Loading model...</span>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 z-10">
            <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
              <span className="text-destructive text-sm font-bold">!</span>
            </div>
            <span className="text-xs text-muted-foreground text-center leading-tight">
              {errorMessage ?? "Camera unavailable"}
            </span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          data-testid="webcam-video"
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(1)" }}
          data-testid="landmark-canvas"
        />

        {isTracking && (
          <div
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-mono"
            style={{
              background: "rgba(0,0,0,0.6)",
              color: confidence > 0.6 ? "#00d4ff" : "#6b7280",
              fontSize: "10px",
            }}
            data-testid="confidence-badge"
          >
            {(confidence * 100).toFixed(0)}%
          </div>
        )}

        <div
          className="absolute top-1.5 left-1.5 flex items-center gap-1"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isTracking ? "#00d4ff" : "#374151",
              boxShadow: isTracking ? "0 0 6px #00d4ff" : "none",
            }}
          />
          <span className="text-xs font-mono" style={{ fontSize: "9px", color: "#6b7280" }}>
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
