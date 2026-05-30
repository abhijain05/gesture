import { motion } from "framer-motion";
import { Hand, MousePointerClick, Zap, Activity, Info } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const GESTURE_TIPS = [
  {
    icon: "☛",
    title: "Point Finger",
    desc: "Raise your index finger to move the virtual cursor. Hover over a nav item for 0.5 seconds to navigate.",
    color: "#00d4ff",
  },
  {
    icon: "✦",
    title: "Pinch",
    desc: "Bring your thumb and index finger together to select the currently highlighted navigation item.",
    color: "#a855f7",
  },
  {
    icon: "✌",
    title: "Two Fingers",
    desc: "Raise your index and middle finger (peace sign). Move your hand up to scroll up, down to scroll down.",
    color: "#f59e0b",
  },
  {
    icon: "✋",
    title: "Open Palm",
    desc: "Show your open hand with all fingers extended to instantly return to the Home page.",
    color: "#22c55e",
  },
];

const STATUS_CARDS = [
  { label: "Gestures Active", value: "4", Icon: Zap, color: "#00d4ff" },
  { label: "Pages Available", value: "5", Icon: Activity, color: "#a855f7" },
  { label: "Camera Status", value: "Live", Icon: Hand, color: "#22c55e" },
];

export default function Home() {
  return (
    <div className="h-full overflow-y-auto px-8 py-8" data-testid="page-home">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto flex flex-col gap-8"
      >
        <motion.div custom={0} variants={fadeUp} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(124,58,237,0.15) 100%)",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
            >
              <Hand size={20} style={{ color: "#00d4ff" }} />
            </div>
            <div>
              <h1
                className="font-bold text-white leading-none"
                style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}
              >
                Gesture Navigator
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Navigate this interface with your hands — no mouse required
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div custom={1} variants={fadeUp} className="grid grid-cols-3 gap-4">
          {STATUS_CARDS.map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(8px)",
              }}
              data-testid={`status-card-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <Icon size={18} style={{ color }} />
              <div>
                <div className="text-2xl font-bold text-white" style={{ color }}>
                  {value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div custom={2} variants={fadeUp} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Info size={14} style={{ color: "#6b7280" }} />
            <h2 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase" style={{ fontSize: "11px", letterSpacing: "0.1em" }}>
              Gesture Controls
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {GESTURE_TIPS.map(({ icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                custom={i + 3}
                variants={fadeUp}
                className="rounded-xl p-4 flex items-start gap-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${color}18`,
                  backdropFilter: "blur(8px)",
                }}
                data-testid={`gesture-tip-${title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
                  style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}
                >
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          custom={6}
          variants={fadeUp}
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(0,212,255,0.04)",
            border: "1px solid rgba(0,212,255,0.12)",
          }}
        >
          <MousePointerClick size={16} style={{ color: "#00d4ff", flexShrink: 0 }} />
          <p className="text-sm text-muted-foreground">
            You can also click or tap any navigation item normally — gesture control is additive, not replacing standard input.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
