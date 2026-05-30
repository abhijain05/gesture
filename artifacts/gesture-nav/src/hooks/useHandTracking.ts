import { useEffect, useRef, useCallback, useState } from "react";
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useGestureContext } from "@/context/GestureContext";
import { detectGesture } from "./useGestureRecognition";

type TrackingStatus = "idle" | "loading" | "ready" | "error";

interface TrackingState {
  handLandmarker: HandLandmarker | null;
  raf: number | null;
  lastDetectTime: number;
  fpsTimestamps: number[];
  gestureBuffer: string[];
  smoothCursor: { x: number; y: number } | null;
  prevTwoFingerY: number | null;
  isRunning: boolean;
}

function findScrollContainer(): Element | null {
  const divs = Array.from(document.querySelectorAll("div"));
  for (const el of divs) {
    const style = window.getComputedStyle(el);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 10
    ) {
      return el;
    }
  }
  return null;
}

export interface HandTrackingResult {
  status: TrackingStatus;
  errorMessage: string | null;
  startTracking: () => void;
  stopTracking: () => void;
}

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
): HandTrackingResult {
  const { setGestureState, gestureSettings } = useGestureContext();
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Single consolidated ref bag — adding new state never changes hook count
  const s = useRef<TrackingState>({
    handLandmarker: null,
    raf: null,
    lastDetectTime: 0,
    fpsTimestamps: [],
    gestureBuffer: [],
    smoothCursor: null,
    prevTwoFingerY: null,
    isRunning: false,
  });

  const initMediaPipe = useCallback(async () => {
    try {
      setStatus("loading");
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      s.current.handLandmarker = handLandmarker;
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(String(err));
    }
  }, []);

  useEffect(() => {
    initMediaPipe();
    return () => {
      if (s.current.raf) cancelAnimationFrame(s.current.raf);
      s.current.handLandmarker?.close();
    };
  }, [initMediaPipe]);

  const computeFps = useCallback((now: number) => {
    s.current.fpsTimestamps.push(now);
    s.current.fpsTimestamps = s.current.fpsTimestamps.filter((t) => now - t < 1000);
    return s.current.fpsTimestamps.length;
  }, []);

  const smoothGesture = useCallback((detected: string): string => {
    const buf = s.current.gestureBuffer;
    buf.push(detected);
    if (buf.length > 3) buf.shift();
    const counts: Record<string, number> = {};
    for (const g of buf) counts[g] = (counts[g] || 0) + 1;
    let best = "NONE";
    let bestCount = 0;
    for (const [g, c] of Object.entries(counts)) {
      if (c > bestCount) { best = g; bestCount = c; }
    }
    return bestCount >= 2 ? best : "NONE";
  }, []);

  const drawLandmarks = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(0, 212, 255, 0.7)";
      ctx.lineWidth = 1.5;
      for (const [a, b] of CONNECTIONS) {
        const la = landmarks[a];
        const lb = landmarks[b];
        if (!la || !lb) continue;
        ctx.beginPath();
        ctx.moveTo((1 - la.x) * width, la.y * height);
        ctx.lineTo((1 - lb.x) * width, lb.y * height);
        ctx.stroke();
      }
      for (const lm of landmarks) {
        const x = (1 - lm.x) * width;
        const y = lm.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 212, 255, 0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    []
  );

  const detect = useCallback(() => {
    if (!s.current.isRunning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = s.current.handLandmarker;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      s.current.raf = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    if (now - s.current.lastDetectTime < 16) {
      s.current.raf = requestAnimationFrame(detect);
      return;
    }
    s.current.lastDetectTime = now;

    const results = landmarker.detectForVideo(video, now);
    const fps = computeFps(now);
    const ctx = canvas.getContext("2d");

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
      }

      const { gesture, confidence } = detectGesture(landmarks, gestureSettings.sensitivity);
      const smoothed = smoothGesture(gesture);

      // --- Cursor smoothing (POINT_FINGER) ---
      const indexTip = landmarks[8];
      let cursorPos: { x: number; y: number } | null = null;
      if (smoothed === "POINT_FINGER" && indexTip) {
        const raw = { x: (1 - indexTip.x) * window.innerWidth, y: indexTip.y * window.innerHeight };
        const prev = s.current.smoothCursor;
        const alpha = 0.3;
        if (!prev) {
          cursorPos = raw;
        } else {
          const ex = prev.x + alpha * (raw.x - prev.x);
          const ey = prev.y + alpha * (raw.y - prev.y);
          const d = Math.sqrt((ex - prev.x) ** 2 + (ey - prev.y) ** 2);
          cursorPos = d < 2 ? prev : { x: ex, y: ey };
        }
        s.current.smoothCursor = cursorPos;
      } else {
        s.current.smoothCursor = null;
      }

      // --- Motion-based scroll (TWO_FINGER) ---
      if (smoothed === "TWO_FINGER" && gestureSettings.twoFingerEnabled) {
        const currentY = (landmarks[8].y + landmarks[12].y) / 2;
        const prevY = s.current.prevTwoFingerY;
        if (prevY !== null) {
          const deltaY = currentY - prevY;
          if (Math.abs(deltaY) > 0.003) {
            const scrollEl = findScrollContainer();
            scrollEl?.scrollBy({ top: deltaY * window.innerHeight * 5, behavior: "instant" as ScrollBehavior });
          }
        }
        s.current.prevTwoFingerY = currentY;
      } else {
        s.current.prevTwoFingerY = null;
      }

      setGestureState({
        currentGesture: smoothed as any,
        confidence,
        landmarks,
        cursorPosition: cursorPos,
        fps,
        isTracking: true,
      });
    } else {
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      const smoothed = smoothGesture("NONE");
      s.current.smoothCursor = null;
      s.current.prevTwoFingerY = null;
      setGestureState({
        currentGesture: smoothed as any,
        confidence: 0,
        landmarks: null,
        cursorPosition: null,
        fps,
        isTracking: true,
      });
    }

    s.current.raf = requestAnimationFrame(detect);
  }, [videoRef, canvasRef, computeFps, drawLandmarks, smoothGesture, setGestureState, gestureSettings.sensitivity, gestureSettings.twoFingerEnabled]);

  const startTracking = useCallback(async () => {
    if (s.current.isRunning) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      s.current.isRunning = true;
      setGestureState({ isTracking: true });
      s.current.raf = requestAnimationFrame(detect);
    } catch (err) {
      setStatus("error");
      setErrorMessage("Camera permission denied or not available");
    }
  }, [detect, videoRef, setGestureState]);

  const stopTracking = useCallback(() => {
    s.current.isRunning = false;
    if (s.current.raf) cancelAnimationFrame(s.current.raf);
    const video = videoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setGestureState({ isTracking: false, currentGesture: "NONE", landmarks: null, cursorPosition: null });
  }, [videoRef, setGestureState]);

  useEffect(() => {
    if (status === "ready") startTracking();
    return () => stopTracking();
  }, [status]);

  return { status, errorMessage, startTracking, stopTracking };
}
