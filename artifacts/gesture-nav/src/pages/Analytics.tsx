import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

const RANGES = ["7D", "30D", "90D", "1Y"];

function generateData(points: number) {
  return Array.from({ length: points }, (_, i) => ({
    name: `Day ${i + 1}`,
    sessions: Math.floor(800 + Math.sin(i * 0.5) * 300 + Math.random() * 200),
    users: Math.floor(600 + Math.cos(i * 0.4) * 200 + Math.random() * 150),
  }));
}

const chartDataByRange: Record<string, ReturnType<typeof generateData>> = {
  "7D": generateData(7),
  "30D": generateData(30),
  "90D": generateData(90),
  "1Y": generateData(52),
};

const METRICS = [
  { label: "Avg Session Time", value: "4m 32s", delta: "+11%", positive: true },
  { label: "Bounce Rate", value: "28.4%", delta: "-4.2%", positive: true },
  { label: "Conversion Rate", value: "3.8%", delta: "+0.6%", positive: true },
  { label: "Error Rate", value: "0.12%", delta: "+0.02%", positive: false },
  { label: "Median Load Time", value: "840ms", delta: "-120ms", positive: true },
  { label: "Returning Users", value: "61%", delta: "+3%", positive: true },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs font-mono"
        style={{ background: "#0d1829", border: "1px solid rgba(0,212,255,0.2)" }}
      >
        <div className="text-muted-foreground mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [range, setRange] = useState("30D");
  const data = chartDataByRange[range];

  return (
    <div className="h-full overflow-y-auto px-8 py-8" data-testid="page-analytics">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto flex flex-col gap-6"
      >
        <motion.div custom={0} variants={fadeUp} className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)" }}
            >
              <BarChart3 size={20} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 className="font-bold text-white" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
                Analytics
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">User engagement and performance trends</p>
            </div>
          </div>

          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all duration-200"
                style={{
                  background: range === r ? "rgba(0,212,255,0.12)" : "transparent",
                  color: range === r ? "#00d4ff" : "#6b7280",
                  border: range === r ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
                }}
                data-testid={`range-${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          custom={1}
          variants={fadeUp}
          className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
          data-testid="analytics-chart"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-white">Sessions &amp; Users</div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#00d4ff" }} />
                <span className="text-muted-foreground">Sessions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#a855f7" }} />
                <span className="text-muted-foreground">Users</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#4b5563", fontSize: 10, fontFamily: "Menlo, monospace" }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(data.length / 6)}
              />
              <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sessions" stroke="#00d4ff" strokeWidth={1.5} fill="url(#colorSessions)" />
              <Area type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={1.5} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div custom={2} variants={fadeUp} className="grid grid-cols-3 gap-4">
          {METRICS.map(({ label, value, delta, positive }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp
                  size={10}
                  style={{ color: positive ? "#22c55e" : "#ef4444", transform: positive ? "none" : "rotate(180deg)" }}
                />
                <span className="text-xs font-mono" style={{ color: positive ? "#22c55e" : "#ef4444" }}>
                  {delta}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
