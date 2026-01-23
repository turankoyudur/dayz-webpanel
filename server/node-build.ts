import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = Number(process.env.PORT ?? 3000);

// ESM-safe __dirname (Node 18+)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/spa klasörü: dist/server/node-build.mjs dosyasına göre ../spa = dist/spa
const distPath = path.resolve(__dirname, "../spa");

// Static dosyaları servis et
app.use(express.static(distPath));

/// SPA fallback: API/health HARIC her şeyi index.html'e düşür
app.get(/^\/(?!api\/|health).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// İstersen health'i ayrıca bırak (zaten API router varsa şart değil)

app.listen(port, () => {
  // Konsolda görünmesi önemli: start.bat loglarında da görürsün
  console.log(`[server] listening on http://localhost:${port}`);
});
