# Changelog

Bu proje değişiklik günlüğü, **Keep a Changelog** formatını takip edecek şekilde düzenlenmiştir.

## [Unreleased]

## [0.3.0-alpha.2] - 2026-01-22

### Added
- UI: Instance yönetimi sayfası: `/instances` (create / rename / set active / archive).
- UI: Header instance seçici entegre edildi (Layout). Yeni instance oluşturma sonrası otomatik reload ile cache karışması engellenir.

### Changed
- SetupGuard: ilk kurulum tamamlanmamışken `/instances` sayfasına erişim whitelist'e alındı.
- Sidebar: "Instances" menü girdisi eklendi.

## [0.3.0-alpha.1] - 2026-01-22

> Not: Bu sürüm **tamamlanmamış** bir "handoff" paketidir. Multi-instance dönüşümü başlatıldı; UI ve bazı akışlar bir sonraki sprintte tamamlanacaktır.

### Added
- Multi-instance altyapısı (başlangıç):
  - Request instance context: `X-Instance-Id` header → `req.instanceId`
  - Instance registry modülü: `/api/instances` (list/create/set-active/archive)
  - Instance klasör iskeleti: `instances/<id>/{profiles,runtime,keys,configs,logs}`
- Server-control katmanında instanceId parametresi ile çalışma (service constructor ve runtime/log path’leri instance bazlı).
- Handoff dosyası: `docs/NEW_CHAT_PROMPT_TR.md` (yeni sohbet için tek-prompt bağlam).

### Changed
- Settings service artık instance-scoped çalışır (`instance:<id>` anahtarı); `instanceName` değeri instanceId ile zorlanır.
- Roadmap önceliği: Multi-instance (çoklu sunucu) altyapısı P1’de öne çekildi.

### Removed
- RCON / GameLabs / CFTools gibi uzaktan admin entegrasyonları kalıcı olarak kapsam dışıdır (dokümantasyon sadeleştirildi).

## [0.2.5] - 2026-01-22

### Added
- Launch parameter preset’leri:
  - API: `GET /api/server/presets`, `POST /api/server/presets/apply`
  - UI: Settings ekranında `Launch Presets` kartı (preset seç → forma uygula)

### Changed
- `additionalLaunchArgs` varsayılanı artık `-doLogs -adminLog -netLog -freezeCheck` (eski sürümdeki "dologs" typo düzeltildi; geriye dönük normalize edilir).

### Fixed
- Genel 404 senaryoları için yeni hata kodu eklendi: `E_NOT_FOUND`.

### Added
- Settings ekranına ApiBridge ayar kartı (apiKey/nodeId/polling/timeout).
- Backend'e `/api/settings/health` endpoint'i (UI health kartıyla uyumlu).
- Settings'e **DataRoot** + **setupComplete** alanları (portable runtime için).
- Minimal **Setup Wizard**: `/setup` sayfası + route gating.
- Setup API: `/api/setup/status`, `/api/setup/create-folders`, `/api/setup/install-steamcmd` (Win), `/api/setup/install-dayz`, `/api/setup/complete`.
- Settings'e **Steam Web API Key** alanı (Workshop search için).
- Build öncesi doküman senkronizasyonu: `npm run docs:sync` (dokümanları `public/docs/` altına kopyalar).
- Release paketleme scriptleri:
 - Windows: `scripts/windows/release-zip.ps1`
 - Linux/macOS: `scripts/linux/release-zip.sh`
- Sohbet geçmişi feature backlog özeti: `docs/BACKLOG_FROM_CHAT_HISTORY_TR.md`
- Setup Wizard v2 installer jobs:
 - API: `/api/setup/jobs/*`
 - UI: job output polling (output tail)
- Frontend HTTP helper: `apiDelete()`
- Güvenli File Browser (allowlisted roots) + Path Picker UI:
 - API: `/api/fs/roots`, `/api/fs/list` (yalnızca localhost)
 - Settings ekranında `Browse` butonları (dataRoot/steamcmd/dayz/profiles/apibridge)
- Setup Wizard “stepper” UI (adım adım akış) + adım durumunun localStorage ile korunması
- Setup sırasında `/settings` erişimi (SetupGuard whitelist)
- External supervisor hook endpoints (localhost-only): `POST /api/server/expect-exit`, `POST /api/server/register-pid`
- `docs/DECISIONS.md` eklendi (kalıcı kararlar tek yerde)

### Changed
- Settings şeması güncellendi: ApiBridge alanları eklendi, eski BattlEye/uzaktan admin alanları kaldırıldı.
- `AppError` constructor'ı, eski ve yeni kullanım şekillerini destekleyecek şekilde geriye dönük uyumlu hale getirildi.
- Settings "managed paths" varsayılanları artık hard-coded sürücü harfi yerine DataRoot üzerinden türetiliyor.
- `doctor` çıktıları daha net "Fix:" yönergeleri ile güncellendi.
- Windows installer fallback'inde `package-lock.json` varsa `npm ci` tercih edilecek şekilde güncellendi.
- Typecheck artık hatasız (`pnpm run typecheck`).
- Paketleme scriptleri varsayılan ZIP adına `v<version>` ekler.
- `package.json` artık `version` alanı içerir (ZIP isimlendirme standardı).
- Settings şemasındaki duplike `steamWebApiKey` tanımı kaldırıldı.
- Setup `create-folders` adımı artık instance standart klasörlerini tamamlar: `profiles`, `runtime`, `keys`.
- `doctor` scripti instance klasör standartlarını da raporlayacak şekilde güncellendi.
- Server control: PID persistence + crash detection (runtime state: `instances/<name>/runtime/server-process.json`).
- Server control: detached süreçleri durdurmak için Windows'ta `taskkill` fallback.
- Settings'e opsiyonel supervisor alanları eklendi: `autoRestartOnCrash`, `autoRestartDelayMs`, `autoRestartMaxAttempts`, `autoRestartWindowMs`.
- Roadmap güncellendi: Planlı restart/scheduler panel kapsamı dışına alındı (ApiBridge wrapper/scheduler)
- Server control crash detection, expected-exit penceresini dikkate alacak şekilde güncellendi
- `requireLocalhost` middleware ortaklaştırıldı (fs + server-control hook endpoints)

### Removed
- Roadmap ve dokümanlarda kapsam dışı entegrasyon referansları sadeleştirildi (Uzaktan admin entegrasyonları).
