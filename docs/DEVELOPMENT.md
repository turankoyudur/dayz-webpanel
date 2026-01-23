# Development

## Komutlar

### Dev

```bash
npm install
npm run dev
```

- Vite dev server çalışır.
- Varsayılan port: `3000` (server tarafı Vite üzerinden ayağa kalkar).

### Prod build

```bash
npm run build
npm run start
```

- Client SPA: `dist/spa/` (Vite `outDir`)
- Server bundle: `dist/server/node-build.mjs`

Build öncesinde `npm run docs:sync` otomatik çalışır ve dokümanları
`public/docs/` altına kopyalar.

### Release zip

- Windows:
  `powershell -ExecutionPolicy Bypass -File scripts\windows\release-zip.ps1`
- Linux/macOS: `./scripts/linux/release-zip.sh`

### DB / Prisma

```bash
npm run db:setup
```

- `prisma generate` + `prisma db push` (idempotent)

## Notlar

- Repo `type: module` olduğu için Node tarafı ESM'dir.
- Backend route prefix: `/api/*`
