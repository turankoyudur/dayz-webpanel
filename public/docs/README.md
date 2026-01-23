# DayZ Web Panel (Node.js)

Bu proje, Windows 11 / Linux üzerinde çalışan **DayZ Dedicated Server** için modern bir web panelidir.

Bu repoda panelin ana hedefi: **kurulum, modlar, server process yönetimi ve log/config görünürlüğü**.

ApiBridge modülü repoda korunur ancak:
- ApiBridge geliştirmesi **ayrı yürütülür**
- Panel core akışının zorunlu bağımlılığı değildir

> Not: Uzaktan admin entegrasyonları bu repo kapsamı dışındadır.

## Mevcut sürümde neler var?

- **Kurulum / çalıştırma scriptleri** (loglu)
 - Windows: `scripts/windows/install.bat`, `scripts/windows/start.bat`
 - Linux: `scripts/linux/install.sh`, `scripts/linux/start.sh`
- **SQLite lokal DB** (Prisma)
 - Ayarlar (DB’de), mod listesi, hata logları
- **Settings ekranı**
 - SteamCMD yolu, DayZ server yolu, profiles yolu, ApiBridge yolu
 - server port, serverDZ.cfg adı, ek launch argümanları
 - Steam kullanıcı/şifre (SteamCMD workshop indirme için)
 - ApiBridge: apiKey, nodeId, polling/timeout ayarları
- **Mod yönetimi**
 - Workshop ID ekle
 - SteamCMD ile mod indirme (temel)
 - Enable/Disable ile launch argümanına otomatik dahil etme
- **Server kontrol**
 - Start / Stop / Restart
 - Enable modlar için server klasörüne **Junction link (mklink /J)** (Windows) veya **symlink** (Linux) oluşturma
- **ApiBridge UI**
 - Players sayfası: online oyuncu snapshot (state.json)
 - Console sayfası: ApiBridge üzerinden komut gönderme + sonuç bekleme
- **Log görüntüleme**
 - `./data/logs` altındaki logları listeleme ve tail

## Kurulum / Başlatma

Detaylı kurulum rehberi: `docs/README_TR.md`

Özet (Windows):

1) Kurulum:

```bat
scripts\windows\install.bat
```

2) Başlatma:

```bat
scripts\windows\start.bat
```

Uygulama:

`http://localhost:3000`

## Dosya Yapısı

```
dayz-web-panel/
 client/ # React + Tailwind UI
 server/ # Express API + servisler
 prisma/ # DB şeması
 data/ # Lokal DB + loglar (gitignored)
 scripts/ # Windows/Linux install & start
 docs/ # Kurulum + mimari + roadmap + changelog
```

## Mimari

- `server/modules/settings` → DB’de settings yönetimi
- `server/modules/apibridge` → File-Bridge okuma/yazma + komut döngüsü
- `server/modules/mods` → Workshop mod DB + SteamCMD download + enable/disable
- `server/modules/server-control` → DayZ process start/stop + junction link
- `server/modules/config` → DayZ config okuma-yazma (serverDZ.cfg vb.)
- `server/modules/logs` → log list/tail

Her modül:
- `*.service.ts` → iş mantığı
- `*.routes.ts` → API endpointleri

## Yol Haritası ve Değişiklik Günlüğü

- Roadmap: `docs/ROADMAP.md`
- Changelog: `docs/CHANGELOG.md`
- ChatGPT bağlam dosyası: `docs/CHATGPT_CONTEXT_TR.md`

## Dokümanların build çıktısına entegrasyonu

`npm run build`, build'e başlamadan önce `npm run docs:sync` çalıştırır ve repo dokümanlarını `public/docs/` altına kopyalar.
Bu sayede `dist/` üretildiğinde SPA içinde güncel dokümanlar da yer alır.

## Release ZIP (node_modules yok, data temiz)

Kaynak release için (varsayılan: **dist dahil değil**):

- Windows (PowerShell):
 - `powershell -ExecutionPolicy Bypass -File scripts\windows\release-zip.ps1`
- Linux/macOS:
 - `./scripts/linux/release-zip.sh`

`dist/` de dahil edilecekse:
- Windows: `... release-zip.ps1 -IncludeDist`
- Linux/macOS: `INCLUDE_DIST=1 ./scripts/linux/release-zip.sh`

 
