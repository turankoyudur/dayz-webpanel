# DayZ Web Panel — Kurulum Rehberi (TR)

Bu doküman, Windows 11 ve Linux üzerinde panelin kurulumu, başlatılması ve
temel sorun giderme adımlarını içerir.

## 1) Önkoşullar

- Windows 11 veya Linux
- İnternet erişimi (SteamCMD / npm paketleri için)
- Diskte yeterli alan (DayZ server + modlar için)

## 2) Varsayılan yollar

Aşağıdaki değerler UI üzerinden değiştirilebilir.

- Windows:
  - DayZ Server: `E:\steamcmd\steamapps\common\DayZServer`
  - SteamCMD: `E:\steamcmd\steamcmd.exe`
  - Profiles: `E:\steamcmd\steamapps\common\DayZServer\profiles`
  - ApiBridge: `E:\steamcmd\steamapps\common\DayZServer\profiles\ApiBridge`

- Linux:
  - DayZ Server: `/opt/steamcmd/steamapps/common/DayZServer`
  - SteamCMD: `/opt/steamcmd/steamcmd.sh`
  - Profiles: `/opt/steamcmd/steamapps/common/DayZServer/profiles`
  - ApiBridge: `/opt/steamcmd/steamapps/common/DayZServer/profiles/ApiBridge`

> Not: ApiBridge klasörü, DayZ tarafındaki modun JSON dosyalarıyla panelle
> haberleştiği dizindir.

## 3) Kurulum (Windows 11)

PowerShell ya da CMD üzerinden:

```bat
scripts\windows\install.bat
```

Kurulum aşamaları:

- Node.js LTS yoksa winget üzerinden kurulur
- `.env` yoksa `.env.example` kopyalanır
- `npm install` + `npm run db:setup`
- `npm run build`
- Log: `data\logs\install-YYYYMMDD-HHMMSS.log`

## 4) Başlatma (Windows 11)

```bat
scripts\windows\start.bat
```

Başlatma aşamaları:

- `npm run db:setup`
- Build yoksa `npm run build`
- Server başlatılır
- Log: `data\logs\start-YYYYMMDD-HHMMSS.log`

Uygulama açıldığında:

```text
http://localhost:3000
```

## 5) Kurulum (Linux)

```bash
chmod +x scripts/linux/install.sh scripts/linux/start.sh
scripts/linux/install.sh
```

Kurulum aşamaları:

- Node.js 22.x mevcut mu kontrol edilir
- `pnpm install` (yoksa `npm install`)
- `.env` yoksa `.env.example` kopyalanır
- `db:setup`
- `build`
- Log: `data/logs/install-YYYYMMDD-HHMMSS.log`

## 6) Başlatma (Linux)

```bash
scripts/linux/start.sh
```

Başlatma aşamaları:

- `db:setup`
- Build yoksa `build`
- Server başlatılır
- Log: `data/logs/start-YYYYMMDD-HHMMSS.log`

Uygulama açıldığında:

```text
http://localhost:3000
```

## 7) Doctor komutu

Sistem sağlığını hızlı kontrol etmek için:

```bash
npm run doctor
```

Kontroller:

- Node.js versiyonu (22 hedef)
- Prisma client üretildi mi
- DB bağlantısı
- `dist/server/node-build.mjs` mevcut mu
- Settings içinde SteamCMD / DayZ / Profiles / ApiBridge path'leri set mi
- ApiBridge klasöründe beklenen dosyalar için temel kontrol

## 8) Sorun Giderme (FAQ)

### A) Kurulum sırasında npm komutları yarıda kesiliyor

- Windows batch dosyalarında `npm` komutları `call npm ...` olarak
  çalışmalıdır.

### B) `dist/server/node-build.mjs` yok

- `npm run build` çalıştırın.
- `scripts\windows\start.bat` zaten bu kontrolü yapar.

### C) ApiBridge "Not Ready"

- DayZ tarafındaki mod çalışıyor mu (server başlatıldı mı)?
- `Profiles/ApiBridge` içinde `bridge_heartbeat.json` güncelleniyor mu?
- Settings içindeki `ApiBridge Path` doğru mu?

### D) Ayar yollarını güncellemek

UI üzerindeki Settings sayfasından yolları girip kaydedin.
