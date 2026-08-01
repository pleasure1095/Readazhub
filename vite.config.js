import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Vite + React setup. No custom aliasing yet — kept simple
// so the project stays easy to maintain as agreed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
