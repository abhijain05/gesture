import { Switch, Route, Router as WouterRouter } from "wouter";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GestureProvider } from "@/context/GestureContext";
import { Sidebar } from "@/components/Sidebar";
import { WebcamPanel } from "@/components/WebcamPanel";
import { GestureStatusBar } from "@/components/GestureStatusBar";
import { VirtualCursor } from "@/components/VirtualCursor";
import { RippleEffect } from "@/components/RippleEffect";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Paint from "@/pages/Paint";
import NotFound from "@/pages/not-found";

function AppLayout() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden relative"
      style={{ background: "#050812" }}
    >
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {[
          { color: "#00d4ff", x: "10%", y: "20%", size: 700 },
          { color: "#7c3aed", x: "60%", y: "60%", size: 600 },
          { color: "#0ea5e9", x: "80%", y: "10%", size: 500 },
        ].map(({ color, x, y, size }, i) => (
          <div
            key={i}
            className="absolute rounded-full blob"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              opacity: 0.04,
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              transform: "translate(-50%, -50%)",
              animationDelay: `${i * 6}s`,
              animationDuration: `${20 + i * 5}s`,
            }}
          />
        ))}
      </div>

      <Sidebar />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/reports" component={Reports} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings" component={Settings} />
            <Route path="/paint" component={Paint} />
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </main>

      <WebcamPanel />
      <GestureStatusBar />
      <VirtualCursor />
      <RippleEffect />
    </div>
  );
}

function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <GestureProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AnimatePresence>
          {!loaded && (
            <motion.div
              key="loading"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <LoadingScreen onComplete={() => setLoaded(true)} />
            </motion.div>
          )}
        </AnimatePresence>
        {loaded && <AppLayout />}
        <Toaster />
      </WouterRouter>
    </GestureProvider>
  );
}

export default App;
