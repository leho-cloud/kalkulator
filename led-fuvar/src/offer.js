// Ügyfélnek szóló fuvarköltség-kimutatás (nyomtatás / PDF)
const LOGO = '__LOGO__';
const DOC_STORE = STORE + '.doc';
const DOOR_FALLBACK = __DOOR__;
const door = () => D.doorTransit || DOOR_FALLBACK;
const DOC_DEF = { detail: true,  client: '', ref: '', valid: 7, markup: 0, round: true, cur: 'HUF', modes: { air: true, sea: true, rail: true }, excl: 'vám, import-ÁFA, vámkezelés, belföldi kiszállítás, szállítmánybiztosítás', note: '', contact: '' };
let DOC = (() => { try { return { ...DOC_DEF, ...JSON.parse(localStorage.getItem(DOC_STORE) || '{}') }; } catch (e) { return { ...DOC_DEF }; } })();
const docSave = () => { try { localStorage.setItem(DOC_STORE, JSON.stringify(DOC)); } catch (e) { /* */ } };

function docPrice(usd) {
  if (usd === null || usd === undefined) return null;
  let v = convert(usd, DOC.cur, D.fx) * (1 + (Number(DOC.markup) || 0) / 100);
  if (DOC.round) { const step = DOC.cur === 'HUF' ? 1000 : 10; v = Math.ceil(v / step) * step; }
  return v;
}
const docMoney = v => v === null ? '–' : new Intl.NumberFormat('hu-HU', { style: 'currency', currency: DOC.cur, maximumFractionDigits: 0 }).format(v);
const hdate = d => d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });

function modeRows(res) {
  const M = S.money;
  const seaC = D.containers.find(c => c.id === S.seaCont), railC = D.containers.find(c => c.id === S.railCont);
  const air = airFreight(res, { divisor: S.airDiv, step: D.rules.airStep, rate: M.airRate, min: M.airMin, extras: M.airExtra });
  const sea = S.seaMode === 'lcl' ? { mode: 'lcl', ...seaLcl(res, { wm: S.seaWM, minRT: D.rules.seaMinRT, rate: M.seaLclRate, min: M.seaLclMin, extras: M.seaLclExtra }) }
    : { mode: 'fcl', ...fcl(res, { container: seaC, fillFactor: (S.seaFill ?? 0) / 100, rate: M.seaFclRate, extras: M.seaFclExtra }) };
  const rail = S.railMode === 'lcl' ? { mode: 'lcl', ...railLcl(res, { factor: S.railFactor, rate: M.railLclRate, min: M.railLclMin, extras: M.railLclExtra }) }
    : { mode: 'fcl', ...fcl(res, { container: railC, fillFactor: (S.railFill ?? 0) / 100, rate: M.railFclRate, extras: M.railFclExtra }) };
  return [
    { key: 'air', name: 'Légi fuvar', t: door().air.total, leg: D.transit.air?.text, basis: air.chg != null ? `díjköteles tömeg ${nf(air.chg, 1)} kg` : '', usd: air.cost },
    { key: 'sea', name: sea.mode === 'lcl' ? 'Tengeri fuvar · gyűjtő (LCL)' : 'Tengeri fuvar · teljes konténer', t: door().sea.total, leg: 'ebből hajóút ' + (door().sea.steps[2]?.[1] || ''), basis: sea.mode === 'lcl' ? (sea.rt != null ? `${nf(sea.rt, 2)} díjköteles egység (W/M)` : '') : (sea.n ? `${sea.n} × ${seaC.name}` : ''), usd: sea.cost },
    { key: 'rail', name: rail.mode === 'lcl' ? 'Vasúti fuvar · gyűjtő (LCL)' : 'Vasúti fuvar · teljes konténer', t: door().rail.total, leg: 'ebből vasút ' + (door().rail.steps[2]?.[1] || ''), basis: rail.mode === 'lcl' ? (rail.chgM3 != null ? `${nf(rail.chgM3, 2)} m³ díjköteles térfogat` : '') : (rail.n ? `${rail.n} × ${railC.name}` : ''), usd: rail.cost },
  ].filter(r => DOC.modes[r.key]).map(r => ({ ...r, price: docPrice(r.usd) }));
}
function docContext() {
  const k = window.__ledfuvar; if (!k) return null;
  const ic = DOC.useIntake !== false && typeof intakeContext === 'function' ? intakeContext() : null;
  const cab = cabinet();
  const wall = S.mode === 'wall' && val(S.wallW) && val(S.wallH) ? ` · ${nf(S.wallW, 2)} × ${nf(S.wallH, 2)} m fal` : '';
  const calcLed = { label: k.qty != null ? `${k.qty} db kabinet` : '–', sub: `${cab.brand === 'Saját' ? 'egyedi kabinet' : cab.brand + ' ' + cab.name}${wall}` };
  if (ic) return { ...ic, led: ic.led || calcLed, rows: ic.rows.filter(r => r.key === 'other' || DOC.modes[r.key] !== false) };
  return { res: k.res, rows: modeRows(k.res), extraExcl: [], led: calcLed };
}

function buildDoc() {
  const ctx = docContext(); if (!ctx) return null;
  const { res, rows } = ctx;
  const today = new Date(); const until = new Date(today.getTime() + (Number(DOC.valid) || 0) * 864e5);
  const known = rows.filter(r => r.price !== null);
  const best = known.length > 1 ? Math.min(...known.map(r => r.price)) : null;

  const d = el('article', 'doc');
  // Fejléc
  const head = el('header', 'doc-head');
  const lg = el('img'); lg.src = LOGO; lg.alt = 'TZSVTAV – LED, Prolight, Sound';
  const hr = el('div', 'doc-title');
  hr.append(el('h1', '', 'Fuvarköltség-becslés'), el('p', '', hdate(today)));
  if (DOC.ref) hr.append(el('p', 'doc-ref', DOC.ref));
  head.append(lg, hr); d.append(head);

  // Ügyfél
  if (DOC.client || DOC.ref) {
    const who = el('div', 'doc-who');
    if (DOC.client) { const b = el('div'); b.append(el('span', '', 'Ügyfél'), el('b', '', DOC.client)); who.append(b); }
    const v = el('div'); v.append(el('span', '', 'Érvényes'), el('b', '', (Number(DOC.valid) || 0) > 0 ? hdate(until).replace(/\.$/, '') + '-ig' : 'visszavonásig')); who.append(v);
    d.append(who);
  }

  // Szállítmány
  d.append(el('h2', '', 'A szállítmány'));
  const grid = el('div', 'doc-grid');
  const cell = (t, v, s) => { const c = el('div'); c.append(el('span', '', t), el('b', '', v)); if (s) c.append(el('small', '', s)); grid.append(c); };
  cell('LED-fal', ctx.led.label, ctx.led.sub);
  cell('Bruttó tömeg', res.gross != null ? `${nf(Math.ceil(res.gross), 0)} kg` : '–', 'csomagolással együtt');
  cell('Térfogat', res.volume != null ? `${nf(res.volume, 2)} m³` : '–', 'csomagok külső mérete');
  cell('Csomagok', res.count != null ? `${res.count} db` : '–', res.caseCount != null ? `ebből ${res.caseCount} LED-láda` : '');
  d.append(grid);

  // Fuvarmódok
  d.append(el('h2', '', 'Becsült fuvarköltség'));
  const tb = el('table', 'doc-tbl');
  const th = el('thead'); const thr = el('tr'); ['Fuvarmód', 'Átfutás (háztól házig)', 'Elszámolási alap', 'Becsült díj (nettó)'].forEach(t => thr.append(el('th', '', t))); th.append(thr); tb.append(th);
  const tbody = el('tbody');
  for (const r of rows) {
    const tr = el('tr', r.price !== null && r.price === best ? 'best' : '');
    const n = el('td'); n.append(el('b', '', r.name)); if (r.price !== null && r.price === best) n.append(el('em', '', 'Legkedvezőbb'));
    const tt = el('td'); tt.append(el('b', '', r.t || '–')); if (r.key !== 'air' && r.leg) tt.append(el('small', '', r.leg));
    tr.append(n, tt, el('td', '', r.basis || '–'), el('td', 'num', r.price === null ? 'nem számolható' : docMoney(r.price)));
    tbody.append(tr);
  }
  if (!rows.length) { const tr = el('tr'); const td = el('td', '', 'Nincs kiválasztott fuvarmód.'); td.colSpan = 4; tr.append(td); tbody.append(tr); }
  tb.append(tbody); d.append(tb);

  // Átfutás részletezése
  const dt = door();
  if (DOC.detail && rows.some(r => r.key !== 'air' || rows.length === 1)) {
    d.append(el('h2', '', 'Átfutási idő részletezése'));
    const wrap = el('div', 'doc-steps');
    const seen = new Set();
    for (const r of rows) {
      const m = dt[r.key]; if (!m || seen.has(r.key)) continue; seen.add(r.key);
      const box = el('div', 'doc-step');
      const h = el('div', 'doc-step-h'); h.append(el('b', '', r.name.split(' · ')[0]), el('span', '', m.total)); box.append(h);
      const ol = el('ol');
      for (const [a, b] of m.steps) { const li = el('li'); li.append(el('span', '', a), el('b', '', b)); ol.append(li); }
      box.append(ol);
      if (m.freq) box.append(el('p', '', m.freq));
      if (m.risk) box.append(el('p', 'risk', m.risk));
      wrap.append(box);
    }
    d.append(wrap);
  }

  // Feltételek
  const info = el('div', 'doc-info');
  const ul = el('ul');
  ul.append(el('li', '', 'Útvonal: Kína (gyári felvétel) → Budapest. Az átfutás a kész, csomagolt áru átvételétől számít; a gyártási idő ezen felül értendő. Tipikus sáv, nem garantált határidő.'));
  const excl = exclList(ctx); if (excl) ul.append(el('li', '', `Az ár nem tartalmazza: ${excl}.`));
  ul.append(el('li', '', 'Az árak nettó árak, a mindenkori ÁFA-t nem tartalmazzák.'));
  if (DOC.cur !== 'USD') ul.append(el('li', '', `Átváltás: EKB-árfolyam (${D.fx.date}), 1 € = ${nf(D.fx.eurHuf, 2)} Ft. Árfolyamváltozás esetén a díj módosulhat.`));
  if (DOC.note.trim()) ul.append(el('li', 'doc-note', DOC.note.trim()));
  info.append(ul); d.append(info);
  d.append(el('p', 'doc-disc', 'A kimutatás tájékoztató jellegű becslés aktuális piaci fuvardíjak alapján, nem minősül ajánlati kötöttségnek. A végleges díjat a fuvarozó visszaigazolása, a tényleges csomagadatok és az indulás időpontjában érvényes pótdíjak határozzák meg.'));

  const foot = el('footer', 'doc-foot');
  foot.append(el('span', '', DOC.contact.trim() || 'TZSVTAV'), el('span', 'doc-tag', 'LED · PROLIGHT · SOUND'));
  d.append(foot);
  return d;
}

function exclList(ctx) {
  const base = DOC.excl.trim(); const extra = (ctx.extraExcl || []).filter(x => x && !base.toLowerCase().includes(x.toLowerCase()));
  return [...extra, base].filter(Boolean).join(', ');
}
function offerText() {
  const ctx = docContext(); if (!ctx) return '';
  const today = new Date(); const until = new Date(today.getTime() + (Number(DOC.valid) || 0) * 864e5);
  const r = ctx.res; const L = [];
  L.push(`Tárgy: Fuvarköltség-becslés${DOC.ref ? ' – ' + DOC.ref : ''}`, '');
  L.push(DOC.client ? `Tisztelt ${DOC.client}!` : 'Tisztelt Partnerünk!', '');
  L.push(`Köszönjük megkeresését. ${DOC.ref ? 'A(z) ' + DOC.ref + ' szállítására' : 'A szállításra'} az alábbi becsült fuvarköltséget adjuk (nettó, ÁFA nélkül):`, '');
  const known = ctx.rows.filter(x => x.price != null); const best = known.length > 1 ? Math.min(...known.map(x => x.price)) : null;
  for (const x of ctx.rows) L.push(`– ${x.name}: ${x.price == null ? 'egyedi ajánlat alapján' : docMoney(x.price)} · átfutás háztól házig: ${x.t}${x.price != null && x.price === best ? ' (legkedvezőbb)' : ''}`);
  L.push('');
  const sh = [r.gross != null ? `${nf(Math.ceil(r.gross), 0)} kg bruttó` : null, r.volume != null ? `${nf(r.volume, 2)} m³` : null, r.count != null ? `${r.count} csomag` : null].filter(Boolean).join(', ');
  const ds = ctx.led.sub && ctx.led.sub !== 'csomaglista alapján' ? ctx.led.sub : '';
  L.push(`Szállítmány: ${ds ? ds + (sh ? ' – ' : '') : ''}${sh}.`);
  const excl = exclList(ctx); if (excl) L.push(`Az ár nem tartalmazza: ${excl}.`);
  L.push('Az átfutási idő a kész, csomagolt áru átvételétől számít, tipikus sáv, nem garantált határidő. A vasúti és tengeri gyűjtőjáratok jellemzően hetente indulnak; határ- vagy kikötői fennakadás esetén 1–2 hét késés előfordulhat.');
  if (DOC.cur !== 'USD') L.push(`Az ár a(z) ${D.fx.date}-i EKB-árfolyamon (1 € = ${nf(D.fx.eurHuf, 2)} Ft) készült; árfolyamváltozás esetén módosulhat.`);
  if ((Number(DOC.valid) || 0) > 0) L.push(`Az ajánlat ${hdate(until).replace(/\.$/, '')}-ig érvényes, tájékoztató jellegű becslés; a végleges díjat a fuvarozó visszaigazolása határozza meg.`);
  if (DOC.note.trim()) L.push(DOC.note.trim());
  L.push('', 'A részletes kimutatást csatoltan küldjük.', '', 'Üdvözlettel:', DOC.contact.trim() || 'TZSVTAV');
  return L.join('\n');
}

function renderDoc() { const host = $('docSheet'); if (!host) return; const d = buildDoc(); host.replaceChildren(...(d ? [d] : [])); }
function openDoc(print) {
  renderDoc(); $('docWrap').hidden = false; document.body.classList.add('doc-open');
  if (print) setTimeout(() => window.print(), 150);
}
function closeDoc() { $('docWrap').hidden = true; document.body.classList.remove('doc-open'); }

(function initDoc() {
  if (!$('docClient')) return;
  const bind = (id, key, num) => { const n = $(id); n.value = DOC[key] ?? ''; n.addEventListener('input', () => { DOC[key] = num ? (n.value === '' ? 0 : Number(n.value)) : n.value; docSave(); }); };
  bind('docClient', 'client'); bind('docRef', 'ref'); bind('docValid', 'valid', true); bind('docMarkup', 'markup', true);
  bind('docExcl', 'excl'); bind('docNote', 'note'); bind('docContact', 'contact');
  const cur = $('docCur'); cur.value = DOC.cur; cur.addEventListener('change', () => { DOC.cur = cur.value; docSave(); });
  const dtl = $('docDetail'); dtl.checked = DOC.detail !== false; dtl.addEventListener('change', () => { DOC.detail = dtl.checked; docSave(); });
  const rd = $('docRound'); rd.checked = !!DOC.round; rd.addEventListener('change', () => { DOC.round = rd.checked; docSave(); });
  for (const m of ['air', 'sea', 'rail']) { const c = $('docM-' + m); c.checked = DOC.modes[m] !== false; c.addEventListener('change', () => { DOC.modes[m] = c.checked; docSave(); }); }
  $('docPreview').addEventListener('click', () => openDoc(false));
  $('docPrint').addEventListener('click', () => openDoc(true));
  $('docPrint2').addEventListener('click', () => window.print());
  $('docClose').addEventListener('click', closeDoc);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('docWrap').hidden) closeDoc(); });
  let oldTitle = null;
  $('docText').addEventListener('click', () => { const ta = $('docTextOut'); ta.value = offerText(); ta.hidden = false; $('docCopy').hidden = false; ta.focus(); });
  $('docCopy').addEventListener('click', async () => { const ta = $('docTextOut'); try { await navigator.clipboard.writeText(ta.value); $('docCopy').textContent = 'Kimásolva ✓'; } catch (e) { ta.select(); document.execCommand?.('copy'); $('docCopy').textContent = 'Kijelölve – másold ki'; } setTimeout(() => { $('docCopy').textContent = 'Másolás'; }, 2000); });
  window.addEventListener('beforeprint', () => { renderDoc(); oldTitle = document.title; document.title = ['Fuvarköltség-becslés', DOC.client, DOC.ref].filter(Boolean).join(' – ').replace(/[\\/:*?"<>|]/g, '-'); });
  window.addEventListener('afterprint', () => { if (oldTitle) document.title = oldTitle; });
  window.__doc = { build: buildDoc, state: () => DOC, price: docPrice, text: offerText, ctx: docContext };
})();
