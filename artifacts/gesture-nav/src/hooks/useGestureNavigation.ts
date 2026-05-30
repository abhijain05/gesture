import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGestureContext } from "@/context/GestureContext";
import { playGestureSound } from "@/lib/audio";

const NAV_ITEMS = [
  { id: "home", path: "/" },
  { id: "dashboard", path: "/dashboard" },
  { id: "reports", path: "/reports" },
  { id: "analytics", path: "/analytics" },
  { id: "settings", path: "/settings" },
];

const NAV_ITEM_ELEMENTS_SELECTOR = "[data-nav-id]";
const HOVER_DWELL_MS = 800;
const PINCH_DEBOUNCE_MS = 1200;
const PALM_DEBOUNCE_MS = 1500;

export function useGestureNavigation() {
  const { currentGesture, cursorPosition, hoveredNavItem, setGestureState, gestureSettings } =
    useGestureContext();
  const [, navigate] = useLocation();

  const hoverStartRef = useRef<number | null>(null);
  const lastHoveredRef = useRef<string | null>(null);
  const lastPinchRef = useRef<number>(0);
  const lastPalmRef = useRef<number>(0);
  const hoverProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getHoveredNavItem = useCallback((x: number, y: number): string | null => {
    const elements = document.querySelectorAll<HTMLElement>(NAV_ITEM_ELEMENTS_SELECTOR);
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return el.getAttribute("data-nav-id");
      }
    }
    return null;
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      playGestureSound("select");
    },
    [navigate]
  );

  useEffect(() => {
    if (!gestureSettings.pointFingerEnabled && currentGesture === "POINT_FINGER") return;

    if (currentGesture === "POINT_FINGER" && cursorPosition) {
      const hovered = getHoveredNavItem(cursorPosition.x, cursorPosition.y);

      if (hovered !== hoveredNavItem) {
        setGestureState({ hoveredNavItem: hovered });
        if (hovered !== lastHoveredRef.current) {
          hoverStartRef.current = Date.now();
          lastHoveredRef.current = hovered;
          if (hovered) playGestureSound("hover");
        }
      }

      if (hovered && hoverStartRef.current) {
        const elapsed = Date.now() - hoverStartRef.current;
        if (elapsed >= HOVER_DWELL_MS) {
          const item = NAV_ITEMS.find((n) => n.id === hovered);
          if (item) {
            navigateTo(item.path);
            hoverStartRef.current = null;
            lastHoveredRef.current = null;
          }
        }
      }
    } else {
      if (hoveredNavItem !== null) {
        setGestureState({ hoveredNavItem: null });
      }
      hoverStartRef.current = null;
      lastHoveredRef.current = null;
    }
  }, [
    currentGesture,
    cursorPosition,
    hoveredNavItem,
    getHoveredNavItem,
    setGestureState,
    navigateTo,
    gestureSettings.pointFingerEnabled,
  ]);

  useEffect(() => {
    if (!gestureSettings.pinchEnabled) return;
    if (currentGesture !== "PINCH") return;
    const now = Date.now();
    if (now - lastPinchRef.current < PINCH_DEBOUNCE_MS) return;
    lastPinchRef.current = now;

    if (hoveredNavItem) {
      const item = NAV_ITEMS.find((n) => n.id === hoveredNavItem);
      if (item) navigateTo(item.path);
    }
  }, [currentGesture, hoveredNavItem, navigateTo, gestureSettings.pinchEnabled]);

  useEffect(() => {
    if (!gestureSettings.openPalmEnabled) return;
    if (currentGesture !== "OPEN_PALM") return;
    const now = Date.now();
    if (now - lastPalmRef.current < PALM_DEBOUNCE_MS) return;
    lastPalmRef.current = now;
    navigateTo("/");
    playGestureSound("home");
  }, [currentGesture, navigateTo, gestureSettings.openPalmEnabled]);

  return null;
}
