import { GestureEngine } from "@workspace/gesture-core";
import type { GestureUI5Options } from "./types.js";

const UI5_CLICKABLE_ROLES = new Set([
  "button", "link", "menuitem", "option", "tab",
  "listitem", "row", "treeitem", "checkbox", "radio",
  "combobox", "spinbutton", "switch",
]);

const UI5_CLICKABLE_TAGS = new Set([
  "button", "a", "input", "select", "textarea",
]);

const UI5_SELECTORS = [
  "[data-sap-ui]",
  ".sapMBtn",
  ".sapMListItem",
  ".sapMNavItem",
  ".sapMTile",
  ".sapMSegBBtn",
  ".sapUiTab",
  ".sapMTabStripItem",
  ".sapMSelectListItem",
  ".sapMTreeItem",
];

export class UI5Adapter {
  private engine: GestureEngine;
  private options: Required<GestureUI5Options>;
  private pinchHandler: ((e: Event) => void) | null = null;
  private palmHandler: ((e: Event) => void) | null = null;
  private twoFingerHandler: ((e: Event) => void) | null = null;
  private dwellHandler: ((e: Event) => void) | null = null;

  constructor(options: GestureUI5Options = {}) {
    this.options = {
      sensitivity: 0.6,
      dwellTimeMs: 600,
      audioFeedback: true,
      showCursor: true,
      showWebcam: true,
      onNavigate: options.onNavigate ?? (() => {}),
      onAction: options.onAction ?? (() => {}),
      homeSelector: options.homeSelector ?? "[data-gesture-home]",
      scrollSelector: options.scrollSelector ?? ".sapMScrollContV, .sapUiScrollDelegate",
      ...options,
    };

    this.engine = new GestureEngine({
      sensitivity: this.options.sensitivity,
      dwellTimeMs: this.options.dwellTimeMs,
      audioFeedback: this.options.audioFeedback,
      showCursor: this.options.showCursor,
      showWebcam: this.options.showWebcam,
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.pinchHandler = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const target = this.findUI5Target(x, y);
      if (target) {
        const id = target.getAttribute("id") ?? target.getAttribute("data-action") ?? "";
        this.options.onAction(id, target);
        target.click?.();
        (target as HTMLElement).focus?.();
      }
    };

    this.palmHandler = () => {
      const homeEl = document.querySelector<HTMLElement>(this.options.homeSelector);
      if (homeEl) {
        homeEl.click();
        this.options.onNavigate("home");
      } else {
        this.options.onNavigate("home");
      }
    };

    this.twoFingerHandler = (e: Event) => {
      const { deltaY } = (e as CustomEvent<{ deltaY: number }>).detail;
      const scrollEl = this.findUI5ScrollContainer();
      if (scrollEl) scrollEl.scrollBy({ top: deltaY, behavior: "instant" as ScrollBehavior });
    };

    this.dwellHandler = (e: Event) => {
      const { target } = (e as CustomEvent<{ target: Element | null; progress: number }>).detail;
      if (target) {
        const id = (target as HTMLElement).getAttribute("id") ?? "";
        if (id) this.options.onNavigate(id);
      }
    };

    document.addEventListener("gesture:pinch", this.pinchHandler);
    document.addEventListener("gesture:palm", this.palmHandler);
    document.addEventListener("gesture:twofinger", this.twoFingerHandler);
    document.addEventListener("gesture:dwell", this.dwellHandler);
  }

  private findUI5Target(x: number, y: number): HTMLElement | null {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el && el !== document.body) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") ?? "";
      if (UI5_CLICKABLE_TAGS.has(tag) || UI5_CLICKABLE_ROLES.has(role)) return el;
      for (const sel of UI5_SELECTORS) {
        if (el.matches(sel)) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  private findUI5ScrollContainer(): Element | null {
    const explicit = document.querySelector(this.options.scrollSelector);
    if (explicit) return explicit;
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 10) {
        return el;
      }
    }
    return null;
  }

  async init(): Promise<void> {
    await this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
    if (this.pinchHandler) document.removeEventListener("gesture:pinch", this.pinchHandler);
    if (this.palmHandler) document.removeEventListener("gesture:palm", this.palmHandler);
    if (this.twoFingerHandler) document.removeEventListener("gesture:twofinger", this.twoFingerHandler);
    if (this.dwellHandler) document.removeEventListener("gesture:dwell", this.dwellHandler);
  }

  getEngine(): GestureEngine {
    return this.engine;
  }
}
