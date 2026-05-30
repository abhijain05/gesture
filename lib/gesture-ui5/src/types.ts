import type { GestureEngineOptions } from "@workspace/gesture-core";

export interface GestureUI5Options extends GestureEngineOptions {
  onNavigate?: (target: string) => void;
  onAction?: (actionId: string, element: Element) => void;
  homeSelector?: string;
  scrollSelector?: string;
}
