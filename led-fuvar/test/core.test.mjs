import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wallLayout, shipment, airFreight, seaLcl, fcl, railLcl, convert } from '../core.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const data = JSON.parse(readFileSync(new URL('../data.json', import.meta.url)));

// 1) Falméret → kabinetszám: 6 × 3 m, 500 × 500 → 12 × 6 = 72
const w = wallLayout(6, 3, 500, 500);
assert.deepEqual([w.cols, w.rows, w.count], [12, 6, 72]);
// 4,1 m széles fal 576 mm-es panellel → 8 oszlop (4,608 m)
assert.equal(wallLayout(4.1, 2, 576, 576).cols, 8);

// 2) 24 × ADJ VS3IP gyári 8-as ládában
const vs3 = data.cabinets.find(c => c.id === 'adj-vs3ip');
const box = data.cases.find(c => c.id === 'adj-vs3ip-8');
const r = shipment({ cabinets: { qty: 24, kg: vs3.kg }, items: [], mainCase: { ...box, count: null, fill: 0 }, packs: [] });
assert.equal(r.caseCount, 3);
near(r.net, 216); near(r.tare, 157.5); near(r.gross, 373.5);
near(r.volume, (3 * 101 * 66 * 86) / 1e6);
assert.deepEqual(r.missing, []);

// Légi: térfogatsúly 286,6 kg < 373,5 kg → díjsúly 373,5 kg
const a = airFreight(r, { divisor: 6000, step: 0.5, rate: 4.87, min: 0, extras: 0 });
near(a.volW, r.volume * 1e6 / 6000); near(a.chg, 373.5); near(a.cost, 373.5 * 4.87);
assert.equal(a.basis, 'tömeg');

// Tengeri LCL: RT = max(1,72 m³; 0,3735 t) = 1,72
const s = seaLcl(r, { wm: 1000, minRT: 1, rate: 130, min: 0, extras: 50 });
near(s.rt, 1.72); near(s.cost, 1.72 * 130 + 50);

// FCL 40' HC → 1 konténer
const hc = data.containers.find(c => c.id === '40hc');
const f = fcl(r, { container: hc, fillFactor: 0.85, rate: 3504, extras: 0 });
assert.equal(f.n, 1); near(f.cost, 3504);

// Vasúti LCL: max(1,72 m³; 373,5/333 = 1,12) = 1,72 m³
const rl = railLcl(r, { factor: 333, rate: 185, min: 0, extras: 0 });
near(rl.chgM3, 1.72); near(rl.cost, 1.72 * 185);

// 3) Légi: könnyű, nagy térfogatú csomag → térfogatsúly a díjalap, fél kg-ra kerekítve
const light = { gross: 100, volume: 1.0, capacityWarning: false };
const la = airFreight(light, { divisor: 6000, step: 0.5, rate: 1 });
near(la.chg, 167); assert.equal(la.basis, 'térfogat');

// 4) Minimum díj és 1 RT minimum
near(seaLcl({ gross: 50, volume: 0.2, capacityWarning: false }, { rate: 100, minRT: 1, min: 0 }).cost, 100);
near(airFreight({ gross: 10, volume: 0.01, capacityWarning: false }, { rate: 2, min: 80 }).cost, 80);

// 5) FCL: tömeg miatt 2 konténer
const heavy = fcl({ gross: 30000, volume: 20, capacityWarning: false }, { container: hc, fillFactor: 0.85, rate: 1000 });
assert.deepEqual([heavy.byVol, heavy.byWt, heavy.n], [1, 2, 2]);

// 6) Kevés láda megadva → figyelmeztetés, díjak nem számolhatók
const short = shipment({ cabinets: { qty: 24, kg: 9 }, mainCase: { ...box, count: 2, fill: 0 } });
assert.equal(short.capacityWarning, true);
assert.equal(airFreight(short, { rate: 4 }).cost, null);
assert.equal(fcl(short, { container: hc, rate: 1 }).n, null);

// 7) Hiányzó adatok: ismeretlen ládaméret és tömeg
const unknown = shipment({ cabinets: { qty: 10, kg: 12 }, mainCase: { capacity: 5, count: null, tare: null, fill: 0, dims: [null, null, null] } });
assert.equal(unknown.gross, null); assert.equal(unknown.volume, null);
assert.ok(unknown.missing.includes('LED-láda önsúlya'));
assert.ok(unknown.missing.includes('LED-láda külső mérete'));
assert.equal(airFreight(unknown, { rate: 4 }).cost, null);

// 8) Tartozék és külön csomag (raklap)
const pal = data.packs.find(p => p.id === 'eur-pallet');
const withAcc = shipment({
  cabinets: { qty: 8, kg: 9 },
  items: [{ qty: 4, kg: 18.9 }, { qty: 50, kg: 0.195 }],
  mainCase: { ...box, count: null, fill: 0 },
  packs: [{ count: 1, tare: pal.tare, fill: 0, dims: [120, 80, 120] }],
});
near(withAcc.net, 72 + 75.6 + 9.75); near(withAcc.tare, 52.5 + 25); assert.equal(withAcc.count, 2);
near(withAcc.volume, (101 * 66 * 86 + 120 * 80 * 120) / 1e6);

// 9) Árfolyam: 1112,7 USD = 1000 EUR = 365 080 HUF
near(convert(1112.7, 'EUR', data.fx), 1000, 1e-9);
near(convert(1112.7, 'HUF', data.fx), 365080, 1e-6);

// 10) Adatfájl: minden kabinethez forrás, a hivatkozott láda létezik
for (const c of data.cabinets) {
  assert.ok(c.source, c.id);
  if (c.case) assert.ok(data.cases.some(x => x.id === c.case), c.id);
}
console.log('core.test: falméret, összesítés, légi/tengeri/vasúti számítás, minimumok, hiányzó adat és árfolyam rendben.');
