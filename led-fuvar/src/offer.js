// Ügyfélnek szóló fuvarköltség-kimutatás (nyomtatás / PDF)
const LOGO = '__LOGO__';
const DOC_STORE = STORE + '.doc';
const DOC_DEF = { client: '', ref: '', valid: 7, markup: 0, round: true, cur: 'HUF', modes: { air: true, sea: true, rail: true }, excl: 'vám, import-ÁFA, vámkezelés, belföldi kiszállítás, szállítmánybiztosítás', note: '', contact: '' };
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

function buildDoc() {
  const k = window.__ledfuvar; if (!k) return null;
  const { res, air, sea, rail, qty } = k;
  const cab = cabinet();
  const today = new Date(); const until = new Date(today.getTime() + (Number(DOC.valid) || 0) * 864e5);
  const seaC = D.containers.find(c => c.id === S.seaCont), railC = D.containers.find(c => c.id === S.railCont);
  const rows = [
    { key: 'air', name: 'Légi fuvar', t: D.transit.air?.text, basis: air.chg != null ? `díjköteles tömeg ${nf(air.chg, 1)} kg` : '', usd: air.cost },
    { key: 'sea', name: sea.mode === 'lcl' ? 'Tengeri fuvar · gyűjtő (LCL)' : 'Tengeri fuvar · teljes konténer', t: D.transit.sea?.text, basis: sea.mode === 'lcl' ? (sea.rt != null ? `${nf(sea.rt, 2)} díjköteles egység (W/M)` : '') : (sea.n ? `${sea.n} × ${seaC.name}` : ''), usd: sea.cost },
    { key: 'rail', name: rail.mode === 'lcl' ? 'Vasúti fuvar · gyűjtő (LCL)' : 'Vasúti fuvar · teljes konténer', t: D.transit.rail?.text, basis: rail.mode === 'lcl' ? (rail.chgM3 != null ? `${nf(rail.chgM3, 2)} m³ díjköteles térfogat` : '') : (rail.n ? `${rail.n} × ${railC.name}` : ''), usd: rail.cost },
  ].filter(r => DOC.modes[r.key]).map(r => ({ ...r, price: docPrice(r.usd) }));
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
  const wall = S.mode === 'wall' && val(S.wallW) && val(S.wallH) ? ` · ${nf(S.wallW, 2)} × ${nf(S.wallH, 2)} m fal` : '';
  const grid = el('div', 'doc-grid');
  const cell = (t, v, s) => { const c = el('div'); c.append(el('span', '', t), el('b', '', v)); if (s) c.append(el('small', '', s)); grid.append(c); };
  cell('LED-fal', qty != null ? `${qty} db kabinet` : '–', `${cab.brand === 'Saját' ? 'egyedi kabinet' : cab.brand + ' ' + cab.name}${wall}`);
  cell('Bruttó tömeg', res.gross != null ? `${nf(Math.ceil(res.gross), 0)} kg` : '–', 'csomagolással együtt');
  cell('Térfogat', res.volume != null ? `${nf(res.volume, 2)} m³` : '–', 'csomagok külső mérete');
  cell('Csomagok', res.count != null ? `${res.count} db` : '–', res.caseCount != null ? `ebből ${res.caseCount} LED-láda` : '');
  d.append(grid);

  // Fuvarmódok
  d.append(el('h2', '', 'Becsült fuvarköltség'));
  const tb = el('table', 'doc-tbl');
  const th = el('thead'); const thr = el('tr'); ['Fuvarmód', 'Menetidő', 'Elszámolási alap', 'Becsült díj (nettó)'].forEach(t => thr.append(el('th', '', t))); th.append(thr); tb.append(th);
  const tbody = el('tbody');
  for (const r of rows) {
    const tr = el('tr', r.price !== null && r.price === best ? 'best' : '');
    const n = el('td'); n.append(el('b', '', r.name)); if (r.price !== null && r.price === best) n.append(el('em', '', 'Legkedvezőbb'));
    tr.append(n, el('td', '', r.t || '–'), el('td', '', r.basis || '–'), el('td', 'num', r.price === null ? 'nem számolható' : docMoney(r.price)));
    tbody.append(tr);
  }
  if (!rows.length) { const tr = el('tr'); const td = el('td', '', 'Nincs kiválasztott fuvarmód.'); td.colSpan = 4; tr.append(td); tbody.append(tr); }
  tb.append(tbody); d.append(tb);

  // Feltételek
  const info = el('div', 'doc-info');
  const ul = el('ul');
  ul.append(el('li', '', 'Útvonal: Kína → Európa. A menetidő a tényleges indulástól számít, a gyártási és vámkezelési idő ezen felül értendő.'));
  if (DOC.excl.trim()) ul.append(el('li', '', `Az ár nem tartalmazza: ${DOC.excl.trim()}.`));
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
  const rd = $('docRound'); rd.checked = !!DOC.round; rd.addEventListener('change', () => { DOC.round = rd.checked; docSave(); });
  for (const m of ['air', 'sea', 'rail']) { const c = $('docM-' + m); c.checked = DOC.modes[m] !== false; c.addEventListener('change', () => { DOC.modes[m] = c.checked; docSave(); }); }
  $('docPreview').addEventListener('click', () => openDoc(false));
  $('docPrint').addEventListener('click', () => openDoc(true));
  $('docPrint2').addEventListener('click', () => window.print());
  $('docClose').addEventListener('click', closeDoc);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('docWrap').hidden) closeDoc(); });
  let oldTitle = null;
  window.addEventListener('beforeprint', () => { renderDoc(); oldTitle = document.title; document.title = ['Fuvarköltség-becslés', DOC.client, DOC.ref].filter(Boolean).join(' – ').replace(/[\\/:*?"<>|]/g, '-'); });
  window.addEventListener('afterprint', () => { if (oldTitle) document.title = oldTitle; });
  window.__doc = { build: buildDoc, state: () => DOC, price: docPrice };
})();
