import fs from "node:fs";
import path from "node:path";

/**
 * docs-sync.mjs
 *
 * Amaç: Repo dokümanlarını her build öncesinde `public/docs/` altına kopyalamak.
 * Böylece Vite build çıktısında (dist/spa) dokümanlar her zaman güncel olarak yer alır.
 */

const root = path.resolve(process.cwd());
const outDir = path.join(root, "public", "docs");

/** Kopyalanacak dosyalar (repo kökünden). */
const rootFiles = ["README.md", ".env.example", ".gitignore"].filter((p) => fs.existsSync(path.join(root, p)));

/** Kopyalanacak doküman klasörleri (repo kökünden). */
const docDirs = ["docs"].filter((p) => fs.existsSync(path.join(root, p)));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    // Ignore builder cache or node_modules if someone copied it under docs accidentally.
    if (e.name === "node_modules" || e.name === ".builder") continue;
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    if (e.isDirectory()) copyDir(src, dst);
    else if (e.isFile()) copyFile(src, dst);
  }
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

function readPkgVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    return pkg?.version ?? null;
  } catch {
    return null;
  }
}

// 1) output klasörünü hazırla
ensureDir(outDir);

// 2) root dosyalarını kopyala
for (const f of rootFiles) {
  copyFile(path.join(root, f), path.join(outDir, f));
}

// 3) docs/ klasörünü kopyala
for (const d of docDirs) {
  copyDir(path.join(root, d), path.join(outDir, d));
}

// 4) build-info üret
const buildInfo = {
  builtAt: new Date().toISOString(),
  version: process.env.APP_VERSION ?? readPkgVersion() ?? "unknown",
};
writeJson(path.join(root, "public", "build-info.json"), buildInfo);
writeJson(path.join(outDir, "build-info.json"), buildInfo);

console.log(`[docs-sync] Copied docs to ${path.relative(root, outDir)}`);
