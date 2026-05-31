import { useEffect } from "react";
import { useLocation } from "wouter";
import { VoiceCommandEngine } from "@workspace/gesture-core";

const VOICE_PAGES = [
  { id: "home",      name: "Home" },
  { id: "dashboard", name: "Dashboard" },
  { id: "reports",   name: "Reports" },
  { id: "analytics", name: "Analytics" },
  { id: "settings",  name: "Settings" },
  { id: "paint",     name: "Paint" },
];

const ID_TO_PATH: Record<string, string> = {
  home:      "/",
  dashboard: "/dashboard",
  reports:   "/reports",
  analytics: "/analytics",
  settings:  "/settings",
  paint:     "/paint",
};

function resolveNavId(raw: string): string | null {
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  for (const page of VOICE_PAGES) {
    const pid = page.id.replace(/[^a-z]/g, "");
    const pname = page.name.toLowerCase().replace(/[^a-z]/g, "");
    if (pid === key || pname === key || pid.startsWith(key) || key.startsWith(pid)) {
      return page.id;
    }
  }
  return null;
}

export function useVoiceCommands() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";
    if (!apiKey) return;

    const voice = new VoiceCommandEngine({
      geminiApiKey: apiKey,
      getPages: () => VOICE_PAGES,
      getCurrentPage: () => {
        const path = window.location.pathname.split("/").filter(Boolean).pop() ?? "home";
        return path || "home";
      },
      onAction: (action) => {
        if (action.type === "navigate" && action.page) {
          const id = resolveNavId(action.page);
          if (id) {
            const btn = document.querySelector<HTMLElement>(`[data-nav-id="${id}"]`);
            if (btn) {
              btn.click();
              return true;
            }
            const path = ID_TO_PATH[id];
            if (path) {
              navigate(path);
              return true;
            }
          }
        }
        if (action.type === "click" && action.label) {
          const lower = action.label.toLowerCase();
          const els = document.querySelectorAll<HTMLElement>("button, a, [role='button']");
          for (const el of els) {
            if ((el.textContent ?? "").toLowerCase().includes(lower)) {
              el.click();
              return true;
            }
          }
        }
        return false;
      },
    });

    return () => voice.destroy();
  }, [navigate]);
}
