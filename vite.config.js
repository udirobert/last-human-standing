/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Force the automatic JSX runtime for all .js/.jsx files (including test files
  // that import components which don't import React explicitly).
  esbuild: {
    jsx: "automatic",
  },
  build: {
    rollupOptions: {
      // No externals — bundle everything for the browser, including
      // @selfxyz/qrcode (loaded lazily by SelfVerify.jsx).
      external: [],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/wagmi")) return "vendor-wagmi";
          if (id.includes("node_modules/viem")) return "vendor-viem";
          if (id.includes("node_modules/@tanstack")) return "vendor-tanstack";
          if (id.includes("node_modules/framer-motion")) return "vendor-framer";
          // @worldcoin: minikit-js is imported at startup (MiniKitProvider in
          // main.jsx) so it stays on the critical path. The full idkit UI is
          // only needed by the lazy WorldIdVerify flow — we give it NO manual
          // chunk so rolldown co-locates it with the lazy WorldIdVerify chunk
          // and keeps it out of the modulepreload set.
          if (id.includes("node_modules/@worldcoin/minikit-js")) return "vendor-minikit";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
        },
      },
    },
    // Cap is for the (still-large) SelfVerify route chunk. The main
    // index bundle is targeted at < 200 kB; the cap is permissive
    // enough to keep warnings actionable, not noisy.
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    // Default env: jsdom for component tests; server tests use // @vitest-environment node
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["server/**", "src/lib/**", "src/hooks/**", "src/config/**"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.*",
        "**/index.html",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        statements: 50,
        branches: 40,
      },
    },
  },
});
