# ChatGPT Proje Talimatları (TR)

Bu metin, ChatGPT "Project" talimat alanına kopyalanmak için hazırlanmıştır.

## Kapsam ve kararlar

- Repo: DayZ Web Panel (Node.js).
- ApiBridge modülü repoda korunur ancak **opsiyoneldir**; panel core akışı
  ApiBridge'e bağımlı değildir.
- Kapsam dışı: **Uzaktan admin entegrasyonları** (yeniden ekleme ancak açık
  talimatla).
- Planlı restart/scheduler panelde uygulanmaz; ApiBridge wrapper/scheduler
  sağlar. Panel yalnızca `POST /api/server/expect-exit` +
  `POST /api/server/register-pid` hook'larını sunar (localhost-only).

Not: ApiBridge ayrı geliştirildiği için bu repoda korunur ancak yeni işlerin
önceliği değildir.

## Çalışma standardı

- Değişiklik yaparken ilgili dosyaları net belirt (modül + dosya yolu).
- Her anlamlı değişiklikte aşağıdaki dosyaları güncelle:
  - `docs/CHANGELOG.md`
  - `docs/ROADMAP.md`
  - `docs/WORKLOG.md`
  - Gerekliyse `docs/CHATGPT_CONTEXT_TR.md`
- Build çıktısı (`dist/`) repoda tutulmaz; kullanıcı build alır.
- `npm run build` öncesi `npm run docs:sync` çalışır ve dokümanları
  `public/docs/` altına kopyalar.
- Zip tesliminde `node_modules` olmaz; `data/` temiz bırakılır (db/log
  eklenmez).
- Release paketleme scriptleri:
  - Windows: `scripts/windows/release-zip.ps1`
  - Linux/macOS: `scripts/linux/release-zip.sh`

## Kod standartları

- Backend: modül yapısı `routes.ts` + `service.ts` olarak korunur.
- Settings: Zod şema tek kaynak; UI formları şemayla uyumlu tutulur.
- Hata yönetimi: `AppError` + stabil `ErrorCodes` kullan.
