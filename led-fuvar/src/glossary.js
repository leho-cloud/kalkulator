// Fuvarszótár és ajánlatértelmező
const GLOSS = [
  { g: 'Paritás (Incoterms® 2020) – ki fizet és meddig', items: [
    { k: 'EXW', n: 'Ex Works – gyártelepen átadva', d: 'Az eladó csak összekészíti az árut a saját telephelyén. Minden mást a vevő (vagy a szállítmányozója) intéz és fizet: felrakás, elszállítás a raktárig, kínai exportvámkezelés, fő fuvar, import. Ha az ajánlat „EXW Shenzhen”, akkor a díj már a gyári felvételtől számít.', m: /\bEXW\b|ex\s?works/i },
    { k: 'FCA', n: 'Free Carrier – fuvarozónak átadva', d: 'Az eladó exportvámkezel, és átadja az árut a vevő fuvarozójának a megnevezett helyen (pl. a gyűjtőraktárban). Ettől kezdve minden költség és kockázat a vevőé. Vasúthoz és légi fuvarhoz ez a pontos megfelelője a FOB-nak.', m: /\bFCA\b/i },
    { k: 'FOB', n: 'Free On Board – hajóra rakva', d: 'Csak tengeri fuvarnál. Az eladó fizeti a belföldi fuvart és az exportvámot, és felrakja az árut a hajóra a kikötőben (pl. FOB Shenzhen). A tengeri fuvardíjat és mindent utána a vevő fizet.', m: /\bFOB\b/i },
    { k: 'CFR', n: 'Cost and Freight – költség és fuvar', d: 'Csak tengeri. Az eladó a célkikötőig kifizeti a tengeri fuvart, de a kockázat már a hajóra rakáskor a vevőre száll. Biztosítás nincs benne.', m: /\bCFR\b|\bC&F\b/i },
    { k: 'CIF', n: 'Cost, Insurance and Freight', d: 'Mint a CFR, de az eladó minimális szállítmánybiztosítást is köt. Az EU-ban a vámérték nagyjából az EU-határig felmerült CIF-érték.', m: /\bCIF\b/i },
    { k: 'CPT / CIP', n: 'Carriage Paid To / and Insurance Paid', d: 'Bármely fuvarmódnál: az eladó kifizeti a fuvart a megnevezett célhelyig (CIP-nél biztosítással), a kockázat az első fuvarozónak átadáskor átszáll.', m: /\bCPT\b|\bCIP\b/i },
    { k: 'DAP', n: 'Delivered At Place – célhelyre szállítva', d: 'Az eladó (vagy a szállítmányozó) a megadott címig szállít, de az importvámkezelés, a vám és az ÁFA a vevőé. Lerakodás a vevő feladata.', m: /\bDAP\b/i },
    { k: 'DPU', n: 'Delivered at Place Unloaded', d: 'Mint a DAP, de az eladó le is rakodja az árut a célhelyen.', m: /\bDPU\b/i },
    { k: 'DDP', n: 'Delivered Duty Paid – vámfizetve leszállítva', d: 'Mindent az eladó vagy a szállítmányozó fizet, a vámot és az import-ÁFA-t is. A legkényelmesebb, de nézd meg, kinek a nevén megy a vámkezelés, és visszaigényelhető-e az ÁFA.', m: /\bDDP\b/i },
  ]},
  { g: 'Helyek, útvonal, kódok', items: [
    { k: 'CFS', n: 'Container Freight Station – gyűjtőraktár', d: 'Az a raktár, ahol a gyűjtő (LCL) szállítmányokat konténerbe rakják vagy kirakják. „CFS BUD” = a budapesti gyűjtőraktárban vehető át az áru, ide még nem szállítják ki a címedre; a kiszállítás (utófuvar) külön tétel.', m: /\bCFS\b/i },
    { k: 'CY', n: 'Container Yard – konténerterminál', d: 'Teljes konténeres (FCL) átadás-átvétel helye a kikötőben vagy vasúti terminálon. „CY–CY” díjban nincs benne a kiszállítás.', m: /\bCY\b/i },
    { k: 'BUD', n: 'Budapest kódja', d: 'A budapesti repülőtér IATA-kódja, de vasúti és tengeri ajánlatban is egyszerűen Budapestet jelöli (UN/LOCODE: HUBUD). Vasútnál általában a BILK vagy más budapesti terminál, illetve az ahhoz tartozó CFS.', m: /\bBUD\b|HUBUD/i },
    { k: 'BILK', n: 'Budapesti Intermodális Logisztikai Központ', d: 'Soroksári vasúti konténerterminál, ide érkezik a kínai konténervonatok jelentős része.', m: /\bBILK\b/i },
    { k: 'via …', n: 'Útvonal / gyűjtőközpont', d: 'A „via Xi’an” vagy „via Chengdu” azt jelenti, hogy a vonat melyik kínai vasúti csomópontból indul. Az áru odáig belföldön jut el a gyártól. Az útvonal befolyásolja az árat, a menetidőt és az indulások gyakoriságát; ugyanarra a feladásra ez két alternatív ajánlat, nem kell összeadni őket.', m: /\bvia\b/i },
    { k: 'Xi’an', n: 'Hszian – vasúti csomópont', d: 'Az egyik legnagyobb kínai konténervonat-csomópont (Xi’an Chang’an International Port), sűrű indulással Európa felé.', m: /xi['’]?an|hszian/i },
    { k: 'Chengdu', n: 'Csengtu – vasúti csomópont', d: 'Délnyugat-kínai vasúti csomópont (Chengdu International Railway Port), rendszeres vonatokkal Európa felé.', m: /chengdu|csengtu/i },
    { k: 'Malaszewicze', n: 'Lengyel–belarusz határátmenet', d: 'Itt történik a nyomtávváltás (széles nyomtávról normálra) a legtöbb Kína–Európa vonatnál. Torlódás esetén itt keletkezik késés.', m: /malaszewicze|ma[łl]aszewicze/i },
    { k: 'POL / POD', n: 'Port of Loading / Port of Discharge', d: 'Berakodási és kirakodási kikötő (vagy terminál).', m: /\bPOL\b|\bPOD\b/i },
    { k: 'Door-to-door', n: 'Háztól házig', d: 'A díj a feladó címétől a te címedig tart. Ellenőrizd, hogy a vámkezelés benne van-e.', m: /door[\s-]to[\s-]door|háztól/i },
    { k: 'Utófuvar', n: 'Kiszállítás a terminálról', d: 'A CFS-től vagy terminálról a telephelyedig tartó közúti fuvar (on-carriage, delivery). Ha az ajánlat CFS-ig vagy CY-ig szól, ezt külön kell kérni.', m: /utófuvar|on-?carriage|delivery|kiszállítás/i },
  ]},
  { g: 'Mennyiség és díjalap', items: [
    { k: 'LCL', n: 'Less than Container Load – gyűjtő', d: 'Részrakomány: a szállítmányod más feladók áruival egy konténerben utazik. Térfogat vagy tömeg (W/M) alapján fizetsz.', m: /\bLCL\b/i },
    { k: 'FCL', n: 'Full Container Load – teljes konténer', d: 'Egész konténert bérelsz; a díj konténerenként értendő, a töltöttségtől függetlenül.', m: /\bFCL\b/i },
    { k: 'CBM / m³', n: 'Köbméter', d: 'Cubic meter. Az LCL-díjak többsége „USD/CBM” vagy „USD/W/M”.', m: /\bCBM\b|m3\b|m³/i },
    { k: 'W/M', n: 'Weight or Measurement', d: 'A díjköteles mennyiség a tömeg vagy a térfogat közül a nagyobb. Tengeren 1 m³ = 1000 kg, vasúton gyakran 1 m³ = 333 kg (vagy szállítmányozónként más). A kalkulátor 4. lépése ezzel számol.', m: /\bW\s?\/\s?M\b/i },
    { k: 'RT', n: 'Revenue Ton – díjköteles tonna', d: 'A W/M alapján kiszámolt díjköteles egység (1 RT = 1 m³ vagy 1 t). Általában minimum 1 RT-t számláznak.', m: /\bRT\b|revenue ton/i },
    { k: 'Díjköteles tömeg', n: 'Chargeable weight – légi fuvar', d: 'A tényleges bruttó és a térfogati tömeg közül a nagyobb. Térfogati tömeg = cm³ / 6000 (1 m³ = 166,7 kg).', m: /chargeable|díjköteles|volumetric|térfogati/i },
    { k: 'TEU / FEU', n: '20 és 40 lábas konténeregység', d: 'TEU = 20 láb, FEU = 40 láb. 20GP: ~33 m³, 40GP: ~67 m³, 40HC: ~76 m³ belső tér.', m: /\bTEU\b|\bFEU\b|20GP|40GP|40HC|20'|40'/i },
    { k: 'Min.', n: 'Minimumdíj', d: 'Kis szállítmánynál is ennyit kell legalább fizetni (pl. „min. 1 CBM”).', m: /\bmin\.?\b|minimum/i },
    { k: 'All-in', n: 'Mindent tartalmazó díj', d: 'Elvileg minden pótdíjat tartalmaz; mindig kérdezz rá, mi marad ki (jellemzően a vámkezelés, a vám, az ÁFA és a kiszállítás).', m: /all[\s-]?in/i },
    { k: '.- / ,-', n: 'Kerek összeg jele', d: 'A „460 USD .-” a kerek összeget jelenti (nincsenek tizedesek), nem egységet.', m: /\.-|,-/ },
    { k: 'per shpt / per BL', n: 'Szállítmányonként / fuvarokmányonként', d: 'A díj egyszer fizetendő a teljes feladásra, a mennyiségtől függetlenül. Ilyen jellemzően a Doc ktg és a vámkezelés.', m: /per\s?(shpt|shipment|bl|hbl)|\/\s?(shpt|bl|hbl)|szállítmányonként/i },
  ]},
  { g: 'Helyi költségek és pótdíjak', items: [
    { k: 'Doc ktg', n: 'Dokumentációs költség (DOC fee)', d: 'Okmánykezelési díj: a fuvarokmány (B/L, CIM/SMGS, AWB) kiállítása, a vámhoz szükséges iratok előkészítése, nyilvántartás. Szállítmányonként egyszer fizetendő.', m: /doc\.?\s?(ktg|fee|költség)|documentation|dokument/i },
    { k: 'Handling', n: 'Kezelési díj', d: 'Az áru mozgatása a gyűjtőraktárban: kirakás a konténerből, raktári kezelés, kiadás. Lehet szállítmányonkénti átalány vagy m³-enkénti díj, kérdezz rá.', m: /handling|kezelési/i },
    { k: 'THC', n: 'Terminal Handling Charge', d: 'Terminálkezelési díj a kikötőben vagy vasúti terminálon (be- és kirakás). Indulási és érkezési oldalon is lehet.', m: /\bTHC\b|terminal handling/i },
    { k: 'BAF', n: 'Bunker Adjustment Factor', d: 'Üzemanyag-pótdíj (tengeri); az olajár szerint változik.', m: /\bBAF\b|bunker/i },
    { k: 'LSS', n: 'Low Sulphur Surcharge', d: 'Alacsony kéntartalmú üzemanyag pótdíja (tengeri).', m: /\bLSS\b|low sulphur/i },
    { k: 'CAF', n: 'Currency Adjustment Factor', d: 'Árfolyam-kiigazítási pótdíj.', m: /\bCAF\b/i },
    { k: 'PSS / GRI', n: 'Főszezoni pótdíj / általános díjemelés', d: 'Peak Season Surcharge és General Rate Increase: a fuvarozók időszakos díjemelései, főleg a kínai újév és a karácsonyi szezon előtt.', m: /\bPSS\b|\bGRI\b|peak season/i },
    { k: 'ISPS', n: 'Kikötővédelmi díj', d: 'International Ship and Port Facility Security: a kikötői biztonsági előírások díja.', m: /\bISPS\b/i },
    { k: 'ENS / ICS2', n: 'EU biztonsági előzetes bejelentés', d: 'Entry Summary Declaration az EU ICS2 rendszerében; minden EU-ba érkező szállítmánynál kötelező, a szállítmányozó külön díjat számolhat rá.', m: /\bENS\b|\bICS2\b/i },
    { k: 'D/O', n: 'Delivery Order – kiadási díj', d: 'Az árukiadási rendelvény kiállításának díja az érkezési oldalon.', m: /\bD\/O\b|delivery order/i },
    { k: 'FSC / SSC', n: 'Üzemanyag- és biztonsági pótdíj (légi)', d: 'Fuel Surcharge és Security Surcharge, általában kg-onként a díjköteles tömegre.', m: /\bFSC\b|\bSSC\b|fuel surcharge|security surcharge/i },
    { k: 'Pickup', n: 'Felvétel / előfuvar', d: 'A gyártól a gyűjtőraktárig tartó belföldi fuvar Kínában. EXW paritásnál ez is a vevőé (az ajánlatban többnyire benne van).', m: /pick-?up|előfuvar|pre-?carriage/i },
    { k: 'Storage / Free time', n: 'Tárolás / díjmentes idő', d: 'A raktárban vagy terminálon néhány napig ingyenes a tárolás, utána napidíjat számolnak.', m: /storage|free\s?time|tárolás/i },
    { k: 'Demurrage / Detention', n: 'Konténer-állás és -késedelmi díj', d: 'FCL-nél: ha a konténer a díjmentes időn túl a terminálon áll (demurrage) vagy nálad van (detention), napidíjat kell fizetni.', m: /demurrage|detention|kötbér/i },
    { k: 'Biztosítás', n: 'Szállítmánybiztosítás (Cargo insurance)', d: 'Nem automatikus! A fuvarozó felelőssége kg-onként korlátozott, ezért értékes LED-falnál érdemes az áru értékére biztosítást kötni (általában az áruérték kis százaléka).', m: /insurance|biztosít/i },
  ]},
  { g: 'Okmányok', items: [
    { k: 'B/L, HBL, MBL', n: 'Bill of Lading – tengeri fuvarlevél', d: 'Értékpapír jellegű tengeri fuvarokmány: aki az eredeti B/L-lel rendelkezik, az veheti át az árut. HBL: a szállítmányozó saját B/L-je, MBL: a hajózási társaságé.', m: /\bB\/?L\b|\bHBL\b|\bMBL\b|bill of lading/i },
    { k: 'Telex release', n: 'Elektronikus B/L-feloldás', d: 'Nem kell eredeti papír B/L-t küldeni, a kiadást a feladó elektronikusan engedélyezi.', m: /telex|seaway/i },
    { k: 'CIM / SMGS', n: 'Vasúti fuvarlevél', d: 'Nemzetközi vasúti fuvarokmány (SMGS a volt szovjet nyomtávú szakaszon, CIM az EU-ban, gyakran közös CIM/SMGS). Egyes szállítmányozók vasúton is adnak saját, B/L-szerű okmányt.', m: /\bCIM\b|\bSMGS\b/i },
    { k: 'AWB / HAWB', n: 'Air Waybill – légi fuvarlevél', d: 'Légi fuvarokmány; a HAWB a szállítmányozó saját légi fuvarlevele. A szám alapján követhető a szállítmány.', m: /\bH?AWB\b|\bMAWB\b|air waybill/i },
    { k: 'CMR', n: 'Közúti fuvarlevél', d: 'Nemzetközi közúti fuvarokmány, pl. a budapesti utófuvarnál vagy európai közúti szakaszon.', m: /\bCMR\b/i },
    { k: 'CI / PL', n: 'Kereskedelmi számla és csomaglista', d: 'Commercial Invoice (vámérték, HS-kód, Incoterm) és Packing List (darabszám, tömeg, méret ládánként). Vámkezeléshez mindkettő kell.', m: /commercial invoice|packing list|csomaglista|\bP\/L\b/i },
    { k: 'CO / Form A', n: 'Származási bizonyítvány', d: 'Certificate of Origin: az áru származását igazolja. Kínai árunál általában nem ad vámkedvezményt, de kérhetik.', m: /certificate of origin|származási|\bC\/O\b|form a\b/i },
    { k: 'MSDS / UN38.3', n: 'Biztonsági adatlap / akkuteszt', d: 'Akkumulátoros vagy vegyi tartalmú árunál kérik. Lítiumakkus eszköz (pl. akkus vezérlő, UPS) veszélyes árunak (9. osztály) minősülhet.', m: /\bMSDS\b|\bSDS\b|UN\s?38\.3/i },
    { k: 'DG / DGD', n: 'Veszélyes áru / nyilatkozat', d: 'Dangerous Goods és Dangerous Goods Declaration. Sok vasúti és légi útvonal korlátozza vagy tiltja.', m: /\bDGD?\b|dangerous goods|veszélyes/i },
  ]},
  { g: 'Vám és adó', items: [
    { k: 'Vámkezelés', n: 'Importvámkezelés (customs clearance)', d: 'A vámáru-nyilatkozat elkészítése és benyújtása, általában szállítmányonkénti díjért (a vámügynöké). Ez a szolgáltatás díja; a vám és az import-ÁFA ezen felül, a vámhatóságnak fizetendő. Ha az ajánlatban „+ vámkezelés” áll, akkor nincs benne.', m: /vámkezel|customs clearance|clearance/i },
    { k: 'Vám', n: 'Vámteher (duty)', d: 'A vámérték (áruérték + fuvar és biztosítás az EU-határig) százalékában. A kulcs a HS/KN tarifaszámtól függ; a pontos besorolást a vámügynök adja meg, mert LED-moduloknál és kijelzőknél eltérő lehet.', m: /\bvám\b|\bduty\b|vámteher/i },
    { k: 'Import ÁFA', n: '27% Magyarországon', d: 'A vámérték + vám + az EU-n belüli fuvarköltség után. Áfakörös cégnél visszaigényelhető (önadózással vagy halasztott fizetéssel is rendezhető).', m: /áfa|\bVAT\b/i },
    { k: 'HS / KN kód', n: 'Vámtarifaszám', d: 'Harmonized System (6 jegy) / Kombinált Nómenklatúra (8 jegy, EU). Ez határozza meg a vámtételt és az esetleges előírásokat.', m: /\bHS\b|\bKN\b|tarifaszám|HS code/i },
    { k: 'EORI', n: 'Vámazonosító szám', d: 'EU-s vámügyekhez kötelező cégazonosító (Magyarországon HU + adószám formátumú). Nélküle nem lehet vámkezelni.', m: /\bEORI\b/i },
    { k: 'T1 / tranzit', n: 'Vám alatti továbbítás', d: 'Az áru vámkezeletlenül megy tovább (pl. Lengyelországból Budapestre), és a célállomáson vámkezelik.', m: /\bT1\b|tranzit|transit doc/i },
    { k: 'AEO', n: 'Engedélyezett gazdálkodó', d: 'Authorised Economic Operator: megbízható vámügyfél-státusz, gyorsabb vámkezelést jelent.', m: /\bAEO\b/i },
  ]},
  { g: 'Idők', items: [
    { k: 'ETD / ETA', n: 'Becsült indulás / érkezés', d: 'Estimated Time of Departure / Arrival.', m: /\bETD\b|\bETA\b/i },
    { k: 'T/T', n: 'Transit time – menetidő', d: 'Az indulástól az érkezésig tartó idő. Vasúton jellemzően 15–25 nap, tengeren 30–45+ nap, légin 3–7 nap (felvétellel és vámmal együtt több).', m: /\bT\/T\b|transit time|menetidő/i },
    { k: 'Cut-off', n: 'Leadási határidő', d: 'Eddig kell az árunak és az okmányoknak a raktárba vagy terminálra beérkeznie, hogy felférjen az adott járatra.', m: /cut-?off|closing/i },
    { k: 'Validity', n: 'Ajánlat érvényessége', d: 'Meddig érvényes a díj (gyakran 1–2 hét vagy a hónap vége). Utána a piaci díj szerint újraárazzák.', m: /valid|érvényes/i },
  ]},
];

const CUR = { usd: 'USD', '$': 'USD', eur: 'EUR', '€': 'EUR', huf: 'HUF', ft: 'HUF' };
const INCO = /\b(EXW|FCA|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i;
const PLACE_T = /\b(CFS|CY|DOOR|PORT|RAMP)\b/i;

function parseNum(s) {
  s = s.replace(/\s/g, '');
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = /,\d{3}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (d >= 0 && /\.\d{3}$/.test(s) && s.split('.').length >= 2) s = s.replace(/\./g, '');
  const v = parseFloat(s); return Number.isFinite(v) ? v : null;
}
function findAmount(line) {
  const re = /(?:(USD|EUR|HUF|Ft|€|\$)\s*(\d[\d\s.,]*\d|\d))|(?:(\d[\d\s.,]*\d|\d)\s*(USD|EUR|HUF|Ft|€|\$))/i;
  const m = line.match(re); if (!m) return null;
  const cur = CUR[(m[1] || m[4]).toLowerCase()]; const v = parseNum(m[2] || m[3]);
  if (v === null) return null;
  const unitM = line.match(/(?:\/|per\s)\s*(cbm|m3|m³|w\/m|rt|kg|shpt|shipment|bl|hbl|konténer|cntr|cont|teu|feu|20'|40'|20gp|40gp|40hc|20dc|40dc)/i);
  let unit = null;
  if (unitM) { const u = unitM[1].toLowerCase(); unit = /cbm|m3|m³|w\/m|rt/.test(u) ? 'm3' : u === 'kg' ? 'kg' : /cntr|cont|konténer|teu|feu|20|40/.test(u) ? 'cntr' : 'shpt'; }
  return { v, cur, unit, raw: m[0] };
}
const toEur = (v, cur) => cur === 'EUR' ? v : cur === 'USD' ? v / D.fx.eurUsd : v / D.fx.eurHuf;

function analyze(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out = [];
  let ctx = '';
  for (const line of lines) {
    if (/^[^\d]*:\s*$/.test(line)) { ctx = line.replace(/:\s*$/, ''); out.push({ type: 'head', line, terms: terms(line), ctx }); continue; }
    const amt = findAmount(line);
    const inc = line.match(INCO);
    const route = line.match(/^(.*?)\s+[-–→>]+\s+(.*?)(?::|\s{2,}|\s\d|$)/);
    const via = line.match(/\bvia\s+([A-Za-zÀ-ž'’ -]+)/i);
    const extra = /^\+/.test(line);
    let type = 'fee';
    if (amt && (route || inc)) type = 'freight';
    else if (!amt) type = extra || /vám|clearance|insurance|biztos|delivery|kiszáll/i.test(line) ? 'excluded' : 'note';
    out.push({ type, line, amt, inc: inc && inc[1].toUpperCase(), from: route && route[1].replace(INCO, '').trim(), to: route && route[2].trim(), via: via && via[1].trim(), terms: terms(line), ctx });
  }
  return out;
}
function terms(line) {
  const found = [];
  for (const grp of GLOSS) for (const t of grp.items) if (t.m.test(line) && !found.includes(t)) found.push(t);
  return found;
}
function explain(r) {
  if (r.type === 'freight') {
    const parts = [];
    const ctxRail = /vasút|rail|train/i.test(r.ctx + ' ' + r.line), ctxSea = /tenger|sea|ocean/i.test(r.ctx + ' ' + r.line), ctxAir = /légi|air/i.test(r.ctx + ' ' + r.line);
    const mode = ctxRail ? 'vasúti' : ctxSea ? 'tengeri' : ctxAir ? 'légi' : '';
    const fromTxt = r.from ? r.from : 'a feladási hely';
    if (r.inc === 'EXW') parts.push(`Fuvardíj a ${fromTxt} környéki gyártól (EXW: felvétellel és kínai exportvámmal együtt)`);
    else if (r.inc) parts.push(`${r.inc} paritású díj innen: ${fromTxt}`);
    else parts.push(`Fuvardíj innen: ${fromTxt}`);
    const pl = t => { t = t.replace(/\b(CFS|CY)\b/i, '').trim(); return /\bBUD\b|budapest/i.test(t) ? 'a budapesti (BUD)' : t ? `a(z) ${t}` : 'a cél'; };
    if (r.to) parts.push(/\bCFS\b/i.test(r.to) ? `${pl(r.to)} gyűjtőraktárig (CFS), kiszállítás nélkül` : /\bCY\b/i.test(r.to) ? `${pl(r.to)} konténerterminálig (CY)` : `eddig: ${r.to}`);
    let s = parts.join(', ') + '.';
    if (mode) s = s.replace(/^Fuvardíj/, `${mode[0].toUpperCase() + mode.slice(1)} fuvardíj`);
    if (r.via) s += ` A vonat ${r.via} csomóponton át megy.`;
    s += r.amt.unit === 'm3' ? ' Egység: m³-enként (W/M).' : r.amt.unit === 'shpt' ? ' Egység: szállítmányonként.' : r.amt.unit === 'cntr' ? ' Egység: konténerenként.' : ' Az egység nincs megadva: kérdezz rá, hogy a teljes szállítmányra vagy m³-enként (W/M) érvényes.';
    return s;
  }
  if (r.type === 'fee') {
    const t = r.terms.find(x => /Doc|Handling|THC|BAF|ISPS|D\/O|Pickup|Storage|ENS|FSC|LSS|CAF|PSS/.test(x.k));
    const base = t ? `${t.n}.` : 'Járulékos díj.';
    return base + (r.amt?.unit === 'm3' ? ' m³-enként.' : r.amt?.unit ? '' : ' Általában szállítmányonként egyszer fizetendő.');
  }
  if (r.type === 'excluded') {
    if (/vám/i.test(r.line)) return 'Nincs benne az árban: a vámkezelés díja külön jön, és ezen felül a vám és a 27% import-ÁFA is.';
    return 'Nincs benne az árban, külön költség.';
  }
  if (r.type === 'head') return r.terms.length ? '' : 'Fejléc / fuvarmód.';
  return r.terms.length ? '' : 'Megjegyzés.';
}

function qChgM3() {
  const k = window.__ledfuvar; if (!k?.res) return null;
  const r = railLcl(k.res, { factor: S.railFactor || 333, rate: 0 });
  return r.chgM3;
}
const fmtE = eur => `${nf(eur, 0)} €`;
const fmtH = eur => `${nf(Math.round(eur * D.fx.eurHuf / 100) * 100, 0)} Ft`;

function renderQuote() {
  const box = $('qOut'); if (!box) return;
  const rows = analyze($('qText').value);
  box.replaceChildren();
  if (!rows.length) { box.append(el('p', 'src', 'Illessz be egy ajánlatot a fenti mezőbe.')); return; }
  const list = el('ol', 'qlist');
  for (const r of rows) {
    const li = el('li', 'q-' + r.type);
    const top = el('div', 'qline');
    top.append(el('code', '', r.line));
    if (r.amt) top.append(el('b', 'qamt', `${nf(r.amt.v, 2)} ${r.amt.cur}` + (r.amt.cur !== 'EUR' ? ` ≈ ${fmtE(toEur(r.amt.v, r.amt.cur))}` : '')));
    const tag = { freight: 'Fuvardíj', fee: 'Járulékos díj', excluded: 'Nincs benne', note: 'Megjegyzés', head: 'Fejléc' }[r.type];
    top.prepend(el('span', 'qtag', tag));
    li.append(top);
    const ex = explain(r); if (ex) li.append(el('p', 'qex', ex));
    if (r.terms.length) {
      const ch = el('div', 'qterms');
      for (const t of r.terms) { const a = el('a', 'chip', t.k); a.href = '#g-' + slug(t.k); a.title = t.n; ch.append(a); }
      li.append(ch);
    }
    list.append(li);
  }
  box.append(list);

  // Összesítő
  const fr = rows.filter(r => r.type === 'freight'), fees = rows.filter(r => r.type === 'fee' && r.amt), exc = rows.filter(r => r.type === 'excluded');
  if (!fr.length && !fees.length) return;
  const m3 = qChgM3();
  const wm = m3 === null ? null : Math.max(1, m3);
  const feeEur = (qty) => fees.reduce((s, f) => s + toEur(f.amt.v, f.amt.cur) * (f.amt.unit === 'm3' ? (qty ?? 1) : 1), 0);
  const sum = el('div', 'qsum');
  sum.append(el('h3', '', 'Összesítés'));
  if (fr.length > 1) sum.append(el('p', 'src', `${fr.length} alternatív fuvarajánlat (pl. eltérő útvonal) – ezek közül egyet kell választani, nem összeadandók.`));
  const tbl = el('div', 'qtbl');
  for (const f of fr) {
    const name = [f.inc, f.from, '→', f.to].filter(Boolean).join(' ') + (f.via ? ` (via ${f.via})` : '');
    const fe = toEur(f.amt.v, f.amt.cur);
    const card = el('div', 'qopt'); card.append(el('b', '', name));
    const lump = fe + feeEur(1);
    const pr = el('ul', 'qcalc');
    const addLi = (lbl, txt) => { const l = el('li'); l.append(el('span', '', lbl), el('b', '', txt)); pr.append(l); };
    if (f.amt.unit !== 'm3') addLi('Ha a díj a teljes szállítmányra szól', `${fmtE(lump)} · ${fmtH(lump)}`);
    if (f.amt.unit !== 'shpt' && f.amt.unit !== 'cntr' && wm !== null) {
      const t = fe * wm + feeEur(wm);
      addLi(`Ha m³-enként (W/M) – ${nf(wm, 2)} m³ a kalkulátorból${m3 < 1 ? ', min. 1' : ''}`, `${fmtE(t)} · ${fmtH(t)}`);
    }
    card.append(pr); tbl.append(card);
  }
  if (!fr.length) { const c = el('div', 'qopt'); c.append(el('b', '', 'Járulékos díjak összesen'), el('p', '', `${fmtE(feeEur(1))} · ${fmtH(feeEur(1))}`)); tbl.append(c); }
  sum.append(tbl);
  const feeTxt = fees.map(f => `${f.line.replace(f.amt.raw, '').replace(/[.:\-\s]+$/, '').trim() || 'díj'} ${nf(f.amt.v, 2)} ${f.amt.cur}`).join(', ');
  if (feeTxt) sum.append(el('p', 'src', `Beleszámolt járulékos díjak: ${feeTxt}.`));
  const miss = exc.map(e => e.line.replace(/^\+\s*/, '')).join(', ');
  sum.append(el('p', 'src warnc', `Nincs benne: ${miss ? miss + ', ' : ''}vám és 27% import-ÁFA${fr.some(f => /CFS|CY/i.test(f.to || '')) ? ', kiszállítás a CFS/terminálról a telephelyre' : ''}${rows.some(r => r.terms.some(t => t.k === 'Biztosítás')) ? '' : ', szállítmánybiztosítás'}.`));
  sum.append(el('p', 'src', `Átváltás: EKB ${D.fx.date}, 1 € = ${nf(D.fx.eurUsd, 4)} $ = ${nf(D.fx.eurHuf, 2)} Ft.`));
  box.append(sum);
}
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function renderGloss() {
  const box = $('gList'); box.replaceChildren();
  const q = ($('gSearch').value || '').trim().toLowerCase();
  let n = 0;
  for (const grp of GLOSS) {
    const items = grp.items.filter(t => !q || (t.k + ' ' + t.n + ' ' + t.d).toLowerCase().includes(q));
    if (!items.length) continue;
    const sec = el('details', 'ggrp'); sec.open = !!q; const sm = el('summary'); sm.append(el('span', '', grp.g), el('small', '', String(items.length))); sec.append(sm);
    const dl = el('dl', 'gdl');
    for (const t of items) { n++; const dt = el('dt'); dt.id = 'g-' + slug(t.k); dt.append(el('b', '', t.k), el('span', '', t.n)); dl.append(dt, el('dd', '', t.d)); }
    sec.append(dl); box.append(sec);
  }
  if (!n) box.append(el('p', 'src', 'Nincs találat.'));
}

const Q_EXAMPLE = 'Vasúti díj:\nEXW Shenzhen - CFS BUD:      460 USD .-        via Xian\nEXW Shenzhen - CFS BUD:      445 USD .-        via Chengdu\nDoc ktg 75 EUR\nHandling 30 EUR\n+ vámkezelés';
(function initGloss() {
  const t = $('qText'); if (!t) return;
  let saved = null; try { saved = localStorage.getItem(STORE + '.quote'); } catch (e) { /* */ }
  t.value = saved ?? Q_EXAMPLE;
  t.addEventListener('input', () => { try { localStorage.setItem(STORE + '.quote', t.value); } catch (e) { /* */ } renderQuote(); });
  $('qExample').addEventListener('click', () => { t.value = Q_EXAMPLE; t.dispatchEvent(new Event('input')); });
  $('qClear').addEventListener('click', () => { t.value = ''; t.dispatchEvent(new Event('input')); t.focus(); });
  $('gSearch').addEventListener('input', renderGloss);
  document.addEventListener('click', e => { const a = e.target.closest('.qterms a'); if (!a) return; if ($('gSearch').value) { $('gSearch').value = ''; renderGloss(); } const d = document.querySelector(a.getAttribute('href')); if (d) { d.closest('details').open = true; e.preventDefault(); d.scrollIntoView({ behavior: 'smooth', block: 'center' }); d.classList.add('hl'); setTimeout(() => d.classList.remove('hl'), 1600); } });
  renderGloss(); renderQuote();
  window.__qRefresh = renderQuote;
  window.__gloss = { analyze, count: GLOSS.reduce((s, g) => s + g.items.length, 0) };
})();
