import { motion } from "framer-motion";
import { Settings as SettingsIcon, Hand, Zap, RotateCcw } from "lucide-react";
import { useGestureContext } from "@/context/GestureContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}

function Toggle({ checked, onChange, testId }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative rounded-full transition-all duration-300 shrink-0"
      style={{
        width: 40,
        height: 22,
        background: checked ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)",
        border: checked ? "1px solid rgba(0,212,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
        boxShadow: checked ? "0 0 12px rgba(0,212,255,0.2)" : "none",
      }}
      data-testid={testId}
    >
      <div
        className="absolute top-0.5 rounded-full transition-all duration-300"
        style={{
          width: 16,
          height: 16,
          left: checked ? 21 : 2,
          background: checked ? "#00d4ff" : "#4b5563",
          boxShadow: checked ? "0 0 8px #00d4ff" : "none",
        }}
      />
    </button>
  );
}

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
}

function GestureSlider({ value, onChange }: SliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground w-8">Low</span>
      <div className="flex-1 relative h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <input
          type="range"
          min={0.3}
          max={0.9}
          step={0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          data-testid="sensitivity-slider"
        />
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((value - 0.3) / 0.6) * 100}%`,
            background: "linear-gradient(90deg, #00d4ff, #a855f7)",
            boxShadow: "0 0 6px #00d4ff",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all"
          style={{
            left: `calc(${((value - 0.3) / 0.6) * 100}% - 6px)`,
            background: "#00d4ff",
            borderColor: "#050812",
            boxShadow: "0 0 8px #00d4ff",
          }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">High</span>
      <span className="text-xs font-mono w-8 text-right" style={{ color: "#00d4ff" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function Settings() {
  const { gestureSettings, updateSettings } = useGestureContext();

  const handleReset = () => {
    updateSettings({ pointFingerEnabled: true, pinchEnabled: true, openPalmEnabled: true, twoFingerEnabled: true, sensitivity: 0.6 });
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8" data-testid="page-settings">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto flex flex-col gap-6"
      >
        <motion.div custom={0} variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <SettingsIcon size={20} style={{ color: "#6b7280" }} />
            </div>
            <div>
              <h1 className="font-bold text-white" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
                Settings
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Configure gesture behavior</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="button-reset"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </motion.div>

        <motion.div
          custom={1}
          variants={fadeUp}
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <Hand size={14} style={{ color: "#00d4ff" }} />
            <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase" style={{ fontSize: "11px" }}>
              Gesture Controls
            </span>
          </div>

          {[
            {
              key: "pointFingerEnabled" as const,
              label: "Point Finger",
              desc: "Raise index finger to move cursor and hover over items",
              glyph: "☛",
              color: "#00d4ff",
            },
            {
              key: "pinchEnabled" as const,
              label: "Pinch",
              desc: "Bring thumb and index together to select hovered item",
              glyph: "✦",
              color: "#a855f7",
            },
            {
              key: "twoFingerEnabled" as const,
              label: "Two Fingers",
              desc: "Peace sign — hand up scrolls up, hand down scrolls down",
              glyph: "✌",
              color: "#f59e0b",
            },
            {
              key: "openPalmEnabled" as const,
              label: "Open Palm",
              desc: "Show full open hand to navigate back to Home",
              glyph: "✋",
              color: "#22c55e",
            },
          ].map(({ key, label, desc, glyph, color }) => (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-4 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
              data-testid={`setting-${key}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: `${color}10`, border: `1px solid ${color}20`, color }}
                >
                  {glyph}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </div>
              <Toggle
                checked={gestureSettings[key]}
                onChange={(v) => updateSettings({ [key]: v })}
                testId={`toggle-${key}`}
              />
            </div>
          ))}
        </motion.div>

        <motion.div
          custom={2}
          variants={fadeUp}
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            <Zap size={14} style={{ color: "#f59e0b" }} />
            <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase" style={{ fontSize: "11px" }}>
              Detection Sensitivity
            </span>
          </div>
          <div className="px-5 py-5 flex flex-col gap-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-white">Confidence Threshold</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Higher values require clearer gestures. Lower values detect more but may false-trigger.
                </div>
              </div>
            </div>
            <GestureSlider
              value={gestureSettings.sensitivity}
              onChange={(v) => updateSettings({ sensitivity: v })}
            />
          </div>
        </motion.div>

        <motion.div
          custom={3}
          variants={fadeUp}
          className="rounded-xl p-4"
          style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)" }}
        >
          <div className="text-xs font-semibold text-white mb-1">Future: AI Gesture Learning</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            The gesture engine is architected to support personalized AI-learned gestures. A future update will let you record and name custom hand poses, which the system will learn to recognize using your specific hand shape and size.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
