const KPI_TILES = [
  { label: "Open Orders",   value: "1,284", delta: "+12%", color: "#0070f2", icon: "📋" },
  { label: "Revenue (EUR)", value: "€4.2M", delta: "+8.3%", color: "#107e3e", icon: "💶" },
  { label: "Customers",     value: "3,471", delta: "+5%",   color: "#6a1b9a", icon: "👥" },
  { label: "Overdue Items", value: "23",    delta: "-4",    color: "#bb0000", icon: "⚠️" },
];

const RECENT = [
  { id: "SO-4821", customer: "Acme Corp.",      status: "In Process", amount: "€12,400" },
  { id: "SO-4820", customer: "Global Tech",     status: "Completed",  amount: "€8,700"  },
  { id: "SO-4819", customer: "Euro Supplies",   status: "New",        amount: "€3,200"  },
  { id: "SO-4818", customer: "Pacific Ltd.",    status: "In Process", amount: "€21,000" },
  { id: "SO-4817", customer: "Nordic AS",       status: "Completed",  amount: "€5,500"  },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "New":        { bg: "#e8f4fd", color: "#0070f2" },
  "In Process": { bg: "#fff3e0", color: "#e9730c" },
  "Completed":  { bg: "#e8f5e9", color: "#107e3e" },
};

export default function Overview() {
  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d2d3e", margin: 0, marginBottom: 4 }}>Overview</h2>
        <p style={{ fontSize: 13, color: "#6a6d70", margin: 0 }}>Summary of your business operations · Updated just now</p>
      </div>

      {/* KPI grid — 4 cols desktop, 2 cols mobile */}
      <div className="grid-kpi-4">
        {KPI_TILES.map((tile) => (
          <div key={tile.label} className="sap-card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: "#6a6d70", marginBottom: 4 }}>{tile.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: tile.color }}>{tile.value}</div>
              </div>
              <span style={{ fontSize: 22 }}>{tile.icon}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: tile.delta.startsWith("+") ? "#107e3e" : "#bb0000", fontWeight: 600 }}>
              {tile.delta} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders table — scrollable on mobile */}
      <div className="sap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Recent Sales Orders</span>
          <button className="sap-btn sap-btn-ghost" style={{ height: 28, fontSize: 12, padding: "0 12px" }}>
            View All
          </button>
        </div>

        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
            <thead>
              <tr style={{ background: "#f5f6f7" }}>
                {["Order ID", "Customer", "Status", "Amount"].map((h) => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6a6d70", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT.map((row, i) => (
                <tr key={row.id} style={{ borderTop: "1px solid #e8e8e8", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#0070f2", fontWeight: 600, whiteSpace: "nowrap" }}>{row.id}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13 }}>{row.customer}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span className="sap-tag" style={{ background: STATUS_COLORS[row.status].bg, color: STATUS_COLORS[row.status].color }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
