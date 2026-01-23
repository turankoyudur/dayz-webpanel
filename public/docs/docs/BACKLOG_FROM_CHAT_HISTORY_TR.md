# ChatGPT Sohbet Geçmişi Backlog Özeti (TR)

Bu dosya, geçmiş ChatGPT oturumlarında geçen istekleri **tek yerde** toplar ve güncel `docs/ROADMAP.md` ile hizalar.

## 1) Kapsam değişiklikleri (tarihsel)

### Başlangıçta istenen ancak kapsam dışına alınanlar (kalıcı)
- **uzaktan admin / BattlEye uzaktan admin UI & otomasyonları** (konsol, player actions, macros, scheduled messages)
- ** / Cloud** (Data API / event sistemleri, tüm panel özellikleri)

Bu repo için mevcut karar: yukarıdaki entegrasyonlar **geri eklenmez**; yalnızca açık talimatla yeniden kapsam dahiline alınır.

### Opsiyonel: ApiBridge
- ApiBridge modülü repo içinde korunur; fakat geliştirme önceliği değildir.
- Panel core akışı ApiBridge'e bağımlı tutulmaz.

## 2) Geçmişte geçen — güncel panel kapsamına uyan başlıklar

### Kurulum ve "manual edit yok" hedefi
- UI üzerinden tüm gerekli parametrelerin girilebilmesi
- Windows 11 için kurulum/start scriptleri + loglama
- Setup/Wizard akışı ile:
 - klasörlerin oluşturulması
 - SteamCMD kurulumu
 - DayZ Dedicated kurulumu
 - Setup completion gating

**Roadmap karşılığı:** `P0` tamamlananlar + `P1 — Kurulum sihirbazı (v2)`.

### Mod yönetimi
- Workshop arama + koleksiyon import
- “güncel mod listesi”/güncelleme kontrolü
- İndirme kuyruğu + progress

**Roadmap karşılığı:** `P1 — Mod yönetimi (kuyruk/progress)`.

### Multi-instance (MCS Manager/Loader benzeri)
- Instance klasör standardı
- UI'dan instance oluşturma/klonlama

**Roadmap karşılığı:** `P1 — Kurulum sihirbazı (v2)` (instance standardı) + ileri fazlar.

### Server control operasyonları
- PID persistence + crash detection
- Graceful stop + kill fallback
- Planlı restart / schedule (ApiBridge wrapper/scheduler) — panel: coordination hooks

**Roadmap karşılığı:** `P1 — Server control iyileştirmeleri`.

### Config editörleri ve loglar
- `serverDZ.cfg` raw edit + validation
- Log viewer filtre/search/export

**Roadmap karşılığı:** `P2 — Config editörleri ve operasyonel araçlar`.

## 3) Bu backlog'un kullanımı

- Yeni özellik talebi geldiğinde önce buraya bak:
 - **kapsam dışı mı?**
 - **hangi roadmap maddesine düşüyor?**
- Roadmap'te bir madde tamamlandığında burada ayrıca “tamamlandı” işaretlemesi şart değildir;
 referans olarak `docs/ROADMAP.md` kaynak kabul edilir.
