import { useState, useMemo } from "react";

const ORDERS = [
  { id: "SO-4821", customer: "Acme Corp.", date: "2026-05-28", status: "In Process", amount: "€12,400", items: 4, priority: "High" },
  { id: "SO-4820", customer: "Global Tech GmbH", date: "2026-05-27", status: "Completed", amount: "€8,700", items: 2, priority: "Normal" },
  { id: "SO-4819", customer: "Euro Supplies S.A.", date: "2026-05-26", status: "New", amount: "€3,200", items: 1, priority: "Low" },
  { id: "SO-4818", customer: "Pacific Ltd.", date: "2026-05-25", status: "In Process", amount: "€21,000", items: 7, priority: "High" },
  { id: "SO-4817", customer: "Nordic AS", date: "2026-05-24", status: "Completed", amount: "€5,500", items: 3, priority: "Normal" },
  { id: "SO-4816", customer: "Alpha Industries", date: "2026-05-23", status: "New", amount: "€9,800", items: 5, priority: "High" },
  { id: "SO-4815", customer: "Beta Solutions", date: "2026-05-22", status: "Completed", amount: "€2,100", items: 1, priority: "Low" },
  { id: "SO-4814", customer: "Gamma Corp.", date: "2026-05-21", status: "In Process", amount: "€15,600", items: 6, priority: "Normal" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  New: { bg: "#e8f4fd", color: "#0070f2" },
  "In Process": { bg: "#fff3e0", color: "#e9730c" },
  Completed: { bg: "#e8f5e9", color: "#107e3e" },
};

const PRIORITY_STYLE: Record<string, string> = {
  High: "#bb0000",
  Normal: "#0070f2",
  Low: "#6a6d70",
};

export default function SalesOrders() {
  const [selected, setSelected] = useState<string | null>(ORDERS[0].id);
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => ORDERS.filter(
      (o) =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );
  const order = ORDERS.find((o) => o.id === selected) ?? ORDERS[0];

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      <div style={{ width: 340, borderRight: "1px solid #d9d9d9", background: "#fff", overflowY: "auto" }} className="scrollbar-thin">
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Sales Orders ({filtered.length})</span>
          <button className="sap-btn sap-btn-primary" style={{ height: 28, fontSize: 12, padding: "0 12px" }} data-gesture-click>
            + New
          </button>
        </div>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search orders or customers…"
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
              background: "#fafafa",
              color: "#1d2d3e",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0070f2")}
            onBlur={(e) => (e.target.style.borderColor = "#d9d9d9")}
          />
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "#6a6d70", fontSize: 13 }}>
            No orders match "{search}"
          </div>
        )}
        {filtered.map((o) => (
          <button
            key={o.id}
            data-gesture-dwell
            onClick={() => setSelected(o.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 16px",
              borderBottom: "1px solid #f0f0f0",
              background: selected === o.id ? "#e8f0fe" : "transparent",
              borderLeft: selected === o.id ? "3px solid #0070f2" : "3px solid transparent",
              cursor: "pointer",
              transition: "background 0.1s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#0070f2" }}>{o.id}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_STYLE[o.priority] }}>{o.priority}</span>
            </div>
            <div style={{ fontSize: 13, color: "#1d2d3e", marginBottom: 4 }}>{o.customer}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="sap-tag" style={{ background: STATUS_STYLE[o.status].bg, color: STATUS_STYLE[o.status].color }}>
                {o.status}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{o.amount}</span>
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto", background: "#f5f6f7" }} className="scrollbar-thin">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1d2d3e" }}>{order.id}</h2>
            <p style={{ fontSize: 13, color: "#6a6d70", margin: "4px 0 0" }}>{order.customer}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sap-btn sap-btn-ghost" data-gesture-click>Edit</button>
            <button className="sap-btn sap-btn-primary" data-gesture-click>Approve</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Customer", value: order.customer },
            { label: "Order Date", value: order.date },
            { label: "Status", value: order.status },
            { label: "Priority", value: order.priority },
            { label: "Line Items", value: String(order.items) },
            { label: "Total Amount", value: order.amount },
          ].map((f) => (
            <div key={f.label} className="sap-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "#6a6d70", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{f.value}</div>
            </div>
          ))}
        </div>

        <div className="sap-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e8e8", fontWeight: 700, fontSize: 14 }}>Line Items</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f6f7" }}>
                {["#", "Product", "Quantity", "Unit Price", "Total"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6a6d70" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: order.items }, (_, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e8e8e8" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>Product {String.fromCharCode(65 + i)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>{(i + 1) * 2}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>€{(100 * (i + 1)).toLocaleString()}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>€{(100 * (i + 1) * (i + 1) * 2).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
