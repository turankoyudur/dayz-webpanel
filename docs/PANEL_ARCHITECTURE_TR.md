# Panel Mimarisi ve Dosya Haritası (TR)

Bu doküman, panelin dosya yapısını ve ana fonksiyonlarını **yeni bir ChatGPT sohbetinde** hızlıca anlayabilmek için hazırlanmıştır.

## 1) Genel mimari

- **Tek repo**: DayZ Web Panel (Node.js + Express + Vite).
- **UI**: React (Vite) → `client/`
- **Backend API**: Express → `server/`
- **Paylaşılan yardımcılar**: `shared/` (örn. instance adı validasyonu)
- **DB**: SQLite + Prisma → `prisma/` + `data/app.db` (runtime)

## 2) Çalışma alanları ve klasör düzeni

### Repo içi runtime (`data/`)

- `data/app.db`: SQLite veritabanı (runtime)
- `data/logs/`: panel logları (runtime)

> Zip tesliminde `data/` temiz bırakılır (db/log içermez).

### Build öncesi doküman entegrasyonu (`docs:sync`)

`npm run build`, build'e başlamadan önce `scripts/docs-sync.mjs` çalıştırır ve dokümanları `public/docs/` altına kopyalar.
Bu sayede SPA build çıktısında dokümanlar her zaman güncel kalır.

### DayZ runtime kökü (`Settings.dataRoot`)

Varsayılan: proje kökündeki `data/`.

Panelin DayZ/SteamCMD ile ilgili dosyaları bu kökün altında tutulur:

- `.../steamcmd/` → SteamCMD kurulum dizini
- `.../steamcmd/steamapps/common/DayZServer/` → DayZ Dedicated Server (varsayılan)
- `.../instances/<instanceName>/profiles/` → Profiles (RPT vb.)
- `.../instances/<instanceName>/runtime/` → Instance runtime (ileride genişletilecek)

## 3) Başlıca modüller (Backend)

### 3.0 Instances (`server/modules/instances`) (Multi-instance omurga)

**Amaç:** Çoklu sunucu (instance) yönetimi için registry ve disk klasör iskeleti.

- `instances.routes.ts`: `/api/instances` (list/create/set-active/archive)
- `instances.service.ts`: instance yaşam döngüsü + seed settings
- `instanceFolders.ts`: `instances/<id>/{profiles,runtime,keys,configs,logs}` scaffold

**Instance seçimi**: Her API çağrısı `X-Instance-Id` header ile instance bağlamını belirtir. Middleware: `server/middleware/instanceContext.ts`.

### 3.1 Settings (`server/modules/settings`)

**Amaç:** Panelin tüm ayarlarını DB'de saklamak ve diğer modüllere tek yerden dağıtmak.

- Dosyalar:
  - `settings.service.ts`: Zod şema, default değerler, `get/update/validatePaths`
  - `settings.routes.ts`: API (`/api/settings`, `/api/settings/health`)

- Önemli alanlar:
  - `dataRoot`: portatif runtime kökü
  - `setupComplete`: ilk kurulum tamamlandı mı
  - `steamcmdPath`, `dayzServerPath`, `profilesPath`, `apiBridgePath`: managed path'ler (DataRoot üzerinden türetilir)
  - `steamWebApiKey`: Workshop search için opsiyonel

### 3.2 Setup Wizard (`server/modules/setup`)

**Amaç:** İlk açılışta gerekli klasörleri hazırlamak ve (Windows) SteamCMD/DayZ kurulumunu tetiklemek.

`create-folders` adımı şu klasörleri oluşturur:

- `<dataRoot>/steamcmd`
- `<dataRoot>/instances/<instance>/profiles`
- `<dataRoot>/instances/<instance>/runtime`
- `<dataRoot>/instances/<instance>/keys`
- `./data/logs` (panel logları)

- `setup.routes.ts`: HTTP endpoint'leri
- `setup.jobs.ts`: Uzun süren kurulum komutlarını *job* olarak çalıştırır (UI progress için)
- API (önerilen: v2 jobs):
  - `GET /api/setup/status`
  - `POST /api/setup/create-folders`
  - `GET /api/setup/jobs`, `GET/DELETE /api/setup/jobs/:id`
  - `POST /api/setup/jobs/install-steamcmd` (Windows)
  - `POST /api/setup/jobs/install-dayz`
  - `POST /api/setup/complete`
  - (Legacy, blocking): `POST /api/setup/install-steamcmd`, `POST /api/setup/install-dayz`

### 3.3 Server Control (`server/modules/server-control`)

**Amaç:** DayZ Dedicated Server prosesini başlat/durdur/yeniden başlat.

- `serverControl.service.ts`: `start/stop/restart/status`, process spawn ve log yönlendirme
  - PID persistence + crash detection: runtime state dosyası `.../instances/<instance>/runtime/server-process.json`
  - Panel restart olsa bile çalışan süreç varsa status "Detached" olur
  - Stop: detached süreçlerde PID üzerinden sonlandırma (Windows: `taskkill` fallback)
- `serverControl.routes.ts`: `/api/server/*`
  - API:
    - `GET /api/server/status`
    - `POST /api/server/start`, `POST /api/server/stop`, `POST /api/server/restart`
    - `GET /api/server/presets`, `POST /api/server/presets/apply`
    - (localhost-only hooks): `POST /api/server/expect-exit`, `POST /api/server/register-pid`

Not: Planlı restart / scheduler panel kapsamı dışı; ApiBridge wrapper/scheduler sağlar. Çakışmayı önlemek için panel, (localhost-only) `POST /api/server/expect-exit` ve `POST /api/server/register-pid` hook'larını sunar.

### 3.4 Mods (`server/modules/mods`)

**Amaç:** Workshop arama, collection import, mod kurulum, enable/disable, key sync.

- `mods.service.ts`: Steam Web API (QueryFiles), SteamCMD workshop download, junction/symlink, `-mod` arg üretimi
- `mods.routes.ts`: `/api/mods/*`

Not: Kuyruk/progress roadmap'te P1.

### 3.5 Config (`server/modules/config`)

**Amaç:** server config dosyalarını (şimdilik raw) okuyup yazmak.

- `config.service.ts`: `readFile/writeFile`, allowlist yaklaşımı
- `config.routes.ts`: `/api/config/*`

Not: Parse/diff/validation roadmap'te P2.

### 3.6 Logs (`server/modules/logs`)

**Amaç:** Panel logları + RPT gibi çıktıların listelenmesi ve tail.

- `logs.routes.ts`: `/api/logs/*`

### 3.7 File Browser (`server/modules/fs`)

**Amaç:** UX için güvenli path seçimi (Browse). Bu modül bir “dosya yöneticisi” değil; sadece allowlisted köklerde klasör listeleme yapar.

- `fs.service.ts`: allowlisted roots + path traversal koruması
- `fs.routes.ts`: `/api/fs/*` (yalnızca localhost)
- API:
  - `GET /api/fs/roots`
  - `GET /api/fs/list?rootId=<id>&path=<rel>`

Not: allowlist varsayılan olarak `Panel Root` + `Data Root` ile sınırlıdır.

### 3.8 ApiBridge (`server/modules/apibridge`) (şimdilik askıda)

**Amaç:** DayZ modunun profile klasörüne yazdığı JSON dosyaları üzerinden veri alışverişi.

- `apibridge.routes.ts`:
  - `GET /api/apibridge/status`
  - `GET /api/apibridge/state`
  - `GET /api/apibridge/players`
  - `GET /api/apibridge/config`
  - `PUT /api/apibridge/config`
  - `POST /api/apibridge/commands`

## 4) Frontend sayfaları (UI)

- Routing: `client/App.tsx`
- Setup gate: `client/components/SetupGuard.tsx` (setupComplete=false ise `/setup`, ancak path düzeltmek için `/settings` erişimi serbest)
- Sayfalar:
  - `client/pages/Instances.tsx` (instance create/rename/set-active/archive)
  - `client/pages/Setup.tsx`
  - `client/pages/Settings.tsx` (Settings kartları `client/components/settings/*`)
  - `client/pages/Server.tsx`, `Console.tsx`, `Mods.tsx`, `Logs.tsx`, `Configs.tsx`, `ApiBridge.tsx`

## 5) DB modeli (Prisma)

- `prisma/schema.prisma`:
  - `Setting` (key/value)
  - `Mod` (enabled/order)
  - `ErrorLog` (stable error codes)

## 6) Hızlı arama (pratik)

- API route nerede?
  - `server/routes/index.ts` (tüm router mount noktaları)
- Bir endpoint hangi dosyada?
  - `server/modules/**/<name>.routes.ts`
- Bir davranış/service nerede?
  - `server/modules/**/<name>.service.ts`

Örnek `grep`:

- `grep -RIn "setupComplete" server client`
- `grep -RIn "/api/setup" server client`
- `grep -RIn "workshop_download_item" server/modules/mods`

## 7) Release ZIP (node_modules yok, data temiz)

- Windows: `scripts/windows/release-zip.ps1`
- Linux/macOS: `scripts/linux/release-zip.sh`
