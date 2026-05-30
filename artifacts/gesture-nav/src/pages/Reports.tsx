import { motion } from "framer-motion";
import { FileBarChart, Download, Filter } from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

const REPORTS = [
  { id: "RPT-001", name: "Q2 Revenue Analysis", category: "Finance", status: "Complete", date: "2026-05-28", size: "2.4 MB" },
  { id: "RPT-002", name: "User Growth Report", category: "Growth", status: "Processing", date: "2026-05-27", size: "1.1 MB" },
  { id: "RPT-003", name: "System Performance Audit", category: "Infra", status: "Complete", date: "2026-05-25", size: "800 KB" },
  { id: "RPT-004", name: "Marketing Campaign ROI", category: "Marketing", status: "Failed", date: "2026-05-24", size: "—" },
  { id: "RPT-005", name: "Customer Churn Analysis", category: "Finance", status: "Complete", date: "2026-05-22", size: "3.2 MB" },
  { id: "RPT-006", name: "Infrastructure Cost Report", category: "Infra", status: "Processing", date: "2026-05-20", size: "560 KB" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Complete: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", dot: "#22c55e" },
  Processing: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", dot: "#fbbf24" },
  Failed: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", dot: "#ef4444" },
};

const CATEGORIES = ["All", "Finance", "Growth", "Infra", "Marketing"];

export default function Reports() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered =
    activeFilter === "All" ? REPORTS : REPORTS.filter((r) => r.category === activeFilter);

  return (
    <div className="h-full overflow-y-auto px-8 py-8" data-testid="page-reports">
      <motion.div
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto flex flex-col gap-6"
      >
        <motion.div custom={0} variants={fadeUp} className="flex items-start justify-between">
          <div>
            <h1 className="font-bold text-white" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
              Reports
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="button-export"
          >
            <Download size={14} />
            Export
          </button>
        </motion.div>

        <motion.div custom={1} variants={fadeUp} className="flex items-center gap-2">
          <Filter size={12} style={{ color: "#6b7280" }} />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: activeFilter === cat ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: activeFilter === cat ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  color: activeFilter === cat ? "#00d4ff" : "#6b7280",
                }}
                data-testid={`filter-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          custom={2}
          variants={fadeUp}
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          data-testid="reports-table"
        >
          <div
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 text-xs font-mono text-muted-foreground px-4 py-3 border-b"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", letterSpacing: "0.06em" }}
          >
            <span>REPORT</span>
            <span className="px-4">CATEGORY</span>
            <span className="px-4">STATUS</span>
            <span className="px-4">DATE</span>
            <span className="px-4">SIZE</span>
          </div>
          {filtered.map((report, i) => {
            const s = STATUS_COLORS[report.status];
            return (
              <div
                key={report.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 items-center px-4 py-3 border-b transition-colors duration-150 hover:bg-white/[0.02] cursor-default"
                style={{
                  borderColor: "rgba(255,255,255,0.04)",
                  borderBottomWidth: i === filtered.length - 1 ? 0 : 1,
                }}
                data-testid={`report-row-${report.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileBarChart size={13} style={{ color: "#4b5563", flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{report.name}</div>
                    <div className="text-xs font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                      {report.id}
                    </div>
                  </div>
                </div>
                <span className="px-4 text-xs text-muted-foreground">{report.category}</span>
                <span className="px-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: s.bg, color: s.text }}
                  >
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: s.dot, boxShadow: `0 0 4px ${s.dot}` }}
                    />
                    {report.status}
                  </span>
                </span>
                <span className="px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {report.date}
                </span>
                <span className="px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {report.size}
                </span>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
