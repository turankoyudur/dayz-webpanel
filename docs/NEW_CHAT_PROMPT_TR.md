# Yeni Sohbet İçin Tek-Prompt Bağlam (DayzTr Panel)

Aşağıdaki metni **yeni bir ChatGPT sohbetine tek mesaj** olarak yapıştırın. Amaç: Bu repo içindeki DayZ web paneli geliştirmesine kaldığı yerden devam etmek.

---

## Proje adı / hedef

- Proje: **DayzTr Node JS – DayZ Web Panel**
- Hedef: DayZ Dedicated Server kurulum/yönetim paneli (local panel). **Portable** çalışma (DataRoot), kurulum sihirbazı, mod/config/log yönetimi.

## Kritik kararlar (değiştirilmeyecek)

1) **RCON / GameLabs / CFTools tamamen kapsam dışı** (repo içinde yeniden hedeflenmeyecek).
2) **Planlı restart / scheduler panelde yok**: Bu iş **ApiBridge wrapper/scheduler** tarafından yapılacak. Panel sadece koordinasyon hook’ları sunar:
   - `POST /api/server/expect-exit` (localhost-only)
   - `POST /api/server/register-pid` (localhost-only)
3) **dist repo’da takip edilmez**. Build kullanıcı ortamında alınır.
4) Release paketlerinde **node_modules olmaz** ve `data/` runtime çıktıları (db/log) temiz olur.

## Mevcut durum (repo snapshot)

- Sürüm: **0.3.0-alpha.2** (WIP)
- Multi-instance (çoklu sunucu) önceliklendirildi ve backend omurgası başlatıldı.

### Backend’de mevcut (kontrol et)

- Instance context middleware: `server/middleware/instanceContext.ts` → `X-Instance-Id` ⇒ `req.instanceId`
- Instance registry API: `server/modules/instances/*` → `/api/instances`
- Settings instance-scoped: `server/modules/settings/settings.service.ts` (DB key: `instance:<id>`) + global active instance key
- Server control service instanceId ile çalışıyor: `server/modules/server-control/*` (runtime/log path’leri instance bazlı)
- Config service instance configs dizinine yazıyor: `server/modules/config/*` (önce instance configs, yoksa fallback)

### Client’ta durum

- Instance seçici (header) aktif: `client/components/InstanceSelector.tsx` (Layout'a bağlı)
- `/instances` yönetim sayfası mevcut: `client/pages/Instances.tsx`
- (Opsiyonel) HTTP client her isteğe `X-Instance-Id` header eklemiyor (tek kullanıcı local panelde global active yeterli).
- React Query cache key’leri instanceId ile ayrıştırılmalı (reload ihtiyacını azaltmak için).
- Mods enable/order per-instance’a taşınacak (`InstanceMod`).

## Dosya haritası (önce bunları oku)

1) `docs/CHATGPT_CONTEXT_TR.md` – hızlı bağlam
2) `docs/PANEL_ARCHITECTURE_TR.md` – mimari / modül haritası
3) `docs/ROADMAP.md` – öncelik sırası (Multi-instance P1 en üst)
4) `docs/DECISIONS.md` – kalıcı kararlar
5) `docs/WORKLOG.md` + `docs/CHANGELOG.md` – yapılan işler
6) (Varsa) `chatgpt sohbet geçmişi.txt` – eski konuşma backlog’u
7) ApiBridge referansı: `ApiBridge_Management_v1_3.zip` (entegrasyon yapılmayacak, sadece bilgi/roadmap)

## Şu anki sprint hedefi (P1 – Multi-instance Foundation)

Amaç: Tüm ekran ve API çağrıları **instance bağlamıyla** çalışsın.

### Sprint-1 (Multi-instance UI — tamamlanan)

- [x] Instance Selector (header) Layout'a bağlandı.
- [x] `/instances` sayfası eklendi (create / rename / set active / archive).

### Sprint-2 (Instance context + cache ayrıştırma)

1) (Opsiyonel) **Client HTTP**: `client/lib/http.ts` içine `X-Instance-Id` header ekle (localStorage `dz.instanceId`).
2) **React Query**: queryKey’lere instanceId ekle (reload ihtiyacını azaltmak için).
3) Instance değişiminde hard reload yerine: `queryClient.invalidateQueries()` + minimal state reset.

### Sprint-3 (Mods per-instance)

- `InstanceMod` modelini aktive et:
  - enable/disable ve sıralamayı instance bazlı yap.
  - Global `Mod.enabled` alanını deprecated bırak (geriye uyumluluk), UI’dan kullanma.

## Paketleme notu

- Zip adı: `dayz-web-panel-panel-only-v<version>-YYYYMMDD-HHMMSS.zip`
- Zip’te `node_modules/` yok, `data/` temiz, `.env` yok.

---

## Görev

Lütfen repo dosyalarını incele ve ROADMAP sırasına göre **P1 Multi-instance** sprintini tamamla. Sonrasında:

- `docs/ROADMAP.md`, `docs/WORKLOG.md`, `docs/CHANGELOG.md` güncelle
- temiz zip üret (node_modules yok, data temiz)
