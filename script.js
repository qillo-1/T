'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { title: '', scenes: [], titleCard: true, endCard: true };
const lib = new Map(); // file name -> HTMLImageElement
const TR = [['nar', 'Narration'], ['mus', 'Background music'], ['sfx', 'Sound effect']];
const tr = {};
TR.forEach(([k]) => tr[k] = { name: '', buf: null, vol: 1, off: 0, fi: 0.5, fo: 1 });
tr.mus.vol = 0.3; tr.sfx.vol = 0.8; tr.nar.off = 3;
let ctx = null, playing = null;
const getCtx = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
const cv = $('#cv'), g = cv.getContext('2d');
const err = m => { $('#err').textContent = m || ''; };
const status = m => { $('#status').textContent = m; };

/* ---------- Story and scenes ---------- */
function split() {
  const txt = $('#story').value.trim();
  if (!txt) return err('Paste a story first.');
  err('');
  let parts;
  if ($('#splitMode').value === 'paragraph') parts = txt.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  else {
    const sents = txt.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["”')]*|[^.!?]+$/g) || [txt];
    parts = []; let cur = '';
    sents.forEach(s => { cur = (cur + ' ' + s.trim()).trim(); if (cur.length >= 90) { parts.push(cur); cur = ''; } });
    if (cur) parts.push(cur);
  }
  S.scenes = parts.map(t => ({ text: t, dur: Math.max(3, Math.round(t.split(' ').length / 2.3)), img: '', fit: 'contain', motion: 'zin' }));
  render();
}
function opts(sel, list) { return list.map(([v, n]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(n)}</option>`).join(''); }
function render() {
  const names = [...lib.keys()];
  $('#scenes').innerHTML = S.scenes.length ? S.scenes.map((s, i) => {
    const o = [['', '(no picture)'], ...names.map(n => [n, n])];
    if (s.img && !lib.has(s.img)) o.push([s.img, '⚠ ' + s.img + ' (upload again)']);
    return `<div class="scene"><h3>Scene ${i + 1}</h3>
<textarea rows="3" data-i="${i}" data-k="text">${esc(s.text)}</textarea>
<div class="row"><select data-i="${i}" data-k="img">${opts(s.img, o)}</select>
<select data-i="${i}" data-k="fit">${opts(s.fit, [['contain', 'Contain'], ['cover', 'Cover']])}</select>
<select data-i="${i}" data-k="motion">${opts(s.motion, [['zin', 'Zoom in'], ['zout', 'Zoom out'], ['pl', 'Pan left'], ['pr', 'Pan right'], ['pu', 'Pan up'], ['pd', 'Pan down']])}</select>
<label>Seconds <input type="number" min="1" step="0.5" value="${s.dur}" data-i="${i}" data-k="dur"></label></div>
<div class="row"><button class="alt" data-a="up" data-i="${i}">↑ Up</button><button class="alt" data-a="down" data-i="${i}">↓ Down</button>
<button class="alt" data-a="dup" data-i="${i}">Duplicate</button><button class="alt" data-a="del" data-i="${i}">Delete</button></div></div>`;
  }).join('') : '<p class="hint">No scenes yet. Split your story or add a blank scene.</p>';
  upd();
}
$('#scenes').addEventListener('input', e => {
  const t = e.target, k = t.dataset.k; if (!k) return;
  S.scenes[+t.dataset.i][k] = k === 'dur' ? Math.max(1, +t.value || 1) : t.value;
  upd();
});
$('#scenes').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const i = +b.dataset.i, a = b.dataset.a, A = S.scenes;
  if (a === 'del') A.splice(i, 1);
  else if (a === 'dup') A.splice(i + 1, 0, { ...A[i] });
  else { const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= A.length) return; [A[i], A[j]] = [A[j], A[i]]; }
  render();
});
$('#splitBtn').onclick = split;
$('#addBtn').onclick = () => { S.scenes.push({ text: 'New scene', dur: 5, img: '', fit: 'contain', motion: 'zin' }); render(); };
$('#title').oninput = e => { S.title = e.target.value; upd(); };
$('#titleCard').onchange = e => { S.titleCard = e.target.checked; upd(); };
$('#endCard').onchange = e => { S.endCard = e.target.checked; upd(); };
function upd() { if (!playing) { frame(Math.min(1.5, total())); status('Total length: ' + total().toFixed(1) + ' seconds'); } }

/* ---------- Image library ---------- */
$('#imgs').addEventListener('change', async e => {
  for (const f of e.target.files) {
    const im = new Image(); im.src = URL.createObjectURL(f);
    try { await im.decode(); lib.set(f.name, im); } catch { err('Could not read image: ' + f.name); }
  }
  e.target.value = ''; libUI(); render();
});
function libUI() {
  $('#lib').innerHTML = [...lib].map(([n, im]) => `<div class="thumb"><img src="${im.src}" alt="${esc(n)}">${esc(n)}<br><button class="alt" data-rm="${esc(n)}">Remove</button></div>`).join('');
}
$('#lib').addEventListener('click', e => { const n = e.target.dataset.rm; if (n) { lib.delete(n); libUI(); render(); } });

/* ---------- Audio tracks ---------- */
$('#audio').innerHTML = TR.map(([k, n]) => `<div class="trk"><h3>${n}</h3>
<input type="file" accept="audio/*" data-t="${k}"><small class="hint" id="n_${k}">No file selected</small>
<label>Volume <input type="range" min="0" max="1" step="0.05" value="${tr[k].vol}" data-t="${k}" data-p="vol"></label>
<label>Start (seconds)<input type="number" min="0" step="0.1" value="${tr[k].off}" data-t="${k}" data-p="off"></label>
<label>Fade in (seconds)<input type="number" min="0" step="0.1" value="${tr[k].fi}" data-t="${k}" data-p="fi"></label>
<label>Fade out (seconds)<input type="number" min="0" step="0.1" value="${tr[k].fo}" data-t="${k}" data-p="fo"></label></div>`).join('');
$('#audio').addEventListener('input', e => { const t = e.target; if (t.type !== 'file' && t.dataset.p) tr[t.dataset.t][t.dataset.p] = Math.max(0, +t.value || 0); });
$('#audio').addEventListener('change', async e => {
  const t = e.target; if (t.type !== 'file' || !t.files[0]) return;
  const k = t.dataset.t, f = t.files[0];
  try {
    $('#n_' + k).textContent = 'Reading ' + f.name + '…';
    tr[k].buf = await getCtx().decodeAudioData(await f.arrayBuffer());
    tr[k].name = f.name; audioNames(); upd();
  } catch { $('#n_' + k).textContent = 'This audio file could not be read. Try MP3, WAV or M4A.'; }
});
function audioNames() { TR.forEach(([k]) => { $('#n_' + k).textContent = tr[k].name ? tr[k].name + (tr[k].buf ? ' (' + tr[k].buf.duration.toFixed(1) + 's)' : ' (select this file again)') : 'No file selected'; }); }
$('#fitBtn').onclick = () => {
  const n = tr.nar;
  if (!n.buf || !S.scenes.length) return err('Add scenes and narration first.');
  err('');
  const w = S.scenes.map(s => Math.max(1, s.text.split(/\s+/).filter(Boolean).length)), sum = w.reduce((a, b) => a + b);
  S.scenes.forEach((s, i) => s.dur = +(n.buf.duration * w[i] / sum).toFixed(2));
  n.off = S.titleCard ? 3 : 0;
  document.querySelector('[data-t="nar"][data-p="off"]').value = n.off;
  render();
};
function mix(c, dest, t0, T) {
  const L = [];
  TR.forEach(([k]) => {
    const a = tr[k]; if (!a.buf) return;
    const st = t0 + a.off, en = Math.min(st + a.buf.duration, t0 + T); if (en <= st) return;
    const s = c.createBufferSource(), gn = c.createGain(); s.buffer = a.buf; s.connect(gn).connect(dest);
    const fi = Math.min(a.fi, (en - st) / 2), fo = Math.min(a.fo, (en - st) / 2);
    gn.gain.setValueAtTime(fi > 0 ? 0 : a.vol, st);
    if (fi > 0) gn.gain.linearRampToValueAtTime(a.vol, st + fi);
    gn.gain.setValueAtTime(a.vol, en - fo);
    gn.gain.linearRampToValueAtTime(0, en);
    s.start(st); s.stop(en); L.push(s);
  });
  return L;
}

/* ---------- Timeline and rendering ---------- */
function segs() {
  const a = [];
  if (S.titleCard) a.push({ k: 't', d: 3, text: S.title || 'My Bedtime Story' });
  S.scenes.forEach(s => a.push({ k: 's', d: Math.max(1, +s.dur || 5), s, text: s.text }));
  if (S.endCard) a.push({ k: 'e', d: 3, text: 'The End 🌙\nSweet dreams' });
  return a;
}
const total = () => segs().reduce((n, x) => n + x.d, 0);
function bg(W, H, t) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1140'); gr.addColorStop(1, '#2a2160');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const m = g.createRadialGradient(W * .8, H * .12, 0, W * .8, H * .12, W * (.35 + .03 * Math.sin(t)));
  m.addColorStop(0, 'rgba(255,214,102,.55)'); m.addColorStop(1, 'rgba(255,214,102,0)');
  g.fillStyle = m; g.fillRect(0, 0, W, H);
}
function stars(W, H, t) {
  const ga = g.globalAlpha;
  for (let i = 0; i < 50; i++) {
    const r1 = Math.sin(i * 91.7) * .5 + .5, r2 = Math.sin(i * 47.3 + 2) * .5 + .5;
    const x = r1 * W + Math.sin(t * .5 + i) * W * .01, y = ((r2 * H - t * (8 + i % 5 * 4) * W / 720) % H + H) % H;
    const sz = (1 + i % 3) * W / 720 * 1.6;
    g.globalAlpha = ga * (.4 + .6 * Math.abs(Math.sin(t * 1.5 + i)));
    g.fillStyle = i % 4 ? '#fff6d0' : '#d8c8ff'; g.shadowColor = '#ffd966'; g.shadowBlur = sz * 4;
    g.beginPath(); g.arc(x, y, sz, 0, 7); g.fill();
  }
  g.globalAlpha = ga; g.shadowBlur = 0;
}
function wrap(t, mw) {
  const out = [];
  t.split('\n').forEach(par => {
    let l = '';
    par.split(/\s+/).filter(Boolean).forEach(w => { const c = l ? l + ' ' + w : w; if (g.measureText(c).width > mw && l) { out.push(l); l = w; } else l = c; });
    out.push(l);
  });
  return out;
}
function seg(x, p, t, W, H) {
  bg(W, H, t);
  const s = x.s, im = s && lib.get(s.img);
  if (im && im.naturalWidth) {
    const f = s.fit === 'cover' ? Math.max(W / im.naturalWidth, H / im.naturalHeight) : Math.min(W / im.naturalWidth, H / im.naturalHeight);
    const m = s.motion; let z = 1, px = 0, py = 0;
    if (m === 'zin') z = 1 + .12 * p; else if (m === 'zout') z = 1.12 - .12 * p;
    else { z = 1.08; const o = (p - .5) * .08; if (m === 'pl') px = -o * W; if (m === 'pr') px = o * W; if (m === 'pu') py = -o * H; if (m === 'pd') py = o * H; }
    g.save(); g.translate(W / 2 + px, H / 2 + py); g.scale(z * f, z * f);
    g.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2); g.restore();
  }
  stars(W, H, t);
  if (!x.text) return;
  const sc = x.k === 's', fs = Math.round(W * (sc ? .048 : .09));
  g.font = `700 ${fs}px "Trebuchet MS",system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = wrap(x.text, W * .8), lh = fs * 1.3, bh = lines.length * lh + fs, y0 = sc ? H - bh - H * .05 : (H - bh) / 2;
  if (sc) { g.fillStyle = 'rgba(11,17,64,.72)'; g.beginPath(); g.roundRect ? g.roundRect(W * .05, y0, W * .9, bh, fs * .6) : g.rect(W * .05, y0, W * .9, bh); g.fill(); }
  g.fillStyle = '#ffe08a'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = fs * .2;
  lines.forEach((l, i) => g.fillText(l, W / 2, y0 + fs / 2 + lh * (i + .5)));
  g.shadowBlur = 0;
}
function frame(t) {
  const W = cv.width, H = cv.height, a = segs();
  g.globalAlpha = 1;
  if (!a.length) { bg(W, H, t); stars(W, H, t); return; }
  let acc = 0, i = 0;
  for (; i < a.length - 1 && t >= acc + a[i].d; i++) acc += a[i].d;
  const x = a[i], lt = Math.max(0, t - acc), p = Math.min(1, lt / x.d), X = .8;
  if (i > 0 && lt < X) { seg(a[i - 1], 1, t, W, H); g.globalAlpha = lt / X; seg(x, p, t, W, H); g.globalAlpha = 1; }
  else seg(x, p, t, W, H);
  const T = total(), f = Math.max(0, Math.min(1, t / .6, (T - t) / .8));
  if (f < 1) { g.fillStyle = `rgba(5,8,30,${1 - f})`; g.fillRect(0, 0, W, H); }
}

/* ---------- Playback (audio clock drives the video) ---------- */
function run(rec) {
  const c = getCtx(), T = total();
  if (!T) { err('Add at least one scene first.'); return Promise.resolve(false); }
  return c.resume().then(() => new Promise(res => {
    const t0 = c.currentTime + .15, srcs = mix(c, rec ? rec.dest : c.destination, t0, T), st = { stop: false };
    playing = st;
    const loop = () => {
      const t = Math.max(0, c.currentTime - t0);
      frame(Math.min(t, T)); $('#prog').value = Math.min(1, t / T);
      status((rec ? 'Recording… ' : 'Playing… ') + Math.min(t, T).toFixed(1) + ' / ' + T.toFixed(1) + ' s');
      if (st.stop || t >= T + .3) {
        srcs.forEach(s => { try { s.stop(); } catch { } });
        playing = null; res(!st.stop); return;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }));
}
function stop() { if (playing) playing.stop = true; }
$('#playBtn').onclick = async () => { err(''); stop(); await new Promise(r => setTimeout(r, 60)); await run(); upd(); };
$('#stopBtn').onclick = () => { stop(); setTimeout(upd, 100); };
function setRes() { const [w, h] = $('#res').value.split('x'); cv.width = +w; cv.height = +h; upd(); }
$('#res').onchange = setRes;

/* ---------- Video export ---------- */
$('#expBtn').onclick = async () => {
  err('');
  if (!window.MediaRecorder || !cv.captureStream) return err('This browser cannot record video from a canvas. Try the latest Chrome, Edge or Firefox on a computer.');
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) return err('This browser supports neither WebM nor MP4 recording.');
  stop(); await new Promise(r => setTimeout(r, 100));
  setRes(); $('#expBtn').disabled = true;
  try {
    const c = getCtx(), dest = c.createMediaStreamDestination();
    const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: cv.width > 720 ? 10e6 : 5e6 }), chunks = [];
    let fail = '';
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = e => { fail = (e.error && e.error.message) || 'unknown recording error'; };
    const done = new Promise(r => rec.onstop = r);
    rec.start(1000);
    const ok = await run({ dest });
    if (rec.state !== 'inactive') rec.stop();
    await done;
    if (fail) throw new Error(fail);
    if (!ok) { status('Recording stopped before the end. Nothing was saved.'); return; }
    const ext = mime.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, { type: mime.split(';')[0] }), url = URL.createObjectURL(blob);
    $('#out').src = url; $('#out').hidden = false;
    const a = $('#dlink'); a.href = url; a.download = (S.title || 'moonie-tale').replace(/[^\w\- ]+/g, '_') + '.' + ext; a.textContent = 'Download video (.' + ext + ', ' + (blob.size / 1048576).toFixed(1) + ' MB)'; a.hidden = false;
    status('Done. Your .' + ext + ' video is ready.');
  } catch (ex) { err('Export failed: ' + ex.message + '. Try the 720 × 1280 size.'); }
  finally { $('#expBtn').disabled = false; upd(); }
};

/* ---------- Save and load project ---------- */
function dl(b, n) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = n; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
$('#save').onclick = () => {
  const o = { app: 'moonie-tales', version: 1, story: S, res: $('#res').value, lib: [...lib.keys()], audio: Object.fromEntries(TR.map(([k]) => [k, { name: tr[k].name, vol: tr[k].vol, off: tr[k].off, fi: tr[k].fi, fo: tr[k].fo }])) };
  dl(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }), (S.title || 'moonie-tale').replace(/[^\w\- ]+/g, '_') + '.json');
};
$('#load').onchange = async e => {
  try {
    const o = JSON.parse(await e.target.files[0].text());
    if (o.app !== 'moonie-tales') throw new Error('bad file');
    Object.assign(S, o.story); $('#res').value = o.res || '720x1280';
    TR.forEach(([k]) => { Object.assign(tr[k], o.audio[k] || {}, { buf: null }); ['vol', 'off', 'fi', 'fo'].forEach(p => document.querySelector(`[data-t="${k}"][data-p="${p}"]`).value = tr[k][p]); });
    $('#title').value = S.title; $('#titleCard').checked = S.titleCard; $('#endCard').checked = S.endCard;
    audioNames(); setRes(); render(); err('');
    status('Project loaded. Select your pictures and audio files again.');
  } catch { err('That is not a valid Moonie Tales project file.'); }
  e.target.value = '';
};
setRes(); render();
