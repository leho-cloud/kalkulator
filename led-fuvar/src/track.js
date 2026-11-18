// Vasúti szállítmány követése: vázlatos útvonaltérkép, kézi állomásfrissítés, becsült érkezés
const TR_STORE = STORE + '.track';
const ROUTE = [
  { id: 'xian', n: "Xi'an (Csangan csomópont)", c: 'Kína', lat: 34.27, lon: 108.94, note: 'Indulás, kínai exportvám' },
  { id: 'lanzhou', n: 'Lancsou', c: 'Kína', lat: 36.06, lon: 103.83 },
  { id: 'urumqi', n: 'Ürümcsi', c: 'Kína', lat: 43.83, lon: 87.62 },
  { id: 'alashankou', n: 'Alasankou / Horgosz', c: 'Kína–Kazahsztán határ', lat: 45.17, lon: 82.57, note: 'Nyomtávváltás (1435 → 1520 mm), határ', border: true },
  { id: 'astana', n: 'Asztana', c: 'Kazahsztán', lat: 51.17, lon: 71.43 },
  { id: 'yekaterinburg', n: 'Jekatyerinburg', c: 'Oroszország', lat: 56.84, lon: 60.6 },
  { id: 'moscow', n: 'Moszkva térsége', c: 'Oroszország', lat: 55.75, lon: 37.62 },
  { id: 'brest', n: 'Breszt', c: 'Belarusz', lat: 52.1, lon: 23.7, note: 'Kilépés az EAEU-ból', border: true },
  { id: 'malaszewicze', n: 'Małaszewicze', c: 'Lengyelország', lat: 52.03, lon: 23.4, note: 'EU-belépés, nyomtávváltás (1520 → 1435 mm), torlódási pont', border: true, risk: true },
  { id: 'warsaw', n: 'Varsó térsége', c: 'Lengyelország', lat: 52.23, lon: 21.01 },
  { id: 'katowice', n: 'Katowice', c: 'Lengyelország', lat: 50.26, lon: 19.02 },
  { id: 'zilina', n: 'Zsolna', c: 'Szlovákia', lat: 49.22, lon: 18.74 },
  { id: 'budapest', n: 'Budapest (BILK / CFS)', c: 'Magyarország', lat: 47.43, lon: 19.15, note: 'Érkezés, vámkezelés, kiszállítás' },
];
const LABELS = [['KÍNA', 38.5, 95], ['KAZAHSZTÁN', 48.5, 66], ['OROSZORSZÁG', 60, 48], ['BELARUSZ', 55, 30], ['LENGYELORSZÁG', 54.2, 16], ['SZLOVÁKIA', 48.3, 24.5], ['MAGYARORSZÁG', 45, 17], ['MONGÓLIA', 47, 103], ['ÜZBEGISZTÁN', 40.5, 63]];
const hav = (a, b) => { const R = 6371, r = x => x * Math.PI / 180; const d = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(d)); };
const CUM = ROUTE.reduce((acc, p, i) => (acc.push(i ? acc[i - 1] + hav(ROUTE[i - 1], p) : 0), acc), []);
const TOTAL_KM = CUM.at(-1);
// Tipikus menetidő-arányok (nap a 19,5 napos középértékhez): a határoknál és nyomtávváltásnál több idő megy el
const TD = [0, 1, 3, 5, 7, 9, 11, 13, 15.5, 16.5, 17.5, 18.5, 19.5], TT = TD.at(-1);
const distAtTime = t => { const i = TD.findIndex(d => d >= t); if (i <= 0) return 0; const f = (t - TD[i - 1]) / (TD[i] - TD[i - 1]); return (CUM[i - 1] + (CUM[i] - CUM[i - 1]) * f) / TOTAL_KM; };
const TR_DEF = { dep: '', train: '', ref: '', last: '', lastDate: '', note: '' };
let TR = (() => { try { return { ...TR_DEF, ...JSON.parse(localStorage.getItem(TR_STORE) || '{}') }; } catch (e) { return { ...TR_DEF }; } })();
const trSave = () => { try { localStorage.setItem(TR_STORE, JSON.stringify(TR)); } catch (e) { /* */ } };
const legDays = () => { const s = (door().rail.steps[2]?.[1] || '15–24').match(/(\d+)\D+(\d+)/); return s ? [+s[1], +s[2]] : [15, 24]; };
const dayMs = 864e5;
const fmtD = d => d.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' });

function trackState() {
  const [mn, mx] = legDays();
  const dep = TR.dep ? new Date(TR.dep + 'T12:00:00') : null;
  const now = new Date();
  let idx = ROUTE.findIndex(p => p.id === TR.last), frac = null, est = false, at = null, tf = null;
  if (idx >= 0) { frac = CUM[idx] / TOTAL_KM; tf = TD[idx] / TT; at = TR.lastDate ? new Date(TR.lastDate + 'T12:00:00') : now; }
  else if (dep) { const el = Math.max(0, (now - dep) / dayMs); tf = Math.min(1, el / ((mn + mx) / 2)); frac = distAtTime(tf * TT); est = true; at = now; }
  let eta = null;
  if (tf !== null && at) {
    const rem = 1 - tf;
    eta = rem <= 0 ? [at, at] : [new Date(at.getTime() + rem * mn * dayMs), new Date(at.getTime() + rem * mx * dayMs)];
  } else if (dep) eta = [new Date(dep.getTime() + mn * dayMs), new Date(dep.getTime() + mx * dayMs)];
  if (eta && eta[0] < now && idx !== ROUTE.length - 1) eta = [now, eta[1] < now ? now : eta[1]];
  return { dep, idx, frac, est, eta, elapsed: dep ? Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(dep.getFullYear(), dep.getMonth(), dep.getDate())) / dayMs) : null, mn, mx };
}

// Egyenközű vetület a térkép kivágatára
const MAP = { w: 760, h: 380, lat0: 30, lat1: 62 };
// Szakaszonként lineáris hosszúság-skála: Európa széthúzva, Ázsia sűrítve, hogy a határállomások olvashatók legyenek
const KN = [[9, 0], [28, 320], [42, 420], [75, 580], [114, 760]];
const lonX = lon => { for (let i = 1; i < KN.length; i++) if (lon <= KN[i][0] || i === KN.length - 1) { const [a, x0] = KN[i - 1], [b, x1] = KN[i]; return x0 + (lon - a) / (b - a) * (x1 - x0); } };
const px = p => [lonX(p.lon), ((MAP.lat1 - p.lat) / (MAP.lat1 - MAP.lat0)) * MAP.h];
function posAt(frac) {
  const km = frac * TOTAL_KM; let i = CUM.findIndex(c => c >= km); if (i <= 0) return px(ROUTE[Math.max(0, i)]);
  const t = (km - CUM[i - 1]) / (CUM[i] - CUM[i - 1] || 1); const a = px(ROUTE[i - 1]), b = px(ROUTE[i]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v); if (text !== undefined) n.textContent = text; return n; };

function renderMap(st) {
  const svg = sv('svg', { viewBox: `0 0 ${MAP.w} ${MAP.h}`, class: 'tr-map', role: 'img', 'aria-label': "Xi'an–Budapest vasúti útvonal vázlatos térképe" });
  const g = sv('g', { class: 'grid' });
  for (const lon of [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110]) { const x = lonX(lon); g.append(sv('line', { x1: x, y1: 0, x2: x, y2: MAP.h })); }
  for (let lat = 35; lat <= 60; lat += 5) { const y = px({ lon: 0, lat })[1]; g.append(sv('line', { x1: 0, y1: y, x2: MAP.w, y2: y })); }
  svg.append(g);
  for (const [t, lat, lon] of LABELS) { const [x, y] = px({ lat, lon }); svg.append(sv('text', { x, y, class: 'cty', 'text-anchor': 'middle' }, t)); }
  const pts = ROUTE.map(px);
  svg.append(sv('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'route' }));
  if (st.frac !== null) {
    const done = [pts[0]]; const km = st.frac * TOTAL_KM;
    for (let i = 1; i < ROUTE.length && CUM[i] <= km; i++) done.push(pts[i]);
    done.push(posAt(st.frac));
    svg.append(sv('polyline', { points: done.map(p => p.join(',')).join(' '), class: 'route done' }));
  }
  ROUTE.forEach((p, i) => {
    const [x, y] = pts[i]; const passed = st.frac !== null && CUM[i] / TOTAL_KM <= st.frac + 1e-9;
    const c = sv('circle', { cx: x, cy: y, r: p.border ? 6 : 4, class: 'stn' + (passed ? ' passed' : '') + (p.risk ? ' risk' : '') + (i === st.idx ? ' cur' : '') });
    c.append(sv('title', {}, `${p.n} · ${p.c}${p.note ? ' – ' + p.note : ''}`)); svg.append(c);
    const LP = { xian: [-10, 16, 'end'], alashankou: [10, -8, 'start'], brest: [10, -9, 'start'], malaszewicze: [-10, 16, 'end'], budapest: [10, 5, 'start'], moscow: [0, -12, 'middle'] };
    const lp = LP[p.id];
    if (lp) svg.append(sv('text', { x: x + lp[0], y: y + lp[1], class: 'stn-l', 'text-anchor': lp[2] }, p.n.split(' (')[0].split(' / ')[0].replace(' térsége', '')));
  });
  if (st.frac !== null) {
    const [x, y] = posAt(st.frac);
    const m = sv('g', { class: 'train' + (st.est ? ' est' : ''), transform: `translate(${x},${y})` });
    m.append(sv('circle', { r: 13, class: 'halo' }), sv('circle', { r: 7, class: 'dot' }));
    m.append(sv('title', {}, st.est ? 'Becsült helyzet az indulás óta eltelt idő alapján' : 'Utolsó jelentett állomás'));
    svg.append(m);
  }
  return svg;
}

function renderTrack() {
  const host = $('trMap'); if (!host) return;
  const st = trackState();
  host.replaceChildren(renderMap(st));
  const k = $('trKpi'); k.replaceChildren();
  const kp = (t, v, s, cls) => { const d = el('div', 'kpi' + (cls ? ' ' + cls : '')); d.append(el('dt', '', t)); const dd = el('dd', 'num', v); if (s) dd.append(el('span', 'sub', s)); d.append(dd); k.append(d); };
  const cur = st.idx >= 0 ? ROUTE[st.idx] : null;
  kp('Helyzet', cur ? cur.n.split(' (')[0] : st.est ? 'becsült' : '–', cur ? (TR.lastDate ? `jelentve: ${fmtD(new Date(TR.lastDate))}` : cur.c) : st.est ? 'az indulás óta eltelt idő alapján' : 'add meg az indulást vagy az állomást');
  kp('Megtett út', st.frac !== null ? `${nf(Math.round(st.frac * 100), 0)}%` : '–', `kb. ${nf(Math.round((st.frac ?? 0) * TOTAL_KM / 10) * 10, 0)} / ${nf(Math.round(TOTAL_KM / 10) * 10, 0)} km (légvonalban, vázlatos)`);
  kp('Úton', st.elapsed !== null ? `${st.elapsed} nap` : '–', st.dep ? `indulás: ${fmtD(st.dep)}` : '');
  kp('Becsült érkezés Budapestre', st.eta ? (st.idx === ROUTE.length - 1 ? 'megérkezett' : `${fmtD(st.eta[0])} – ${fmtD(st.eta[1])}`) : '–', st.eta && st.idx !== ROUTE.length - 1 ? `vasúti szakasz ${st.mn}–${st.mx} nap alapján; utána vám és kiszállítás` : '', 'big');
  const w = $('trWarn'); const nextRisk = ROUTE.findIndex((p, i) => p.risk && (st.frac === null || CUM[i] / TOTAL_KM > st.frac));
  w.textContent = nextRisk >= 0 ? `Előtte: ${ROUTE[nextRisk].n} – ${ROUTE[nextRisk].note}. ${door().rail.risk || ''}` : '';
  w.hidden = nextRisk < 0;
}

function trackText() {
  const st = trackState(); const L = [];
  L.push(`Szállítmány állapota${TR.ref ? ' – ' + TR.ref : ''}`);
  if (st.dep) L.push(`Indulás Xi'anból: ${fmtD(st.dep)} (${st.elapsed} napja).`);
  const cur = st.idx >= 0 ? ROUTE[st.idx] : null;
  if (cur) L.push(`Utolsó jelentett helyzet: ${cur.n}, ${cur.c}${TR.lastDate ? ' (' + fmtD(new Date(TR.lastDate)) + ')' : ''}.`);
  else if (st.est) L.push(`A vonat a menetidő alapján kb. az útvonal ${Math.round(st.frac * 100)}%-ánál járhat (becslés).`);
  if (st.eta && st.idx !== ROUTE.length - 1) L.push(`Várható érkezés Budapestre: ${fmtD(st.eta[0])} és ${fmtD(st.eta[1])} között, ezt követően vámkezelés és kiszállítás.`);
  if (st.idx === ROUTE.length - 1) L.push('A szállítmány megérkezett Budapestre, a vámkezelés és kiszállítás következik.');
  L.push('Határátlépésnél (különösen Breszt–Małaszewicze) néhány napos várakozás előfordulhat; változás esetén tájékoztatjuk.');
  if (TR.note.trim()) L.push(TR.note.trim());
  return L.join('\n');
}

(function initTrack() {
  if (!$('trMap')) return;
  const sel = $('trLast'); sel.append(new Option('– nincs jelentés –', ''));
  ROUTE.forEach(p => sel.append(new Option(`${p.n} · ${p.c}`, p.id)));
  const bind = (id, key, ev = 'input') => { const n = $(id); n.value = TR[key] || ''; n.addEventListener(ev, () => { TR[key] = n.value; trSave(); renderTrack(); }); };
  bind('trDep', 'dep', 'change'); bind('trLast', 'last', 'change'); bind('trLastDate', 'lastDate', 'change'); bind('trTrain', 'train'); bind('trRef', 'ref'); bind('trNote', 'note');
  $('trToday').addEventListener('click', () => { const d = new Date(); const s = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); $('trLastDate').value = s; TR.lastDate = s; trSave(); renderTrack(); });
  $('trText').addEventListener('click', async () => { const ta = $('trTextOut'); ta.value = trackText(); ta.hidden = false; try { await navigator.clipboard.writeText(ta.value); $('trText').textContent = 'Kimásolva ✓'; } catch (e) { ta.select(); } setTimeout(() => { $('trText').textContent = 'Állapotüzenet az ügyfélnek'; }, 2000); });
  renderTrack();
  setInterval(renderTrack, 60 * 60 * 1000);
  window.__track = { state: trackState, text: trackText, route: ROUTE, total: TOTAL_KM };
})();
