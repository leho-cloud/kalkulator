import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('/opt/node22/lib/node_modules/');
const {chromium}=require('playwright');
const url='file://'+new URL('../dist/index.html',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
for (const [name,vp] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:name==='mobile'});
const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(name+': '+e.message));
await p.goto(url); await p.waitForTimeout(600);
assert.equal(await p.locator('#trMap circle.stn').count(),13);
const dep=iso(new Date(Date.now()-9*864e5));
await p.fill('#trDep',dep); await p.dispatchEvent('#trDep','change');
let s=await p.evaluate(()=>{const s=window.__track.state();return {f:s.frac,est:s.est,el:s.elapsed}});
assert.ok(s.est && s.f>0.4 && s.f<0.75, JSON.stringify(s)); assert.equal(s.el,9);
await p.selectOption('#trLast','brest'); await p.click('#trToday');
s=await p.evaluate(()=>{const s=window.__track.state();return {f:s.frac,est:s.est,idx:s.idx,eta:s.eta.map(d=>d.toISOString())}});
assert.ok(!s.est && s.idx===7 && s.f>0.8);
assert.ok(await p.isVisible('#trWarn')); assert.ok((await p.textContent('#trWarn')).includes('Małaszewicze'));
await p.click('#trText'); const t=await p.inputValue('#trTextOut'); assert.ok(t.includes('Breszt')); assert.ok(t.includes('Várható érkezés'));
if(name==='desktop') console.log(t);
await p.locator('#s-kovetes').screenshot({path:`/tmp/track-${name}.png`});
await p.reload(); await p.waitForTimeout(500); assert.equal(await p.inputValue('#trLast'),'brest');
await ctx.close();
}
await b.close(); assert.deepEqual(errors,[]); console.log('track.test: térkép, becslés, állomás, állapotüzenet rendben');
