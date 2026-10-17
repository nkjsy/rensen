// Covers + preview videos for CrazyGames, captured from the built game (run crazygames-build.js first) in Microsoft Edge.
// Needs puppeteer-core:  npm i --no-save puppeteer-core@23   then   node tools/crazygames-media.js covers   and   node tools/crazygames-media.js video
// The video run opens a visible Edge window for about a minute (a hidden window would slow the animation down).
// The covers show one dramatic moment up close (a confession, a jealous rival, a shocked friend): big faces and a
// clear story read better at thumbnail size than a wide view of the island.
const puppeteer = require('puppeteer-core'), http = require('http'), fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'crazygames-release'), GAME = path.join(OUT, 'game'), WORK = path.join(OUT, '.capture');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const MODE = process.argv[2] || 'covers';
const types = {'.html':'text/html; charset=utf-8', '.js':'application/javascript', '.woff2':'font/woff2'};
const srv = http.createServer((q, s)=>{ const f = path.join(GAME, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); s.end(); return; } s.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(s); }).listen(8790);
const sleep = ms=>new Promise(r=>setTimeout(r, ms));
const TAGLINE = 'Make friends · Fall in love · Live the island life';

const TITLE_CSS = `#hud,#guide,#dock,#toasts,#sheet,#roomBar,#updBar,#pauseBar,#karaoke,#modalRoot,#inviteCard{display:none!important}`;

async function setup(page, W, H){
  await page.setViewport({width:W, height:H, deviceScaleFactor:1});
  await page.goto('http://localhost:8790/?debug', {waitUntil:'load'}); await sleep(1500);
  // the same island every time, so the covers and the videos match (saved both where the plain web game and the SDK build look)
  const FIX = path.join(__dirname, 'crazygames-island.json');
  if(!fs.existsSync(FIX)){ await page.evaluate(()=>{ localStorage.removeItem('xx_save'); }); await page.reload({waitUntil:'load'}); await sleep(1500); fs.writeFileSync(FIX, await page.evaluate(()=>{ const I = window.__isle; return JSON.stringify(Object.assign({}, I.S, {residents:I.residents.map(r=>r.d)})); })); }
  const fix = JSON.parse(fs.readFileSync(FIX, 'utf8')); fix.lastSeen = Date.now(); fix.tut = 99; const d0 = new Date(); fix.streak = {last:d0.getFullYear()*10000 + (d0.getMonth()+1)*100 + d0.getDate(), n:1};
  await page.evaluate(j=>{ localStorage.setItem('xx_save', j); if(window.__cgData) window.__cgData.setItem('xx_save', j); }, JSON.stringify(fix)); await page.reload({waitUntil:'load'}); await sleep(3000);
  await page.evaluate((css, TAG)=>{
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    window.__drawTitle = (g, W, H, alpha)=>{
      const port = H > W, k = Math.round(Math.min(W, H*1.1)*(port ? .14 : .11)), F = '"Fredoka","Microsoft YaHei UI",sans-serif';
      g.save(); g.globalAlpha = alpha; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.translate(W/2, H*(port ? .075 : .095)); g.rotate(-3*Math.PI/180);
      g.font = '700 ' + k + 'px ' + F;
      g.fillStyle = 'rgba(59,51,85,.35)'; g.fillText('Heart Island', 0, k*.16);
      g.lineWidth = k*.2; g.strokeStyle = '#3B3355'; g.strokeText('Heart Island', 0, k*.08);
      g.lineWidth = k*.14; g.strokeStyle = '#FFFFFF'; g.strokeText('Heart Island', 0, 0);
      g.fillStyle = '#FF6F86'; g.fillText('Heart Island', 0, 0);
      g.restore();
      // tagline on a ribbon at the bottom
      const t = Math.round(Math.min(W, H*1.25)*(port ? .046 : .036)); g.save(); g.globalAlpha = alpha; g.font = '700 ' + t + 'px ' + F; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = !port && g.measureText(TAG).width < W*.88 ? [TAG] : TAG.split(' · '), lh = t*1.35, bw = Math.min(W*.94, Math.max(...lines.map(l=>g.measureText(l).width)) + t*1.6), bh = lines.length*lh + t*.6, by = H - bh - H*.035;
      g.fillStyle = 'rgba(59,51,85,.82)'; g.beginPath(); g.roundRect((W-bw)/2, by, bw, bh, t*.6); g.fill();
      g.fillStyle = '#FFFFFF'; lines.forEach((l, i)=>g.fillText(l, W/2, by + t*.3 + lh*(i+.5)));
      g.restore(); };
    const cv = document.createElement('canvas'); cv.id = 'cgTitle'; cv.width = innerWidth; cv.height = innerHeight; cv.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none;width:100%;height:100%';
    document.body.appendChild(cv); window.__drawTitle(cv.getContext('2d'), cv.width, cv.height, 1);
    window.__isle.closeModal(); // an open popup would pause island time
  }, TITLE_CSS, TAGLINE);
}
// the cover moment: Bean confesses to Peachy, Bobo is jealous, Mila can't believe it
async function stage(page, W, H){
  await page.evaluate((W, H)=>{
    const I = window.__isle; I.S.hour = 10.5; I.S.weather = {day:I.S.day, kind:'sunny'};
    const by = n=>I.residents.find(r=>r.d.name===n), cast = [by('Bean'), by('Peachy'), by('Bobo'), by('Mila')], port = H > W;
    I.residents.forEach(r=>{ if(r.holHat && r.holHat.parent) r.holHat.parent.remove(r.holHat); r.holHat = null; r.label.visible = false; if(!cast.includes(r)){ r.state = 'home'; r.p.root.visible = false; } });
    const T3 = window.THREE, C = {x:0, z:7.2}, YAW = .22;
    const put = (r, px, pz, turn, bubble, pose)=>{ r.state = 'script'; r.dest = null; r.p.root.visible = true; r.face = null; r.facePos = null;
      r.p.root.position.set(C.x + px*Math.cos(YAW) + pz*Math.sin(YAW), 0, C.z - px*Math.sin(YAW) + pz*Math.cos(YAW)); r.p.root.rotation.y = YAW + turn; r.scriptBubble = bubble; r.pose = pose; };
    const sp = port ? .8 : 1;
    put(cast[0], -1.05*sp, .3, .8, null, 'chat');        // Bean, turned toward Peachy
    put(cast[1], 1.05*sp, .3, -.75, '💗', null);          // Peachy, blushing
    put(cast[2], 2.9*sp, -1.6, -.35, '💢', null);          // Bobo, jealous, behind
    put(cast[3], -2.9*sp, -1.6, .35, '😲', null);          // Mila, shocked, behind
    I.sayScript(cast[0], 'Go out with me?! 💘'); cast[0].scriptBubble = null;
    I.cam.yaw = YAW; I.cam.yawGoal = null; I.cam.pitch = port ? .24 : .16; I.cam.pitchGoal = null; I.cam.dist = port ? 11.5 : 8.4; I.cam.distGoal = null;
    I.cam.goal.set(C.x + Math.sin(YAW)*.4, port ? 2.0 : 1.8, C.z + Math.cos(YAW)*.4); I.cam.target.copy(I.cam.goal);
    window.__castHearts = ()=>{ const a = cast[0].p.root.position, b = cast[1].p.root.position; const m = a.clone().add(b).multiplyScalar(.5); m.y = 3.0; I.burst(I.scene, m, '💖', 5, .7); };
    // only the cast's bubbles show: no place names or house labels; bubbles sit just above the heads
    I.scene.traverse(o=>{ if(o.isSprite) o.layers.set(1); });
    cast.forEach((r, i)=>{ [r.bubble, r.tb].forEach(b=>{ if(!b) return; b.layers.set(0); const y = b===r.tb ? 3.35 : i < 2 ? 3.05 : 2.85; Object.defineProperty(b.position, 'y', {get:()=>y, set:()=>{}, configurable:true}); }); });
    if(cast[0].tb) cast[0].tb.scale.set(3.1, .78, 1);
    // clear anything standing between the camera and the cast (trees, house corners)
    I.camera.updateMatrixWorld(); const eye = I.camera.position, mid = cast[0].p.root.position.clone().add(cast[1].p.root.position).multiplyScalar(.5), seg = new T3.Line3(eye.clone().setY(0), mid.clone().setY(0)), q = new T3.Vector3();
    I.scene.children.forEach(o=>{ if(cast.some(r=>r.p.root===o) || !o.position || o.isLight) return; const bs = new T3.Box3().setFromObject(o); if(bs.isEmpty()) return; const c = bs.getCenter(new T3.Vector3()), size = bs.getSize(new T3.Vector3()); if(Math.max(size.x, size.z) > 12) return; seg.closestPointToPoint(c.setY(0), true, q); const near = q.distanceTo(c) < Math.max(size.x, size.z)/2 + .4 && q.distanceTo(mid.clone().setY(0)) > 1.6; const side = eye.clone().setY(0).distanceTo(c) < 5.5; if(near || side){ o.visible = false; o.userData.hiddenForCover = true; } });
    window.__castHearts();
  }, W, H);
  for(let i=0;i<14;i++){ await page.evaluate(()=>window.__isle.loopStep(.03)); }
}

(async ()=>{
  const port = MODE==='covers' ? 9333 : 9334;
  require('child_process').spawn(EDGE, [...(MODE==='covers' ? ['--headless=new'] : []), '--remote-debugging-port=' + port, '--user-data-dir=' + WORK, '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--window-size=1300,900', 'about:blank'], {detached:true, stdio:'ignore'}).unref();
  await sleep(3000);
  const browser = await puppeteer.connect({browserURL:'http://127.0.0.1:' + port, defaultViewport:null});
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  if(MODE==='covers'){
    for(const [W, H, name] of [[1920,1080,'cover-landscape-1920x1080.png'],[800,1200,'cover-portrait-800x1200.png'],[800,800,'cover-square-800x800.png']]){
      await setup(page, W, H); await stage(page, W, H); await sleep(300);
      await page.screenshot({path:path.join(OUT, name)}); console.log('saved', name);
    }
  } else {
    // preview videos: the cover moment, then the confession plays out for real (he says yes!), then a look around the island
    for(const [W, H, name] of [[1920,1080,'preview-landscape-1080p'],[1080,1620,'preview-portrait-1080x1620']]){
      await setup(page, W, H); await stage(page, W, H);
      const chunks = []; await page.exposeFunction('cgChunk_' + W, b=>chunks.push(Buffer.from(b, 'base64')));
      const mime = await page.evaluate((W, H)=>{
        const I = window.__isle, src = I.renderer.domElement, comp = document.createElement('canvas'); comp.width = W; comp.height = H; const g = comp.getContext('2d');
        const title = document.getElementById('cgTitle');
        const orig = I.renderer.render.bind(I.renderer);
        const mime = ['video/mp4;codecs=avc1.640028','video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
        const rec = new MediaRecorder(comp.captureStream(30), {mimeType:mime, videoBitsPerSecond:10e6});
        rec.ondataavailable = e=>{ if(e.data.size){ const fr = new FileReader(); fr.onload = ()=>window['cgChunk_' + W](fr.result.split(',')[1]); fr.readAsDataURL(e.data); } };
        window.__rec = rec;
        I.renderer.render = (s, c)=>{ orig(s, c); g.drawImage(src, 0, 0, W, H); if(window.__titleA > 0) window.__drawTitle(g, W, H, window.__titleA); };
        window.__titleA = 1; title.style.display = 'none';
        return mime;
      }, W, H);
      await page.evaluate(()=>{ window.__rec.start(1000); });
      const pulse = async ms=>{ const t0 = Date.now(); while(Date.now() - t0 < ms){ await page.evaluate(()=>window.__castHearts()); await sleep(450); } };
      await pulse(2200);
      // she thinks it over...
      await page.evaluate(()=>{ const I = window.__isle, by = n=>I.residents.find(r=>r.d.name===n); I.sayScript(by('Bean'), null); by('Bean').scriptBubble = '💘'; I.sayScript(by('Peachy'), 'W-what?! Me?'); by('Peachy').scriptBubble = null; });
      await pulse(1800);
      // ...and says yes: everyone reacts
      await page.evaluate(()=>{
        const I = window.__isle, by = n=>I.residents.find(r=>r.d.name===n), a = by('Bean'), b = by('Peachy'), c = by('Bobo'), m = by('Mila');
        I.sayScript(b, 'Yes! I like you too 💖'); b.scriptBubble = null; a.scriptBubble = '💖'; a.pose = b.pose = 'happy';
        c.scriptBubble = '💔'; m.scriptBubble = '👏'; m.pose = 'happy';
        const mid = a.p.root.position.clone().add(b.p.root.position).multiplyScalar(.5); I.confetti(I.scene, mid);
      });
      await pulse(2600);
      for(let i=0;i<10;i++){ await page.evaluate(a=>{ window.__titleA = a; }, 1 - (i+1)/10); await sleep(40); }
      // then pull back over the island while everyone goes about their day
      await page.evaluate(()=>{ const I = window.__isle; I.residents.forEach(r=>{ [r.bubble, r.tb].forEach(s=>{ if(s){ delete s.position.y; s.position.y = 3.5; s.layers.set(0); } }); I.sayScript(r, null); if(r.state==='script' || r.state==='home'){ r.state = 'idle'; r.timer = Math.random()*1.5; r.p.root.visible = true; } r.scriptBubble = null; r.pose = null; r.label.visible = true; });
        I.scene.traverse(o=>{ o.visible = o.visible || o.userData.hiddenForCover; if(o.isSprite) o.layers.set(0); }); I.cam.distGoal = 34; I.cam.pitchGoal = .78; I.cam.goal.set(0,0,0); I.residents.forEach(r=>{ r.scriptTalk = null; if(r.tb){ r.tb.visible = false; r.tb.scale.set(4, 1, 1); } }); });
      { const t0 = Date.now(); while(Date.now() - t0 < 4200){ await page.evaluate(()=>{ window.__isle.cam.yaw += .005; }); await sleep(30); } }
      await page.evaluate(()=>{ window.__titleA = 0; });
      for(let i=0;i<12;i++){ await page.evaluate(a=>{ window.__titleA = a; }, (i+1)/12); await sleep(40); }
      await sleep(1200);
      await page.evaluate(()=>new Promise(ok=>{ window.__rec.onstop = ()=>setTimeout(ok, 800); window.__rec.stop(); }));
      await sleep(1200);
      const ext = mime.includes('mp4') ? '.mp4' : '.webm';
      fs.writeFileSync(path.join(OUT, name + ext), Buffer.concat(chunks)); console.log('saved', name + ext, (Buffer.concat(chunks).length/1e6).toFixed(1) + 'MB', mime);
    }
  }
  console.log('errors:', errs.filter(e=>!/MIME|sdk|crazygames|404/i.test(e)).slice(0,5));
  await browser.close().catch(()=>{}); srv.close();
})().catch(e=>{ console.error(e); process.exit(1); });
