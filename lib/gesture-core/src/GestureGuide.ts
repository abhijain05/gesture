const ITEMS = [
  { icon: "☝️", label: "Point", desc: "Move the cursor" },
  { icon: "🤏", label: "Pinch", desc: "Click / select" },
  { icon: "✌️", label: "Scroll", desc: "Two fingers — up/down/left/right" },
  { icon: "🖐", label: "Home", desc: "Hold open palm → go home" },
  { icon: "✊", label: "Pause", desc: "Hold fist 2s → freeze gestures" },
  { icon: "⏱", label: "Dwell", desc: "Point + hold over any element" },
];

const STORAGE_KEY = "gcore-guide-shown-v1";
const AUTO_DISMISS_MS = 12000;

export class GestureGuide {
  private container: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private progressEl: HTMLElement | null = null;
  private dismissTimer: number | null = null;
  private progressFrame: number | null = null;
  private startTime = 0;

  constructor() {
    this.styleEl = this.injectStyles();
    this.container = this.build();
    document.body.appendChild(this.container);
  }

  showIfFirstTime(): void {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setTimeout(() => this.show(), 1200);
  }

  show(): void {
    this.container.classList.add("gcguide--visible");
    this.startTime = Date.now();
    this.startProgress();
    this.dismissTimer = window.setTimeout(() => this.hide(), AUTO_DISMISS_MS);
  }

  hide(): void {
    this.container.classList.remove("gcguide--visible");
    if (this.dismissTimer) { clearTimeout(this.dismissTimer); this.dismissTimer = null; }
    if (this.progressFrame) { cancelAnimationFrame(this.progressFrame); this.progressFrame = null; }
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
  }

  destroy(): void {
    this.hide();
    this.container.remove();
    this.styleEl.remove();
  }

  private startProgress(): void {
    const tick = () => {
      const elapsed = Date.now() - this.startTime;
      const p = Math.min(1, elapsed / AUTO_DISMISS_MS);
      if (this.progressEl) this.progressEl.style.width = `${p * 100}%`;
      if (p < 1) this.progressFrame = requestAnimationFrame(tick);
    };
    this.progressFrame = requestAnimationFrame(tick);
  }

  private build(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "gcguide";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Gesture control guide");

    const html = `
      <div class="gcguide-card">
        <div class="gcguide-header">
          <span class="gcguide-header-icon">🤚</span>
          <div>
            <div class="gcguide-title">Gesture Control Active</div>
            <div class="gcguide-subtitle">Here's how to control the app with your hand</div>
          </div>
        </div>
        <div class="gcguide-grid">
          ${ITEMS.map(i => `
            <div class="gcguide-item">
              <span class="gcguide-item-icon">${i.icon}</span>
              <div class="gcguide-item-label">${i.label}</div>
              <div class="gcguide-item-desc">${i.desc}</div>
            </div>
          `).join("")}
        </div>
        <div class="gcguide-footer">
          <div class="gcguide-progress-track"><div class="gcguide-progress-fill"></div></div>
          <button class="gcguide-btn" data-gesture-dwell type="button">Got it!</button>
        </div>
      </div>
    `;
    wrap.innerHTML = html;

    this.progressEl = wrap.querySelector(".gcguide-progress-fill");
    wrap.querySelector(".gcguide-btn")?.addEventListener("click", () => this.hide());
    return wrap;
  }

  private injectStyles(): HTMLStyleElement {
    const s = document.createElement("style");
    s.textContent = `
      .gcguide {
        position: fixed; inset: 0; z-index: 2147483645;
        display: flex; align-items: center; justify-content: center;
        pointer-events: none; opacity: 0;
        transition: opacity 0.3s ease;
        background: rgba(0,0,0,0.35);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      .gcguide--visible { opacity: 1; pointer-events: auto; }
      .gcguide-card {
        background: rgba(13,19,33,0.97);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px;
        padding: 24px;
        width: min(480px, 90vw);
        box-shadow: 0 24px 80px rgba(0,0,0,0.7);
        font-family: system-ui,-apple-system,sans-serif;
        animation: gcguide-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes gcguide-in { from { transform: scale(0.88) translateY(12px); opacity:0; } }
      .gcguide-header {
        display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
        padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .gcguide-header-icon { font-size: 36px; line-height: 1; }
      .gcguide-title { font-size: 17px; font-weight: 700; color: #e2e8f0; }
      .gcguide-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
      .gcguide-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr;
        gap: 12px; margin-bottom: 20px;
      }
      .gcguide-item {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px; padding: 12px 10px; text-align: center;
      }
      .gcguide-item-icon { font-size: 28px; display: block; margin-bottom: 6px; }
      .gcguide-item-label { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 3px; }
      .gcguide-item-desc { font-size: 11px; color: #64748b; line-height: 1.4; }
      .gcguide-footer { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
      .gcguide-progress-track {
        height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
      }
      .gcguide-progress-fill {
        height: 100%; width: 0%; background: #0070f2; border-radius: 2px;
        transition: width 0.1s linear;
      }
      .gcguide-btn {
        background: #0070f2; color: #fff; border: none; border-radius: 8px;
        padding: 10px 0; font-size: 14px; font-weight: 700; cursor: pointer;
        transition: background 0.15s;
      }
      .gcguide-btn:hover { background: #0064d9; }
    `;
    document.head.appendChild(s);
    return s;
  }
}
