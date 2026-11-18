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
const e=await p.evaluate(()=>{const k=window.__ledfuvar;return window.__exw.cost('sea','lcl',k.res,null)});
assert.ok(Math.abs(e.lo-269.4)<0.01 && Math.abs(e.hi-754)<0.02, JSON.stringify(e));
const f=await p.evaluate(()=>{const k=window.__ledfuvar;return window.__exw.cost('rail','fcl',k.res,2)});
assert.equal(f.lo,(50+120)*2+100+35); assert.equal(f.hi,(480+250)*2+300+75);
assert.ok((await p.textContent('#seaExw')).includes('Fuvar + EXW'));
// kimutatás tartalmazza
const d1=await p.evaluate(()=>window.__doc.ctx().rows.map(r=>r.usd));
await p.click('[data-exw=fob]'); assert.ok((await p.textContent('#seaExw')).includes('eladó fizeti'));
const d2=await p.evaluate(()=>window.__doc.ctx().rows.map(r=>r.usd));
assert.ok(d1[1]-d2[1]>500 && d1[1]-d2[1]<520, d1[1]-d2[1]);
await p.click('[data-exw=exw]');
await p.click('#docPreview'); assert.ok((await p.textContent('#docSheet')).includes('kínai felvétel')); await p.click('#docClose');
await p.locator('#sea').screenshot({path:`/tmp/exw-${name}.png`});
await p.reload(); await p.waitForTimeout(400); assert.equal(await p.getAttribute('[data-exw=exw]','aria-pressed'),'true');
await ctx.close();
}
await b.close(); assert.deepEqual(errors,[]); console.log('exw.test: EXW költség, FOB váltás, kimutatás rendben');
