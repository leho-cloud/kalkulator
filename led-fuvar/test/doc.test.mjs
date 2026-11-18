import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('/opt/node22/lib/node_modules/');
const {chromium}=require('playwright');
const url='file://'+new URL('../dist/index.html',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];
for (const [name,vp] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:name==='mobile'});
  const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(name+': '+e.message));
  await p.goto(url); await p.waitForTimeout(600);
  await p.fill('#docClient','Minta Rendezvény Kft.'); await p.fill('#docRef','Ajánlat 2026/118 · P3.9 kültéri fal');
  await p.fill('#docMarkup','10'); await p.fill('#docContact','TZSVTBand Kft. · info@example.hu');
  const k=await p.evaluate(()=>({air:window.__ledfuvar.air.cost,fx:null}));
  const exp=await p.evaluate(u=>{const v=u/ (window.__doc&&1) ; return null;},k.air);
  await p.click('#docPreview'); await p.waitForTimeout(300);
  assert.ok(await p.isVisible('#docWrap'));
  const txt=await p.textContent('#docSheet');
  assert.ok(txt.includes('Minta Rendezvény Kft.')); assert.ok(/\d-ig/.test(txt)); assert.ok(txt.includes('Legkedvezőbb')); assert.ok(!/Drewry|Freightos|felár/i.test(txt),'nincs forrás/felár');
  // felár + kerekítés ellenőrzés
  const chk=await p.evaluate(()=>{const k=window.__ledfuvar;const f=window.__doc.price(k.air.cost);const raw=k.air.cost/ (1) ;return {f};});
  assert.ok(chk.f%1000===0);
  await p.screenshot({path:`/tmp/doc-${name}.png`}); if(name==='mobile'){await p.click('#docClose'); await p.locator('#s-ugyfel').screenshot({path:'/tmp/form-mobile.png'}); await p.click('#docPreview');}
  if(name==='desktop'){ await p.emulateMedia({media:'print'}); await p.pdf({path:'/tmp/fuvar-becsles.pdf',format:'A4',printBackground:true,preferCSSPageSize:true}); await p.emulateMedia({media:'screen'}); }
  await p.click('#docClose'); assert.ok(!(await p.isVisible('#docWrap')));
  // localStorage megmarad
  await p.reload(); await p.waitForTimeout(500); assert.equal(await p.inputValue('#docClient'),'Minta Rendezvény Kft.');
  await ctx.close();
}
await b.close();
assert.deepEqual(errors,[]);
console.log('doc.test: ügyfél-kimutatás, előnézet, PDF, mentés rendben (asztali, mobil).');
