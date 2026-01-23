# Worklog (Güncel)

Bu dosya, yapılan değişiklikleri tarih sırasıyla **net ve anlaşılır** şekilde kaydeder.

## 2026-01-22
### Tamamlananlar
- Settings'e **DataRoot** + **setupComplete** alanları eklendi; managed path varsayılanları artık DataRoot üzerinden türetiliyor (hard-coded sürücü harfi kaldırıldı).
- Settings'e **Steam Web API Key** alanı eklendi (Mods sayfasındaki Workshop search ile tutarlılık).
- Minimal **Setup Wizard** eklendi:
  - UI: `/setup` sayfası
  - Route gating: `setupComplete=false` ise kullanıcı otomatik `/setup` sayfasına yönlenir.
  - API: `/api/setup/status`, `/api/setup/create-folders`, `/api/setup/install-steamcmd` (Win), `/api/setup/install-dayz`, `/api/setup/complete`.
- `doctor` scripti güncellendi: eksikler için “Fix:” yönergeleri daha net.
- Mimari dokümantasyonu güncellendi: `docs/PANEL_ARCHITECTURE_TR.md` (dosya/fonksiyon haritası).
- Roadmap güncellendi: `docs/ROADMAP.md`.
- Build öncesi doküman senkronizasyonu eklendi: `npm run docs:sync` (dokümanları `public/docs/` altına kopyalar).
- Release paketi scriptleri eklendi (node_modules hariç, data temiz):
  - Windows: `scripts/windows/release-zip.ps1`
  - Linux/macOS: `scripts/linux/release-zip.sh`
- Release zip scriptleri, kendi staging/release klasörlerini hariç tutacak şekilde güncellendi (recursive zip önlenir).
- Sohbet geçmişindeki talepleri tekleştirmek için backlog özeti eklendi: `docs/BACKLOG_FROM_CHAT_HISTORY_TR.md`.
- Setup Wizard v2 iyileştirmesi:
  - Backend: `setup.jobs.ts` ile SteamCMD/DayZ kurulumları artık **job** olarak çalışır.
  - API: `/api/setup/jobs/*` (listeleme, detay, silme, installer job başlatma).
  - UI: `/setup` sayfası job durumunu ve **output tail** loglarını polling ile gösterir.
- Frontend fetch helper genişletildi: `apiDelete()` eklendi.
- Settings şemasındaki küçük tutarsızlık düzeltildi (duplike `steamWebApiKey` tanımı kaldırıldı).
- Typecheck temizlendi: `pnpm run typecheck` hatasız.
- Güvenli Path Picker (Browse) eklendi:
  - Backend: `/api/fs/roots`, `/api/fs/list` (allowlisted roots + yalnızca localhost)
  - UI: Settings ekranında path alanlarına `Browse` butonları (DataRoot dahil)
- Release ZIP isimlendirme standardı güncellendi: varsayılan ZIP adına `v<version>` eklenir.
- `package.json` içine `version` alanı eklendi (SemVer uyumlu sürümleme).
- Setup Wizard UI, adım adım (stepper) akışa geçirildi; sayfa yenilense bile aktif adım localStorage ile korunur.
- Setup sırasında `/settings` erişimi açıldı (SetupGuard whitelist) böylece kullanıcı path düzeltmelerini yapabilir.
- Setup "Create folders" adımı instance standart klasörlerini tamamlar: `profiles`, `runtime`, `keys`.
- `doctor` scripti instance klasör standartlarını da kontrol edecek şekilde güncellendi.
- Server control iyileştirmeleri:
  - PID persistence + crash detection (runtime state dosyası: `instances/<name>/runtime/server-process.json`).
  - Panel restart olsa bile "Detached" süreç durumu görülür; Stop, PID üzerinden süreç sonlandırmayı dener.
  - Windows'ta stop için `taskkill` fallback eklendi.
- Supervisor ayarları (opsiyonel) settings şemasına eklendi: `autoRestartOnCrash`, `autoRestartDelayMs`, `autoRestartMaxAttempts`, `autoRestartWindowMs`.
- `doctor` scripti server runtime state dosyasının varlığını da raporlar.
- Dış scheduler uyumluluğu (ApiBridge wrapper/scheduler için) eklendi:
  - `POST /api/server/expect-exit` (localhost-only): expected-exit penceresi
  - `POST /api/server/register-pid` (localhost-only): detached PID register
  - Crash detection expected-exit penceresini dikkate alır (crashCount/auto-restart çakışması engellenir)
- `requireLocalhost` middleware ortaklaştırıldı (fs + server-control hook endpoints)
- Roadmap güncellendi: Planlı restart/scheduler panel kapsamı dışına alındı (ApiBridge) + `docs/DECISIONS.md` eklendi


### Notlar
- `install-steamcmd` endpoint'i Windows'ta PowerShell (`Invoke-WebRequest` + `Expand-Archive`) kullanır.
- ApiBridge entegrasyonu bu repoda korunur ancak **geliştirme önceliği değildir**.
- Launch parameter preset altyapısı eklendi:
  - API: `GET /api/server/presets`, `POST /api/server/presets/apply`
  - UI: Settings ekranına `Launch Presets` kartı (preset seç → forma uygula; kaydet ile DB’ye yazar)
- `additionalLaunchArgs` eski varsayılanındaki tipografik hata düzeltildi ve geriye dönük normalize edildi ("dologs" → `-doLogs`).
- Yeni hata kodu: `E_NOT_FOUND` (preset bulunamadı gibi genel 404 senaryoları için).

### Multi-instance (çoklu sunucu) — Başlangıç (WIP / handoff)
- Multi-instance dönüşümü öne alındı (proje yapısını kökten etkilediği için).
- Backend tarafında instance bağlamı eklendi:
  - `X-Instance-Id` header → `req.instanceId` (middleware: `server/middleware/instanceContext.ts`)
  - Instance registry: `server/modules/instances/*` (+ klasör scaffold)
  - Settings artık instance-scoped: `instance:<id>`
- Server-control servisinde instanceId parametresi ile çalışma desteklendi (runtime + log path’leri instance bazlı).
- Bu repo için bir “handoff paket” üretildi ve yeni sohbet için tek-prompt bağlam dosyası eklendi: `docs/NEW_CHAT_PROMPT_TR.md`.

### Multi-instance (çoklu sunucu) — UI entegrasyonu (alpha.2)
- UI: Header'a instance seçici bağlandı (Layout). Sidebar'a "Instances" menüsü eklendi.
- UI: `/instances` yönetim sayfası eklendi (create / rename / set active / archive).
- SetupGuard whitelist güncellendi: İlk kurulum tamamlanmamışken `/instances` sayfasına erişim açıldı.
