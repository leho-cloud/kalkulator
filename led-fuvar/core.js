// LED-fal súly- és fuvarszámítás – tiszta függvények, külső függőség nélkül.
// Minden bemenet lehet null (hiányzó adat); ilyenkor az érintett eredmény is null.

const ok = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const sum = arr => arr.reduce((a, b) => a + b, 0);
export const ceilStep = (v, step) => (step > 0 ? Math.ceil(v / step - 1e-9) * step : v);

/** Falméretből kabinetszám (oszlop × sor), felfelé kerekítve. */
export function wallLayout(widthM, heightM, cabW, cabH) {
  if (![widthM, heightM, cabW, cabH].every(v => ok(v) && v > 0)) return null;
  const cols = Math.ceil((widthM * 1000) / cabW - 1e-9);
  const rows = Math.ceil((heightM * 1000) / cabH - 1e-9);
  return { cols, rows, count: cols * rows, realW: (cols * cabW) / 1000, realH: (rows * cabH) / 1000 };
}

const boxVolume = dims => (dims.every(d => ok(d) && d > 0) ? dims.reduce((a, b) => a * b, 1) / 1e6 : null);

/**
 * Szállítmány összesítése.
 * cabinets: {qty, kg}
 * items: [{qty, kg}]
 * mainCase: {capacity, count (felülírás vagy null), tare, fill, dims:[cm,cm,cm]}
 * packs: [{count, tare, fill, dims}]
 */
export function shipment({ cabinets, items = [], mainCase, packs = [] }) {
  const missing = [];
  const qty = ok(cabinets.qty) ? cabinets.qty : null;
  if (qty === null) missing.push('kabinetszám');
  if (qty > 0 && !ok(cabinets.kg)) missing.push('kabinet egységtömege');

  const cabNet = qty === null ? null : qty === 0 ? 0 : ok(cabinets.kg) ? qty * cabinets.kg : null;
  const itemNets = items.map(i => (!ok(i.qty) ? null : i.qty === 0 ? 0 : ok(i.kg) ? i.qty * i.kg : null));
  if (itemNets.some(v => v === null)) missing.push('tartozék tömege vagy mennyisége');
  const accNet = itemNets.some(v => v === null) ? null : sum(itemNets);
  const net = cabNet === null || accNet === null ? null : cabNet + accNet;

  // Fő LED-ládák
  const autoCount = qty !== null && ok(mainCase.capacity) && mainCase.capacity > 0 ? Math.ceil(qty / mainCase.capacity) : null;
  const caseCount = ok(mainCase.count) ? mainCase.count : autoCount;
  if (caseCount === null && qty > 0) missing.push('ládakapacitás');
  const capacityWarning = caseCount !== null && ok(mainCase.capacity) && mainCase.capacity > 0 && qty !== null && caseCount * mainCase.capacity < qty;
  const capacityLeft = caseCount !== null && ok(mainCase.capacity) && qty !== null ? caseCount * mainCase.capacity - qty : null;

  const groups = [{ ...mainCase, count: caseCount, main: true }, ...packs.map(p => ({ ...p, count: ok(p.count) ? p.count : null }))];
  let tare = 0, fill = 0, volume = 0, count = 0;
  for (const g of groups) {
    if (g.count === null) { tare = fill = volume = count = null; if (!g.main) missing.push('csomagszám'); break; }
    if (g.count === 0) continue;
    const v = boxVolume(g.dims || []);
    if (tare !== null) tare = ok(g.tare) ? tare + g.count * g.tare : null;
    if (fill !== null) fill = ok(g.fill) ? fill + g.count * g.fill : null;
    if (volume !== null) volume = v === null ? null : volume + g.count * v;
    count += g.count;
    if (!ok(g.tare)) missing.push(g.main ? 'LED-láda önsúlya' : 'külön csomag önsúlya');
    if (v === null) missing.push(g.main ? 'LED-láda külső mérete' : 'külön csomag külső mérete');
  }
  const packaging = tare === null || fill === null ? null : tare + fill;
  const gross = net === null || packaging === null ? null : net + packaging;
  return {
    cabNet, accNet, net, tare, fill, packaging, gross, volume, count, caseCount, capacityWarning, capacityLeft,
    missing: [...new Set(missing)],
  };
}

const charge = (units, rate, min, extras) =>
  units === null || !ok(rate) ? null : Math.max(units * rate, ok(min) ? min : 0) + (ok(extras) ? extras : 0);

/** Légi: díjsúly = max(bruttó, térfogat × 10⁶ / osztó), fél kg-ra felfelé. */
export function airFreight(res, { divisor = 6000, step = 0.5, rate, min = 0, extras = 0 }) {
  const blocked = res.capacityWarning;
  const volW = res.volume === null || !(divisor > 0) ? null : (res.volume * 1e6) / divisor;
  const chg = blocked || res.gross === null || volW === null ? null : ceilStep(Math.max(res.gross, volW), step);
  return { volW, chg, basis: volW !== null && res.gross !== null && volW > res.gross ? 'térfogat' : 'tömeg', cost: charge(chg, rate, min, extras) };
}

/** Tengeri gyűjtőáru (LCL): RT = max(m³, t), legalább minRT. */
export function seaLcl(res, { wm = 1000, minRT = 1, rate, min = 0, extras = 0 }) {
  if (res.capacityWarning || res.volume === null || res.gross === null || !(wm > 0)) return { rt: null, cost: null };
  const t = res.gross / wm;
  const rt = Math.max(ceilStep(Math.max(res.volume, t), 0.01), ok(minRT) ? minRT : 0);
  return { rt, t, basis: res.volume >= t ? 'térfogat' : 'tömeg', cost: charge(rt, rate, min, extras) };
}

/** Teljes konténer (FCL): darabszám térfogat és teherbírás alapján. */
export function fcl(res, { container, fillFactor = 0.85, rate, extras = 0 }) {
  if (res.capacityWarning || res.volume === null || res.gross === null || !container || !(fillFactor > 0)) return { n: null, cost: null };
  const usable = container.volume * Math.min(fillFactor, 1);
  const byVol = Math.max(1, Math.ceil(res.volume / usable - 1e-9));
  const byWt = Math.max(1, Math.ceil(res.gross / container.payload - 1e-9));
  const n = Math.max(byVol, byWt);
  return { n, byVol, byWt, usable, util: res.volume / (n * container.volume), cost: ok(rate) ? n * rate + (ok(extras) ? extras : 0) : null };
}

/** Vasúti gyűjtőáru: díjköteles m³ = max(m³, bruttó kg / tényező). */
export function railLcl(res, { factor = 333, rate, min = 0, extras = 0 }) {
  if (res.capacityWarning || res.volume === null || res.gross === null || !(factor > 0)) return { chgM3: null, cost: null };
  const wtM3 = res.gross / factor;
  const chgM3 = ceilStep(Math.max(res.volume, wtM3), 0.01);
  return { chgM3, wtM3, basis: res.volume >= wtM3 ? 'térfogat' : 'tömeg', cost: charge(chgM3, rate, min, extras) };
}

/** USD → választott pénznem az EKB-árfolyammal. */
export function convert(usd, cur, fx) {
  if (usd === null) return null;
  if (cur === 'USD') return usd;
  const eur = usd / fx.eurUsd;
  return cur === 'EUR' ? eur : eur * fx.eurHuf;
}
