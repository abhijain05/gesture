import { useEffect, useRef, useCallback, useState } from "react";
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useGestureContext } from "@/context/GestureContext";
import { detectGesture } from "./useGestureRecognition";

type TrackingStatus = "idle" | "loading" | "ready" | "error";

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

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
): HandTrackingResult {
  const { setGestureState, gestureSettings } = useGestureContext();
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTimeRef = useRef<number>(0);
  const fpsTimestampsRef = useRef<number[]>([]);
  const gestureBufferRef = useRef<string[]>([]);
  const smoothCursorRef = useRef<{ x: number; y: number } | null>(null);
  const isRunningRef = useRef(false);

  const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
  const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

  const initMediaPipe = useCallback(async () => {
    try {
      setStatus("loading");
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      handLandmarkerRef.current = handLandmarker;
      setStatus("ready");
    } catch (err) {
      console.error("MediaPipe init error:", err);
      setStatus("error");
      setErrorMessage(String(err));
    }
  }, []);

  useEffect(() => {
    initMediaPipe();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      handLandmarkerRef.current?.close();
    };
  }, [initMediaPipe]);

  const computeFps = useCallback((now: number) => {
    fpsTimestampsRef.current.push(now);
    fpsTimestampsRef.current = fpsTimestampsRef.current.filter(
      (t) => now - t < 1000
    );
    return fpsTimestampsRef.current.length;
  }, []);

  const smoothGesture = useCallback((detected: string): string => {
    const buf = gestureBufferRef.current;
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
      const CONNECTIONS: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17],
      ];

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
    if (!isRunningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    if (now - lastDetectTimeRef.current < 16) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    lastDetectTimeRef.current = now;

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
      const indexTip = landmarks[8];
      let cursorPos: { x: number; y: number } | null = null;
      if (smoothed === "POINT_FINGER" && indexTip) {
        const raw = { x: (1 - indexTip.x) * window.innerWidth, y: indexTip.y * window.innerHeight };
        const prev = smoothCursorRef.current;
        const alpha = 0.5;
        cursorPos = prev
          ? { x: prev.x + alpha * (raw.x - prev.x), y: prev.y + alpha * (raw.y - prev.y) }
          : raw;
        smoothCursorRef.current = cursorPos;
      } else {
        smoothCursorRef.current = null;
      }

      if (smoothed === "TWO_FINGER" && gestureSettings.twoFingerEnabled) {
        const wristY = landmarks[0].y;
        const delta = wristY - 0.5;
        const deadZone = 0.1;
        if (Math.abs(delta) > deadZone) {
          const speed = Math.sign(delta) * (Math.abs(delta) - deadZone) * 700;
          const scrollEl = findScrollContainer();
          scrollEl?.scrollBy({ top: speed / 60, behavior: "instant" as ScrollBehavior });
        }
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
      setGestureState({
        currentGesture: smoothed as any,
        confidence: 0,
        landmarks: null,
        cursorPosition: null,
        fps,
        isTracking: true,
      });
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef, canvasRef, computeFps, drawLandmarks, smoothGesture, setGestureState, gestureSettings.sensitivity]);

  const startTracking = useCallback(async () => {
    if (isRunningRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      isRunningRef.current = true;
      setGestureState({ isTracking: true });
      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      setStatus("error");
      setErrorMessage("Camera permission denied or not available");
    }
  }, [detect, videoRef, setGestureState]);

  const stopTracking = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
