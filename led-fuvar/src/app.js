// LED-fal súly- és fuvarkalkulátor – felület
const EMBEDDED = __DATA__;
const DATA_URL = 'https://raw.githubusercontent.com/leho-cloud/kalkulator/main/led-fuvar/data.json';
const STORE = 'tzsvtav.ledfuvar.v1';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const nf = (v, d = 2) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: d }).format(v);
const val = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const numIn = input => { const v = input.valueAsNumber; return Number.isFinite(v) && v >= 0 ? v : null; };
const setIn = (input, v) => { input.value = v === null || v === undefined ? '' : String(+(+v).toFixed(6)); };
const safeUrl = u => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

let D = EMBEDDED;
let S = loadState();

function defaults() {
  const r = D.rates;
  return {
    cabId: (D.cabinets.find(c => c.id === 'adj-vs3ip') || D.cabinets[0]).id, cabKg: null, cabW: null, cabH: null, mode: 'qty', qty: 24, wallW: 6, wallH: 3,
    items: [], caseId: null, caseCap: null, caseCount: null, caseTare: null, caseFill: 0, caseDims: [null, null, null],
    packs: [], cur: 'HUF', seaMode: 'lcl', railMode: 'lcl', seaCont: '40hc', railCont: '40hc',
    airDiv: D.rules.airDivisor, seaWM: D.rules.seaWM, railFactor: D.rules.railFactor,
    seaFill: Math.round(D.rules.fillFactor * 100), railFill: Math.round(D.rules.fillFactor * 100),
    money: {
      airRate: r.air.value, airMin: 0, airExtra: 0,
      seaLclRate: r.seaLcl.value, seaLclMin: 0, seaLclExtra: 0, seaFclRate: r.seaFcl40.value, seaFclExtra: 0,
      railLclRate: r.railLcl.value, railLclMin: 0, railLclExtra: 0, railFclRate: r.railFcl40.value, railFclExtra: 0,
    },
    edited: {}, fresh: true,
  };
}
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.money) return s; } catch (e) { /* üres */ }
  return null;
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* privát mód */ } }

// ---- Pénznem ----
const fx = () => D.fx;
const toCur = usd => (usd === null ? null : convert(usd, S.cur, fx()));
const fromCur = v => (v === null ? null : S.cur === 'USD' ? v : S.cur === 'EUR' ? v * fx().eurUsd : (v / fx().eurHuf) * fx().eurUsd);
const curDigits = () => (S.cur === 'HUF' ? 0 : 2);
const money = usd => (usd === null ? null : new Intl.NumberFormat('hu-HU', { style: 'currency', currency: S.cur, maximumFractionDigits: curDigits() }).format(toCur(usd)));
const moneyShort = usd => {
  if (usd === null) return '–';
  const v = toCur(usd);
  if (S.cur === 'HUF') return v >= 1e6 ? nf(v / 1e6, 2) + ' M Ft' : nf(v / 1e3, 0) + ' e Ft';
  return (S.cur === 'EUR' ? '€' : '$') + nf(v, 0);
};
const curSym = () => (S.cur === 'HUF' ? 'Ft' : S.cur === 'EUR' ? '€' : '$');

// ---- Kitöltők ----
function fillSelect(sel, list, label, group) {
  sel.replaceChildren();
  const groups = new Map();
  for (const it of list) {
    const g = group ? group(it) : '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  for (const [g, arr] of groups) {
    const parent = g ? Object.assign(document.createElement('optgroup'), { label: g }) : sel;
    for (const it of arr) parent.append(new Option(label(it), it.id));
    if (g) sel.append(parent);
  }
}
function sourceLine(node, item, prefix = 'Forrás: ') {
  node.replaceChildren();
  const url = safeUrl(item.url);
  node.append(prefix);
  if (url) { const a = el('a', null, item.source); a.href = url; a.target = '_blank'; a.rel = 'noopener'; node.append(a); }
  else node.append(item.source || '');
}
const cabinet = () => D.cabinets.find(c => c.id === S.cabId) || D.cabinets[0];
const caseDef = () => D.cases.find(c => c.id === S.caseId) || D.cases.find(c => c.id === 'custom');

function applyCabinet(resetCase) {
  const c = cabinet();
  S.cabKg = c.kg; S.cabW = c.w; S.cabH = c.h;
  if (resetCase) applyCase(c.case || 'custom');
}
function applyCase(id) {
  const k = D.cases.find(c => c.id === id) || D.cases.find(c => c.id === 'custom');
  S.caseId = k.id; S.caseCap = k.capacity; S.caseTare = k.tare; S.caseDims = [...k.dims]; S.caseCount = null; S.caseFill = 0;
}

// ---- Tételsorok ----
function itemRow(it, idx) {
  const def = D.accessories.find(a => a.id === it.id) || D.accessories.at(-1);
  const row = el('div', 'row');
  const name = el('label', 'name', 'Tétel');
  const sel = document.createElement('select');
  fillSelect(sel, D.accessories, a => a.name, a => a.group);
  sel.value = def.id;
  name.append(sel);
  const q = el('label', 'q', `Mennyiség`); const qi = unitInput(it.qty, def.unit); q.append(qi.wrap);
  const k = el('label', 'k', 'Egységtömeg'); const ki = unitInput(it.kg, 'kg/' + def.unit); k.append(ki.wrap);
  const tot = el('div', 'tot num');
  const del = el('button', 'del', '×'); del.type = 'button'; del.setAttribute('aria-label', 'Tétel törlése');
  const src = el('p', 'src');
  sourceLine(src, def);
  if (def.kg === null) src.classList.add('warnc');
  let custom = null;
  if (def.id === 'custom' || def.id === 'rack-gear') {
    custom = document.createElement('input'); custom.type = 'text'; custom.placeholder = 'Megnevezés (pl. szerszámláda)'; custom.value = it.name || '';
    custom.addEventListener('input', () => { it.name = custom.value; save(); });
  }
  row.append(name);
  if (custom) { const l = el('label', 'name', 'Megnevezés'); l.append(custom); row.append(l); }
  row.append(q, k, tot, del, src);
  sel.addEventListener('change', () => { const d = D.accessories.find(a => a.id === sel.value); it.id = d.id; it.kg = d.kg; renderItems(); update(); });
  qi.input.addEventListener('input', () => { it.qty = numIn(qi.input); update(); });
  ki.input.addEventListener('input', () => { it.kg = numIn(ki.input); update(); });
  del.addEventListener('click', () => { S.items.splice(idx, 1); renderItems(); update(); });
  it._ui = { q: qi.input, k: ki.input, tot };
  return row;
}
function unitInput(v, unit) {
  const wrap = el('span', 'unit'); const input = document.createElement('input');
  input.type = 'number'; input.min = '0'; input.step = 'any'; input.inputMode = 'decimal'; setIn(input, v);
  wrap.append(input, el('em', null, unit)); return { wrap, input };
}
function renderItems() {
  $('items').replaceChildren(...S.items.map(itemRow));
  if (!S.items.length) $('items').append(el('p', 'src', 'Még nincs tartozék. Add hozzá alább.'));
}
function packRow(p, idx) {
  const def = D.packs.find(x => x.id === p.id) || D.packs.at(-1);
  const row = el('div', 'row pack');
  const name = el('label', 'name', 'Csomag'); const sel = document.createElement('select');
  fillSelect(sel, D.packs, x => x.name); sel.value = def.id; name.append(sel);
  const c = el('label', null, 'Darab'); const ci = unitInput(p.count, 'db'); ci.input.step = '1'; c.append(ci.wrap);
  const t = el('label', null, 'Önsúly'); const ti = unitInput(p.tare, 'kg'); t.append(ti.wrap);
  const f = el('label', null, 'Belső csom.'); const fi = unitInput(p.fill, 'kg'); f.append(fi.wrap);
  const dims = el('div', 'dims');
  const di = ['Hossz', 'Szélesség', 'Magasság'].map((lbl, i) => { const l = el('label', null, lbl); const u = unitInput(p.dims[i], 'cm'); l.append(u.wrap); dims.append(l); u.input.addEventListener('input', () => { p.dims[i] = numIn(u.input); update(); }); return u.input; });
  const del = el('button', 'del', '×'); del.type = 'button'; del.setAttribute('aria-label', 'Csomag törlése');
  const src = el('p', 'src'); sourceLine(src, def);
  row.append(name, c, t, f, dims, del, src);
  sel.addEventListener('change', () => { const d = D.packs.find(x => x.id === sel.value); Object.assign(p, { id: d.id, tare: d.tare, dims: [...d.dims] }); renderPacks(); update(); });
  ci.input.addEventListener('input', () => { p.count = numIn(ci.input); update(); });
  ti.input.addEventListener('input', () => { p.tare = numIn(ti.input); update(); });
  fi.input.addEventListener('input', () => { p.fill = numIn(fi.input); update(); });
  p._ui = { c: ci.input, t: ti.input, f: fi.input, d: di };
  return row;
}
function renderPacks() {
  $('packs').replaceChildren(...S.packs.map(packRow));
  if (!S.packs.length) $('packs').append(el('p', 'src', 'Nincs külön csomag. Rackládát, tartozékdobozt vagy raklapot alább adhatsz hozzá.'));
}
function chips() {
  const quick = ['h30v-300', 'h30v-200', 'rigbar-050', 'h07rn-3g25', 'cat6a', 'din912-m10x30', 'steel-2', 'rack-gear', 'custom'];
  $('itemChips').replaceChildren(...quick.map(id => {
    const a = D.accessories.find(x => x.id === id); if (!a) return document.createTextNode('');
    const b = el('button', 'chip', '+ ' + a.name.replace(/ \(.*\)$/, '')); b.type = 'button';
    b.addEventListener('click', () => { S.items.push({ id: a.id, qty: a.unit === 'db' ? 1 : 10, kg: a.kg }); renderItems(); update(); });
    return b;
  }));
  $('packChips').replaceChildren(...D.packs.map(p => {
    const b = el('button', 'chip', '+ ' + p.name.replace(/ \(.*\)$/, '')); b.type = 'button';
    b.addEventListener('click', () => { S.packs.push({ id: p.id, count: 1, tare: p.tare, fill: 0, dims: [...p.dims] }); renderPacks(); update(); });
    return b;
  }));
}

// ---- Fő mezők ----
function bindStatic() {
  fillSelect($('cab'), D.cabinets, c => `${c.brand} · ${c.name}`, c => c.brand === 'Saját' ? 'Egyéb' : c.brand);
  fillSelect($('case'), D.cases, c => c.name);
  for (const id of ['seaCont', 'railCont']) fillSelect($(id), D.containers, c => `${c.name} · ${nf(c.volume, 1)} m³ · ${nf(c.payload, 0)} kg`);
  $('cab').addEventListener('change', () => { S.cabId = $('cab').value; applyCabinet(true); syncInputs(); update(); });
  $('case').addEventListener('change', () => { applyCase($('case').value); syncInputs(); update(); });
  const map = { cabKg: 'cabKg', cabW: 'cabW', cabH: 'cabH', qty: 'qty', wallW: 'wallW', wallH: 'wallH', caseCap: 'caseCap', caseCount: 'caseCount', caseTare: 'caseTare', caseFill: 'caseFill', airDiv: 'airDiv', seaWM: 'seaWM', railFactor: 'railFactor', seaFill: 'seaFill', railFill: 'railFill' };
  for (const [id, key] of Object.entries(map)) $(id).addEventListener('input', () => { S[key] = numIn($(id)); update(); });
  ['caseL', 'caseWd', 'caseHt'].forEach((id, i) => $(id).addEventListener('input', () => { S.caseDims[i] = numIn($(id)); update(); }));
  $('seaCont').addEventListener('change', () => { S.seaCont = $('seaCont').value; update(); });
  $('railCont').addEventListener('change', () => { S.railCont = $('railCont').value; update(); });
  $('byQty').addEventListener('click', () => { S.mode = 'qty'; syncInputs(); update(); });
  $('byWall').addEventListener('click', () => { S.mode = 'wall'; syncInputs(); update(); });
  document.querySelectorAll('[data-cur]').forEach(b => b.addEventListener('click', () => { S.cur = b.dataset.cur; syncInputs(); update(); }));
  document.querySelectorAll('[data-sea]').forEach(b => b.addEventListener('click', () => { S.seaMode = b.dataset.sea; syncInputs(); rateBadges(); update(); }));
  document.querySelectorAll('[data-rail]').forEach(b => b.addEventListener('click', () => { S.railMode = b.dataset.rail; syncInputs(); rateBadges(); update(); }));
  document.querySelectorAll('[data-money]').forEach(inp => inp.addEventListener('input', () => {
    const k = inp.dataset.money; S.money[k] = fromCur(numIn(inp)); S.edited[k] = true; update();
  }));
}
function syncInputs() {
  $('cab').value = S.cabId; $('case').value = S.caseId;
  setIn($('cabKg'), S.cabKg); setIn($('cabW'), S.cabW); setIn($('cabH'), S.cabH);
  setIn($('qty'), S.qty); setIn($('wallW'), S.wallW); setIn($('wallH'), S.wallH);
  setIn($('caseCap'), S.caseCap); setIn($('caseCount'), S.caseCount); setIn($('caseTare'), S.caseTare); setIn($('caseFill'), S.caseFill);
  ['caseL', 'caseWd', 'caseHt'].forEach((id, i) => setIn($(id), S.caseDims[i]));
  setIn($('airDiv'), S.airDiv); setIn($('seaWM'), S.seaWM); setIn($('railFactor'), S.railFactor);
  setIn($('seaFill'), S.seaFill); setIn($('railFill'), S.railFill);
  $('seaCont').value = S.seaCont; $('railCont').value = S.railCont;
  const wall = S.mode === 'wall';
  $('byQty').setAttribute('aria-pressed', String(!wall)); $('byWall').setAttribute('aria-pressed', String(wall));
  $('qtyBox').hidden = wall; $('wBox').hidden = !wall; $('hBox').hidden = !wall;
  document.querySelectorAll('[data-cur]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cur === S.cur)));
  document.querySelectorAll('[data-sea]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sea === S.seaMode)));
  document.querySelectorAll('[data-rail]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rail === S.railMode)));
  $('seaLclBox').hidden = S.seaMode !== 'lcl'; $('seaFclBox').hidden = S.seaMode !== 'fcl';
  $('railLclBox').hidden = S.railMode !== 'lcl'; $('railFclBox').hidden = S.railMode !== 'fcl';
  document.querySelectorAll('[data-money]').forEach(inp => { const v = toCur(S.money[inp.dataset.money]); inp.value = v === null ? '' : String(+v.toFixed(curDigits() === 0 ? 0 : 2)); });
  document.querySelectorAll('[data-cur-unit]').forEach(e => { const base = e.dataset.base ?? (e.dataset.base = e.textContent); e.textContent = curSym() + base; });
  const f = fx(); $('fxNote').textContent = `EKB-árfolyam (${f.date}): 1 € = ${nf(f.eurUsd, 4)} $ = ${nf(f.eurHuf, 2)} Ft`;
}

// ---- Számítás és kirajzolás ----
const mark = (input, missing) => { input.classList.toggle('missing', !!missing); input.placeholder = missing ? 'Hiányzó adat' : (input.id === 'caseCount' ? 'Automatikus' : ''); };
function li(list, html) { const n = document.createElement('li'); html.forEach(p => n.append(typeof p === 'string' ? p : p)); list.append(n); }
const B = t => el('b', null, t);

function update() {
  const cab = cabinet();
  // Kabinetszám
  let qty = S.qty, layout = null;
  if (S.mode === 'wall') {
    layout = wallLayout(S.wallW, S.wallH, S.cabW, S.cabH);
    qty = layout ? layout.count : null;
    const info = $('wallInfo'); info.hidden = false; info.replaceChildren();
    if (layout) info.append(B(`${layout.cols} × ${layout.rows} = ${layout.count} kabinet`), ` · valós falméret ${nf(layout.realW, 3)} × ${nf(layout.realH, 3)} m (${nf(layout.realW * layout.realH, 2)} m²)`);
    else info.append('A falméretből számoláshoz add meg a kabinet szélességét és magasságát.');
  } else $('wallInfo').hidden = true;
  sourceLine($('cabSrc'), cab); $('cabSrc').classList.toggle('warnc', cab.kg === null);

  const k = caseDef();
  const res = shipment({
    cabinets: { qty, kg: S.cabKg },
    items: S.items.map(i => ({ qty: i.qty, kg: i.kg })),
    mainCase: { capacity: S.caseCap, count: S.caseCount, tare: S.caseTare, fill: S.caseFill, dims: S.caseDims },
    packs: S.packs.map(p => ({ count: p.count, tare: p.tare, fill: p.fill, dims: p.dims })),
  });

  // Hiányzó mezők jelölése
  const hasCab = (qty ?? 0) > 0;
  mark($('cabKg'), hasCab && val(S.cabKg) === null);
  mark($('qty'), S.mode === 'qty' && val(S.qty) === null);
  mark($('cabW'), S.mode === 'wall' && val(S.cabW) === null); mark($('cabH'), S.mode === 'wall' && val(S.cabH) === null);
  const needCase = hasCab && (res.caseCount ?? 1) > 0;
  mark($('caseCap'), hasCab && val(S.caseCount) === null && val(S.caseCap) === null);
  mark($('caseTare'), needCase && val(S.caseTare) === null);
  ['caseL', 'caseWd', 'caseHt'].forEach((id, i) => mark($(id), needCase && !(val(S.caseDims[i]) > 0)));
  for (const it of S.items) { if (!it._ui) continue; mark(it._ui.k, (it.qty ?? 0) > 0 && val(it.kg) === null); mark(it._ui.q, val(it.qty) === null); it._ui.tot.textContent = val(it.qty) !== null && val(it.kg) !== null ? nf(it.qty * it.kg, 2) + ' kg' : '– kg'; }
  for (const p of S.packs) { if (!p._ui) continue; const need = (p.count ?? 0) > 0; mark(p._ui.t, need && val(p.tare) === null); p._ui.d.forEach((d, i) => mark(d, need && !(val(p.dims[i]) > 0))); }

  // Láda-információ
  const ci = $('caseInfo'); ci.replaceChildren();
  if (res.caseCount !== null && qty !== null) {
    ci.append(B(`${res.caseCount} LED-láda`), ` · ${qty} kabinet`, val(S.caseCap) ? ` · ${S.caseCap} db/láda` : '', res.capacityLeft > 0 ? ` · ${res.capacityLeft} üres hely` : '');
  } else ci.append('A ládaszámhoz add meg a láda kapacitását vagy a ládaszámot.');
  sourceLine($('caseSrc'), k); $('caseSrc').classList.toggle('warnc', k.tare === null);

  // KPI
  const kpis = [
    ['Bruttó tömeg', res.gross, 'kg', 1, 'big', res.net !== null ? `nettó ${nf(res.net, 1)} kg` : ''],
    ['Térfogat', res.volume, 'm³', 3, 'big', 'csomagok külső mérete alapján'],
    ['Csomagolás', res.packaging, 'kg', 1, '', res.tare !== null ? `láda ${nf(res.tare, 1)} + belső ${nf(res.fill, 1)} kg` : ''],
    ['Csomagok', res.count, 'db', 0, '', res.caseCount !== null ? `ebből ${res.caseCount} LED-láda` : ''],
  ];
  $('kpis').replaceChildren(...kpis.map(([t, v, u, d, cls, sub]) => {
    const box = el('div', 'kpi ' + cls + (v === null ? ' na' : ''));
    const dd = el('dd', 'num', v === null ? 'Hiányzó adat' : `${nf(v, d)} ${u}`);
    if (sub && v !== null) dd.append(el('span', 'sub', sub));
    box.append(el('dt', null, t), dd); return box;
  }));

  // Fuvar
  const M = S.money;
  const air = airFreight(res, { divisor: S.airDiv, step: D.rules.airStep, rate: M.airRate, min: M.airMin, extras: M.airExtra });
  const seaC = D.containers.find(c => c.id === S.seaCont); const railC = D.containers.find(c => c.id === S.railCont);
  const sea = S.seaMode === 'lcl'
    ? { mode: 'lcl', ...seaLcl(res, { wm: S.seaWM, minRT: D.rules.seaMinRT, rate: M.seaLclRate, min: M.seaLclMin, extras: M.seaLclExtra }) }
    : { mode: 'fcl', ...fcl(res, { container: seaC, fillFactor: (S.seaFill ?? 0) / 100, rate: M.seaFclRate, extras: M.seaFclExtra }) };
  const rail = S.railMode === 'lcl'
    ? { mode: 'lcl', ...railLcl(res, { factor: S.railFactor, rate: M.railLclRate, min: M.railLclMin, extras: M.railLclExtra }) }
    : { mode: 'fcl', ...fcl(res, { container: railC, fillFactor: (S.railFill ?? 0) / 100, rate: M.railFclRate, extras: M.railFclExtra }) };

  const blockedMsg = res.capacityWarning ? 'A ládák nem elegek – a díj nem számolható.' : null;
  // Légi levezetés
  const as = $('airSteps'); as.replaceChildren();
  if (res.gross !== null && res.volume !== null && air.volW !== null) {
    li(as, ['Bruttó tömeg: ', B(nf(res.gross, 1) + ' kg')]);
    li(as, ['Térfogatsúly: ', `${nf(res.volume, 3)} m³ × 1 000 000 ÷ ${nf(S.airDiv, 0)} = `, B(nf(air.volW, 1) + ' kg')]);
    if (air.chg !== null) li(as, ['Díjsúly = a nagyobb (', air.basis, '), fél kg-ra felfelé: ', B(nf(air.chg, 1) + ' kg')]);
    if (air.chg !== null && val(M.airRate) !== null) li(as, [`${nf(air.chg, 1)} kg × ${money(M.airRate)}/kg = `, B(money(air.chg * M.airRate)), val(M.airMin) && air.chg * M.airRate < M.airMin ? ` → minimumdíj ${money(M.airMin)}` : '', val(M.airExtra) ? ` + járulékos ${money(M.airExtra)}` : '']);
  } else li(as, [blockedMsg || 'Hiányzó adat: bruttó tömeg vagy térfogat.']);
  // Tengeri
  const ss = $('seaSteps'); ss.replaceChildren();
  if (blockedMsg) li(ss, [blockedMsg]);
  else if (sea.mode === 'lcl' && sea.rt !== null) {
    li(ss, ['Térfogat: ', B(nf(res.volume, 3) + ' m³'), ` · tömeg: `, B(nf(sea.t, 3) + ' t'), ` (${nf(res.gross, 1)} kg ÷ ${nf(S.seaWM, 0)})`]);
    li(ss, ['Díjköteles egység (W/M) = a nagyobb (', sea.basis, `), min. ${D.rules.seaMinRT} RT: `, B(nf(sea.rt, 2) + ' RT')]);
    if (val(M.seaLclRate) !== null) li(ss, [`${nf(sea.rt, 2)} RT × ${money(M.seaLclRate)} = `, B(money(sea.rt * M.seaLclRate)), val(M.seaLclMin) && sea.rt * M.seaLclRate < M.seaLclMin ? ` → minimumdíj ${money(M.seaLclMin)}` : '', val(M.seaLclExtra) ? ` + járulékos ${money(M.seaLclExtra)}` : '']);
  } else if (sea.mode === 'fcl' && sea.n !== null) {
    li(ss, [`Hasznos térfogat: ${nf(seaC.volume, 1)} m³ × ${nf(S.seaFill, 0)}% = `, B(nf(sea.usable, 1) + ' m³')]);
    li(ss, [`Térfogat szerint ${nf(res.volume, 2)} ÷ ${nf(sea.usable, 1)} → ${sea.byVol} db; tömeg szerint ${nf(res.gross, 0)} ÷ ${nf(seaC.payload, 0)} kg → ${sea.byWt} db`]);
    li(ss, ['Szükséges: ', B(`${sea.n} × ${seaC.name}`), ` (kihasználtság ${nf(sea.util * 100, 1)}%)`, sea.util < 0.4 ? ' – ennyi árunál a gyűjtőáru (LCL) jellemzően olcsóbb.' : '']);
    if (val(M.seaFclRate) !== null) li(ss, [`${sea.n} × ${money(M.seaFclRate)} = `, B(money(sea.n * M.seaFclRate)), val(M.seaFclExtra) ? ` + járulékos ${money(M.seaFclExtra)}` : '']);
  } else li(ss, ['Hiányzó adat: bruttó tömeg vagy térfogat.']);
  // Vasúti
  const rs = $('railSteps'); rs.replaceChildren();
  if (blockedMsg) li(rs, [blockedMsg]);
  else if (rail.mode === 'lcl' && rail.chgM3 !== null) {
    li(rs, ['Térfogat: ', B(nf(res.volume, 3) + ' m³'), ' · tömegből: ', B(nf(rail.wtM3, 3) + ' m³'), ` (${nf(res.gross, 1)} kg ÷ ${nf(S.railFactor, 0)} kg/m³)`]);
    li(rs, ['Díjköteles térfogat = a nagyobb (', rail.basis, '): ', B(nf(rail.chgM3, 2) + ' m³')]);
    if (val(M.railLclRate) !== null) li(rs, [`${nf(rail.chgM3, 2)} m³ × ${money(M.railLclRate)} = `, B(money(rail.chgM3 * M.railLclRate)), val(M.railLclMin) && rail.chgM3 * M.railLclRate < M.railLclMin ? ` → minimumdíj ${money(M.railLclMin)}` : '', val(M.railLclExtra) ? ` + járulékos ${money(M.railLclExtra)}` : '']);
  } else if (rail.mode === 'fcl' && rail.n !== null) {
    li(rs, [`Hasznos térfogat: ${nf(railC.volume, 1)} m³ × ${nf(S.railFill, 0)}% = `, B(nf(rail.usable, 1) + ' m³')]);
    li(rs, [`Térfogat szerint ${rail.byVol} db, tömeg szerint ${rail.byWt} db → `, B(`${rail.n} × ${railC.name}`)]);
    if (val(M.railFclRate) !== null) li(rs, [`${rail.n} × ${money(M.railFclRate)} = `, B(money(rail.n * M.railFclRate)), val(M.railFclExtra) ? ` + járulékos ${money(M.railFclExtra)}` : '']);
  } else li(rs, ['Hiányzó adat: bruttó tömeg vagy térfogat.']);

  const totals = { air: air.cost, sea: sea.cost, rail: rail.cost };
  for (const [key, v] of Object.entries(totals)) {
    const b = $(key + 'Total'); b.className = v === null ? 'na' : 'num';
    b.textContent = v === null ? (blockedMsg ? 'Nem számolható' : 'Adj meg díjat és teljes adatot') : money(v);
    $(key + 'TotalAlt').textContent = v !== null && S.cur !== 'USD' ? `≈ ${nf(v, 0)} USD` : '';
  }
  // Összehasonlító kártyák
  const known = Object.values(totals).filter(v => v !== null);
  const best = known.length ? Math.min(...known) : null, max = known.length ? Math.max(...known) : null;
  const meta = {
    air: { t: 'Légi', c: 'var(--air)', sub: air.chg !== null ? `díjsúly ${nf(air.chg, 1)} kg` : '' },
    sea: { t: sea.mode === 'lcl' ? 'Tengeri · LCL' : 'Tengeri · FCL', c: 'var(--sea)', sub: sea.mode === 'lcl' ? (sea.rt !== null ? `${nf(sea.rt, 2)} RT` : '') : (sea.n ? `${sea.n} × ${seaC.name}` : '') },
    rail: { t: rail.mode === 'lcl' ? 'Vasúti · LCL' : 'Vasúti · FCL', c: 'var(--rail)', sub: rail.mode === 'lcl' ? (rail.chgM3 !== null ? `${nf(rail.chgM3, 2)} m³` : '') : (rail.n ? `${rail.n} × ${railC.name}` : '') },
  };
  $('modes').replaceChildren(...Object.entries(totals).map(([key, v]) => {
    const m = meta[key]; const card = el('button', 'mode' + (v !== null && v === best && known.length > 1 ? ' best' : '')); card.type = 'button';
    card.style.setProperty('--c', m.c);
    const lbl = el('div', 'lbl'); lbl.append(m.t, v !== null && v === best && known.length > 1 ? el('span', 'badge best', 'Legolcsóbb') : el('span', 'badge', D.transit[key]?.text || ''));
    const vv = el('div', 'val num' + (v === null ? ' na' : ''), v === null ? 'Hiányzó adat' : money(v));
    const mt = el('div', 'meta', m.sub);
    const bar = el('div', 'bar'); const i = el('i'); i.style.width = v === null || !max ? '0%' : Math.max(4, (v / max) * 100) + '%'; bar.append(i);
    card.append(lbl, vv, mt, bar);
    card.addEventListener('click', () => $(key).scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return card;
  }));

  // Figyelmeztetések
  const w = [];
  if (res.capacityWarning) w.push(`A megadott ${S.caseCount} ládába legfeljebb ${S.caseCount * S.caseCap} kabinet fér, de ${qty} van megadva. Növeld a ládaszámot vagy töröld a felülírást.`);
  if (res.missing.length) w.push('Hiányzó adat: ' + res.missing.join(', ') + '. A sárga mezőket töltsd ki.');
  const box = $('warn'); box.replaceChildren(); box.classList.toggle('show', w.length > 0);
  if (w.length) { const ul = el('ul'); w.forEach(t => ul.append(el('li', null, t))); box.append(ul); }

  // Dokk
  $('dGross').textContent = res.gross === null ? 'hiányzik' : nf(res.gross, 0) + ' kg';
  $('dAir').textContent = moneyShort(air.cost); $('dSea').textContent = moneyShort(sea.cost); $('dRail').textContent = moneyShort(rail.cost);
  $('dock').classList.toggle('alert', w.length > 0);

  window.__ledfuvar = { res, air, sea, rail, qty };
  window.__qRefresh?.();
  save();
}

function rateBadges() {
  const r = D.rates;
  const set = (id, rate) => {
    const n = $(id); n.replaceChildren();
    if (!rate) return;
    const range = rate.low != null ? ` (sáv ${nf(rate.low, 0)}–${nf(rate.high, 0)} ${rate.unit})` : '';
    n.append(`${rate.label}: ${rate.value == null ? 'nincs adat' : nf(rate.value, 2) + ' ' + rate.unit}${range}${rate.date ? ', ' + rate.date : ''} · `);
    const url = safeUrl(rate.url); if (url) { const a = el('a', null, 'forrás'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; n.append(a); }
  };
  set('airRateSrc', r.air); set('seaRateSrc', S.seaMode === 'lcl' ? r.seaLcl : r.seaFcl40); set('railRateSrc', S.railMode === 'lcl' ? r.railLcl : r.railFcl40);
  for (const k of ['air', 'sea', 'rail']) $(k + 'Transit').textContent = D.transit[k] ? D.transit[k].text : '';
  $('routeNote').textContent = `Útvonal: ${D.meta.route} ${D.rules.fillNote} Alternatív tengeri referencia: ${r.seaFcl40alt.label} ${nf(r.seaFcl40alt.value, 0)} USD/40' (${r.seaFcl40alt.date}).`;
}
function sourcesList() {
  const seen = new Map();
  const add = (label, url) => { const u = safeUrl(url); if (u && !seen.has(u)) seen.set(u, label); };
  D.cabinets.forEach(c => add(`${c.brand} ${c.name} – ${c.source}`, c.url));
  D.cases.forEach(c => add(`${c.name} – ${c.source}`, c.url));
  D.accessories.forEach(a => add(`${a.name} – ${a.source}`, a.url));
  D.packs.forEach(p => add(`${p.name} – ${p.source}`, p.url));
  D.containers.forEach(c => add(`${c.name} konténer – ${c.source}`, c.url));
  Object.values(D.rates).forEach(r => r && r.url && add(`${r.label} – ${r.source}`, r.url));
  add(D.rules.airSource, D.rules.airUrl); add(D.rules.seaSource, D.rules.seaUrl); add(D.rules.railSource, D.rules.railUrl);
  Object.values(D.transit).forEach(t => add(`Menetidő ${t.text} – ${t.source}`, t.url));
  add(`Árfolyam – ${D.fx.source} (${D.fx.date})`, D.fx.url);
  $('sources').replaceChildren(...[...seen].map(([u, l]) => { const li = el('li'); const a = el('a', null, l); a.href = u; a.target = '_blank'; a.rel = 'noopener'; li.append(a); return li; }));
  $('srcMeta').textContent = `Adatok frissítve: ${D.meta.updated} · ${D.meta.note}`;
}
function setStatus(live) {
  $('dataDot').classList.toggle('live', live);
  $('dataText').textContent = `${live ? 'Friss adatok' : 'Beépített adatok'} · ${D.meta.updated}`;
}

function start(live) {
  const def = defaults();
  if (!S) S = def;
  else {
    // Új adatverziónál a nem szerkesztett díjak frissülnek
    for (const k of Object.keys(def.money)) if (!S.edited?.[k] || !(k in S.money)) S.money[k] = def.money[k];
    S.edited ||= {};
    for (const k of Object.keys(def)) if (!(k in S)) S[k] = def[k];
    if (!D.cabinets.some(c => c.id === S.cabId)) S.cabId = def.cabId;
  }
  if (S.fresh) { applyCabinet(true); S.fresh = false; }
  bindStaticOnce(); chips(); renderItems(); renderPacks(); rateBadges(); sourcesList(); syncInputs(); setStatus(live); update();
}
let bound = false;
function bindStaticOnce() { if (bound) { fillSelect($('cab'), D.cabinets, c => `${c.brand} · ${c.name}`, c => c.brand === 'Saját' ? 'Egyéb' : c.brand); return; } bound = true; bindStatic(); }

// Indítás: beépített adat azonnal, majd friss adat a GitHubról (ha elérhető és újabb)
start(false);
(async () => {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(DATA_URL + '?t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' }); clearTimeout(t);
    if (!r.ok) throw new Error(r.status);
    const remote = await r.json();
    if (!remote?.meta?.updated || !Array.isArray(remote.cabinets) || !remote.rates) throw new Error('formátum');
    if (remote.meta.updated >= D.meta.updated) { D = remote; start(true); } else setStatus(false);
  } catch (e) { setStatus(false); }
})();
