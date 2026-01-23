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

## 2026-01-23

### Tamamlananlar

 - **Kalıcı instance seçimi:** Header’daki instance seçici artık seçimi `localStorage` (`dz.instanceId`) anahtarında saklıyor. Sayfa yenilense bile seçili instance korunuyor; geçersiz instance durumunda otomatik geri dönüş uygulanıyor.
 - **HTTP header:** `client/lib/http.ts` içinde `api()` fonksiyonu, `localStorage`’dan okuduğu instance id ile tüm isteklerde `X-Instance-Id` header’ını ekliyor. Instance seçili değilse header gönderilmiyor ve backend aktif instance’ı kullanıyor.
 - **Query cache ayrıştırması:** Tüm React Query sorgularının `queryKey` dizilerine `instanceId` eklendi (settings/server/mods/config/logs/apibridge). Bu sayede her instance kendi cache’ini kullanıyor ve instance değişimi sadece ilgili veriyi etkiliyor.
 - **Mods per-instance:** Mod enable/disable işlemleri ve sunucu başlatılırken `-mod=` parametresinin oluşturulması artık instance’a özel `InstanceMod` kaydına göre yapılıyor. Global `mod.enabled` alanı sadece ilk seed için kullanılıyor.
 - **Port çakışması kontrolü:** Backend, settings kaydında `serverPort` değerinin diğer instance’larla çakışmadığını doğruluyor ve çakışma durumunda 400 hata dönüyor.
 - **Dokümantasyon ve sürüm:** `docs/ROADMAP.md` üzerinde multi‑instance bloklayıcıları tamamlandı olarak işaretlendi. `CHANGELOG.md` ve `WORKLOG.md` güncellenerek sürüm numarası `0.3.0-alpha.3` olarak artırıldı.
 - **Versiyon güncellemesi:** `package.json` içindeki `version` alanı `0.3.0-alpha.3` olarak ayarlandı.

### Notlar

 Bu sprint ile multi‑instance mimarisinin eksik kalan istemci tarafı entegrasyonları tamamlandı. Artık panel, birden fazla instance arasında sorunsuz geçiş yapabiliyor. Her değişiklik, doküman senkronizasyonu (`docs:sync`) sonrası build’e dahil edilmelidir.

## 2026-01-23
### Tamamlananlar
 - **Build kontrolü iyileştirildi:** `scripts/windows/start.bat` ve `scripts/linux/start.sh` betikleri, artık hem sunucu derlemesinin (`dist/server/node-build.mjs`) hem de istemci derlemesinin (`dist/spa/index.html`) varlığını kontrol ediyor. Önceden yalnızca sunucu derlemesi kontrol edildiğinden, istemci klasörü eksik olduğunda panel `/setup` gibi sayfalarda boş bir ekran veriyordu.  Artık her iki dosya da yoksa `npm run build` çağrılarak tam derleme tetikleniyor.
 - **Sürüm güncellemesi (alpha.4):** `package.json` sürümü `0.3.0-alpha.4` olarak artırıldı. `CHANGELOG.md` ve `WORKLOG.md` güncellendi.

### 2026-01-23 — Per‑instance Mod Sıralama (alpha.5)

Bu sprint, mod yönetiminde kalan eksiklikleri tamamladı ve multi‑instance mimarinin işlevsel hale gelmesini sağladı.

#### Tamamlananlar

- **Per‑instance mod sıralama UI:** Mods sayfasına ↑/↓ butonları eklendi ve mod listesi `sortOrder` ve `enabled` alanlarına göre sıralanıyor.  Değişiklikler `PATCH /mods/order` üzerinden backend'e iletiliyor ve React Query cache'leri instance bazında invalid ediliyor.
- **Backend InstanceMod desteği:**  `mods.service.ts` mod listesini `InstanceMod` üzerinden birleştirerek getiriyor; `setEnabled()` ve yeni `setOrder()` metodları, enable/disable ve sıra ayarlamalarını `InstanceMod` tablosuna yazıyor.  Server başlatma sürecinde `-mod=` parametresi seçili instance'ın etkin ve sıralanmış modlarından derleniyor.
- **Sürüm güncellemesi (alpha.5):** Bu değişiklikler 0.3.0‑alpha.5 sürümüne dahil edildi; `CHANGELOG.md` ve `ROADMAP.md` güncellendi.

### 2026-01-23 — Taşınabilirlik ve Dökümantasyon (alpha.6)

Bu güncelleme kod içermemekle birlikte proje dokümantasyonunu portatif çalışma üzerine netleştirdi.

#### Tamamlananlar

- **Varsayılan yollar yeniden yazıldı:** `README_TR.md` artık DataRoot altında portatif bir kurulumun nasıl çalıştığını açıklıyor ve platforma özgü hard‑coded örnekleri kaldırıyor.  `steamcmdPath`, `dayzServerPath`, `profilesPath` ve `apiBridgePath` değerlerinin DataRoot üzerinden nasıl türetildiği anlatıldı.
- **DayZ server dizin yapısı belirlendi:** `PANEL_ARCHITECTURE_TR.md` dosyasında DayZServer klasörünün içeriği (serverDZ.cfg, mpmissions, keys, ServerProfiles) ve panelin bu yapıdan nasıl yararlandığı detaylandırıldı.
- **Sürüm güncellemesi (alpha.6):** Bu dökümantasyon güncellemeleri nedeniyle sürüm numarası `0.3.0-alpha.6` olarak artırıldı; `CHANGELOG.md` ve `WORKLOG.md` dosyalarına yansıtıldı.

### 2026-01-23 — Hata Kodu Loglama (alpha.7)

Bu sprint, hata ayıklamayı kolaylaştırmak için uygulamanın log mekanizmasını geliştirdi.

#### Tamamlananlar

- **Ayrı hata log dosyası:** Uygulama hata kodları artık yalnızca `ErrorLog` tablosuna değil, aynı zamanda `data/logs/error-YYYY-MM-DD.log` dosyasına da kaydediliyor. Yeni Winston transport, hata seviyesindeki logları günlük olarak döndürerek her satıra zaman damgası, seviye, hata kodu, mesaj ve bağlam ekliyor. Böylece hata kaynaklarını doğrudan dosya sisteminden incelemek mümkün hale geliyor.
- **Logger yapılandırması güncellendi:** `server/core/logger.ts` dosyasındaki logger, yeni `errorRotate` transport’unu içeriyor. Bu transport `error` seviyesindeki logları yeni dosyaya yazarken mevcut `app` dosyası tüm logları döndürmeye devam ediyor.
- **Dokümantasyon ve sürüm:** `CHANGELOG.md` dosyasında 0.3.0‑alpha.7 sürümü altında bu iyileştirme açıklandı. `WORKLOG.md` bu kayıt ile güncellendi ve `package.json` sürümü `0.3.0-alpha.7` olarak güncellendi.

#### Notlar

- Bu değişiklik, çoklu instance yapısı ve portatif çalışma modeline ek olarak hata izleme kolaylığı sağlamayı amaçlar. Artık hata kodlarını görmek için veritabanı sorgulamak gerekmez; günlük dosyaları doğrudan incelemek yeterlidir.

### 2026-01-23 — Dev Server Konfigürasyonu (alpha.8)

Bu güncelleme, geliştirme ortamında `/index.html` açılırken yaşanan “403 Restricted” hatasını çözdü.

#### Tamamlananlar

- **Vite fs allow list genişletildi:** `vite.config.client.ts` içerisine `server.fs.allow` eklendi ve proje kökü (`.`) de izinli dizinler listesine dahil edildi. Bu, dev sunucuda bulunan `index.html` dosyasına doğrudan erişimi mümkün kılarak 403 hatasını engeller. Ayrıca `client/` ve `shared/` dizinleri için var olan izinler korunmuştur.
- **Sürüm güncellemesi (alpha.8):** Bu düzeltme nedeniyle `package.json` sürümü `0.3.0-alpha.8` olarak artırıldı ve `CHANGELOG.md` ile `WORKLOG.md` güncellendi.

#### Notlar

- Bu düzenleme yalnızca geliştirme (dev) modunu etkiler; üretim (`npm run build` ve `npm run start`) süreçleri değişmemiştir.

