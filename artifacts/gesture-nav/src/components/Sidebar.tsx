import { useLocation } from "wouter";
import { useGestureContext } from "@/context/GestureContext";
import { useGestureNavigation } from "@/hooks/useGestureNavigation";
import {
  Home,
  LayoutDashboard,
  FileBarChart,
  BarChart3,
  Settings,
  Paintbrush,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "home", path: "/", label: "Home", Icon: Home },
  { id: "dashboard", path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "reports", path: "/reports", label: "Reports", Icon: FileBarChart },
  { id: "analytics", path: "/analytics", label: "Analytics", Icon: BarChart3 },
  { id: "settings", path: "/settings", label: "Settings", Icon: Settings },
  { id: "paint", path: "/paint", label: "Paint", Icon: Paintbrush },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { hoveredNavItem, currentGesture } = useGestureContext();
  useGestureNavigation();

  return (
    <aside
      className="flex flex-col h-full relative z-20"
      style={{
        width: 220,
        minWidth: 220,
        background: "rgba(7,11,22,0.9)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
      }}
      data-testid="sidebar"
    >
      <div
        className="px-5 py-6 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)",
              boxShadow: "0 0 16px rgba(0,212,255,0.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L10 5H8V9H6V5H4L7 1Z" fill="white" />
              <circle cx="7" cy="11" r="2" fill="white" fillOpacity="0.7" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-white" style={{ letterSpacing: "0.12em" }}>
              GESTURE
            </div>
            <div className="text-xs font-bold tracking-widest" style={{ color: "#00d4ff", letterSpacing: "0.12em" }}>
              NAVIGATOR
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 flex flex-col gap-1" data-testid="nav-menu">
        {NAV_ITEMS.map(({ id, path, label, Icon }) => {
          const isActive = location === path || (path !== "/" && location.startsWith(path));
          const isHovered = hoveredNavItem === id && currentGesture === "POINT_FINGER";

          return (
            <button
              key={id}
              data-nav-id={id}
              data-testid={`nav-item-${id}`}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left relative transition-all duration-200 cursor-pointer"
              style={{
                background: isActive
                  ? "rgba(0,212,255,0.08)"
                  : isHovered
                  ? "rgba(0,212,255,0.05)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid #00d4ff"
                  : "2px solid transparent",
                boxShadow: isActive ? "0 0 20px rgba(0,212,255,0.08) inset" : "none",
              }}
            >
              {isHovered && !isActive && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "rgba(0,212,255,0.04)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    borderLeft: "none",
                  }}
                />
              )}
              <Icon
                size={16}
                style={{
                  color: isActive ? "#00d4ff" : isHovered ? "#00d4ff" : "#6b7280",
                  filter: isActive ? "drop-shadow(0 0 6px #00d4ff)" : "none",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              />
              <span
                className="text-sm font-medium relative z-10"
                style={{
                  color: isActive ? "#e2e8f0" : isHovered ? "#cbd5e1" : "#6b7280",
                  transition: "color 0.2s",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff", animation: "pulse 2s infinite" }}
          />
          <span className="text-xs font-mono" style={{ color: "#4b5563", fontSize: "10px", letterSpacing: "0.05em" }}>
            HAND TRACKING ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
}
