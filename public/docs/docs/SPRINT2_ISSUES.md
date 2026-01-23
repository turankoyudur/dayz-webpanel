# Sprint-2 Issue Breakdown (Plan)

Milestone: **Sprint-2**

Labels: **steamcmd**, **mods**, **ui**, **infra**, **bug**

> Not: Sprint-2 icin sadece is parcasi (issue) planidir. Kod degisikligi yok.

## SteamCMD / Workshop
1. **Workshop Search UI + API**
   - Label: steamcmd, mods, ui
   - Kapsam: text search, title/id/updated/size/required DLC gosterimi, "Add" butonu.
2. **Collection import**
   - Label: steamcmd, mods
   - Kapsam: collection URL/ID parse, modlari listele, tek tikla ekle, bagimlilik raporu.
3. **Mod install pipeline (queue + retry)**
   - Label: steamcmd, mods
   - Kapsam: ayni anda x indirme, progress, retry.
4. **Launch arg builder (mod order + presets)**
   - Label: mods, ui
   - Kapsam: -mod/-serverMod ayrimi, drag-drop siralama, preset profilleri.

## Config Yonetimi
5. **serverDZ.cfg editor**
   - Label: ui, infra
   - Kapsam: parse + edit + save, validation, diff gorunumu.
6. **Profil/instance config**
   - Label: infra
   - Kapsam: instance config sync, clone/export/import.

## UX / UI
7. **Dashboard health cards**
    - Label: ui
8. **Log viewer filtre/search/export**
    - Label: ui
9. **Notification system**
    - Label: ui
10. **Role-based auth (opsiyonel)**
    - Label: ui, infra

## Dev / Ops
11. **CI: build + lint + unit tests**
    - Label: infra
12. **E2E smoke test (/health)**
    - Label: infra
13. **Issue template + PR checklist**
    - Label: infra
