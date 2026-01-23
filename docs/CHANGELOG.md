# Changelog

Bu proje değişiklik günlüğü, **Keep a Changelog** formatını takip edecek
şekilde düzenlenmiştir.

## [Unreleased]

## [0.3.0-alpha.5] - 2026-01-23

### Added

- **Per-instance mod ordering:** Mods on the Downloaded Mods list can now be
  reordered using Up/Down buttons. The new order is persisted per instance via
  the backend and determines the order of the `-mod=` launch argument. The list
  is sorted by this order whenever it is fetched.
- **Backend support for InstanceMod:** The API now derives `enabled` and
  `sortOrder` from the `InstanceMod` table. The `/mods` endpoint returns
  per-instance enabled flags and sort orders; `PATCH /mods/order` updates the
  ordering; `PATCH /mods/enable` now writes to `InstanceMod` instead of the
  global flag.

### Changed

- **Server start uses per-instance mods:** The DayZ server launch command now
  builds its `-mod=` argument from enabled instance mods sorted by `sortOrder`.
  Global `Mod.enabled` is ignored in favour of `InstanceMod`.
- **Mod listing sorted by sortOrder:** The UI sorts downloaded mods by the
  per-instance `sortOrder` so that the display matches the order used at
  launch.

### Fixed

- None.

## [0.3.0-alpha.4] - 2026-01-23

### Fixed

- **Build script checks both server and client outputs**: Previously the start
  scripts (`scripts/windows/start.bat` and `scripts/linux/start.sh`) only
  looked for the server build at `dist/server/node-build.mjs` to decide whether
  to run a build. If the client build (`dist/spa/index.html`) was missing — for
  example after cleaning up `dist/spa` — the server would still start and serve
  a blank page at `/setup`. The scripts now verify that both
  `dist/server/node-build.mjs` **and** `dist/spa/index.html` exist before
  skipping the build, ensuring the panel UI is always available.

## [0.3.0-alpha.3] - 2026-01-23

### Added

- **Persistent instance selection:** the chosen instance in the header dropdown
  is now saved to `localStorage` (`dz.instanceId`), so the selection survives
  page reloads.
- **HTTP instance header:** the client `api()` wrapper reads the current
  instance id from `localStorage` and automatically includes an `X-Instance-Id`
  header on every request. If no instance is selected, the server uses its
  active default.
- **Per-instance query caches:** all React Query `queryKey` arrays now include
  the current `instanceId` as a prefix, isolating caches between instances.
- **Per-instance mod management:** enabling/disabling mods and determining
  launch order now operate on `InstanceMod` records. The server start command
  builds the `-mod=` argument from the enabled mods of the selected instance.
- **Port conflict validation:** when saving settings, the backend validates
  that `serverPort` is unique across instances and returns a `400 VALIDATION`
  error if a conflict is detected.

### Changed

- **Instance selection UI:** instance changes persist to `localStorage` and
  automatically reload to prevent cross-instance cache confusion.
- **Cache invalidation:** all invalidations in the frontend now include
  `instanceId` in their `queryKey`, ensuring only the relevant instance's
  caches are cleared.
- **Documentation updates:** the roadmap items for multi-instance blockers are
  marked as complete, and the worklog reflects these changes.

## [0.3.0-alpha.2] - 2026-01-22

### Added

- UI: Instance yönetimi sayfası: `/instances` (create / rename / set active /
  archive).
- UI: Header instance seçici entegre edildi (Layout). Yeni instance oluşturma
  sonrası otomatik reload ile cache karışması engellenir.

### Changed

- SetupGuard: ilk kurulum tamamlanmamışken `/instances` sayfasına erişim
  whitelist'e alındı.
- Sidebar: "Instances" menü girdisi eklendi.

## [0.3.0-alpha.1] - 2026-01-22

> Not: Bu sürüm **tamamlanmamış** bir "handoff" paketidir. Multi-instance
> dönüşümü başlatıldı; UI ve bazı akışlar bir sonraki sprintte
> tamamlanacaktır.

### Added

- Multi-instance altyapısı (başlangıç):
  - Request instance context: `X-Instance-Id` header → `req.instanceId`
  - Instance registry modülü: `/api/instances`
    (list/create/set-active/archive)
  - Instance klasör iskeleti:
    `instances/<id>/{profiles,runtime,keys,configs,logs}`
- Server-control katmanında instanceId parametresi ile çalışma (service
  constructor ve runtime/log path'leri instance bazlı).
- Handoff dosyası: `docs/NEW_CHAT_PROMPT_TR.md` (yeni sohbet için tek-prompt
  bağlam).

### Changed

- Settings service artık instance-scoped çalışır (`instance:<id>` anahtarı);
  `instanceName` değeri instanceId ile zorlanır.
- Roadmap önceliği: Multi-instance (çoklu sunucu) altyapısı P1'de öne çekildi.

### Removed

- RCON / GameLabs / CFTools gibi uzaktan admin entegrasyonları kalıcı olarak
  kapsam dışıdır (dokümantasyon sadeleştirildi).

## [0.2.5] - 2026-01-22

### Added (Features)

- Launch parameter preset'leri:
  - API: `GET /api/server/presets`, `POST /api/server/presets/apply`
  - UI: Settings ekranında `Launch Presets` kartı (preset seç → forma uygula)

### Changed (Updates)

- `additionalLaunchArgs` varsayılanı artık
  `-doLogs -adminLog -netLog -freezeCheck` (eski sürümdeki "dologs" typo
  düzeltildi; geriye dönük normalize edilir).

### Fixed (Bugs)

- Genel 404 senaryoları için yeni hata kodu eklendi: `E_NOT_FOUND`.

### Added (More Features)

- Settings ekranına ApiBridge ayar kartı (apiKey/nodeId/polling/timeout).
- Backend'e `/api/settings/health` endpoint'i (UI health kartıyla uyumlu).
- Settings'e **DataRoot** + **setupComplete** alanları (portable runtime için).
- Minimal **Setup Wizard**: `/setup` sayfası + route gating.
- Setup API: `/api/setup/status`, `/api/setup/create-folders`,
  `/api/setup/install-steamcmd` (Win), `/api/setup/install-dayz`,
  `/api/setup/complete`.
- Settings'e **Steam Web API Key** alanı (Workshop search için).
- Build öncesi doküman senkronizasyonu: `npm run docs:sync` (dokümanları
  `public/docs/` altına kopyalar).
- Release paketleme scriptleri:
  - Windows: `scripts/windows/release-zip.ps1`
  - Linux/macOS: `scripts/linux/release-zip.sh`
- Sohbet geçmişi feature backlog özeti:
  `docs/BACKLOG_FROM_CHAT_HISTORY_TR.md`
- Setup Wizard v2 installer jobs:
  - API: `/api/setup/jobs/*`
  - UI: job output polling (output tail)
- Frontend HTTP helper: `apiDelete()`
- Güvenli File Browser (allowlisted roots) + Path Picker UI:
  - API: `/api/fs/roots`, `/api/fs/list` (yalnızca localhost)
  - Settings ekranında `Browse` butonları
    (dataRoot/steamcmd/dayz/profiles/apibridge)
- Setup Wizard "stepper" UI (adım adım akış) + adım durumunun localStorage ile
  korunması
- Setup sırasında `/settings` erişimi (SetupGuard whitelist)
- External supervisor hook endpoints (localhost-only):
  `POST /api/server/expect-exit`, `POST /api/server/register-pid`
- `docs/DECISIONS.md` eklendi (kalıcı kararlar tek yerde)

### Changed (More Updates)

- Settings şeması güncellendi: ApiBridge alanları eklendi, eski BattlEye/
  uzaktan admin alanları kaldırıldı.
- `AppError` constructor'ı, eski ve yeni kullanım şekillerini destekleyecek
  şekilde geriye dönük uyumlu hale getirildi.
- Settings "managed paths" varsayılanları artık hard-coded sürücü harfi yerine
  DataRoot üzerinden türetiliyor.
- `doctor` çıktıları daha net "Fix:" yönergeleri ile güncellendi.
- Windows installer fallback'inde `package-lock.json` varsa `npm ci` tercih
  edilecek şekilde güncellendi.
- Typecheck artık hatasız (`pnpm run typecheck`).
- Paketleme scriptleri varsayılan ZIP adına `v<version>` ekler.
- `package.json` artık `version` alanı içerir (ZIP isimlendirme standardı).
- Settings şemasındaki duplike `steamWebApiKey` tanımı kaldırıldı.
- Setup `create-folders` adımı artık instance standart klasörlerini tamamlar:
  `profiles`, `runtime`, `keys`.
- `doctor` scripti instance klasör standartlarını da raporlayacak şekilde
  güncellendi.
- Server control: PID persistence + crash detection (runtime state:
  `instances/<name>/runtime/server-process.json`).
- Server control: detached süreçleri durdurmak için Windows'ta `taskkill`
  fallback.
- Settings'e opsiyonel supervisor alanları eklendi: `autoRestartOnCrash`,
  `autoRestartDelayMs`, `autoRestartMaxAttempts`, `autoRestartWindowMs`.
- Roadmap güncellendi: Planlı restart/scheduler panel kapsamı dışına alındı
  (ApiBridge wrapper/scheduler)
- Server control crash detection, expected-exit penceresini dikkate alacak
  şekilde güncellendi
- `requireLocalhost` middleware ortaklaştırıldı (fs + server-control hook
  endpoints)

### Removed (Deprecated)

- Roadmap ve dokümanlarda kapsam dışı entegrasyon referansları sadeleştirildi
  (Uzaktan admin entegrasyonları).
