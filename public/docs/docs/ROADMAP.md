# Roadmap (Güncel)

Bu roadmap, **panel** tarafının hedeflerini ve öncelik sıralamasını içerir.

## Kapsam ve kararlar
- **Kapsam dışı (kalıcı):** Uzaktan admin entegrasyonları.
- **ApiBridge:** Ayrı geliştiriliyor. Bu repoda ApiBridge modülü korunur, ancak ana gelişim önceliği değildir.
- **Planlı restart / scheduler:** Panelde uygulanmaz; ApiBridge wrapper/scheduler sağlar. Panel yalnızca koordinasyon hook'ları sunar (`POST /api/server/expect-exit`, `POST /api/server/register-pid`).
- **Build:** Kullanıcı kendi ortamında build alır; repo tarafında `dist/` takip edilmez.

## Öncelik etiketleri
- **P0**: Panelin güvenilir şekilde açılması ve temel akışların hatasız çalışması
- **P1**: Kurulum otomasyonu + UX + görünürlük
- **P2**: Gelişmiş özellikler ve kalite
- **P3**: Nice-to-have / uzun vadeli

---

## P0 — Stabilizasyon ve tutarlılık (hedef: sürekli çalışır v1)
- [x] Settings şeması ↔ UI form alanları tutarlı (Steam Web API Key dahil)
- [x] Portable çalışma için DataRoot + managed-path türetme (hard-coded drive yok)
- [x] `/api/settings/health` sonuçları UI health kartında görünür
- [x] `doctor` çıktısı: “ne eksik, nasıl düzeltirim” formatında net
- [x] Setup gate: `setupComplete=false` ise otomatik `/setup` yönlendirmesi
- [x] Setup API v1: status + create-folders + (Windows) install-steamcmd + install-dayz + complete

### P0 — Sıradaki (kısa vadeli)
- [x] Release paketi scripti (node_modules hariç, data temiz): `scripts/windows/release-zip.ps1`, `scripts/linux/release-zip.sh`
- [x] Build öncesi doküman senkronizasyonu: `npm run docs:sync` (dokümanları `public/docs/` altına kopyalar)
- [x] Doküman indeksleme: `docs/INDEX.md` + `docs/WORKLOG.md` güncelliği
- [x] Typecheck çıktısının temizlenmesi: `pnpm run typecheck`

---

## P1 — Kurulum sihirbazı (v2) + güvenli çalışma alanı
- [x] Wizard adım adım akış (UI): temel ayarlar, klasör oluşturma, opsiyonel SteamCMD/DayZ kurulum job’ları, doğrulama
- [x] SteamCMD/DayZ kurulumunda progress + log (job + polling, output tail)
- [ ] (Opsiyonel) SSE log streaming (daha akıcı UI)
- [x] Path seçici (Browse…): allowlist köklerde güvenli klasör seçimi (`/api/fs/roots`, `/api/fs/list`)
- [x] Setup sırasında `/settings` erişimi (paths düzeltmek için)
- [x] Instance klasör yapısı standardı: `instances/<name>/profiles`, `instances/<name>/runtime`, `instances/<name>/keys`

---

## P1 — Server control iyileştirmeleri
- [x] PID persistence + crash detection (panel restart olsa bile status doğru)
- [x] Graceful stop + kill fallback (Windows: taskkill)
- [x] Dış scheduler uyumluluğu: expected-exit penceresi + detached PID register (ApiBridge wrapper için)
- [x] Sunucu parametre preset’leri (ör. “vanilla”, “modded”)

---

## P1 — Mod yönetimi (kuyruk/progress)
Not: Temel mod arama + koleksiyon import + enable/disable akışı mevcut.

- [x] Workshop arama (QueryFiles) + fallback search
- [x] Collection import
- [ ] İndirme kuyruğu (concurrency / retry / progress)
- [ ] Mod sıralama (drag-drop) + preset
- [ ] Güncelleme kontrolü (yalnızca indirilen modlar)

---

## P2 — Config editörleri ve operasyonel araçlar
- [ ] `serverDZ.cfg` parse + diff + validation
- [ ] Instance bazlı config klonla / export / import
- [ ] Log viewer: filtre/search/export
- [ ] Bildirim sistemi (kritik hata / server düştü / mod download bitti)

---

## P3 — Güvenlik ve dağıtım
- [ ] Basit auth (opsiyonel): local admin kullanıcı
- [ ] Paketleme: `pkg` ile tek exe / servis modu
- [ ] CI: build + lint + test (GitHub Actions)
