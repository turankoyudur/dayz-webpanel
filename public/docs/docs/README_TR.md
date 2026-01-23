# DayZ Web Panel — Kurulum Rehberi (TR)

Bu doküman, Windows 11 ve Linux üzerinde panelin kurulumu, başlatılması ve temel sorun giderme adımlarını içerir.

## 1) Önkoşullar
- Windows 11 veya Linux
- İnternet erişimi (SteamCMD / npm paketleri için)
- Diskte yeterli alan (DayZ server + modlar için)

## 2) Varsayılan yollar ve portatif çalışma

Panel, **portatif** bir çalışma modeli üzerine kuruludur. Tüm runtime verileri ve bağımlılıklar proje kök dizinindeki `data/` klasörü altında tutulur.  Bu kök değere **DataRoot** denir (`Settings.dataRoot`). Setup Sihirbazı veya Settings ekranından değiştirilebilir ancak varsayılan olarak panel, harici bir sürücüye ihtiyaç duymadan tamamen kendi klasöründe çalışır.

Varsayılan yollar, aşağıdaki *managed path*'ler üzerinden DataRoot'tan türetilir.  Bu değerler UI üzerinden isteğe göre değiştirilebilir:

- **SteamCMD çalıştırılabilir** (`steamcmdPath`)
  - Windows: `<dataRoot>/steamcmd/steamcmd.exe`
  - Linux/macOS: `<dataRoot>/steamcmd/steamcmd.sh`
  
  Setup Sihirbazı'nın “Install SteamCMD” adımı bu dosyayı indirir ve kurar.

- **DayZ Dedicated Server klasörü** (`dayzServerPath`)
  
  - `<dataRoot>/steamcmd/steamapps/common/DayZServer`
  
  SteamCMD üzerinden **223350** uygulama kimliği ile indirilen DayZ server burada yer alır. Klasör içinde `serverDZ.cfg`, `mpmissions/`, `keys/` ve `ServerProfiles/` (veya `profiles/`) gibi alt dizinler bulunur.

- **Profiles klasörü** (`profilesPath`)

  - `<dataRoot>/instances/<instanceName>/profiles`
  
  Panel, DayZ serverın *ServerProfiles* klasörüne denk gelen profillerini her instance için burada tutar. RPT logları ve diğer çalışma dosyaları bu dizinde saklanır.

- **ApiBridge klasörü** (`apiBridgePath`)
  
  - `<profilesPath>/ApiBridge`
  
  DayZ ApiBridge modunun JSON dosyaları (state.json, players.json, commands.json, vb.) bu klasöre yazılır ve panel tarafından okunur.

Bu varsayılan yapılar portatif çalışma içindir; UI üzerinden istediğiniz gibi değiştirebilirsiniz.  Ancak paneli bir USB diske veya taşıması kolay bir klasöre kurmak istiyorsanız `dataRoot` değerini proje klasöründen dışarı çıkarmanıza gerek yoktur.

> Not: ApiBridge klasörü, DayZ tarafındaki modun JSON dosyalarıyla panelin haberleştiği dizindir.

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

```
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

```
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
- Settings içinde SteamCMD / DayZ / Profiles / ApiBridge path’leri set mi
- ApiBridge klasöründe beklenen dosyalar için temel kontrol

## 8) Sorun Giderme (FAQ)

### A) Kurulum sırasında npm komutları yarıda kesiliyor
- Windows batch dosyalarında `npm` komutları `call npm ...` olarak çalışmalıdır.

### B) `dist/server/node-build.mjs` yok
- `npm run build` çalıştırın.
- `scripts\windows\start.bat` zaten bu kontrolü yapar.

### C) ApiBridge “Not Ready”
- DayZ tarafındaki mod çalışıyor mu (server başlatıldı mı)?
- `Profiles/ApiBridge` içinde `bridge_heartbeat.json` güncelleniyor mu?
- Settings içindeki `ApiBridge Path` doğru mu?

### D) Ayar yollarını güncellemek
UI üzerindeki Settings sayfasından yolları girip kaydedin.

## 9) Hata logları

Panel, oluşan hataları iki şekilde kaydeder:

- **Veritabanı `ErrorLog` tablosu:** Kapsamlı hata kodu, mesaj ve yığın izlerini saklar. API üzerinden veya DB aracıyla sorgulanabilir.
- **`data/logs/error-YYYY-MM-DD.log` dosyası:** Yalnızca `error` seviyesindeki logları içerir ve her satırda zaman damgası, seviye, hata kodu, mesaj ve bağlamı barındırır. Hata ayıklarken DB sorgusu yapmanıza gerek kalmadan bu dosyayı inceleyebilirsiniz.

Ana günlük dosyası `data/logs/app-YYYY-MM-DD.log` tüm seviyelerdeki logları içerirken, `error` log dosyası yalnızca hatalar için ayrılmıştır.
