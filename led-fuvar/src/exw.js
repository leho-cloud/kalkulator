// EXW: becsült kínai helyi költségek (felvétel, gyűjtőraktár, exportvám, terminál, okmány)
const EXW_FALLBACK = __EXW__;
const EXW_STORE = STORE + '.exw';
let EXW = (() => { try { return JSON.parse(localStorage.getItem(EXW_STORE) || 'null') ?? { on: true }; } catch (e) { return { on: true }; } })();
const exwData = () => D.exwOrigin || EXW_FALLBACK;
const rng = (a, k = 1) => [a[0] * k, a[1] * k];

function exwCost(mode, kind, res, n) {
  const X = exwData(); const it = [];
  const m3 = Math.max(1, res?.volume ?? 0);
  if (mode === 'air') {
    it.push(['Felvétel a gyártól, reptérre szállítás', rng(X.air.pickup)], ['Exportvámkezelés', rng(X.air.customs)], ['Okmányok (légi fuvarlevél)', rng(X.air.docs)]);
  } else if (kind === 'fcl') {
    const c = Math.max(1, n || 1);
    it.push([`Konténerfuvar gyár → ${mode === 'rail' ? 'vasúti terminál' : 'kikötő'} (${c} db)`, rng(X.fcl.truck, c)], [`Terminálkezelés (THC, ${c} db)`, rng(X.fcl.thc, c)], ['Exportvámkezelés', rng(X.fcl.customs)], ['Okmányok', rng(X.fcl.docs)]);
  } else {
    const cfs = rng(X.lcl.cfsPerM3, m3).map(v => Math.max(v, X.lcl.cfsMin));
    it.push(['Felvétel a gyártól a gyűjtőraktárig', rng(X.lcl.pickup)], [`Gyűjtőraktári átvétel, kezelés (${nf(m3, 2)} m³)`, cfs], [`${mode === 'rail' ? 'Terminál-' : 'Kikötői '}kezelés (${nf(m3, 2)} m³)`, rng(X.lcl.thcPerM3, m3)], ['Exportvámkezelés', rng(X.lcl.customs)], ['Okmányok (B/L, nyilatkozat)', rng(X.lcl.docs)]);
  }
  const lo = it.reduce((s, x) => s + x[1][0], 0), hi = it.reduce((s, x) => s + x[1][1], 0);
  return { items: it, lo, hi, mid: (lo + hi) / 2 };
}
const exwOn = () => EXW.on !== false;

function renderExw() {
  const k = window.__ledfuvar; if (!k) return;
  const map = { air: { mode: 'air', kind: null, n: null, cost: k.air.cost }, sea: { mode: 'sea', kind: k.sea.mode, n: k.sea.n, cost: k.sea.cost }, rail: { mode: 'rail', kind: k.rail.mode, n: k.rail.n, cost: k.rail.cost } };
  for (const [key, m] of Object.entries(map)) {
    const box = $(key + 'Exw'); if (!box) continue; box.replaceChildren();
    if (!exwOn()) { box.append(el('p', 'src', 'FOB/FCA paritás: a kínai felvételt, exportvámot és helyi kezelést az eladó fizeti.')); continue; }
    const e = exwCost(m.mode, m.kind, k.res, m.n);
    const h = el('div', 'exw-h'); h.append(el('span', '', 'EXW: kínai helyi költségek (becslés)'), el('b', '', `${money(e.lo)} – ${money(e.hi)}`)); box.append(h);
    const ul = el('ul'); for (const [t, [a, b]] of e.items) { const li = el('li'); li.append(el('span', '', t), el('span', 'num', `${money(a)} – ${money(b)}`)); ul.append(li); } box.append(ul);
    if (m.cost != null) { const t = el('div', 'exw-t'); t.append(el('span', '', 'Fuvar + EXW összesen'), el('b', '', `${money(m.cost + e.lo)} – ${money(m.cost + e.hi)}`)); box.append(t); }
  }
  const note = $('exwNote'); if (note) note.textContent = exwOn() ? exwData().note : '';
  document.querySelectorAll('[data-exw]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.exw === 'exw') === exwOn())));
}
(function initExw() {
  document.querySelectorAll('[data-exw]').forEach(b => b.addEventListener('click', () => { EXW.on = b.dataset.exw === 'exw'; try { localStorage.setItem(EXW_STORE, JSON.stringify(EXW)); } catch (e) { /* */ } renderExw(); }));
  renderExw(); window.__exwRefresh = renderExw; window.__exw = { cost: exwCost, on: exwOn };
})();
