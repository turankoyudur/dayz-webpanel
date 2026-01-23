# ChatGPT Context (TR) — Hızlı Başlangıç

Bu repo: **DayZ Web Panel** (Node.js + Express + React/Vite). Amaç: DayZ Dedicated Server yönetimini web UI üzerinden yapmak.

## Kapsam

- **Kapsam dışı (kalıcı):** Uzaktan admin entegrasyonları.
- **ApiBridge:** Ayrı geliştiriliyor. Bu repoda modül korunur, ancak geliştirme önceliği değildir.
- **Planlı restart / scheduler:** Panelde uygulanmaz; ApiBridge wrapper/scheduler sağlar. Panel yalnızca koordinasyon hook'ları sunar.

## Multi-instance (çoklu sunucu) — WIP notu

- Backend instance bağlamı aktiftir: `X-Instance-Id` header → `req.instanceId` (middleware: `server/middleware/instanceContext.ts`).
- Instance registry endpoint'leri: `GET/POST/PATCH/DELETE /api/instances`.
- UI tarafında temel instance yönetimi hazır:
  - Header instance seçici: `client/components/InstanceSelector.tsx` (Layout'a bağlı)
  - Yönetim sayfası: `client/pages/Instances.tsx` (`/instances`)
  - Not: Local panel tek kullanıcı varsayımıyla, aktif instance DB'de tutulur. `X-Instance-Id` header tabanlı seçim opsiyoneldir (roadmap).

## Başlangıç için en önemli dokümanlar

- Mimari harita (dosya/fonksiyon): `docs/PANEL_ARCHITECTURE_TR.md`
- Roadmap: `docs/ROADMAP.md`
- Değişiklik günlüğü: `docs/CHANGELOG.md`
- Çalışma günlüğü: `docs/WORKLOG.md`
- Geliştirme notları: `docs/DEVELOPMENT.md`
- ChatGPT proje talimatları: `docs/CHATGPT_PROJECT_INSTRUCTIONS_TR.md`

## Hızlı yön bulma

- Tüm backend router mount noktaları: `server/routes/index.ts`
- Her modülün endpoint'leri: `server/modules/**/<module>.routes.ts`
- Asıl iş mantığı: `server/modules/**/<module>.service.ts`
- UI routing: `client/App.tsx`
- Setup gate: `client/components/SetupGuard.tsx` (`setupComplete=false` ise `/setup`, ancak path düzeltmek için `/settings` erişimi serbest)
- Build-doc entegrasyonu: `scripts/docs-sync.mjs` (`npm run build` öncesi `public/docs/` günceller)
- Release paketleme:
- Windows: `scripts/windows/release-zip.ps1`
- Linux/macOS: `scripts/linux/release-zip.sh`
- Varsayılan ZIP adı: `dayz-web-panel-panel-only-v<version>-<timestamp>.zip`

## En sık kullanılan endpoint'ler

### Instance registry

- `GET /api/instances` (list + activeId)
- `POST /api/instances` (localhost-only)
- `PATCH /api/instances/:id/active` (localhost-only)
- `DELETE /api/instances/:id` (localhost-only)

- Settings: `GET/PUT /api/settings`
- Health: `GET /api/settings/health`
- Setup (v2 jobs):
- `GET /api/setup/status`
- `POST /api/setup/create-folders`
- Not: `create-folders` şu klasörleri oluşturur: `<dataRoot>/steamcmd`, `<dataRoot>/instances/<instance>/profiles`, `runtime`, `keys`, `./data/logs`
- `GET /api/setup/jobs`, `GET/DELETE /api/setup/jobs/:id`
- `POST /api/setup/jobs/install-steamcmd`
- `POST /api/setup/jobs/install-dayz`
- `POST /api/setup/complete`
- (Legacy, blocking): `POST /api/setup/install-steamcmd`, `POST /api/setup/install-dayz`
- Server control: `POST /api/server/start|stop|restart`, `GET /api/server/status`
- (External supervisor hooks, localhost-only): `POST /api/server/expect-exit`, `POST /api/server/register-pid`

### Server control runtime state

- PID persistence + crash detection için runtime state dosyası: `<dataRoot>/instances/<instance>/runtime/server-process.json`
- Panel restart olsa bile "Detached" süreç durumunu PID üzerinden raporlar; Stop, Windows'ta `taskkill` fallback kullanır.
- File Browser (Path Picker): `GET /api/fs/roots`, `GET /api/fs/list?rootId=...&path=...` (yalnızca localhost)

## Setup Wizard akışı (UI)

`client/pages/Setup.tsx` adım adım “stepper” akış kullanır:

1) Basics (DataRoot, instanceName, opsiyonel Steam bilgileri)
2) Create folders (steamcmd + instances/<name>/profiles/runtime/keys + ./data/logs)
3) Install SteamCMD (opsiyonel, Windows)
4) Install DayZ Dedicated Server (opsiyonel)
5) Verify & finish (health kontrolleri + setupComplete)
