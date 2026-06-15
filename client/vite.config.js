import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5050",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into long-lived cacheable chunks so
        // repeat loads are fast (better than one large bundle).
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          realtime: ["socket.io-client"],
          vendor: ["axios", "date-fns", "lucide-react", "react-hot-toast"],
        },
      },
    },
  },
});
