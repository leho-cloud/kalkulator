// Beillesztett / feltöltött adatok értelmezése: csomaglista, LED-kabinet, szállítmányozói ajánlat
const IN_STORE = STORE + '.intake';
let INTAKE = (() => { try { return JSON.parse(localStorage.getItem(IN_STORE) || 'null') || { text: '', man: {}, units: {}, basis: {} }; } catch (e) { return { text: '', man: {}, units: {}, basis: {} }; } })();
INTAKE.man ||= {}; INTAKE.units ||= {}; INTAKE.basis ||= {};
const inSave = () => { try { localStorage.setItem(IN_STORE, JSON.stringify({ text: INTAKE.text, man: INTAKE.man, units: INTAKE.units, basis: INTAKE.basis })); } catch (e) { /* */ } };

// ---- Fájlok: txt/csv/eml, xlsx, docx (ZIP + XML, külső könyvtár nélkül) ----
async function unzip(buf, want) {
  const dv = new DataView(buf); const out = {};
  let e = buf.byteLength - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('nem ZIP');
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
  const dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nl));
    if (want(name)) {
      const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const raw = new Uint8Array(buf, ds, csize);
      out[name] = method === 0 ? dec.decode(raw) : await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    p += 46 + nl + xl + cl;
  }
  return out;
}
const xml = s => new DOMParser().parseFromString(s, 'application/xml');
const colIdx = r => { let n = 0; for (const ch of r.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
async function xlsxText(buf) {
  const f = await unzip(buf, n => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const ss = f['xl/sharedStrings.xml'] ? [...xml(f['xl/sharedStrings.xml']).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const sheets = Object.keys(f).filter(k => k.includes('worksheets')).sort();
  const lines = [];
  for (const sh of sheets) {
    for (const row of xml(f[sh]).getElementsByTagName('row')) {
      const cells = [];
      for (const c of row.getElementsByTagName('c')) {
        const t = c.getAttribute('t'); const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        const txt = t === 's' ? (ss[+v] ?? '') : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : v;
        cells[colIdx(c.getAttribute('r') || 'A')] = txt;
      }
      if (cells.some(x => x)) lines.push(Array.from(cells, x => x ?? '').join('\t'));
    }
  }
  return lines.join('\n');
}
async function docxText(buf) {
  const f = await unzip(buf, n => n === 'word/document.xml'); const doc = xml(f['word/document.xml'] || '<a/>');
  const lines = [];
  for (const p of doc.getElementsByTagName('w:p')) {
    if (p.parentNode?.nodeName === 'w:tc') continue;
    lines.push([...p.getElementsByTagName('w:t')].map(t => t.textContent).join(''));
  }
  for (const tr of doc.getElementsByTagName('w:tr')) lines.push([...tr.getElementsByTagName('w:tc')].map(tc => [...tc.getElementsByTagName('w:t')].map(t => t.textContent).join('')).join('\t'));
  return lines.filter(Boolean).join('\n');
}
async function readFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return xlsxText(await file.arrayBuffer());
  if (name.endsWith('.docx')) return docxText(await file.arrayBuffer());
  if (name.endsWith('.pdf') || name.endsWith('.xls') || name.endsWith('.doc')) throw new Error('Ezt a formátumot a böngésző nem tudja olvasni. Nyisd meg a fájlt, jelöld ki a szöveget, és illeszd be a mezőbe (vagy mentsd .xlsx / .docx formátumban).');
  return file.text();
}

// ---- Értelmezés ----
const num = s => parseNum(String(s));
const DIM3 = /(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\b/;
const KG = /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:kgs?|kg\.)(?![a-z])/gi;
const CBM = /(\d+(?:[.,]\d+)?)\s*(?:cbm|m3|m³)(?![a-z])/i;
const QTY = /(\d+)\s*(?:db|pcs?|ctns?|cartons?|cases?|láda|ládák|ládában|pkgs?|packages?|plts?|pallets?|raklap|raklapok|colli|box(?:es)?|doboz|flight\s*case|rack)\b/i;
const PER = /(each|@|\/\s*(?:db|pcs?|ctn|láda|raklap)|per\s*(?:pc|piece|ctn|carton|case)|darabonként|egyenként|ládánként)/i;
const TOT = /(total|összesen|össz\.|totál|grand|summary|sum\b)/i;
const toM = (a, u) => { const mx = Math.max(...a); const unit = u || (mx <= 3.5 ? 'm' : mx > 400 ? 'mm' : 'cm'); const f = unit === 'm' ? 1 : unit === 'cm' ? 0.01 : 0.001; return a.map(x => x * f); };
const CAB_STOP = /^(black|pearl|carbon|pro|fix|kültéri|beltéri|saját|led|kabinet|vagy|modul|touring|mkii)$/i;
const cabTokens = c => c.name.split(/[\s·×,]+/).filter(w => w.length >= 3 && !CAB_STOP.test(w) && !/^\d+$/.test(w) && !/^P\d/i.test(w));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findCabinet(line) {
  let best = null, score = 0;
  for (const c of D.cabinets) {
    if (c.id === 'custom') continue;
    const s = cabTokens(c).filter(t => new RegExp('(^|[^a-z0-9])' + esc(t) + '($|[^a-z0-9])', 'i').test(line)).length;
    if (s > score) { score = s; best = c; }
  }
  return best;
}

function parseTable(lines) {
  // fejlécsor keresése (tabulátor vagy pontosvessző)
  const split = l => l.split(/\t|;/).map(s => s.trim());
  for (let h = 0; h < Math.min(lines.length, 15); h++) {
    const hc = split(lines[h]).map(s => s.toLowerCase()); if (hc.length < 3) continue;
    const find = re => hc.findIndex(c => re.test(c));
    const iQ = hc.findIndex(c => /^(qty|quantity|db|darab|pcs|ctns|cartons?|pkgs?|packages?|mennyiség|colli|láda)/.test(c) && !/(no\.?(\s|$)|#|szám)/.test(c));
    const iL = find(/^(l|length|hossz)\b/), iW = find(/^(w|width|szél)/), iH = find(/^(h|height|mag)/);
    const iD = find(/(dim|méret|size|meas(?!.*cbm))/);
    const iG = hc.findIndex(c => /(g\.?\s?w|gross|brutt)/.test(c)) >= 0 ? hc.findIndex(c => /(g\.?\s?w|gross|brutt)/.test(c)) : find(/(weight|tömeg|súly|kg)/);
    const iC = find(/(cbm|m3|m³|volume|térfogat)/);
    if ([iQ, iL, iD, iG, iC].filter(i => i >= 0).length < 2) continue;
    const unitH = /\(mm\)|mm/.test(hc.join(' ')) ? 'mm' : /\(cm\)|cm/.test(hc.join(' ')) ? 'cm' : null;
    const gEach = iG >= 0 && /(each|@|per|\/)/.test(hc[iG]);
    const rows = [];
    for (const l of lines.slice(h + 1)) {
      const c = split(l); if (c.every(x => !x)) continue;
      const isTot = TOT.test(l);
      const n = iQ >= 0 ? num(c[iQ]) : null;
      let dims = null;
      if (iL >= 0 && iW >= 0 && iH >= 0) { const a = [num(c[iL]), num(c[iW]), num(c[iH])]; if (a.every(x => x > 0)) dims = toM(a, unitH); }
      else if (iD >= 0) { const m = String(c[iD] || '').match(DIM3); if (m) dims = toM([num(m[1]), num(m[2]), num(m[3])], m[4] || unitH); }
      const kg = iG >= 0 ? num(c[iG]) : null, cbm = iC >= 0 ? num(c[iC]) : null;
      if (!(kg > 0) && !(cbm > 0) && !dims) continue;
      rows.push({ line: l.replace(/\t/g, ' · '), n: n > 0 ? n : 1, dims, kg: kg > 0 ? kg : null, cbm: cbm > 0 ? cbm : null, kgEach: gEach, cbmEach: false, total: isTot });
    }
    if (rows.length) return { rows, headerAt: h };
  }
  return null;
}

function parseText(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out = { pkgs: [], totals: null, cabs: [], quotes: [] };
  const tab = parseTable(lines);
  const skip = new Set();
  if (tab) {
    for (const r of tab.rows) { if (r.total) out.totals = { gross: r.kg, volume: r.cbm, count: r.n > 1 ? r.n : null, line: r.line }; else out.pkgs.push(r); }
    lines.slice(tab.headerAt).forEach((_, i) => skip.add(tab.headerAt + i));
  }
  lines.forEach((l, i) => {
    if (skip.has(i)) return;
    const cab = findCabinet(l);
    if (cab) {
      const w = l.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*m(?![m²2a-z])/i);
      const q = l.match(/(\d+)\s*(?:db|pcs?|darab|kabinet|cabinet|panel|modul|tile)\b/i) || l.match(/(?:^|\s)[x×]\s*(\d+)\b/i);
      out.cabs.push({ line: l, cab, qty: q ? +q[1] : null, wall: w && !DIM3.test(l) ? [num(w[1]), num(w[2])] : null });
      return;
    }
    if (/\b(usd|eur|huf|ft)\b|[$€]/i.test(l)) return; // díjsor → ajánlatértelmező
    const kgs = [...l.matchAll(KG)].map(m => num(m[1])).filter(x => x > 0);
    const cbmM = l.match(CBM), dimM = l.match(DIM3), qM = l.match(QTY) || l.match(/^\s*(\d+)\s*[x×]\s+(?!\d)/);
    const kg = kgs.length ? Math.max(...kgs) : null, cbm = cbmM ? num(cbmM[1]) : null;
    if (TOT.test(l) && (kg || cbm)) { out.totals = { gross: kg, volume: cbm, count: qM ? +qM[1] : null, line: l }; return; }
    if (!dimM && !cbm && !kg) return;
    const n = qM ? +qM[1] : 1;
    const per = PER.test(l);
    out.pkgs.push({ line: l, n, dims: dimM ? toM([num(dimM[1]), num(dimM[2]), num(dimM[3])], dimM[4]) : null, kg, cbm, kgEach: per || (!!dimM && n > 1 && !/össz|total/i.test(l)), cbmEach: per, total: false });
  });
  out.quotes = analyze(text).map((r, i) => ({ ...r, i })).filter(r => r.type === 'freight' || r.type === 'fee' || r.type === 'excluded');
  return out;
}

function intakeTotals(p) {
  let gross = 0, vol = 0, count = 0, gOk = true, vOk = true;
  p.pkgs.forEach((r, i) => {
    const each = INTAKE.basis[i] ?? r.kgEach;
    if (r.kg != null) gross += each ? r.kg * r.n : r.kg; else gOk = false;
    const v = r.cbm != null ? (r.cbmEach ? r.cbm * r.n : r.cbm) : r.dims ? r.dims[0] * r.dims[1] * r.dims[2] * r.n : null;
    if (v != null) vol += v; else vOk = false;
    count += r.n;
  });
  const calc = { gross: p.pkgs.length && gOk ? gross : null, volume: p.pkgs.length && vOk ? vol : null, count: p.pkgs.length ? count : null };
  const t = p.totals || {};
  const pick = (k) => INTAKE.man[k] != null && INTAKE.man[k] !== '' ? Number(INTAKE.man[k]) : (t[k] ?? calc[k]);
  return { calc, totals: p.totals, gross: pick('gross'), volume: pick('volume'), count: pick('count') };
}

const MODE_NAME = { rail: 'Vasúti fuvar', sea: 'Tengeri fuvar', air: 'Légi fuvar', other: 'Fuvar' };
function modeOf(r) {
  const t = (r.ctx + ' ' + r.line).toLowerCase();
  if (/vasút|rail|train|vonat|xi.?an|chengdu|chongqing|malaszewicze/.test(t)) return 'rail';
  if (/tenger|sea|ocean|hajó|fob|cfr|cif|koper|hamburg|rotterdam|port/.test(t)) return 'sea';
  if (/légi|air|repül|awb|flight/.test(t)) return 'air';
  return 'other';
}
const toUsd = (v, cur) => cur === 'USD' ? v : cur === 'EUR' ? v * D.fx.eurUsd : (v / D.fx.eurHuf) * D.fx.eurUsd;

// A kimutatás kontextusa beillesztett adatokból (ha van)
function intakeContext() {
  if (!INTAKE.parsed) return null;
  const p = INTAKE.parsed; const T = intakeTotals(p);
  const hasShip = T.gross != null || T.volume != null;
  const freight = p.quotes.filter(r => r.type === 'freight' && r.amt);
  if (!hasShip && !freight.length) return null;
  const k = window.__ledfuvar;
  const res = hasShip ? { gross: T.gross, volume: T.volume, count: T.count, caseCount: null, capacityWarning: false } : k.res;
  let rows;
  if (freight.length) {
    const fees = p.quotes.filter(r => r.type === 'fee' && r.amt);
    rows = freight.map(r => {
      const key = modeOf(r); const unit = INTAKE.units[r.i] || r.amt.unit || 'm3';
      const g = res.gross ?? 0, v = res.volume ?? 0;
      const q = unit === 'm3' ? Math.max(1, key === 'sea' ? Math.max(v, g / 1000) : Math.max(v, g / (S.railFactor || 333)))
        : unit === 'kg' ? Math.max(g, v * 1e6 / (S.airDiv || 6000)) : 1;
      const feeUsd = fees.reduce((s, f) => s + toUsd(f.amt.v, f.amt.cur) * (f.amt.unit === 'm3' ? q : 1), 0);
      const usd = (res.gross == null && res.volume == null && unit !== 'shpt') ? null : toUsd(r.amt.v, r.amt.cur) * q + feeUsd;
      const basis = unit === 'm3' ? `${nf(q, 2)} m³ díjköteles térfogat (W/M)` : unit === 'kg' ? `díjköteles tömeg ${nf(q, 1)} kg` : unit === 'cntr' ? '1 konténer' : 'teljes szállítmány';
      const dt = door()[key];
      return { key, name: MODE_NAME[key] + (/lcl|gyűjt|cfs/i.test(r.line + r.ctx) || unit === 'm3' ? ' · gyűjtő (LCL)' : '') + (r.via ? ` · via ${r.via}` : ''), t: dt?.total || '–', leg: dt && key !== 'air' ? 'ebből ' + (key === 'rail' ? 'vasút ' : 'hajóút ') + (dt.steps[2]?.[1] || '') : '', basis, usd, price: docPrice(usd) };
    });
  } else rows = modeRows(res);
  const calcRows = !freight.length;
  const ex = p.quotes.filter(r => r.type === 'excluded').map(r => r.line.replace(/^\+\s*/, '').trim());
  const desc = (INTAKE.man.desc || '').trim();
  return { res, rows, calcRows, extraExcl: ex, led: hasShip ? { label: T.count != null ? `${T.count} csomag` : 'Szállítmány', sub: desc || 'csomaglista alapján' } : null };
}

// ---- Felület ----
function renderIntake() {
  const box = $('inOut'); if (!box) return; box.replaceChildren();
  const p = INTAKE.parsed; if (!p) return;
  const T = intakeTotals(p);
  const nothing = !p.pkgs.length && !p.totals && !p.cabs.length && !p.quotes.length;
  if (nothing) { box.append(el('p', 'src warnc', 'Nem találtam méretet, tömeget, köbmétert, LED-kabinetet vagy fuvardíjat. Ellenőrizd a szöveget (pl. „4 láda 120×80×100 cm 85 kg”).')); return; }

  if (p.pkgs.length || p.totals) {
    box.append(el('h3', 'in-h', 'Felismert csomagok'));
    const tb = el('table', 'in-tbl'); const tr0 = el('tr'); ['Sor', 'db', 'Méret', 'Tömeg', 'm³'].forEach(t => tr0.append(el('th', '', t))); const th = el('thead'); th.append(tr0); tb.append(th);
    const tbody = el('tbody');
    p.pkgs.forEach((r, i) => {
      const tr = el('tr');
      tr.append(el('td', 'l', r.line), el('td', '', String(r.n)), el('td', '', r.dims ? r.dims.map(x => nf(x * 100, 0)).join('×') + ' cm' : '–'));
      const kt = el('td');
      if (r.kg != null) {
        const s = el('select'); s.append(new Option(`${nf(r.kg, 1)} kg / db`, 'e'), new Option(`${nf(r.kg, 1)} kg összesen`, 't'));
        s.value = (INTAKE.basis[i] ?? r.kgEach) ? 'e' : 't'; s.disabled = r.n <= 1;
        s.addEventListener('change', () => { INTAKE.basis[i] = s.value === 'e'; inSave(); renderIntake(); renderDocIfOpen(); });
        kt.append(s);
      } else kt.append('–');
      const v = r.cbm != null ? (r.cbmEach ? r.cbm * r.n : r.cbm) : r.dims ? r.dims[0] * r.dims[1] * r.dims[2] * r.n : null;
      tr.append(kt, el('td', '', v != null ? nf(v, 3) : '–'));
      tbody.append(tr);
    });
    tb.append(tbody); box.append(tb);
    if (p.totals) box.append(el('p', 'src', `Összesítő sor a szövegben: ${p.totals.line}`));
  }

  // Végösszegek (szerkeszthető)
  if (p.pkgs.length || p.totals) {
    const g = el('div', 'grid g4 in-sum');
    const fld = (lbl, key, unit, v, step) => {
      const l = el('label', '', lbl); const u = el('span', 'unit'); const inp = el('input'); inp.type = 'number'; inp.min = '0'; inp.step = step; inp.inputMode = 'decimal';
      inp.value = v == null ? '' : String(+(+v).toFixed(3)); inp.placeholder = 'Hiányzó adat';
      inp.addEventListener('input', () => { INTAKE.man[key] = inp.value === '' ? null : inp.value; inSave(); renderDocIfOpen(); });
      u.append(inp, el('em', '', unit)); l.append(u); g.append(l);
    };
    fld('Bruttó tömeg', 'gross', 'kg', T.gross, '0.1'); fld('Térfogat', 'volume', 'm³', T.volume, '0.001'); fld('Csomagok', 'count', 'db', T.count, '1');
    const dl = el('label', '', 'Leírás a kimutatásra'); const di = el('input'); di.type = 'text'; di.placeholder = 'pl. P3.9 LED-fal, 24 kabinet, 3 flight case'; di.value = INTAKE.man.desc || '';
    di.addEventListener('input', () => { INTAKE.man.desc = di.value; inSave(); renderDocIfOpen(); }); dl.append(di); g.append(dl);
    box.append(g);
    const miss = []; if (T.gross == null) miss.push('tömeg'); if (T.volume == null) miss.push('térfogat');
    box.append(el('p', 'src' + (miss.length ? ' warnc' : ''), miss.length ? `Hiányzik: ${miss.join(', ')}. Írd be kézzel a fenti mezőbe.` : 'A végösszegeket átírhatod; a kimutatás ezekkel számol.'));
  }

  if (p.cabs.length) {
    box.append(el('h3', 'in-h', 'Felismert LED-kabinet'));
    p.cabs.forEach(c => {
      const row = el('div', 'in-cab');
      row.append(el('span', '', `${c.cab.brand} ${c.cab.name}` + (c.wall ? ` · ${nf(c.wall[0], 2)} × ${nf(c.wall[1], 2)} m fal` : c.qty ? ` · ${c.qty} db` : ' · darabszám nélkül')));
      const b = el('button', 'chip', 'Betöltés a kalkulátorba'); b.type = 'button';
      b.addEventListener('click', () => {
        S.cabId = c.cab.id; applyCabinet(true);
        if (c.wall) { S.mode = 'wall'; S.wallW = c.wall[0]; S.wallH = c.wall[1]; } else if (c.qty) { S.mode = 'qty'; S.qty = c.qty; }
        syncInputs(); update(); $('s-fal').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      row.append(b); box.append(row);
    });
    box.append(el('p', 'src', 'A láda- és csomagadatokat a kalkulátor 1–3. lépésében ellenőrizd; a kimutatás ezután a kalkulátor adataival is elkészíthető.'));
  }

  const fr = p.quotes.filter(r => r.type === 'freight');
  if (fr.length || p.quotes.length) {
    box.append(el('h3', 'in-h', 'Felismert fuvardíjak (a kimutatás ezekkel számol)'));
    const ul = el('ul', 'in-q');
    for (const r of p.quotes) {
      const li = el('li', 'q-' + r.type); li.append(el('code', '', r.line));
      if (r.type === 'freight') {
        const s = el('select'); [['m3', 'm³-enként (W/M)'], ['shpt', 'teljes szállítmányra'], ['kg', 'kg-onként (légi)'], ['cntr', 'konténerenként']].forEach(([v, t]) => s.append(new Option(t, v)));
        s.value = INTAKE.units[r.i] || r.amt?.unit || 'm3';
        s.addEventListener('change', () => { INTAKE.units[r.i] = s.value; inSave(); renderDocIfOpen(); });
        li.append(el('span', 'tagm', MODE_NAME[modeOf(r)]), s);
        if (!r.amt?.unit) li.append(el('small', 'warnc', 'Az ajánlat nem írja az egységet – ellenőrizd.'));
      } else li.append(el('span', 'tagm', r.type === 'fee' ? 'járulékos díj · szállítmányonként' : 'nincs benne az árban'));
      ul.append(li);
    }
    box.append(ul);
  }
  const use = el('label', 'chk'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = DOC.useIntake !== false;
  cb.addEventListener('change', () => { DOC.useIntake = cb.checked; docSave(); renderDocIfOpen(); });
  use.append(cb, ' A kimutatás és az ajánlatszöveg a beillesztett adatokból készüljön'); box.append(use);
}
function renderDocIfOpen() { if ($('docWrap') && !$('docWrap').hidden) renderDoc(); }

async function doParse() {
  INTAKE.text = $('inText').value; INTAKE.man = {}; INTAKE.units = {}; INTAKE.basis = {};
  INTAKE.parsed = INTAKE.text.trim() ? parseText(INTAKE.text) : null; DOC.useIntake = true; docSave(); inSave(); renderIntake();
}
(function initIntake() {
  const t = $('inText'); if (!t) return;
  t.value = INTAKE.text || '';
  if (INTAKE.text) { const keep = { man: INTAKE.man, units: INTAKE.units, basis: INTAKE.basis }; INTAKE.parsed = parseText(INTAKE.text); Object.assign(INTAKE, keep); }
  const DEFMSG = $('inFileMsg').textContent;
  $('inParse').addEventListener('click', () => { $('inFileMsg').textContent = DEFMSG; $('inFileMsg').className = 'src'; doParse(); });
  $('inClear').addEventListener('click', () => { t.value = ''; doParse(); });
  $('inFile').addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const msg = $('inFileMsg'); msg.textContent = 'Beolvasás…'; msg.className = 'src';
    try { t.value = await readFile(f); msg.textContent = `Beolvasva: ${f.name}`; await doParse(); }
    catch (err) { msg.textContent = err.message || 'A fájlt nem sikerült beolvasni.'; msg.className = 'src warnc'; }
    e.target.value = '';
  });
  renderIntake();
  window.__intake = { parseText, ctx: intakeContext, totals: () => INTAKE.parsed && intakeTotals(INTAKE.parsed), xlsxText, docxText };
})();
