import { useState } from "react";

const CATEGORIES = ["All", "Software", "Hardware", "Services", "Consulting"];

const REPORTS = [
  { id: 1, title: "Q4 Software Performance Report", category: "Software", date: "2026-01-15", status: "Published", downloads: 234, author: "M. Fischer" },
  { id: 2, title: "Cloud Infrastructure Analysis", category: "Software", date: "2026-02-20", status: "Published", downloads: 189, author: "P. Müller" },
  { id: 3, title: "Hardware Inventory Audit", category: "Hardware", date: "2026-03-10", status: "Published", downloads: 145, author: "T. Schmidt" },
  { id: 4, title: "Professional Services Review", category: "Services", date: "2026-04-05", status: "Draft", downloads: 0, author: "K. Weber" },
  { id: 5, title: "Software License Compliance", category: "Software", date: "2026-04-15", status: "Published", downloads: 312, author: "M. Fischer" },
  { id: 6, title: "Consulting Engagement Summary", category: "Consulting", date: "2026-05-01", status: "Published", downloads: 78, author: "A. Bauer" },
  { id: 7, title: "IT Infrastructure Report", category: "Hardware", date: "2026-05-10", status: "Published", downloads: 56, author: "T. Schmidt" },
  { id: 8, title: "SaaS Application Usage", category: "Software", date: "2026-05-20", status: "Published", downloads: 201, author: "P. Müller" },
  { id: 9, title: "Field Services KPIs", category: "Services", date: "2026-05-28", status: "Draft", downloads: 0, author: "K. Weber" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Software:    { bg: "#e3f2fd", color: "#1565c0" },
  Hardware:    { bg: "#fce4ec", color: "#880e4f" },
  Services:    { bg: "#e8f5e9", color: "#1b5e20" },
  Consulting:  { bg: "#fff8e1", color: "#e65100" },
};

export default function Reports() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = REPORTS.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.author.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || r.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1d2d3e" }}>
          Reports
        </h1>
        <p style={{ margin: "4px 0 0", color: "#6a6d70", fontSize: 14 }}>
          {filtered.length} of {REPORTS.length} reports · Updated just now
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 20,
        background: "#fff",
        border: "1px solid #d9d9d9",
        borderRadius: 10,
        padding: "12px 16px",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, color: "#999", pointerEvents: "none",
          }}>🔍</span>
          <input
            type="search"
            placeholder="Search reports by title, category, or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-voice-search
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              border: "1px solid #d0d0d0",
              borderRadius: 7,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              background: "#fafafa",
              color: "#1d2d3e",
              transition: "border-color .15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#0070f2"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#d0d0d0"; }}
          />
        </div>

        {/* Category filter tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              data-gesture-dwell
              onClick={() => setCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor: category === cat ? "#0070f2" : "#d0d0d0",
                background: category === cat ? "#0070f2" : "#fff",
                color: category === cat ? "#fff" : "#444",
                fontSize: 12,
                fontWeight: category === cat ? 700 : 400,
                cursor: "pointer",
                transition: "all .12s",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Reports", value: REPORTS.length, color: "#0070f2" },
          { label: "Published", value: REPORTS.filter(r => r.status === "Published").length, color: "#107e3e" },
          { label: "Drafts", value: REPORTS.filter(r => r.status === "Draft").length, color: "#e9730c" },
          { label: "Total Downloads", value: REPORTS.reduce((s,r) => s + r.downloads, 0).toLocaleString(), color: "#6c3483" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 10,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 11, color: "#6a6d70", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Report list */}
      <div style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 110px 90px 80px 90px",
          padding: "10px 20px",
          background: "#f5f6f7",
          borderBottom: "1px solid #e8e8e8",
          fontSize: 11,
          fontWeight: 700,
          color: "#6a6d70",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          <span>Title</span>
          <span>Category</span>
          <span>Date</span>
          <span style={{ textAlign: "center" }}>Status</span>
          <span style={{ textAlign: "right" }}>Downloads</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#999", fontSize: 14 }}>
            No reports match your search.
          </div>
        ) : (
          filtered.map((report, i) => {
            const catStyle = CATEGORY_COLORS[report.category] ?? { bg: "#f5f5f5", color: "#555" };
            return (
              <div
                key={report.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 90px 80px 90px",
                  padding: "13px 20px",
                  alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f0f0f0" : "none",
                  cursor: "pointer",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8f9ff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0070f2", marginBottom: 2 }}>
                    {report.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>by {report.author}</div>
                </div>

                <span style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  background: catStyle.bg,
                  color: catStyle.color,
                }}>
                  {report.category}
                </span>

                <span style={{ fontSize: 12, color: "#555" }}>
                  {new Date(report.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>

                <div style={{ textAlign: "center" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 9px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    background: report.status === "Published" ? "#e8f5e9" : "#fff3e0",
                    color: report.status === "Published" ? "#2e7d32" : "#e65100",
                  }}>
                    {report.status}
                  </span>
                </div>

                <div style={{ textAlign: "right", fontSize: 12, color: "#555", fontVariantNumeric: "tabular-nums" }}>
                  {report.downloads > 0 ? report.downloads.toLocaleString() : "—"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
