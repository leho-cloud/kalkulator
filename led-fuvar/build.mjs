import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const r=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const core=r('./core.js').replace(/^export /gm,'');
const data=JSON.stringify(JSON.parse(r('./data.json')));
const app=r('./src/app.js').replace('__DATA__',()=>data)+'\n'+r('./src/glossary.js')+'\n'+r('./src/offer.js').replace('__LOGO__',()=>'data:image/png;base64,'+readFileSync(new URL('./assets/tzsvtav-logo.png',import.meta.url)).toString('base64'));
const html=r('./src/index.html').replace('/*__CSS__*/',()=>r('./src/style.css')).replace('/*__JS__*/',()=>'\n'+core+'\n'+app);
mkdirSync(new URL('./dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('./dist/index.html',import.meta.url),html);
console.log('dist/index.html',html.length,'byte');
