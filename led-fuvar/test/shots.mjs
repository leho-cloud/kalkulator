import {createRequire} from 'node:module';
const require=createRequire('/opt/node22/lib/node_modules/');
const {chromium}=require('playwright');
const url='file://'+new URL('../dist/index.html',import.meta.url).pathname;
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const d=await b.newPage({viewport:{width:1440,height:1000}});
await d.goto(url); await d.waitForTimeout(700);
await d.click('#itemChips .chip >> nth=0'); await d.click('#itemChips .chip >> nth=3');
await d.click('[data-cur=HUF]');
await d.evaluate(()=>scrollTo(0,0)); await d.screenshot({path:'dist/desktop.png',fullPage:true});
const m=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await m.goto(url); await m.waitForTimeout(700); await m.click('[data-cur=HUF]');
await m.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,0)}); await m.waitForTimeout(150);
await m.screenshot({path:'dist/m1.png'});
for (const [i,id] of [[2,'s-fal'],[3,'s-csom'],[4,'s-fuvar'],[5,'sea']]) { await m.evaluate(id=>document.getElementById(id).scrollIntoView(),id); await m.waitForTimeout(150); await m.screenshot({path:`dist/m${i}.png`}); }
await b.close();
