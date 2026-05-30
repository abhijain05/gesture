const CURSOR_CSS = `
.gcore-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483647;
  overflow: hidden;
}
.gcore-cursor {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  transition: opacity 0.2s;
}
.gcore-cursor-dot {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: rgba(0, 112, 242, 0.9);
  box-shadow: 0 0 8px rgba(0, 112, 242, 0.6);
  transition: background 0.15s, transform 0.15s;
}
.gcore-cursor-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(0, 112, 242, 0.5);
  animation: gcore-pulse 1.2s ease-in-out infinite;
}
.gcore-cursor--pinch .gcore-cursor-dot {
  background: rgba(255, 100, 0, 0.9);
  transform: scale(1.4);
  box-shadow: 0 0 12px rgba(255, 100, 0, 0.7);
}
.gcore-cursor--palm .gcore-cursor-dot {
  background: rgba(50, 200, 100, 0.9);
  transform: scale(1.6);
  box-shadow: 0 0 14px rgba(50, 200, 100, 0.7);
}
.gcore-dwell-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 3px solid rgba(0, 112, 242, 0.8);
  clip-path: none;
  transform: rotate(-90deg);
  opacity: 0;
  transition: opacity 0.15s;
}
.gcore-dwell-ring--active {
  opacity: 1;
}
.gcore-webcam {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 160px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(0, 112, 242, 0.5);
  background: #000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: auto;
  z-index: 2147483646;
  transition: box-shadow 0.15s, border-color 0.15s;
  user-select: none;
}
.gcore-webcam:hover {
  border-color: rgba(0, 112, 242, 0.9);
  box-shadow: 0 6px 28px rgba(0,0,0,0.55);
}
.gcore-webcam.gcore-webcam--dragging {
  box-shadow: 0 12px 40px rgba(0,0,0,0.7);
  border-color: rgba(0, 112, 242, 1);
  opacity: 0.92;
  transition: none;
}
.gcore-webcam-handle {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 22px;
  background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%);
  cursor: grab;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.gcore-webcam-handle:active { cursor: grabbing; }
.gcore-webcam-handle-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
}
.gcore-webcam video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
.gcore-webcam canvas {
  position: absolute;
  inset: 0;
  transform: scaleX(-1);
}
.gcore-badge {
  position: fixed;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 112, 242, 0.9);
  color: white;
  font-family: "72", "72full", Arial, Helvetica, sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.03em;
  box-shadow: 0 2px 8px rgba(0, 112, 242, 0.4);
}
.gcore-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7fff7f;
  animation: gcore-blink 1.5s ease-in-out infinite;
}
@keyframes gcore-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.6); opacity: 0.1; }
}
@keyframes gcore-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
`;

export class CursorOverlay {
  private overlay: HTMLDivElement;
  private cursor: HTMLDivElement;
  private cursorDot: HTMLDivElement;
  private dwellRing: SVGSVGElement;
  private webcamContainer: HTMLDivElement | null = null;
  private badge: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private visible = false;

  constructor(private showWebcam: boolean) {
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = CURSOR_CSS;
    document.head.appendChild(this.styleEl);

    this.overlay = document.createElement("div");
    this.overlay.className = "gcore-overlay";

    this.cursor = document.createElement("div");
    this.cursor.className = "gcore-cursor";
    this.cursor.style.opacity = "0";

    this.cursorDot = document.createElement("div");
    this.cursorDot.className = "gcore-cursor-dot";

    const ring = document.createElement("div");
    ring.className = "gcore-cursor-ring";

    this.dwellRing = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
    this.dwellRing.setAttribute("viewBox", "0 0 36 36");
    this.dwellRing.style.cssText = "position:absolute;inset:-4px;width:36px;height:36px;transform:rotate(-90deg);opacity:0;transition:opacity 0.15s;pointer-events:none;";

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "18");
    circle.setAttribute("cy", "18");
    circle.setAttribute("r", "15");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "rgba(0,112,242,0.9)");
    circle.setAttribute("stroke-width", "3");
    circle.setAttribute("stroke-dasharray", "94.2");
    circle.setAttribute("stroke-dashoffset", "94.2");
    this.dwellRing.appendChild(circle);

    this.cursor.appendChild(this.cursorDot);
    this.cursor.appendChild(ring);
    this.cursor.appendChild(this.dwellRing as unknown as Node);
    this.overlay.appendChild(this.cursor);

    this.badge = document.createElement("div");
    this.badge.className = "gcore-badge";
    this.badge.innerHTML = `<span class="gcore-badge-dot"></span>Gesture Control Active`;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.badge);

    if (showWebcam) this.initWebcam();
  }

  private initWebcam(): void {
    this.webcamContainer = document.createElement("div");
    this.webcamContainer.className = "gcore-webcam";

    const handle = document.createElement("div");
    handle.className = "gcore-webcam-handle";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "gcore-webcam-handle-dot";
      handle.appendChild(dot);
    }
    this.webcamContainer.appendChild(handle);

    this.makeDraggable(this.webcamContainer, handle);
    document.body.appendChild(this.webcamContainer);
  }

  private makeDraggable(el: HTMLDivElement, handle: HTMLDivElement): void {
    const W = 160, H = 120;
    const STORAGE_KEY = "gcore-webcam-pos";

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const applyPos = (left: number, top: number) => {
      const maxX = window.innerWidth - W - 4;
      const maxY = window.innerHeight - H - 4;
      const x = clamp(left, 4, maxX);
      const y = clamp(top, 4, maxY);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      return { x, y };
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        applyPos(x, y);
      }
    } catch (_) {}

    let dragging = false;
    let startMouseX = 0, startMouseY = 0, startElX = 0, startElY = 0;

    const getElLeft = () => parseInt(el.style.left || "", 10) || (window.innerWidth - W - 16);
    const getElTop  = () => parseInt(el.style.top  || "", 10) || (window.innerHeight - H - 16);

    const onStart = (clientX: number, clientY: number) => {
      dragging = true;
      startMouseX = clientX;
      startMouseY = clientY;
      startElX = getElLeft();
      startElY = getElTop();
      el.classList.add("gcore-webcam--dragging");
      document.body.style.userSelect = "none";
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!dragging) return;
      const { x, y } = applyPos(
        startElX + (clientX - startMouseX),
        startElY + (clientY - startMouseY)
      );
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })); } catch (_) {}
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("gcore-webcam--dragging");
      document.body.style.userSelect = "";
    };

    handle.addEventListener("mousedown", (e) => { e.preventDefault(); onStart(e.clientX, e.clientY); });
    document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    document.addEventListener("mouseup", onEnd);

    handle.addEventListener("touchstart", (e) => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    document.addEventListener("touchmove", (e) => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener("touchend", onEnd);
  }

  getWebcamContainer(): HTMLDivElement | null {
    return this.webcamContainer;
  }

  moveCursor(x: number, y: number, gesture: string): void {
    this.cursor.style.left = `${x}px`;
    this.cursor.style.top = `${y}px`;

    if (!this.visible) {
      this.cursor.style.opacity = "1";
      this.visible = true;
    }

    this.cursor.className = `gcore-cursor${gesture === "PINCH" ? " gcore-cursor--pinch" : gesture === "OPEN_PALM" ? " gcore-cursor--palm" : ""}`;
  }

  hideCursor(): void {
    if (this.visible) {
      this.cursor.style.opacity = "0";
      this.visible = false;
    }
    this.setDwellProgress(0);
  }

  setDwellProgress(progress: number): void {
    const circle = this.dwellRing.querySelector("circle");
    if (!circle) return;
    const circumference = 94.2;
    const offset = circumference * (1 - progress);
    circle.setAttribute("stroke-dashoffset", String(offset));
    (this.dwellRing as unknown as HTMLElement).style.opacity = progress > 0 ? "1" : "0";
  }

  destroy(): void {
    this.overlay.remove();
    this.badge.remove();
    this.webcamContainer?.remove();
    this.styleEl.remove();
  }
}
