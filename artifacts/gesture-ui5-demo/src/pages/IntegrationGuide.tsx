const STEPS = [
  {
    step: "1",
    title: "Install the package",
    desc: "Add the gesture library to your SAP UI5 project. Works with npm, pnpm, or as a script tag.",
    code: `npm install @gesture-nav/core @gesture-nav/ui5`,
    lang: "bash",
  },
  {
    step: "2",
    title: "Import & initialize in Component.js",
    desc: "Two lines of code. Call init() in your Component.onInit() or app startup. That's it.",
    code: `sap.ui.define([
  "sap/ui/core/UIComponent",
  "@gesture-nav/ui5"
], function (UIComponent, { GestureUI5 }) {
  "use strict";

  return UIComponent.extend("my.app.Component", {
    onInit: async function () {

      // ✅ Two lines to activate gesture control
      const gesture = new GestureUI5({ sensitivity: 0.7 });
      await gesture.init();

    }
  });
});`,
    lang: "javascript",
  },
  {
    step: "3",
    title: "Mark elements for dwell-navigation (optional)",
    desc: "Add data-gesture-dwell to any element you want dwell-to-click support. Everything else works automatically.",
    code: `<!-- Navigation items become gesture-navigable -->
<List>
  <StandardListItem
    data-gesture-dwell="true"
    title="Sales Orders"
    press=".onNavToOrders"
  />
  <StandardListItem
    data-gesture-dwell="true"
    title="Products"
    press=".onNavToProducts"
  />
</List>

<!-- Buttons work automatically via Pinch gesture -->
<Button text="Approve" press=".onApprove" />`,
    lang: "xml",
  },
];

const GESTURES = [
  { name: "☝️ Point Finger", action: "Move cursor — hover over any element" },
  { name: "🤏 Pinch", action: "Click — triggers press/tap on nearest button or link" },
  { name: "✌️ Two Fingers", action: "Scroll — moves the active scroll container" },
  { name: "🖐 Open Palm", action: "Home — navigates to the shell home or app root" },
  { name: "⏱ Dwell", action: "Select — hold pointer over [data-gesture-dwell] element" },
];

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <pre style={{
      background: "#1d2d3e",
      color: "#e8f0fe",
      padding: "16px 20px",
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.6,
      overflow: "auto",
      margin: 0,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
    }}>
      <code>{code}</code>
    </pre>
  );
}

export default function IntegrationGuide() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0070f2", color: "#fff", padding: "6px 16px", borderRadius: 20, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🤚</span>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>PLUG & PLAY SDK</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>SAP UI5 Gesture Integration Guide</h1>
        <p style={{ fontSize: 14, color: "#6a6d70", lineHeight: 1.6, margin: 0 }}>
          Add hands-free gesture control to any SAP Fiori / UI5 application with 2 lines of code.
          No framework changes, no UI modifications — just install and initialise.
        </p>
      </div>

      <div className="sap-card" style={{ padding: 20, marginBottom: 24, background: "#e8f5e9", border: "1px solid #a5d6a7" }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: "#107e3e" }}>✅ You're looking at it right now</div>
        <p style={{ margin: 0, fontSize: 13, color: "#1d2d3e", lineHeight: 1.6 }}>
          This entire Fiori-style app is powered by <strong>@gesture-nav/core</strong> and <strong>@gesture-nav/ui5</strong>.
          The virtual cursor, webcam overlay, dwell-navigation, pinch-to-click, and audio feedback are all from the library — zero custom code in this app.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 20, marginBottom: 28 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "#0070f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              {s.step}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: "#6a6d70", margin: "0 0 12px", lineHeight: 1.6 }}>{s.desc}</p>
              <CodeBlock code={s.code} lang={s.lang} />
            </div>
          </div>
        ))}
      </div>

      <div className="sap-card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Gesture Reference</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {GESTURES.map((g) => (
            <div key={g.name} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "#f5f6f7", borderRadius: 6 }}>
              <span style={{ fontSize: 20, minWidth: 28, textAlign: "center" }}>{g.name.split(" ")[0]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{g.name.split(" ").slice(1).join(" ")}</div>
                <div style={{ fontSize: 12, color: "#6a6d70" }}>{g.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sap-card" style={{ padding: 20, background: "#f0f4ff" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Configuration Options</h3>
        <CodeBlock lang="javascript" code={`new GestureUI5({
  sensitivity: 0.7,       // 0-1, gesture detection confidence threshold
  dwellTimeMs: 600,       // ms to hold pointer before dwell fires
  audioFeedback: true,    // subtle audio cues on actions
  showCursor: true,       // display the virtual cursor overlay
  showWebcam: true,       // show webcam feed in corner
  onNavigate: (id) => {   // called when dwell-navigation fires
    sap.m.routing.navTo(id);
  },
  onAction: (id, el) => { // called on every gesture click
    console.log("Gesture clicked:", id, el);
  }
})`} />
      </div>
    </div>
  );
}
