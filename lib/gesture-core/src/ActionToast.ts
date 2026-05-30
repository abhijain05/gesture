const TOAST_DURATION_MS = 2200;

export class ActionToast {
  private container: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private timer: number | null = null;

  constructor() {
    this.styleEl = this.injectStyles();
    this.container = document.createElement("div");
    this.container.className = "gctoast";
    document.body.appendChild(this.container);
  }

  show(icon: string, message: string): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.container.innerHTML = `<span class="gctoast-icon">${icon}</span><span class="gctoast-msg">${message}</span>`;
    this.container.classList.remove("gctoast--out");
    this.container.classList.add("gctoast--visible");
    this.timer = window.setTimeout(() => {
      this.container.classList.add("gctoast--out");
      this.timer = window.setTimeout(() => {
        this.container.classList.remove("gctoast--visible", "gctoast--out");
      }, 300);
    }, TOAST_DURATION_MS);
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.container.remove();
    this.styleEl.remove();
  }

  private injectStyles(): HTMLStyleElement {
    const s = document.createElement("style");
    s.textContent = `
      .gctoast {
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-80px);
        z-index: 2147483647;
        background: rgba(13,19,33,0.95); color: #e2e8f0;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 24px;
        padding: 8px 18px 8px 12px;
        display: none; align-items: center; gap: 8px;
        font-family: system-ui,-apple-system,sans-serif;
        font-size: 13px; font-weight: 600;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        pointer-events: none;
        white-space: nowrap;
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease;
        opacity: 0;
      }
      .gctoast--visible {
        display: flex;
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .gctoast--out {
        transform: translateX(-50%) translateY(-16px);
        opacity: 0;
        transition: transform 0.22s ease, opacity 0.22s ease;
      }
      .gctoast-icon { font-size: 16px; }
      .gctoast-msg { color: #e2e8f0; }
    `;
    document.head.appendChild(s);
    return s;
  }
}
