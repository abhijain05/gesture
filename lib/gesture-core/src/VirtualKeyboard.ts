const WORD_LIST = ("the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us please find create update delete search open close save send order confirm cancel select return home back next previous submit approve reject navigate show list detail view report sales order customer product invoice delivery service note message task project team user admin setting account profile email phone number address city country date amount total price quantity status name title description comment attachment document file export import print help support").split(" ");

type KeyDef = string | { key: string; label: string; flex?: number };

const ROWS: KeyDef[][] = [
  ["1","2","3","4","5","6","7","8","9","0",{key:"BACKSPACE",label:"⌫",flex:1.8}],
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L",{key:"ENTER",label:"↵",flex:1.8}],
  [{key:"SHIFT",label:"⇧",flex:1.6},"Z","X","C","V","B","N","M",{key:"SHIFT2",label:"⇧",flex:1.6}],
  [{key:"COMMA",label:",",flex:0.8},{key:"PERIOD",label:".",flex:0.8},{key:"SPACE",label:"Space",flex:6},{key:"CLOSE",label:"✕",flex:1.2}],
];

const SHIFT_MAP: Record<string,string> = {
  "1":"!","2":"@","3":"#","4":"$","5":"%","6":"^","7":"&","8":"*","9":"(","0":")",
  "COMMA":"<","PERIOD":">",
};

export class VirtualKeyboard {
  private container: HTMLDivElement;
  private suggRow: HTMLDivElement | null = null;
  private currentInput: HTMLInputElement | HTMLTextAreaElement | null = null;
  private isShift = false;
  private isCaps = false;
  private visible = false;
  private dwellTimeMs: number;
  private keyDwellStart = 0;
  private keyDwellEl: HTMLElement | null = null;
  private keyDwellFrame: number | null = null;
  private focusInHandler: (e: Event) => void;
  private gestureHandler: (e: Event) => void;
  private keydownHandler: (e: KeyboardEvent) => void;
  private styleEl: HTMLStyleElement;

  constructor(options: { dwellTimeMs?: number } = {}) {
    this.dwellTimeMs = options.dwellTimeMs ?? 550;
    this.container = this.buildKeyboard();
    document.body.appendChild(this.container);
    this.styleEl = this.injectStyles();
    this.focusInHandler = this.onFocusIn.bind(this);
    this.gestureHandler = this.onGestureCursor.bind(this);
    this.keydownHandler = this.onKeydown.bind(this);
    document.addEventListener("focusin", this.focusInHandler, true);
    document.addEventListener("gesture:cursor", this.gestureHandler as EventListener);
    document.addEventListener("keydown", this.keydownHandler, true);
  }

  destroy(): void {
    document.removeEventListener("focusin", this.focusInHandler, true);
    document.removeEventListener("gesture:cursor", this.gestureHandler as EventListener);
    document.removeEventListener("keydown", this.keydownHandler, true);
    this.container.remove();
    this.styleEl.remove();
    if (this.keyDwellFrame) cancelAnimationFrame(this.keyDwellFrame);
  }

  private onFocusIn(e: Event): void {
    const target = e.target as HTMLElement;
    if (this.container.contains(target)) return;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      const inp = target as HTMLInputElement;
      const t = inp.type || "text";
      if (["text","search","email","url","tel","number","password",""].includes(t)) {
        this.currentInput = inp;
        this.show();
        return;
      }
    }
    if (!this.container.contains(target)) {
      this.hide();
    }
  }

  private onGestureCursor(e: Event): void {
    if (!this.visible) return;
    const ce = e as CustomEvent<{ x: number; y: number }>;
    const { x, y } = ce.detail;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const keyEl = el?.closest("[data-vk-key]") as HTMLElement | null;

    if (!keyEl || !this.container.contains(keyEl)) {
      this.clearKeyDwell();
      return;
    }

    if (keyEl !== this.keyDwellEl) {
      this.clearKeyDwell();
      this.keyDwellEl = keyEl;
      this.keyDwellStart = Date.now();
      this.tickDwell();
    }
  }

  private tickDwell(): void {
    if (!this.keyDwellEl) return;
    const elapsed = Date.now() - this.keyDwellStart;
    const progress = Math.min(1, elapsed / this.dwellTimeMs);
    this.setKeyProgress(this.keyDwellEl, progress);
    if (progress >= 1) {
      const key = this.keyDwellEl.dataset.vkKey!;
      this.keyDwellEl.classList.add("vk-key-fired");
      setTimeout(() => this.keyDwellEl?.classList.remove("vk-key-fired"), 200);
      this.clearKeyDwell(false);
      this.pressKey(key);
    } else {
      this.keyDwellFrame = requestAnimationFrame(() => this.tickDwell());
    }
  }

  private clearKeyDwell(resetEl = true): void {
    if (this.keyDwellFrame) { cancelAnimationFrame(this.keyDwellFrame); this.keyDwellFrame = null; }
    if (this.keyDwellEl) this.setKeyProgress(this.keyDwellEl, 0);
    if (resetEl) this.keyDwellEl = null;
  }

  private setKeyProgress(el: HTMLElement, progress: number): void {
    const fill = el.querySelector(".vk-key-fill") as HTMLElement | null;
    if (fill) {
      fill.style.width = `${progress * 100}%`;
      fill.style.opacity = progress > 0 ? "1" : "0";
    }
    if (progress > 0) el.classList.add("vk-key-hover");
    else el.classList.remove("vk-key-hover");
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.visible) {
      this.hide();
    }
  }

  private pressKey(key: string): void {
    const input = this.currentInput;
    if (!input && key !== "CLOSE") return;

    if (key === "CLOSE") { this.hide(); return; }

    // Word suggestion completion
    if (key.startsWith("WORD:") && input) {
      const word = key.slice(5);
      const val = input.value;
      const lastSpace = Math.max(val.lastIndexOf(" "), val.lastIndexOf("\n"));
      const before = lastSpace >= 0 ? val.slice(0, lastSpace + 1) : "";
      const newVal = before + word + " ";
      const setter = Object.getOwnPropertyDescriptor(
        input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      )?.set;
      if (setter) {
        setter.call(input, newVal);
        try { input.setSelectionRange(newVal.length, newVal.length); } catch (_) {}
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      this.updatePreview();
      return;
    }
    if (key === "SHIFT" || key === "SHIFT2") {
      this.isShift = !this.isShift;
      this.updateLabels();
      return;
    }
    if (key === "CAPS") {
      this.isCaps = !this.isCaps;
      this.updateLabels();
      return;
    }

    if (!input) return;
    input.focus();

    if (key === "BACKSPACE") {
      this.typeBackspace(input);
    } else if (key === "ENTER") {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
      input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
      this.hide();
    } else if (key === "SPACE") {
      this.typeChar(input, " ");
    } else if (key === "COMMA") {
      this.typeChar(input, this.isShift ? "<" : ",");
    } else if (key === "PERIOD") {
      this.typeChar(input, this.isShift ? ">" : ".");
    } else {
      let char = key;
      if (this.isShift && SHIFT_MAP[key]) {
        char = SHIFT_MAP[key];
      } else {
        const isUpper = this.isCaps !== this.isShift;
        char = isUpper ? key.toUpperCase() : key.toLowerCase();
      }
      this.typeChar(input, char);
      if (this.isShift) { this.isShift = false; this.updateLabels(); }
    }
    this.updatePreview();
    this.updateSuggestions();
  }

  private typeChar(el: HTMLInputElement | HTMLTextAreaElement, char: string): void {
    el.focus();
    if (document.execCommand("insertText", false, char)) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    )?.set;
    if (setter) {
      setter.call(el, el.value.slice(0, start) + char + el.value.slice(end));
      try { el.setSelectionRange(start + 1, start + 1); } catch (_) {}
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  private typeBackspace(el: HTMLInputElement | HTMLTextAreaElement): void {
    el.focus();
    if (document.execCommand("delete", false)) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    )?.set;
    if (setter) {
      if (start !== end) {
        setter.call(el, el.value.slice(0, start) + el.value.slice(end));
        try { el.setSelectionRange(start, start); } catch (_) {}
      } else if (start > 0) {
        setter.call(el, el.value.slice(0, start - 1) + el.value.slice(end));
        try { el.setSelectionRange(start - 1, start - 1); } catch (_) {}
      }
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  private updatePreview(): void {
    const preview = this.container.querySelector(".vk-preview") as HTMLElement | null;
    if (preview && this.currentInput) {
      preview.textContent = this.currentInput.value || this.currentInput.placeholder || "";
      preview.style.color = this.currentInput.value ? "#e2e8f0" : "#64748b";
    }
  }

  private updateLabels(): void {
    const isUpper = this.isCaps !== this.isShift;
    this.container.querySelectorAll<HTMLElement>("[data-vk-key]").forEach((btn) => {
      const key = btn.dataset.vkKey!;
      const labelEl = btn.querySelector(".vk-key-label") as HTMLElement | null;
      if (!labelEl) return;
      if (key.length === 1 && /[A-Z]/.test(key)) {
        labelEl.textContent = isUpper ? key.toUpperCase() : key.toLowerCase();
      } else if (key === "SHIFT" || key === "SHIFT2") {
        btn.classList.toggle("vk-shift-active", this.isShift);
      } else if (key === "COMMA") {
        labelEl.textContent = this.isShift ? "<" : ",";
      } else if (key === "PERIOD") {
        labelEl.textContent = this.isShift ? ">" : ".";
      } else if (key in SHIFT_MAP) {
        labelEl.textContent = this.isShift ? SHIFT_MAP[key] : key;
      }
    });
  }

  private show(): void {
    if (this.visible) { this.updatePreview(); this.updateSuggestions(); return; }
    this.visible = true;
    this.container.style.transform = "translateY(0)";
    this.container.style.opacity = "1";
    this.updatePreview();
    this.updateSuggestions();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.style.transform = "translateY(110%)";
    this.container.style.opacity = "0";
    this.currentInput = null;
    this.clearKeyDwell();
  }

  private buildKeyboard(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.id = "gesture-virtual-keyboard";
    wrap.setAttribute("aria-hidden", "true");

    const header = document.createElement("div");
    header.className = "vk-header";
    header.innerHTML = `
      <span class="vk-icon">⌨️</span>
      <span class="vk-title">Gesture Keyboard</span>
      <div class="vk-preview-wrap">
        <span class="vk-preview"></span>
      </div>
      <span class="vk-hint">Point + hold key to type · Pinch to press</span>
    `;
    wrap.appendChild(header);

    const body = document.createElement("div");
    body.className = "vk-body";

    for (const row of ROWS) {
      const rowEl = document.createElement("div");
      rowEl.className = "vk-row";
      for (const keyDef of row) {
        const key = typeof keyDef === "string" ? keyDef : keyDef.key;
        const label = typeof keyDef === "string" ? keyDef : keyDef.label;
        const flex = typeof keyDef === "string" ? 1 : (keyDef.flex ?? 1);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vk-key";
        btn.dataset.vkKey = key;
        btn.style.flex = String(flex);

        if (["BACKSPACE","ENTER","SHIFT","SHIFT2","SPACE","CLOSE"].includes(key)) {
          btn.classList.add("vk-key-special");
        }
        if (key === "CLOSE") btn.classList.add("vk-key-close");

        const fill = document.createElement("span");
        fill.className = "vk-key-fill";
        btn.appendChild(fill);

        const labelEl = document.createElement("span");
        labelEl.className = "vk-key-label";
        labelEl.textContent = label;
        btn.appendChild(labelEl);

        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => this.pressKey(key));

        rowEl.appendChild(btn);
      }
      body.appendChild(rowEl);
    }

    // Suggestion row (word completion)
    const suggRow = document.createElement("div");
    suggRow.className = "vk-sugg-row";
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vk-sugg-btn";
      btn.dataset.vkKey = `WORD:`;
      btn.style.display = "none";
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => {
        const word = btn.dataset.vkKey?.replace("WORD:", "") ?? "";
        if (word) this.pressKey(`WORD:${word}`);
      });
      suggRow.appendChild(btn);
    }
    this.suggRow = suggRow;
    wrap.appendChild(suggRow);

    wrap.appendChild(body);
    return wrap;
  }

  private updateSuggestions(): void {
    if (!this.suggRow || !this.currentInput) {
      this.suggRow?.querySelectorAll<HTMLElement>(".vk-sugg-btn").forEach(b => { b.style.display = "none"; });
      return;
    }
    const val = this.currentInput.value;
    const parts = val.split(/\s+/);
    const current = parts[parts.length - 1].toLowerCase();
    const btns = this.suggRow.querySelectorAll<HTMLElement>(".vk-sugg-btn");
    if (current.length < 1) {
      btns.forEach(b => { b.style.display = "none"; });
      return;
    }
    const matches = WORD_LIST.filter(w => w.startsWith(current) && w.length > current.length).slice(0, 3);
    btns.forEach((btn, i) => {
      if (matches[i]) {
        btn.textContent = matches[i];
        (btn as HTMLElement).dataset.vkKey = `WORD:${matches[i]}`;
        btn.style.display = "";
      } else {
        btn.style.display = "none";
      }
    });
  }

  private injectStyles(): HTMLStyleElement {
    const style = document.createElement("style");
    style.id = "gesture-virtual-keyboard-styles";
    style.textContent = `
      #gesture-virtual-keyboard {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 2147483646;
        background: rgba(13, 19, 33, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-top: 1px solid rgba(255,255,255,0.1);
        padding: 0 12px 12px;
        transform: translateY(110%);
        opacity: 0;
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease;
        box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
        font-family: system-ui, -apple-system, sans-serif;
        user-select: none;
      }
      .vk-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 4px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 10px;
      }
      .vk-icon { font-size: 16px; }
      .vk-title { font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 0.06em; }
      .vk-preview-wrap {
        flex: 1;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        padding: 4px 10px;
        min-width: 0;
        overflow: hidden;
      }
      .vk-preview {
        font-size: 13px;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        max-width: 100%;
      }
      .vk-hint { font-size: 10px; color: #475569; white-space: nowrap; }
      .vk-body { display: flex; flex-direction: column; gap: 6px; }
      .vk-row { display: flex; gap: 5px; justify-content: center; }
      .vk-key {
        position: relative;
        overflow: hidden;
        flex: 1;
        min-width: 0;
        height: 44px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 7px;
        color: #e2e8f0;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.1s, border-color 0.1s, transform 0.1s;
        padding: 0;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }
      .vk-key:hover, .vk-key-hover {
        background: rgba(0,112,242,0.25);
        border-color: rgba(0,112,242,0.5);
      }
      .vk-key-fired {
        background: rgba(0,112,242,0.6) !important;
        transform: scale(0.93);
        border-color: #0070f2 !important;
      }
      .vk-key-special { font-size: 13px; color: #94a3b8; background: rgba(255,255,255,0.04); }
      .vk-key-close { color: #f87171 !important; background: rgba(248,113,113,0.1) !important; border-color: rgba(248,113,113,0.3) !important; }
      .vk-key-close:hover { background: rgba(248,113,113,0.25) !important; }
      .vk-shift-active { background: rgba(0,112,242,0.3) !important; border-color: #0070f2 !important; color: #60a5fa !important; }
      .vk-key-fill {
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 0%;
        opacity: 0;
        background: linear-gradient(90deg, rgba(0,112,242,0.5), rgba(0,112,242,0.3));
        transition: none;
        border-radius: 7px;
        pointer-events: none;
      }
      .vk-key-label { position: relative; z-index: 1; pointer-events: none; }
      .vk-sugg-row {
        display: flex; gap: 6px; padding: 0 0 8px;
      }
      .vk-sugg-btn {
        flex: 1;
        height: 34px;
        background: rgba(0,112,242,0.15);
        border: 1px solid rgba(0,112,242,0.35);
        border-radius: 20px;
        color: #60a5fa;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        padding: 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background 0.12s, border-color 0.12s;
        outline: none;
      }
      .vk-sugg-btn:hover {
        background: rgba(0,112,242,0.3);
        border-color: rgba(0,112,242,0.6);
        color: #93c5fd;
      }
    `;
    document.head.appendChild(style);
    return style;
  }
}
