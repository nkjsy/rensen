// Builds the CrazyGames upload: crazygames-release/game/ (and game.zip next to it).
// The game is self-contained there: three.js and the QR library are copied in, the CrazyGames SDK is
// loaded, and web-only bits (service worker, install manifest, self-update banner) are left out.
// Usage: node tools/crazygames-build.js
const fs = require('fs'), path = require('path'), https = require('https'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'crazygames-release'), GAME = path.join(OUT, 'game');
const LIBS = {
  'three.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'qrcode.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
};
const get = (url, headers)=>new Promise((ok, no)=>https.get(url, {headers:headers||{}}, res=>{ if(res.statusCode!==200) return no(new Error(url + ' ' + res.statusCode)); const b = []; res.on('data', c=>b.push(c)); res.on('end', ()=>ok(Buffer.concat(b))); }).on('error', no));
// Google Fonts are bundled too (latin subsets only), so the game looks the same offline or where Google is blocked
async function localFonts(html){
  const m = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)">/); if(!m) throw new Error('build: font link not found');
  const css = (await get(m[1].replace(/&amp;/g, '&'), {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'})).toString();
  fs.mkdirSync(path.join(GAME, 'fonts'), {recursive:true});
  const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b=>/^\/\* (latin|latin-ext) \*\//.test(b));
  let out = ''; const done = {};
  for(const b of blocks){
    const url = (b.match(/url\((https:[^)]+\.woff2)\)/) || [])[1]; if(!url) continue;
    const fam = (b.match(/font-family: '([^']+)'/) || [])[1].toLowerCase(), wt = (b.match(/font-weight: (\d+)/) || [])[1], sub = b.match(/^\/\* ([a-z-]+) \*\//)[1];
    const name = `${fam}-${sub}.woff2`; if(!done[url]){ done[url] = 1; fs.writeFileSync(path.join(GAME, 'fonts', name), await get(url)); } // variable fonts: one file serves every weight
    out += b.replace(url, 'fonts/' + name).replace(/\/\* [a-z-]+ \*\/\s*/, '');
  }
  return html.replace(m[0], `<style>${out.replace(/\s+/g, ' ')}</style>`).replace(/<link rel="preconnect"[^>]*>\s*/g, '');
}
function swap(s, a, b){ if(!s.includes(a)) throw new Error('build: cannot find ' + a.slice(0, 80)); return s.split(a).join(b); }

(async ()=>{
  fs.rmSync(GAME, {recursive:true, force:true}); fs.mkdirSync(GAME, {recursive:true});
  for(const [f, url] of Object.entries(LIBS)) fs.writeFileSync(path.join(GAME, f), await get(url));
  let s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  s = swap(s, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="three.min.js"></script>');
  s = swap(s, "loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js')", "loadScript('qrcode.min.js')");
  s = s.replace(/<link rel="manifest"[^>]*>/, '').replace(/<link rel="apple-touch-icon"[^>]*>/, '');
  s = await localFonts(s);
  s = s.replace(/<script>if\('serviceWorker' in navigator[\s\S]*?<\/script>/, '');
  s = swap(s, 'checkUpdate(); setInterval(checkUpdate, 3*60*1000);', '');
  s = swap(s, "document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) checkUpdate(); });", '');
  // progress is saved through the SDK Data module (synced to the player's CrazyGames account); photos stay in
  // localStorage because they would blow the 1 MB data limit
  s = swap(s, "function store(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v);}catch(e){ return null; } }",
    "function store(k,v){ try{ const L = (k!=='xx_photos' && window.__cgData) || localStorage; if(v===undefined) return L.getItem(k); L.setItem(k,v);}catch(e){ return null; } }");
  s = s.split("localStorage.setItem('xx_save',").join("(window.__cgData || localStorage).setItem('xx_save',");
  s = s.split("localStorage.removeItem('xx_save')").join("(window.__cgData || localStorage).removeItem('xx_save')");
  // the game starts only after the SDK has loaded the player's saved data
  s = swap(s, '<script>\n(function(){\n', '<script>\nwindow.__cgBoot = (function(){\n');
  s = s.replace(/\n\}\)\(\);\n<\/script>(?![\s\S]*\n\}\)\(\);\n<\/script>)/, '\n});\n</script>');
  // CrazyGames SDK: tell the site when the game has loaded and when play starts / pauses
  s = swap(s, '<style>', '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script><style>');
  s = s.replace(/<\/body>(?![\s\S]*<\/body>)/, `<script>
(function(){
  const sdk = ()=>window.CrazyGames && CrazyGames.SDK;
  let ready = false, booted = false;
  const call = fn=>{ if(ready) try{ fn(sdk()); }catch(e){} };
  const boot = ()=>{ if(booted) return; booted = true; window.__cgBoot(); };
  setTimeout(boot, 6000); // never leave players on a blank page if the SDK is slow or blocked
  if(sdk()) sdk().init().then(()=>{
    ready = true;
    try{ const D = sdk().data; if(D){ if(!D.getItem('xx_save')){ const old = localStorage.getItem('xx_save'); if(old) D.setItem('xx_save', old); } window.__cgData = D; } }catch(e){}
    boot(); call(s=>s.game.loadingStop && s.game.loadingStop()); call(s=>s.game.gameplayStart());
  }).catch(()=>boot());
  else boot();
  document.addEventListener('visibilitychange', ()=>call(s=>document.hidden ? s.game.gameplayStop() : s.game.gameplayStart()));
  const pb = document.getElementById('pauseBtn'), rb = document.getElementById('resumeBtn');
  if(pb) pb.addEventListener('click', ()=>setTimeout(()=>call(s=>pb.classList.contains('on') ? s.game.gameplayStop() : s.game.gameplayStart()), 0));
  if(rb) rb.addEventListener('click', ()=>call(s=>s.game.gameplayStart()));
})();
</script></body>`);
  fs.writeFileSync(path.join(GAME, 'index.html'), s);
  const zip = path.join(OUT, 'game.zip'); fs.rmSync(zip, {force:true});
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${GAME}\\*' -DestinationPath '${zip}'`]);
  const files = fs.readdirSync(GAME, {recursive:true}).filter(f=>fs.statSync(path.join(GAME, f)).isFile()), size = files.reduce((n, f)=>n + fs.statSync(path.join(GAME, f)).size, 0);
  console.log(`built ${GAME} (${(size/1024).toFixed(0)} KB, ${files.length} files) and ${zip}`);
})().catch(e=>{ console.error(e); process.exit(1); });
