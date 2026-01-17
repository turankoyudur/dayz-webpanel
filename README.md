# DayZ Local Panel (Windows 11) — File Based (MCSManager tarzı)

Bu proje; **DayZ sunucunu aynı makinede** yönetmek için hazırlanmış, **Node.js tabanlı** bir web paneldir.

- **RCON (BattlEye) bağlantısı** + komut çalıştırma + çıktı izleme
- **Sunucu proses yönetimi**: başlat / durdur / yeniden başlat (watchdog ile)
- **Dosya yöneticisi**: DayZ klasörlerini panelden gez, dosya oku/yaz
- **BEServer_x64.cfg düzenleme** (RConPassword / RConPort / RestrictRCon)
- **Log**: panel console, RCON, steamcmd, audit (kim ne yaptı) + profile log tail
- **SteamCMD**: Dedicated server güncelleme + workshop download (opsiyonel)
- **Scheduler (cron)**: belirli saatlerde mesaj/restart/update gibi işleri çalıştırma

> Not: Veritabanı (Prisma/SQLite) yoktur. Tüm veriler `./data` altında JSON/log dosyaları olarak saklanır.

---

## 1) Kurulum (Windows 11)

1) Zip’i bir klasöre çıkar:

- Örnek: `C:\dev\dayz-panel`

2) **install.bat** çalıştır:

- `install.bat` Node.js yoksa **portable Node.js LTS indirip `tools/node/current` içine kurar**.
- Ardından `npm install`, `npm run build`, `npm run setup` çalışır.

3) **start.bat** çalıştır:

- Paneli başlatır ve tarayıcıda `http://localhost:8081` açar.

4) İlk giriş bilgileri:

- `data\SystemConfig\FIRST_RUN_CREDENTIALS.txt`

---

## 2) DayZ klasörlerini panelde tanımlama

`install.bat` sonrası otomatik olarak bir örnek instance oluşturulur:

- DayZ root: `E:\steamcmd\steamapps\common\DayZServer`
- BattlEye: `E:\steamcmd\steamapps\common\DayZServer\profiles\BattlEye`

Instance dosyası:

- `data\InstanceConfig\dayz-main.json`

Bu dosyada:
- exe, args, port, profiles yolu, BE yolu vb. ayarları güncelleyebilirsin.

---

## 3) Dosya Yapısı (MCSManager tarzı)

Bu panelde iki ana klasör mantığı var:

- `data/InstanceConfig/<ID>.json`
  - Instance ayar dosyası (sunucu yolu, port, args, watchdog, steamcmd vb.)

- `data/InstanceData/<ID>/...`
  - Instance’a ait runtime/log dosyaları
  - `logs/console.log` (panel yakaladığı stdout/stderr)
  - `logs/rcon.log` (RCON komut/çıktı)
  - `logs/steamcmd.log` (SteamCMD çıktısı)
  - `logs/audit.ndjson` (kim ne yaptı?)
  - `tasks.json` (scheduler)

---

## 4) Panel Özellikleri

### Sunucu kontrol
- Start / Stop / Restart
- Watchdog (crash olursa restart)

### RCON
- Connect/Disconnect
- Komut gönderme + response görme
- Message/event’ler Socket.IO üzerinden UI’a akar

### Dosya Yönetimi
- Root / Profiles / BattlEye dizinleri arasında geçiş
- Dosya aç / düzenle / kaydet

### BattlEye config editor
- `BEServer_x64.cfg` içinden ayarları okur/yazar
- `BEServer_x64_active_*.cfg` varsa uyarır ve istersen silebilirsin

### SteamCMD
- DayZ Dedicated güncelleme
- Workshop download (Steam hesabı gerekebilir)

### Audit log
- Panelde yapılan kritik işlemler (start/stop, rcon command, file write vs.) kayıt edilir.

---

## 5) Geliştirme Modu

Komutlar (proje kökünde):

```bash
npm install
npm run dev:full
```

- `dev:full` hem backend’i hem Vite frontend’i birlikte çalıştırır.

---

## 6) Modüler Mimari (revize ederken dosya yapısı bozulmasın)

Backend modülleri:

- `apps/server/src/modules/*Routes.ts`
  - Her özellik kendi route dosyasında

Servis katmanı:

- `instances/instanceManager.ts`  → Instance config + data dizinleri
- `dayz/processManager.ts`       → DayZ process lifecycle
- `rcon/rconManager.ts`          → RCON bağlantıları
- `files/fileService.ts`         → Secure file operations
- `steam/steamcmdService.ts`     → SteamCMD runner
- `scheduler/scheduler.ts`       → Cron tasks
- `audit/audit.ts`               → Audit logging

> Yeni özellik eklerken ideal yaklaşım:
> 1) `services` katmanına yeni servis
> 2) `modules/` içine yeni route dosyası
> 3) UI tarafına yeni Tab / Component

---

## 7) Yol Haritası (istersen sonraki revizelerde ekleyebiliriz)

- Mod manager (workshop list, otomatik junction/symlink, keys sync)
- Backup/restore (config + profiles + mpmissions + mod list)
- Rol bazlı permission ekranı
- Discord webhook bildirimleri
- Log trigger + otomasyon (CF Tools benzeri)

---

## Lisans / Uyarı

Bu proje bir örnek/altyapı olarak hazırlanmıştır.
Sunucunu internete açacaksan:
- `data/SystemConfig/config.json` içinde `host` ve `allowedOrigins` ayarlarını dikkatli yap
- Şifreyi değiştir
- Gerekirse reverse proxy + HTTPS kullan
