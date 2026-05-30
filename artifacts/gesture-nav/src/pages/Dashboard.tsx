import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users, Activity, DollarSign, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

const chartData = [
  { name: "Mon", value: 420 },
  { name: "Tue", value: 680 },
  { name: "Wed", value: 540 },
  { name: "Thu", value: 890 },
  { name: "Fri", value: 720 },
  { name: "Sat", value: 310 },
  { name: "Sun", value: 490 },
];

const KPIS = [
  { label: "Total Users", value: "24,891", change: "+12.4%", up: true, Icon: Users, color: "#00d4ff" },
  { label: "Revenue", value: "$84,320", change: "+8.1%", up: true, Icon: DollarSign, color: "#a855f7" },
  { label: "Active Sessions", value: "1,203", change: "-3.2%", up: false, Icon: Activity, color: "#f59e0b" },
  { label: "Page Views", value: "142K", change: "+22.7%", up: true, Icon: Eye, color: "#22c55e" },
];

const RECENT_ACTIVITY = [
  { action: "New user registered", time: "2m ago", dot: "#00d4ff" },
  { action: "Revenue milestone reached: $80K", time: "18m ago", dot: "#22c55e" },
  { action: "Session count dropped — alert triggered", time: "45m ago", dot: "#f59e0b" },
  { action: "Weekly report generated", time: "1h ago", dot: "#a855f7" },
  { action: "System health check passed", time: "3h ago", dot: "#6b7280" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs font-mono"
        style={{ background: "#0d1829", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}
      >
        <div className="text-muted-foreground mb-0.5">{label}</div>
        <div className="font-bold">{payload[0].value}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto px-8 py-8" data-testid="page-dashboard">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto flex flex-col gap-6"
      >
        <motion.div custom={0} variants={fadeUp}>
          <h1 className="font-bold text-white" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time performance overview</p>
        </motion.div>

        <motion.div custom={1} variants={fadeUp} className="grid grid-cols-2 gap-4">
          {KPIS.map(({ label, value, change, up, Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">{label}</div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {up ? (
                      <TrendingUp size={12} style={{ color: "#22c55e" }} />
                    ) : (
                      <TrendingDown size={12} style={{ color: "#ef4444" }} />
                    )}
                    <span
                      className="text-xs font-mono"
                      style={{ color: up ? "#22c55e" : "#ef4444" }}
                    >
                      {change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last week</span>
                  </div>
                </div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}20` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          custom={2}
          variants={fadeUp}
          className="rounded-xl p-5"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          data-testid="weekly-chart"
        >
          <div className="text-sm font-semibold text-white mb-4">Weekly Activity</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#4b5563", fontSize: 11, fontFamily: "Menlo, monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,212,255,0.04)" }} />
              <Bar dataKey="value" fill="#00d4ff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          custom={3}
          variants={fadeUp}
          className="rounded-xl p-5"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          data-testid="recent-activity"
        >
          <div className="text-sm font-semibold text-white mb-4">Recent Activity</div>
          <div className="flex flex-col gap-3">
            {RECENT_ACTIVITY.map(({ action, time, dot }, i) => (
              <div key={i} className="flex items-center gap-3" data-testid={`activity-item-${i}`}>
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
                />
                <span className="text-sm text-muted-foreground flex-1">{action}</span>
                <span className="text-xs font-mono text-muted-foreground shrink-0" style={{ fontSize: "11px" }}>
                  {time}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
