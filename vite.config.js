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
      external: ["@selfxyz/qrcode"],
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/wagmi")) return "vendor-wagmi";
          if (id.includes("node_modules/viem")) return "vendor-viem";
          if (id.includes("node_modules/@tanstack")) return "vendor-tanstack";
          if (id.includes("node_modules/framer-motion")) return "vendor-framer";
          if (id.includes("node_modules/@worldcoin")) return "vendor-worldcoin";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "vendor-react";
        },
      },
    },
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
