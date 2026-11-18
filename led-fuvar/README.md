# LED-fal súly- és fuvarkalkulátor (`led-fuvar/`)

Önálló, egyfájlos HTML-kalkulátor: LED-kabinetek, tartozékok és ládák alapján bruttó tömeget, térfogatot,
valamint légi, tengeri (LCL/FCL) és vasúti (LCL/FCL) fuvardíjat számol, lépésenkénti levezetéssel.

- `index.html` – a kész, közzétehető oldal (beépített tartalék adatokkal).
- `data.json` – minden adat (kabinetek, ládák, tartozékok, konténerek, díjindexek, árfolyam) forrással.
  Az oldal induláskor innen tölti a friss változatot:
  `https://raw.githubusercontent.com/leho-cloud/kalkulator/main/led-fuvar/data.json`
- `core.js` – számítási logika, `test/core.test.mjs` – ellenőrzött példák.
- `src/` – felület forrása, `build.mjs` – összeállítja az `index.html`-t.

## Frissítés (2–3 naponta, ütemezett feladat végzi)

1. Csak nyilvános forrásból, dátummal és URL-lel frissíts. Ha egy érték nem található, maradjon `null` – ne becsüld.
2. Frissítendő mezők a `data.json`-ban:
   - `rates.air` – Freightos Air Index Kína → Észak-Európa (USD/kg), vagy TAC/Baltic ha az frissebb.
   - `rates.seaFcl40` – Drewry WCI Shanghai → Rotterdam (USD/40'); `rates.seaFcl40alt` – Xeneta/Freightos FBX11.
   - `rates.seaLcl`, `rates.railFcl40`, `rates.railLcl` – csak ha új, datált nyilvános sáv jelent meg.
   - `fx` – EKB euró referencia-árfolyam (USD, HUF).
   - `cabinets`, `cases`, `accessories` – új gyártói adatlap vagy modell esetén.
   - `meta.updated` – a frissítés napja (ÉÉÉÉ-HH-NN).
3. `node test/core.test.mjs` és `node build.mjs`, majd commit a `main` ágra.

A régi, saját szállítási listákból származó adatokat szándékosan nem tartalmazza.
