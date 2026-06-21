import { defineConfig } from "vite";
import path from "node:path";

// https://vitejs.dev/config
export default defineConfig(async () => {
  const { default: react } = await import("@vitejs/plugin-react");
  const { default: tailwindcss } = await import("@tailwindcss/vite");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          quick: path.resolve(__dirname, "index-quick.html"),
          loading: path.resolve(__dirname, "index-loading.html"),
        },
      },
    },
    clearScreen: false,
    server: {
      strictPort: true,
      port: 1420,
    },
    envPrefix: ["VITE_", "TAURI_"],
  };
});
