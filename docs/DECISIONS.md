# Decisions (Güncel)

Bu dosya, projede alınan **kalıcı/stratejik kararları** tek yerde toplar.

## 2026-01-22 — Uzaktan admin entegrasyonları kapsam dışı

- Panel tarafında **Uzaktan admin entegrasyonları** entegrasyonları **tamamen
  kapsam dışı**dır.
- Özellikle **RCON / GameLabs / CFTools** gibi entegrasyonlar bu repodan
  kaldırılmıştır ve yeniden hedeflenmez.
- Yönetim (broadcast, restart, player/admin aksiyonları) için hedef yön
  **ApiBridge (file-bridge + wrapper)** yaklaşımıdır.

## 2026-01-22 — Planlı restart/scheduler panelde uygulanmayacak

- Planlı restart/scheduler **panel içinde** uygulanmayacak.
- Bu yetenek **ApiBridge wrapper/scheduler** tarafından sağlanacak.
- Panel tarafında yalnızca çakışmayı önlemek için koordinasyon hook'ları
  bulunur:
  - `POST /api/server/expect-exit` (localhost-only): Yakın zamanda
    gerçekleşecek shutdown/restart için "expected exit" penceresi açar.
  - `POST /api/server/register-pid` (localhost-only): Wrapper restart sonrası
    yeni PID'i panele bildirir (process "detached" kalır).

## 2026-01-22 — Build ve dist yönetimi

- Build kullanıcı ortamında alınır.
- Repo tarafında `dist/` takip edilmez.
- Her önemli değişiklikte `docs/ROADMAP.md`, `docs/WORKLOG.md`,
  `docs/CHANGELOG.md` güncel tutulur.

## 2026-01-22 — Multi-instance önceliklendirme

- Çoklu sunucu (multi-instance) desteği, proje yapısını kökten etkilediği için
  roadmap'te **P1 önceliğine** alındı.
- Hedef: Tüm modüller (settings/server/mods/config/log) `X-Instance-Id`
  tabanlı instance bağlamıyla çalışır.
