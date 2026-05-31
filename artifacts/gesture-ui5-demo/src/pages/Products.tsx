import { useState } from "react";

const PRODUCTS = [
  { id: "P001", name: "Enterprise Server",  category: "Hardware", price: "€4,200",   stock: 12, status: "Active"       },
  { id: "P002", name: "ERP License Pro",    category: "Software", price: "€1,800/yr", stock: 99, status: "Active"       },
  { id: "P003", name: "Network Switch 48P", category: "Hardware", price: "€890",      stock: 5,  status: "Low Stock"    },
  { id: "P004", name: "Cloud Storage 1TB",  category: "Service",  price: "€49/mo",   stock: 99, status: "Active"       },
  { id: "P005", name: "Security Suite",     category: "Software", price: "€620/yr",  stock: 99, status: "Active"       },
  { id: "P006", name: "Workstation Ultra",  category: "Hardware", price: "€2,800",   stock: 0,  status: "Out of Stock" },
  { id: "P007", name: "Managed Firewall",   category: "Service",  price: "€199/mo",  stock: 99, status: "Active"       },
  { id: "P008", name: "Backup Solution",    category: "Service",  price: "€89/mo",   stock: 99, status: "Active"       },
];

const CAT_COLORS: Record<string, string> = {
  Hardware: "#6a1b9a",
  Software: "#0070f2",
  Service:  "#107e3e",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active:         { bg: "#e8f5e9", color: "#107e3e" },
  "Low Stock":    { bg: "#fff3e0", color: "#e9730c" },
  "Out of Stock": { bg: "#ffebee", color: "#bb0000" },
};

const ICON: Record<string, string> = { Hardware: "🖥️", Software: "💿", Service: "☁️" };

export default function Products() {
  const [filter, setFilter] = useState("All");
  const categories = ["All", "Hardware", "Software", "Service"];
  const filtered = filter === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Product Catalog</h2>
          <p style={{ fontSize: 13, color: "#6a6d70", margin: "4px 0 0" }}>{filtered.length} products</p>
        </div>
        <button className="sap-btn sap-btn-primary" data-gesture-click>+ Add Product</button>
      </div>

      {/* Category filters — scrollable on mobile */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as any }}>
        {categories.map((cat) => (
          <button
            key={cat}
            data-gesture-dwell
            onClick={() => setFilter(cat)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: filter === cat ? "2px solid #0070f2" : "1px solid #d9d9d9",
              background: filter === cat ? "#0070f2" : "#fff",
              color: filter === cat ? "#fff" : "#1d2d3e",
              fontSize: 13,
              fontWeight: filter === cat ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid — 4 cols desktop, 2 cols mobile */}
      <div className="grid-products">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="sap-card"
            data-gesture-dwell
            style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
          >
            <div style={{ height: 80, background: `linear-gradient(135deg, ${CAT_COLORS[p.category]}22, ${CAT_COLORS[p.category]}11)`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e8e8e8" }}>
              <span style={{ fontSize: 32 }}>{ICON[p.category]}</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: CAT_COLORS[p.category] }}>{p.category}</span>
                <span className="sap-tag" style={{ background: STATUS_COLORS[p.status].bg, color: STATUS_COLORS[p.status].color, fontSize: 10 }}>
                  {p.status}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#6a6d70", marginBottom: 8 }}>{p.id}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0070f2" }}>{p.price}</span>
                <span style={{ fontSize: 11, color: "#6a6d70" }}>Stock: {p.stock}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
