import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  // During development, Vite restricts file serving to a safe allowlist. By default
  // only `client/`, `shared/` and the Vite client are allowed, which can result
  // in a 403 Restricted error when opening `/index.html` from the project root.
  // Extend the allowed paths to include the project root so that the top-level
  // `index.html` can be served while developing.
  server: {
    fs: {
      allow: [
        // allow serving files from the project root (where index.html lives)
        path.resolve(__dirname, "."),
        // maintain access to client and shared directories
        path.resolve(__dirname, "./client"),
        path.resolve(__dirname, "./shared"),
      ],
    },
  },
});
