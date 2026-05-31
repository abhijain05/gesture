import type { VoicePage } from "@workspace/gesture-core";

/**
 * SAP UI5 DOM scanner — discovers navigable pages and interactive
 * elements at runtime by reading the live DOM.  Nothing is hardcoded:
 * every scan runs fresh so lazy-loaded shells, permission-gated tabs
 * and SPA route changes are always reflected.
 */

// Ordered list of SAP UI5 nav selectors (most specific first).
// All standard SAP UI5 / Fiori shells are covered; custom apps can
// add `data-gesture-nav="<id>"` to any element to opt-in explicitly.
const NAV_SELECTORS = [
  // ── explicit opt-in (highest priority) ─────────────────────────
  "[data-gesture-nav]",

  // ── sap.m.NavigationList ──────────────────────────────────────
  ".sapMNavList .sapMNavListItem:not([aria-disabled='true'])",
  ".sapMNavItem:not([aria-disabled='true'])",

  // ── sap.m.TabBar ─────────────────────────────────────────────
  ".sapMTabBarItem:not([aria-disabled='true'])",
  ".sapMTabStripItem:not([aria-disabled='true'])",
  "[class*='sapMITBItem']:not([aria-disabled='true']):not([class*='Dsbl'])",

  // ── sap.m.IconTabBar ─────────────────────────────────────────
  ".sapMITH .sapMITBHead:not([aria-disabled='true'])",

  // ── sap.m.SegmentedButton ────────────────────────────────────
  ".sapMSegBBtn:not([aria-disabled='true'])",

  // ── sap.f.DynamicPage / ObjectPage anchor bar ─────────────────
  ".sapUxAPAnchorBarButton:not([disabled])",

  // ── SAP Fiori Launchpad ───────────────────────────────────────
  ".sapUshellTile[role='button']",
  ".sapUshellGroupItemContainer .sapUshellContainerTitle",
  ".sapUshellNavItem",

  // ── SAP ShellBar / Unified Shell ─────────────────────────────
  ".sapFShellBarMenuButton",
  ".sapUshellShellHeadItm",

  // ── sap.m.List navigation items ──────────────────────────────
  ".sapMSLI[role='option']",
  ".sapMLIB[role='option']",

  // ── Generic accessible fallbacks ─────────────────────────────
  "nav [role='tab']:not([aria-disabled='true'])",
  "nav [role='menuitem']:not([aria-disabled='true'])",
  "[role='navigation'] a[href]",
  "[role='navigation'] button:not([disabled])",
  "[role='tablist'] [role='tab']:not([aria-disabled='true'])",
].join(",");

const SEARCH_SELECTORS = [
  // SAP SearchField
  ".sapMSearchField input",
  ".sapMSF input",
  "[class*='sapMSearchField'] input",
  // SAP FilterBar
  ".sapUiSFB input",
  ".sapUiSFBInput input",
  // SAP SmartFilterBar
  ".sapUiSmartFilterBar input[type='text']",
  // Explicit hint
  "[data-voice-search]",
  // Standard HTML fallbacks
  "input[type='search']",
  "input[placeholder*='earch' i]",
  "input[placeholder*='ilter' i]",
].join(",");

// Extract a readable label from a SAP UI5 element
function extractLabel(el: Element): string {
  // Explicit hint wins
  const hint = el.getAttribute("data-gesture-nav");
  if (hint && hint !== "" && hint !== "true") return hint;

  // ARIA label
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();

  // title attribute
  const title = el.getAttribute("title");
  if (title) return title.trim();

  // SAP UI5 inner text elements (most controls put visible text in a span)
  const inner = el.querySelector(
    ".sapMNavListItemText, .sapMITBText, .sapMTabBarItemText, " +
    ".sapMBtnContent, .sapMSegBBtnInner, .sapUxAPAnchorBarScrollContainer span, " +
    ".sapUshellContainerTitle, .sapUshellTileTitle, .sapFShellBarMenuButton span"
  );
  if (inner?.textContent?.trim()) return inner.textContent.trim();

  // Raw text content (strip whitespace runs)
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
}

// Build a stable id from a label
function labelToId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// Detect current page from hash / pathname (SAP UI5 always uses hash routing)
function detectCurrentPage(): string {
  const hash = location.hash.replace(/^#\/?/, "").split("?")[0].split("/")[0];
  if (hash) return hash;
  const seg = location.pathname.split("/").filter(Boolean).pop();
  return seg ?? "home";
}

export class SapUI5Scanner {
  private observer: MutationObserver | null = null;
  private onPagesChange?: (pages: VoicePage[]) => void;

  /**
   * Scan the live DOM and return all navigable pages found.
   * Called fresh at each voice trigger — no caching.
   */
  getNavPages(): VoicePage[] {
    const seen = new Set<string>();
    const pages: VoicePage[] = [];

    try {
      const elements = document.querySelectorAll(NAV_SELECTORS);
      for (const el of elements) {
        if (!isVisible(el)) continue;
        const label = extractLabel(el);
        if (!label || label.length < 2) continue;
        const id = labelToId(label);
        if (seen.has(id)) continue;
        seen.add(id);
        pages.push({ name: label, id });
      }
    } catch {
      // DOM may be mid-update; return what we have
    }

    return pages;
  }

  /**
   * Navigate to a page by finding and clicking the matching nav element.
   * Returns true if a match was found and clicked.
   */
  navigate(pageName: string): boolean {
    const lower = pageName.toLowerCase().replace(/[-_]/g, " ");
    try {
      const elements = document.querySelectorAll(NAV_SELECTORS);
      for (const el of elements) {
        if (!isVisible(el)) continue;
        const label = extractLabel(el).toLowerCase().replace(/[-_]/g, " ");
        if (
          label.includes(lower) ||
          lower.includes(label) ||
          labelToId(label) === labelToId(pageName)
        ) {
          (el as HTMLElement).click();
          return true;
        }
      }
    } catch {
    }
    return false;
  }

  /**
   * Find the best search/filter input on the current view.
   */
  getSearchInput(): HTMLInputElement | null {
    return document.querySelector<HTMLInputElement>(SEARCH_SELECTORS);
  }

  /**
   * Fill the search input and fire React/UI5-compatible events.
   */
  async fillSearch(query: string, delayMs = 400): Promise<boolean> {
    await sleep(delayMs);
    const input = this.getSearchInput();
    if (!input) return false;

    input.focus();

    // React synthetic value setter
    const proto = Object.getPrototypeOf(input) === HTMLInputElement.prototype
      ? HTMLInputElement.prototype
      : Object.getPrototypeOf(input);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
      ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, query);
    else input.value = query;

    // Fire all event types UI5 / React / Vue listen to
    for (const type of ["input", "change", "keyup"]) {
      input.dispatchEvent(new Event(type, { bubbles: true }));
    }

    // SAP UI5 live-change event
    input.dispatchEvent(new CustomEvent("sap-change", { bubbles: true, detail: { value: query } }));

    return true;
  }

  /**
   * Click an element by its visible text (for generic "click X" commands).
   */
  clickByLabel(label: string): boolean {
    const lower = label.toLowerCase();
    const candidates = document.querySelectorAll<HTMLElement>(
      "button, a, [role='button'], [role='menuitem'], [role='tab'], .sapMBtn"
    );
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      if ((el.textContent ?? "").toLowerCase().includes(lower)) {
        el.click();
        return true;
      }
    }
    return false;
  }

  /**
   * Current page id inferred from URL hash / pathname.
   */
  getCurrentPage(): string {
    return detectCurrentPage();
  }

  /**
   * Watch for DOM changes and call `cb` when navigable pages change.
   * Useful for shells that lazily add nav items.
   */
  watchNavChanges(cb: (pages: VoicePage[]) => void): void {
    this.onPagesChange = cb;
    let last = JSON.stringify(this.getNavPages());

    this.observer = new MutationObserver(() => {
      const current = JSON.stringify(this.getNavPages());
      if (current !== last) {
        last = current;
        cb(this.getNavPages());
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "aria-current", "class", "data-gesture-nav"],
    });
  }

  stopWatching(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
