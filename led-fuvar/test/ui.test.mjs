import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('/opt/node22/lib/node_modules/');
const {chromium}=require('playwright');
const url='file://'+new URL('../index.html',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];
for (const [name,vp] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:name==='mobile',hasTouch:name==='mobile'});
  const p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(name+': '+e.message)); p.on('console',m=>m.type()==='error'&&!/Failed to load resource|net::/.test(m.text())&&errors.push(name+': '+m.text()));
  await p.goto(url); await p.waitForTimeout(700);
  let k=await p.evaluate(()=>window.__ledfuvar);
  // Alap: 24 × ADJ VS3IP, gyári 8-as láda
  assert.equal(k.res.caseCount,3); assert.ok(Math.abs(k.res.gross-373.5)<1e-9);
  assert.ok(Math.abs(k.air.chg-373.5)<1e-9); assert.ok(Math.abs(k.sea.rt-1.72)<1e-9); assert.ok(Math.abs(k.rail.chgM3-1.72)<1e-9);
  await p.click('[data-sea=fcl]'); await p.click('[data-rail=fcl]'); k=await p.evaluate(()=>window.__ledfuvar);
  assert.equal(k.sea.n,1); assert.equal(k.rail.n,1); assert.ok((await p.textContent('#seaRateSrc')).includes('Drewry'));
  // Falméret mód: 6 × 3 m → 11 × 6 = 66 kabinet (576 mm)
  await p.click('#byWall'); k=await p.evaluate(()=>window.__ledfuvar);
  assert.equal(k.qty,11*6);
  assert.ok((await p.textContent('#wallInfo')).includes('11 × 6 = 66'));
  // Tartozék: 3 m truss ×4
  await p.click('#itemChips .chip >> nth=0');
  await p.fill('#items .row input[type=number] >> nth=0','4');
  k=await p.evaluate(()=>window.__ledfuvar);
  assert.ok(Math.abs(k.res.accNet-4*18.9)<1e-9);
  // Raklap hozzáadása, magasság 120 cm
  await p.click('#packChips .chip >> nth=0');
  await p.fill('#packs .dims input >> nth=2','120');
  k=await p.evaluate(()=>window.__ledfuvar);
  assert.equal(k.res.count,9+1);
  // Kapacitás-figyelmeztetés
  await p.fill('#caseCount','2'); k=await p.evaluate(()=>window.__ledfuvar);
  assert.ok(k.res.capacityWarning); assert.equal(k.air.cost,null);
  assert.ok(await p.isVisible('#warn'));
  await p.fill('#caseCount','');
  // Hiányzó adat: Absen 500×1000 – láda tömege/mérete nincs
  await p.selectOption('#cab','absen-pl39v3-1000'); k=await p.evaluate(()=>window.__ledfuvar);
  assert.equal(k.res.gross,null);
  assert.ok(await p.$eval('#caseTare',e=>e.classList.contains('missing')));
  assert.ok(await p.$eval('#caseL',e=>e.classList.contains('missing')));
  // Saját ládaadatokkal kiszámolható
  await p.fill('#caseTare','45'); await p.fill('#caseL','110'); await p.fill('#caseWd','62'); await p.fill('#caseHt','80');
  k=await p.evaluate(()=>window.__ledfuvar); assert.ok(k.res.gross>0);
  // Tengeri LCL, vasúti LCL átkapcsolás
  await p.click('[data-sea=lcl]'); await p.click('[data-rail=lcl]');
  k=await p.evaluate(()=>window.__ledfuvar); assert.ok(k.sea.rt>0 && k.rail.chgM3>0);
  // Pénznem: HUF megjelenítés
  await p.click('[data-cur=HUF]'); assert.ok((await p.textContent('#airTotal')).includes('Ft'));
  // Légi díj felülírása HUF-ban → USD-ben tárolva
  await p.fill('[data-money=airRate]','2000'); k=await p.evaluate(()=>window.__ledfuvar);
  const fx=await p.evaluate(()=>({u:1.1127,h:365.08}));
  assert.ok(Math.abs(k.air.cost - k.air.chg*2000/fx.h*fx.u)<1e-6);
  const over=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth); assert.ok(over<=0,'túlcsordulás '+over);
  await ctx.close();
}
await b.close();
assert.deepEqual(errors,[]);
console.log('ui.test: alapeset, falméret, tartozék, raklap, kapacitás, hiányzó adat, LCL/FCL, pénznem – asztali és mobil rendben.');
