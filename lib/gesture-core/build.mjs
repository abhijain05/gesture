import { build } from "esbuild";
import { mkdir } from "fs/promises";

await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "GestureCore",
  outfile: "dist/gesture-core.min.js",
  minify: true,
  target: ["es2020", "chrome90", "firefox90", "safari14"],
  platform: "browser",
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  banner: {
    js: `/* GestureCore v1.0.0 — Hand gesture + voice commands for any web app
 * Exposes: GestureCore.GestureEngine, GestureCore.VoiceCommandEngine,
 *          GestureCore.GestureGuide, GestureCore.VirtualKeyboard
 * Usage:
 *   const engine = new GestureCore.GestureEngine({ showCursor:true, showWebcam:true });
 *   engine.start();
 *   engine.on("ready", () => console.log("Gesture engine ready"));
 *   // Cleanup: engine.destroy();
 */`,
  },
});

console.log("✅  Built dist/gesture-core.min.js");
