import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export interface TrackingFrame {
  landmarks: NormalizedLandmark[] | null;
  fps: number;
}

export type TrackingCallback = (frame: TrackingFrame) => void;

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private raf: number | null = null;
  private isRunning = false;
  private fpsTimestamps: number[] = [];
  private lastDetectTime = 0;
  private stream: MediaStream | null = null;

  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement | null,
    private sensitivity: number,
    private onFrame: TrackingCallback,
    private onStatusChange: (status: "loading" | "ready" | "error", msg?: string) => void
  ) {
    this.video = video;
    if (canvas) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext("2d");
    }
  }

  async init(): Promise<void> {
    this.onStatusChange("loading");
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: this.sensitivity * 0.8,
        minHandPresenceConfidence: this.sensitivity * 0.8,
        minTrackingConfidence: this.sensitivity * 0.8,
      });
      this.onStatusChange("ready");
    } catch (err) {
      this.onStatusChange("error", String(err));
      throw err;
    }
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.video.srcObject = this.stream;
      this.video.playsInline = true;
      await this.video.play();
      this.isRunning = true;
      this.loop();
    } catch (err) {
      this.onStatusChange("error", "Camera permission denied or unavailable");
      throw err;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.video.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      this.video.srcObject = null;
    }
  }

  destroy(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  updateSensitivity(s: number): void {
    this.sensitivity = s;
  }

  private computeFps(now: number): number {
    this.fpsTimestamps.push(now);
    this.fpsTimestamps = this.fpsTimestamps.filter((t) => now - t < 1000);
    return this.fpsTimestamps.length;
  }

  private drawLandmarks(landmarks: NormalizedLandmark[]): void {
    const ctx = this.canvasCtx;
    const canvas = this.canvas;
    const video = this.video;
    if (!ctx || !canvas) return;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0, 112, 242, 0.8)";
    ctx.lineWidth = 1.5;
    for (const [a, b] of HAND_CONNECTIONS) {
      const la = landmarks[a], lb = landmarks[b];
      if (!la || !lb) continue;
      ctx.beginPath();
      ctx.moveTo(la.x * canvas.width, la.y * canvas.height);
      ctx.lineTo(lb.x * canvas.width, lb.y * canvas.height);
      ctx.stroke();
    }
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 112, 242, 0.9)";
      ctx.fill();
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    if (now - this.lastDetectTime >= 16 && this.video.readyState >= 2 && this.landmarker) {
      this.lastDetectTime = now;
      const results = this.landmarker.detectForVideo(this.video, now);
      const fps = this.computeFps(now);
      if (results.landmarks?.length > 0) {
        const lm = results.landmarks[0];
        this.drawLandmarks(lm);
        this.onFrame({ landmarks: lm, fps });
      } else {
        this.canvasCtx?.clearRect(0, 0, this.canvas?.width ?? 0, this.canvas?.height ?? 0);
        this.onFrame({ landmarks: null, fps });
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
