'use strict';
/* =====================================================================
   Marginalia, second edition: router, renderers, interactions, state, audio.
   All copy comes from CONTENT in js/content.js.
   ===================================================================== */
(function () {
  const UI = CONTENT.ui;
  const NAMES = CONTENT.names;
  const CH = CONTENT.chapters;
  const SEQ = CH.filter((c) => !c.extra);
  const bySlug = {};
  CH.forEach((c, i) => { bySlug[c.slug] = c; c._i = i; });
  const LAST_NUMERAL = CH.filter((c) => c.numeral).map((c) => c.numeral).pop();
  const PETALS = CH.filter((c) => c.petal).map((c) => c.slug);

  /* ===================== helpers ===================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(text, cls) {
    const b = el('button', cls || 'btn', text);
    b.type = 'button';
    return b;
  }
  function frag(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  const scrollTo = (n, block) => n.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: block || 'nearest' });
  function say(text) {
    const live = $('#live');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }
  function rng(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const fx = (v) => v.toFixed(1);
  // Catmull-Rom points to a smooth cubic path, so generated ink looks hand-drawn
  function smooth(pts, closed) {
    const n = pts.length;
    const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${fx(pts[0][0])} ${fx(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${fx(p1[0] + (p2[0] - p0[0]) / 6)} ${fx(p1[1] + (p2[1] - p0[1]) / 6)} ${fx(p2[0] - (p3[0] - p1[0]) / 6)} ${fx(p2[1] - (p3[1] - p1[1]) / 6)} ${fx(p2[0])} ${fx(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  }
  function blob(cx, cy, r, jitter, n, seed) {
    const R = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rr = r + (R() - 0.5) * 2 * jitter;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return smooth(pts, true);
  }

  /* ===================== state: one object, one key ===================== */
  const KEY = 'marginalia.v2';
  const memory = {};
  const store = {
    get(k) {
      try { const v = localStorage.getItem(k); return v === null && k in memory ? memory[k] : v; } catch (e) { return k in memory ? memory[k] : null; }
    },
    set(k, v) {
      memory[k] = v;
      try { localStorage.setItem(k, v); } catch (e) { /* private mode or file:// lockdown: memory keeps this visit going */ }
    },
  };
  const validStamp = (v) => !!v && typeof v.date === 'string' && v.date.length < 40 && typeof v.rot === 'number' && Math.abs(v.rot) <= 8;
  const validSig = (v) => typeof v === 'string' && v.length < 800000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v);
  function loadState() {
    const s = { gate: false, visited: {}, done: {}, petals: {}, clauses: {}, envelopes: {}, signs: {}, rose: false, signature: null, stamp: null, last: null, sound: false, coach: false };
    let raw = null;
    try { raw = JSON.parse(store.get(KEY)); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object') {
      Object.keys(s).forEach((k) => {
        const v = raw[k];
        if (s[k] !== null && typeof s[k] === 'object') { if (v && typeof v === 'object' && !Array.isArray(v)) s[k] = v; }
        else if (typeof s[k] === 'boolean') s[k] = v === true;
        else s[k] = v;
      });
    } else {
      // carry over what the first edition remembered
      if (store.get('marginalia.gate') === '1') s.gate = true;
      try { s.stamp = JSON.parse(store.get('marginalia.kept')); } catch (e) { s.stamp = null; }
    }
    if (!validStamp(s.stamp)) s.stamp = null;
    if (!validSig(s.signature)) s.signature = null;
    if (typeof s.last !== 'string' || !bySlug[s.last]) s.last = null;
    return s;
  }
  const S = loadState();
  const save = () => store.set(KEY, JSON.stringify(S));
  const done = (k) => !!S.done[k];
  const mark = (k, v) => { S.done[k] = v === undefined ? 1 : v; save(); };

  /* ===================== sound: Web Audio only, off by default ===================== */
  const SND = { on: false, ctx: null };
  function audioInit() {
    if (SND.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const ctx = new AC();
      SND.ctx = ctx;
      SND.master = ctx.createGain(); SND.master.gain.value = 0; SND.master.connect(ctx.destination);
      // vinyl crackle: faint hiss with sparse decaying clicks, low-passed, looped
      const len = ctx.sampleRate * 6, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let click = 0, amp = 0;
      for (let i = 0; i < len; i++) {
        if (click <= 0 && Math.random() < 0.0003) { click = 30 + Math.random() * 50; amp = 0.25 + Math.random() * 0.55; }
        let v = (Math.random() * 2 - 1) * 0.012;
        if (click > 0) { v += (Math.random() * 2 - 1) * amp * (click / 80); click--; }
        d[i] = v;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260;
      const g = ctx.createGain(); g.gain.value = 0.32;
      src.connect(hp).connect(lp).connect(g).connect(SND.master);
      src.start();
      return true;
    } catch (e) { SND.ctx = null; return false; }
  }
  function noiseSrc(sec) {
    const ctx = SND.ctx, len = Math.max(1, Math.floor(ctx.sampleRate * sec)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf; return s;
  }
  function envGain(t, peak, attack, decay) {
    const g = SND.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }
  const audible = () => SND.on && SND.ctx && !document.hidden;
  function swish() {
    if (!audible()) return;
    const ctx = SND.ctx, t = ctx.currentTime, s = noiseSrc(0.6), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.18); f.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    s.connect(f).connect(envGain(t, 0.4, 0.07, 0.45)).connect(SND.master); s.start(t);
  }
  function crack(vol) {
    if (!audible()) return;
    const ctx = SND.ctx, t = ctx.currentTime, v = vol || 0.5;
    [0, 0.045].forEach((dt, k) => {
      const s = noiseSrc(0.08), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1600;
      s.connect(f).connect(envGain(t + dt, v * (k ? 0.5 : 1), 0.002, 0.05)).connect(SND.master); s.start(t + dt);
    });
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    o.connect(envGain(t, v * 0.5, 0.004, 0.12)).connect(SND.master); o.start(t); o.stop(t + 0.2);
  }
  // soft two-note chime for unlocks: sine plus a quiet octave harmonic
  function chime() {
    if (!audible()) return;
    const ctx = SND.ctx, t = ctx.currentTime;
    [[659.25, 0], [987.77, 0.17]].forEach(([f, dt]) => {
      [[f, 0.2], [f * 2, 0.045]].forEach(([freq, peak]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        o.connect(envGain(t + dt, peak, 0.02, 1.5)).connect(SND.master); o.start(t + dt); o.stop(t + dt + 1.7);
      });
    });
  }
  function soundLabel(on) {
    const b = $('#sound');
    b.textContent = on ? UI.soundOn : UI.soundOff;
    b.setAttribute('aria-pressed', String(on));
  }
  function setSound(on, persist) {
    if (on && !audioInit()) on = false;
    SND.on = on;
    if (SND.ctx) {
      if (on && SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {});
      SND.master.gain.setTargetAtTime(on ? 0.7 : 0, SND.ctx.currentTime, 0.15);
    }
    if (persist !== false) { S.sound = on; save(); }
    soundLabel(on);
  }
  $('#sound').addEventListener('click', () => setSound(!S.sound));
  // a saved "sound: on" can only start after she touches something (browsers require a gesture)
  function firstGesture(e) {
    removeEventListener('pointerdown', firstGesture, true);
    removeEventListener('keydown', firstGesture, true);
    if (S.sound && !SND.ctx && !(e.target.closest && e.target.closest('#sound'))) setSound(true, false);
  }
  addEventListener('pointerdown', firstGesture, true);
  addEventListener('keydown', firstGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (!SND.ctx) return;
    if (document.hidden) SND.ctx.suspend().catch(() => {});
    else if (SND.on) SND.ctx.resume().catch(() => {});
  });

  /* ===================== drawings ===================== */
  const ORN = '<svg class="orn draw" viewBox="0 0 160 20" aria-hidden="true"><path pathLength="1" d="M4 10C24 2 40 18 62 10c8-3 12-4 18 0 6-4 10-3 18 0 22 8 38-8 58 0"/><path pathLength="1" style="--i:1" d="M80 4l4 6-4 6-4-6z"/></svg>';
  const ARROW = '<svg class="arrow" viewBox="0 0 40 24" aria-hidden="true"><path d="M37 5C27 2 13 6 5 17"/><path d="M5 17l1-8M5 17l8-1"/></svg>';
  const ROSE_WASH = 'M38 46c-4 18 6 34 23 34 17 0 28-12 26-28-2-16-14-26-28-25-11 1-19 8-21 19z';
  const ROSE = [
    ['M60 47c-3-2-7 1-5 5 2 3 8 2 9-2 1-5-5-9-10-7-6 2-8 10-4 15 5 6 15 4 18-3 3-8-2-16-10-18', 'ink'],
    ['M47 35c5-7 15-9 22-5 5 3 8 8 8 13', 'ink'],
    ['M45 44c-7 6-7 19 2 25 8 5 21 4 27-3', 'ink'],
    ['M74 66c7-7 8-19 2-26-4-5-10-7-16-6', 'ink'],
    ['M41 47c-4-6-3-13 3-17', 'ink'],
    ['M39 50c-5 13 4 27 21 29 14 1 25-9 26-21', 'ink'],
    ['M50 79c-4 3-9 4-13 3M70 79c4 3 9 4 13 3', 'leaf'],
    ['M60 80c-1 26 3 52-1 80-1 10 0 20 1 28', 'leaf'],
    ['M59 118c-9-9-25-9-34-1 9 7 25 8 34 1z', 'leaf'],
    ['M59 118c-11-3-21-2-30-1', 'leaf'],
    ['M60 142c9-10 25-11 34-5-8 8-24 10-34 5z', 'leaf'],
    ['M58 162l-6-4 6-1', 'leaf'],
  ];
  const roseSVG = () => `<svg class="rose" viewBox="0 0 120 196" aria-hidden="true"><path class="wash" d="${ROSE_WASH}"/>${ROSE.map(([d, k], i) => `<path class="${k}" pathLength="1" style="--i:${i}" d="${d}"/>`).join('')}</svg>`;
  const PETAL_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2C15 5 17.5 11 13.5 16 11.5 18.4 8.4 18.4 6.4 16.2 2.6 12 4.2 5.2 10 2z" fill="#F2B8CF"/><path d="M10 4.5C9 8.5 9.2 12.5 10.2 16" fill="none" stroke="#E59BBC" stroke-width=".9" stroke-linecap="round"/></svg>';
  function sealSVG() {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="${blob(50, 50, 45, 3.4, 16, 7)}" fill="url(#wax)"/>
      <path d="${blob(50, 50, 45, 3.4, 16, 7)}" fill="url(#waxSheen)"/>
      <path d="M18 42c10-9 22 4 34-3s22-1 28 8M24 64c9 5 18-6 30 0s16 6 22 0" fill="none" stroke="#B9A2F2" stroke-opacity=".28" stroke-width="2.2" stroke-linecap="round"/>
      <path d="${blob(50, 50, 33, 1.3, 14, 3)}" fill="none" stroke="#2B2580" stroke-opacity=".6" stroke-width="2.2"/>
      <path d="${blob(50, 50, 30, 1, 14, 5)}" fill="none" stroke="#ECE4FF" stroke-opacity=".3" stroke-width="1"/>
      <text x="51.2" y="52.2" text-anchor="middle" dominant-baseline="central" fill="#11163A" fill-opacity=".55">C</text>
      <text x="49" y="50" text-anchor="middle" dominant-baseline="central" fill="#F1DDA6" fill-opacity=".55">C</text>
      <text x="50" y="51" text-anchor="middle" dominant-baseline="central" fill="#D9B45F">C</text></svg>`;
  }
  // the crossed-out word: only generated loops of ink, there is no word underneath
  function buildScribble(svg) {
    const W = 150, H = 44, tri = (u) => { const m = u % 2; return m < 1 ? m : 2 - m; };
    const pass = (seed, loops, sweeps, width, delay, dur) => {
      const R = rng(seed), pts = [], n = loops * 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = t * loops * Math.PI * 2, r = H * (0.2 + 0.13 * R());
        const x = 10 + (W - 20) * tri(t * sweeps) + Math.cos(a) * r * 0.85;
        const y = H / 2 + Math.sin(a) * r + (R() - 0.5) * H * 0.12;
        pts.push([Math.max(2, Math.min(W - 2, x)), Math.max(3, Math.min(H - 3, y))]);
      }
      return `<path pathLength="1" stroke-width="${width}" style="--d:${delay}s;--dur:${dur}s" d="${smooth(pts, false)}"/>`;
    };
    svg.innerHTML =
      pass(11, 10, 1, 2.3, 0, 0.75) + pass(23, 8, 2, 1.7, 0.55, 0.55) + pass(37, 12, 3, 1.2, 0.95, 0.55) +
      `<path class="blot" d="${blob(136, 30, 3.6, 1.1, 9, 12)}"/><path class="blot" d="${blob(129, 36, 1.3, 0.4, 7, 4)}"/>`;
    svg.setAttribute('aria-label', UI.scribble);
  }
  function stampSVG(seed) {
    const R = rng(seed), spat = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.75 + R() * 1.5), d = 50 + R() * 14; // never below the stamp, where the date sits
      spat.push(`<circle cx="${fx(50 + Math.cos(a) * d)}" cy="${fx(50 + Math.sin(a) * d)}" r="${fx(0.6 + R() * 1.8)}"/>`);
    }
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${UI.stamp}">
      <g filter="url(#rough)" fill="none" stroke="url(#stampInk)" opacity=".92">
        <path d="${blob(50, 50, 44, 1.2, 18, seed)}" stroke-width="4.2"/>
        <path d="${blob(50, 50, 37.5, 0.8, 16, seed + 1)}" stroke-width="1.3"/>
        <path d="M50 60C38 52 32 45 35 38c3-7 12-7 15 0 3-7 12-7 15 0 3 7-3 14-15 22z" fill="url(#stampInk)" stroke="none"/>
        <path d="M33 72c10-4 24-4 34 1" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M60 71c3-5 8-6 12-4-2 4-7 6-12 4zM46 70c-3-4-8-5-11-3 2 4 7 5 11 3z" fill="url(#stampInk)" stroke="none"/>
        <circle cx="66" cy="68" r="3.2" stroke-width="1.4"/>
      </g>
      <g class="spat">${spat.join('')}</g></svg>`;
  }
  const ENVELOPE = '<svg viewBox="0 0 52 38" aria-hidden="true"><rect class="body" x="1" y="2" width="50" height="34" rx="2"/><path d="M1 36l18-15M51 36L33 21" fill="none" stroke="#4B44C6" stroke-width="1.2"/><path class="flapline" d="M1 2h50L26 22z"/><circle class="wax" cx="26" cy="21" r="4.5"/></svg>';
  function clockSVG() {
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r1 = i % 3 ? 40 : 36;
      ticks += `<line class="tick" x1="${fx(50 + Math.sin(a) * r1)}" y1="${fx(50 - Math.cos(a) * r1)}" x2="${fx(50 + Math.sin(a) * 43)}" y2="${fx(50 - Math.cos(a) * 43)}"/>`;
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="face" cx="50" cy="50" r="46"/>${ticks}<line class="hh" x1="50" y1="50" x2="50" y2="28"/><line class="mm" x1="50" y1="50" x2="50" y2="15"/><circle cx="50" cy="50" r="3" fill="#D9B45F"/></svg>`;
  }
  function shelfSVG() {
    const W = [16, 13, 18, 14, 17, 12, 15, 19], Hh = [96, 84, 104, 90, 100, 80, 94, 88];
    const spine = (x, w, h, i) => {
      const y = 128 - h, c = i % 2 ? '#7A4FD8' : '#2A5FD6';
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="url(#spineSheen)"/>` +
        (i % 3 ? `<rect x="${x + 2}" y="${y + 10}" width="${w - 4}" height="1.6" fill="#D9B45F" opacity=".8"/>` : '');
    };
    let out = '', x = 10, i = 0;
    while (x + W[i % 8] < 152) { out += spine(x, W[i % 8], Hh[i % 8], i); x += W[i % 8] + 1.5; i++; }
    x = 218; i = 3;
    while (x + W[i % 8] < 252) { out += spine(x, W[i % 8], Hh[i % 8], i); x += W[i % 8] + 1.5; i++; }
    return `<svg class="shelf-art" viewBox="0 0 260 150" role="img" aria-label="${UI.shelf}">
      <rect x="0" y="18" width="260" height="110" fill="#ECE4FF" opacity=".55"/>
      ${out}
      <rect x="0" y="128" width="260" height="11" rx="2" fill="#262E6B"/><rect x="0" y="128" width="260" height="2" fill="#4B44C6"/>
      <rect x="4" y="139" width="252" height="5" fill="#1A2152" opacity=".35"/></svg>`;
  }

  /* ===================== clickable cues: shimmer until used once ===================== */
  function cue(node, key) {
    const k = 'cue:' + key;
    if (S.done[k]) return;
    node.classList.add('cue');
    const tag = el('span', 'tap-tag', UI.tap);
    tag.setAttribute('aria-hidden', 'true');
    if (node.tagName !== 'INPUT') node.appendChild(tag);
    const spend = () => {
      node.classList.remove('cue');
      tag.remove();
      S.done[k] = 1; save();
      node.removeEventListener('pointerdown', spend);
      node.removeEventListener('keydown', onKey);
      node.removeEventListener('input', spend);
    };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key.indexOf('Arrow') === 0) spend(); };
    node.addEventListener('pointerdown', spend);
    node.addEventListener('keydown', onKey);
    node.addEventListener('input', spend);
  }

  /* ===================== shared pieces ===================== */
  function slip(m, at, k) {
    const f = el('figure', 'slip ' + m.who);
    if (k != null) f.style.setProperty('--k', k);
    f.appendChild(el('figcaption', 'slip-who', NAMES[m.who]));
    const q = el('blockquote', 'slip-text');
    q.appendChild(el('p', '', m.text));
    f.appendChild(q);
    if (at) f.appendChild(el('p', 'slip-at', at));
    return f;
  }
  // "same time" slips reuse the timestamp before them
  function withTimes(items) {
    let at = '';
    return items.map((m) => { if (m.at) at = m.at; return [m, at]; });
  }
  function marginNote(b) {
    const a = el('aside', 'mnote');
    a.setAttribute('aria-label', UI.marginNote);
    a.innerHTML = ARROW;
    const span = el('span');
    if (b.struck) {
      const n = b.struck, st = el('s', 'struck', n.struck), nb = el('span', 'nb');
      st.insertAdjacentHTML('beforeend', '<svg class="scratch" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M1 6C18 3 34 8 52 5s34-3 47-2"/><path pathLength="1" style="--i:1" d="M3 3c24 4 50 1 95 5"/></svg>');
      // the quote marks travel with the struck phrase so a line break never strands them
      nb.append(n.open, st, n.close);
      span.append(n.before, nb, n.after);
    } else {
      span.textContent = b.text;
    }
    a.appendChild(span);
    return a;
  }
  const off = (node) => { node.style.animation = 'none'; return node; };

  /* ===================== renderers, one per block type ===================== */
  const R = {};

  R.prose = (b) => {
    const d = el('div', 'prose' + (b.card ? ' card-note' : ''));
    b.paras.forEach((t) => d.appendChild(el('p', '', t)));
    return d;
  };

  R.poem = (b) => {
    const d = el('div', 'poem-blk');
    d.insertAdjacentHTML('beforeend', ORN);
    const p = el('p', 'poem');
    b.lines.forEach((line, i) => { if (i) p.appendChild(document.createElement('br')); p.appendChild(document.createTextNode(line)); });
    d.appendChild(p);
    return d;
  };

  R.margin = marginNote;

  R.messages = (b, ch) => {
    const wrap = el('div', 'msg-block');
    const box = el('div', 'messages' + (b.pinned ? ' pinned' : ''));
    wrap.appendChild(box);
    const list = withTimes(b.items);
    const cap = b.caption ? el('p', 'caption-line', b.caption) : null;
    const key = ch.slug + ':transcript';
    if (b.play && !done(key)) {
      box.setAttribute('aria-live', 'polite');
      const act = el('div', 'actions');
      act.style.marginTop = '0';
      const play = button(b.play);
      act.appendChild(play);
      wrap.appendChild(act);
      cue(play, key);
      play.addEventListener('click', () => {
        act.remove();
        let i = 0;
        const step = () => {
          if (i >= list.length) { if (cap) wrap.appendChild(cap); mark(key); return; }
          const [m, at] = list[i];
          const typing = el('div', 'slip typing ' + m.who);
          typing.innerHTML = '<i></i><i></i><i></i>';
          typing.setAttribute('aria-hidden', 'true');
          box.appendChild(typing);
          scrollTo(typing);
          setTimeout(() => { typing.replaceWith(slip(m, at)); i++; setTimeout(step, 380); }, RM() ? 250 : 950);
        };
        step();
      });
    } else {
      list.forEach(([m, at], k) => box.appendChild(slip(m, at, k)));
      if (cap) wrap.appendChild(cap);
    }
    return wrap;
  };

  R.feed = (b, ch, ctx) => {
    const key = ch.slug + ':feed';
    const wrap = el('div', 'feed-wrap');
    const year = el('p', 'year', String(b.from));
    const feed = el('div', 'feed');
    feed.dataset.noSwipe = '';
    feed.setAttribute('role', 'img');
    feed.setAttribute('aria-label', UI.feed);
    const H = 84, POOL = 6, VIEW = 270, CARD = 74, center = (VIEW - CARD) / 2;
    const cards = [];
    for (let i = 0; i < POOL; i++) { const c = el('div', 'fcard'); feed.appendChild(c); cards.push(c); }
    const stop = button(b.button);
    const capSpot = el('div');
    wrap.append(year, feed, stop, capSpot);
    const WIDTHS = [70, 52, 84, 60, 46, 76, 58, 66, 80];
    const generic = (c, s) => {
      const w = WIDTHS[((s % 9) + 9) % 9];
      c.className = 'fcard';
      c.innerHTML = `<span class="av"></span><span class="lines"><span class="ln" style="width:${w}%"></span><span class="ln" style="width:${w - 24}%"></span></span>`;
    };
    const her = (c) => {
      c.className = 'fcard her';
      c.innerHTML = `<span class="mini-rose">${roseSVG()}</span><span class="name"></span>`;
      c.querySelector('.name').textContent = b.name;
    };
    let offset = 0, herSlot = -1, target = -1, startOff = 0, stopT = 0, raf = 0, last = 0, landed = false;
    const DUR = 2600;
    const span = b.to - b.from;
    function paint() {
      const first = Math.floor(offset / H);
      for (let s = first; s < first + POOL; s++) {
        const c = cards[((s % POOL) + POOL) % POOL];
        if (c.dataset.slot !== String(s)) { c.dataset.slot = String(s); if (s === herSlot) her(c); else generic(c, s); }
        c.style.transform = `translateY(${(s * H - offset).toFixed(1)}px)`;
      }
    }
    function frame(t) {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      if (target < 0) {
        offset += dt * 0.9;
        year.textContent = String(b.from + (Math.floor(offset / (H * 2)) % span));
      } else {
        const k = Math.min(1, (t - stopT) / DUR), e = 1 - Math.pow(1 - k, 3);
        offset = startOff + (target - startOff) * e;
        year.textContent = String(k >= 1 ? b.to : Math.min(b.to - 1, b.from + (Math.floor(offset / (H * 2)) % span)));
        if (k >= 1) { land(true); return; }
      }
      paint();
      raf = requestAnimationFrame(frame);
    }
    function run() {
      if (landed || raf || RM()) return;
      feed.classList.add('moving');
      last = 0;
      raf = requestAnimationFrame(frame);
    }
    function pause() { cancelAnimationFrame(raf); raf = 0; }
    function land(live) {
      pause();
      landed = true;
      offset = herSlot * H - center;
      feed.classList.remove('moving');
      paint();
      year.textContent = String(b.to);
      stop.hidden = true;
      const cap = el('p', 'caption-line', b.caption);
      if (!live) off(cap);
      capSpot.appendChild(cap);
      if (live) { mark(key); chime(); say(b.name + '. ' + b.to + '. ' + b.caption); }
    }
    stop.addEventListener('click', () => {
      if (landed || target >= 0) return;
      herSlot = Math.floor(offset / H) + 10;
      target = herSlot * H - center;
      if (!raf) { land(true); return; }
      startOff = offset;
      stopT = performance.now();
    });
    if (done(key)) { herSlot = 5; land(false); } else { paint(); cue(stop, key); }
    ctx.enter.push(run);
    ctx.leave.push(() => { if (target < 0) pause(); });
    return wrap;
  };

  R.wordStack = (b, ch) => {
    const key = ch.slug + ':words';
    const wrap = el('div', 'wordstack');
    const f = off(el('figure', 'slip ' + b.who));
    f.appendChild(el('figcaption', 'slip-who', NAMES[b.who]));
    const stack = button(null, 'stack');
    stack.setAttribute('aria-label', UI.wordNext);
    const ghost = el('span', 'ghost', UI.tap);
    ghost.setAttribute('aria-hidden', 'true');
    stack.appendChild(ghost);
    const live = el('span', 'sr');
    live.setAttribute('aria-live', 'polite');
    f.append(stack, live, el('p', 'slip-at', b.at));
    wrap.appendChild(f);
    let n = 0;
    const add = (anim) => { const w = el('span', 'w', b.words[n++]); if (!anim) off(w); stack.insertBefore(w, ghost); };
    const finish = (anim) => {
      ghost.remove();
      stack.disabled = true;
      stack.removeAttribute('aria-label');
      const r = slip(b.reply, b.at);
      if (!anim) off(r);
      wrap.appendChild(r);
    };
    if (done(key)) { while (n < b.words.length) add(false); finish(false); } else cue(stack, key);
    stack.addEventListener('click', () => {
      if (n >= b.words.length) return;
      add(true);
      live.textContent = b.words[n - 1];
      if (n === b.words.length) { mark(key); setTimeout(() => { finish(true); swish(); }, RM() ? 100 : 600); }
    });
    return wrap;
  };

  R.ribbons = (b, ch) => {
    const wrap = el('div', 'ribbons-block');
    const book = el('div', 'book');
    book.innerHTML = '<div class="book-edge" aria-hidden="true"></div>';
    const rib = el('div', 'ribbons');
    rib.setAttribute('role', 'group');
    rib.setAttribute('aria-label', UI.ribbonsGroup);
    book.appendChild(rib);
    const count = el('p', 'count');
    const notes = el('div', 'notes');
    notes.setAttribute('aria-live', 'polite');
    const doneLine = el('p', 'done-line', b.done);
    doneLine.hidden = true;
    const pull = frag(`<figure class="pull" hidden><svg class="qmark draw" viewBox="0 0 60 44" aria-hidden="true"><path pathLength="1" d="M25 5C13 9 6 19 7 29c1 6 5 9 9 9 5-1 8-5 6-10-2-4-8-5-11-1"/><path pathLength="1" style="--i:1" d="M53 5C41 9 34 19 35 29c1 6 5 9 9 9 5-1 8-5 6-10-2-4-8-5-11-1"/></svg><blockquote><p></p></blockquote></figure>`);
    pull.querySelector('p').textContent = b.quote;
    const act = el('div', 'actions');
    const turn = button(b.turn, 'btn appear');
    turn.hidden = true;
    turn.addEventListener('click', goNext);
    act.appendChild(turn);
    wrap.append(book, count, notes, doneLine, pull, act);
    const read = new Set(), total = b.items.length, parts = [];
    const H = [126, 140, 118, 134, 146, 124], ROT = [-1.4, 0.9, -0.5, 1.2, -1, 0.6];
    b.items.forEach((r, i) => {
      const tone = i % 2 ? 'purple' : 'blue';
      const btn = button(null, 'ribbon');
      btn.dataset.tone = tone;
      btn.style.setProperty('--h', H[i % H.length] + 'px');
      btn.style.setProperty('--r', ROT[i % ROT.length] + 'deg');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', `${ch.slug}-note${i}`);
      btn.setAttribute('aria-label', UI.ribbonLabel(r.label));
      btn.appendChild(el('span', '', r.label));
      const card = el('div', 'note-card');
      card.id = `${ch.slug}-note${i}`;
      card.dataset.tone = tone;
      card.dataset.i = i;
      card.append(el('h3', '', r.label), el('p', '', r.note));
      btn.addEventListener('click', () => pullOne(i, true));
      rib.appendChild(btn);
      parts.push({ btn, card });
    });
    function pullOne(i, live) {
      const { btn, card } = parts[i];
      if (read.has(i)) { if (live) scrollTo(card); return; }
      read.add(i);
      btn.setAttribute('aria-expanded', 'true');
      // inserted (not unhidden) so the live region announces it; kept in ribbon order
      const later = $$('.note-card', notes).find((c) => +c.dataset.i > i);
      notes.insertBefore(live ? card : off(card), later || null);
      count.textContent = b.counter(read.size, total);
      if (live) { mark(`${ch.slug}:ribbon:${i}`); swish(); requestAnimationFrame(() => scrollTo(card)); }
      if (read.size !== total) return;
      if (live) {
        setTimeout(() => { doneLine.hidden = false; }, 700);
        setTimeout(() => { pull.hidden = false; }, 1900);
        setTimeout(() => { turn.hidden = false; scrollTo(turn); }, 3300);
      } else {
        doneLine.hidden = false; pull.hidden = false; turn.hidden = false;
      }
    }
    count.textContent = b.counter(0, total);
    b.items.forEach((_, i) => { if (done(`${ch.slug}:ribbon:${i}`)) pullOne(i, false); else cue(parts[i].btn, `${ch.slug}:ribbon:${i}`); });
    return wrap;
  };

  R.colourMixer = (b, ch, ctx) => {
    const key = ch.slug + ':indigo';
    const wrap = el('div', 'mixer');
    wrap.dataset.noSwipe = '';
    wrap.innerHTML = '<div class="drop" aria-hidden="true"><svg viewBox="0 0 80 104"><path fill="currentColor" d="M40 4C30 26 10 44 10 66a30 30 0 0 0 60 0C70 44 50 26 40 4z"/><path d="M25 62c0 11 6 19 15 21" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/></svg></div>';
    const input = el('input');
    input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1'; input.value = '20';
    input.setAttribute('aria-label', UI.mixer);
    const ends = el('div', 'mix-ends');
    ends.append(el('span', '', b.left), el('span', '', b.right));
    const sayLine = el('p', 'mix-say');
    sayLine.setAttribute('aria-live', 'polite');
    const plateSpot = el('div');
    wrap.append(input, ends, sayLine, plateSpot);
    const C = { blue: [42, 95, 214], indigo: [75, 68, 198], purple: [122, 79, 216] };
    const mix = (a, c, t) => a.map((v, i) => Math.round(v + (c[i] - v) * t));
    const plate = (anim) => { const p = el('div', 'bookplate', b.plate); if (!anim) off(p); plateSpot.appendChild(p); };
    function update(live) {
      const v = +input.value;
      const rgb = v <= 50 ? mix(C.blue, C.indigo, v / 50) : mix(C.indigo, C.purple, (v - 50) / 50);
      wrap.style.setProperty('--mix', `rgb(${rgb.join(',')})`);
      ctx.sheet.style.setProperty('--glow', `rgba(${rgb.join(',')},.5)`);
      const centre = Math.abs(v - 50) <= 3;
      const text = v <= 5 ? b.says.left : v >= 95 ? b.says.right : centre ? b.says.center : b.says.between;
      if (sayLine.textContent !== text) sayLine.textContent = text;
      input.setAttribute('aria-valuetext', text);
      if (live && centre && !done(key)) { mark(key); chime(); plate(true); }
    }
    input.addEventListener('input', () => update(true));
    if (done(key)) plate(false);
    update(false);
    cue(wrap, key);
    return wrap;
  };

  R.auraCards = (b, ch) => {
    const wrap = el('div', 'aura-block');
    wrap.appendChild(el('h3', 'sub-head', b.heading));
    const grid = el('div', 'auras');
    b.cards.forEach((c, i) => {
      const card = el('div', 'aura');
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.setAttribute('aria-pressed', 'false');
      const front = el('div', 'aura-face front');
      front.appendChild(el('h4', '', c.front));
      const back = el('div', 'aura-face back');
      back.setAttribute('aria-hidden', 'true');
      back.appendChild(el('div', 'orb' + (c.tint === 'gold' ? ' gold' : '')));
      if (c.slip) back.appendChild(slip(c.slip, c.slip.at));
      else { const t = el('div'); t.append(el('p', 'aura-by', NAMES.corey), el('p', 'aura-text', c.text)); back.appendChild(t); }
      card.append(front, back);
      const flip = () => {
        const on = !card.classList.contains('flipped');
        card.classList.toggle('flipped', on);
        card.setAttribute('aria-pressed', String(on));
        back.setAttribute('aria-hidden', String(!on));
        front.setAttribute('aria-hidden', String(on));
        swish();
      };
      card.addEventListener('click', flip);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      cue(card, `${ch.slug}:aura:${i}`);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  };

  R.annotations = (b, ch) => {
    const wrap = el('div', 'annot');
    const page = el('div', 'ruled');
    page.setAttribute('aria-live', 'polite');
    const tabs = el('div', 'tabs');
    b.tabs.forEach((t, i) => {
      const tab = button(t.label, 'tab');
      tab.setAttribute('aria-pressed', 'false');
      tab.setAttribute('aria-label', UI.tabLabel(t.label));
      tab.addEventListener('click', () => {
        $$('.tab', tabs).forEach((x) => x.setAttribute('aria-pressed', 'false'));
        tab.setAttribute('aria-pressed', 'true');
        tab.dataset.read = '';
        page.textContent = '';
        page.append(el('h4', '', t.label), el('p', '', t.note));
        swish();
      });
      cue(tab, `${ch.slug}:tab:${i}`);
      tabs.appendChild(tab);
    });
    wrap.append(page, tabs);
    return wrap;
  };

  R.shelf = (b, ch) => {
    const key = ch.slug + ':shelf';
    const wrap = el('div', 'shelf-block');
    const shelf = el('div', 'shelf');
    shelf.innerHTML = shelfSVG();
    const slot = button(null, 'slot');
    slot.setAttribute('aria-label', UI.shelfSlot);
    slot.appendChild(el('span', '', b.reserved));
    shelf.appendChild(slot);
    const pickSpot = el('div');
    wrap.append(shelf, pickSpot);
    const place = (anim) => {
      slot.classList.add('filled');
      slot.textContent = '';
      const book = el('span', 'placed');
      book.appendChild(el('span', '', b.spine));
      slot.appendChild(anim ? book : off(book));
      slot.disabled = true;
      slot.setAttribute('aria-label', b.spine);
      const card = el('p', 'staff-pick', b.pick);
      pickSpot.appendChild(anim ? card : off(card));
    };
    if (done(key)) place(false); else cue(slot, key);
    slot.addEventListener('click', () => { if (done(key)) return; mark(key); place(true); chime(); });
    return wrap;
  };

  R.clock = (b) => {
    const wrap = el('div', 'clock-block');
    let F;
    try {
      const mk = (tz, h23) => new Intl.DateTimeFormat('en-US', h23 ? { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : { timeZone: tz, hour: 'numeric', minute: '2-digit' });
      F = [['on', b.on, mk('America/Toronto'), mk('America/Toronto', true)], ['bc', b.bc, mk('America/Vancouver'), mk('America/Vancouver', true)]];
    } catch (e) { wrap.hidden = true; return wrap; }
    const row = el('div', 'clocks');
    const faces = F.map(([cls, label]) => {
      const c = el('div', 'clock ' + cls);
      c.setAttribute('role', 'img');
      c.innerHTML = clockSVG();
      c.appendChild(el('p', 'cap', label));
      row.appendChild(c);
      return c;
    });
    const cap = el('p', 'clock-cap');
    wrap.append(row, cap);
    function tick() {
      const d = new Date(), txt = [];
      F.forEach(([, label, pretty, h23], i) => {
        const parts = h23.format(d).split(':');
        const h = (+parts[0]) % 24, m = +parts[1] || 0;
        const face = faces[i];
        $('.hh', face).style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
        $('.mm', face).style.transform = `rotate(${m * 6}deg)`;
        const t = pretty.format(d);
        face.setAttribute('aria-label', UI.clockLabel(label, t));
        txt.push(t);
      });
      cap.textContent = b.caption(txt[0], txt[1]);
    }
    tick();
    setInterval(tick, 30000);
    return wrap;
  };

  R.timeline = (b, ch) => {
    const wrap = el('div', 'thread-block');
    const ol = el('ol', 'thread');
    const doneLine = el('p', 'done-line', b.done);
    doneLine.hidden = true;
    const total = b.days.length;
    const opened = () => b.days.filter((_, i) => S.envelopes[i]).length;
    b.days.forEach((d, i) => {
      const li = el('li', 'day');
      const env = button(null, 'env');
      env.setAttribute('aria-expanded', 'false');
      env.setAttribute('aria-label', UI.envelope(d.label));
      env.innerHTML = ENVELOPE;
      const lab = el('span', 'env-label');
      lab.appendChild(el('b', '', d.label));
      if (d.sub) lab.appendChild(el('i', '', d.sub));
      env.appendChild(lab);
      const body = el('div', 'day-body');
      body.hidden = true;
      li.append(env, body);
      ol.appendChild(li);
      const open = (live) => {
        li.classList.add('open');
        env.setAttribute('aria-expanded', 'true');
        env.setAttribute('aria-label', d.label);
        body.hidden = false;
        let at = '', k = 0;
        d.items.forEach((it) => {
          let n;
          if (it.note) { n = el('p', 'day-note', it.note); n.style.setProperty('--k', k++); }
          else { if (it.at) at = it.at; n = slip(it, at, k++); }
          body.appendChild(live ? n : off(n));
        });
      };
      env.addEventListener('click', () => {
        if (li.classList.contains('open')) { scrollTo(body); return; }
        S.envelopes[i] = 1; save();
        open(true);
        swish();
        say(d.label);
        if (opened() === total) setTimeout(() => { doneLine.hidden = false; chime(); say(b.done); }, 1200);
      });
      if (S.envelopes[i]) open(false); else cue(env, `${ch.slug}:env:${i}`);
    });
    if (opened() === total) doneLine.hidden = false;
    wrap.append(ol, doneLine);
    return wrap;
  };

  R.signDeck = (b, ch) => {
    const wrap = el('div', 'signs-block');
    const deck = el('div', 'deck');
    const count = el('p', 'count');
    const reader = el('div', 'sign-read');
    reader.hidden = true;
    reader.setAttribute('aria-live', 'polite');
    const tenth = el('p', 'tenth', b.tenth);
    tenth.hidden = true;
    const total = b.cards.length;
    const turned = () => b.cards.filter((_, i) => S.signs[i]).length;
    const show = (c) => { reader.hidden = false; reader.textContent = ''; reader.append(el('b', '', `${c.n}. ${c.title}`), el('p', '', c.text)); };
    function update(live) {
      const n = turned();
      count.textContent = b.counter(n, total);
      if (n === total && tenth.hidden) {
        tenth.hidden = false;
        if (live) setTimeout(() => { chime(); say(b.tenth); scrollTo(tenth); }, 600); else off(tenth);
      }
    }
    b.cards.forEach((c, i) => {
      const card = button(null, 'sign');
      card.setAttribute('aria-label', UI.signCard(c.n));
      const down = el('span', 'sign-face down', c.n);
      down.setAttribute('aria-hidden', 'true');
      const up = el('span', 'sign-face up');
      up.append(el('b', '', c.n), el('span', '', c.title));
      card.append(down, up);
      const flip = (live) => {
        card.classList.add('flipped');
        card.setAttribute('aria-label', `${c.n}. ${c.title}`);
        if (live) { S.signs[i] = 1; save(); swish(); }
        update(live);
      };
      card.addEventListener('click', () => { if (!card.classList.contains('flipped')) flip(true); show(c); });
      if (S.signs[i]) flip(false); else cue(card, `${ch.slug}:sign:${i}`);
      deck.appendChild(card);
    });
    update(false);
    wrap.append(deck, count, reader, tenth);
    return wrap;
  };

  R.drawer = (b, ch, ctx) => {
    const keyOpen = ch.slug + ':drawer';
    const wrap = el('div', 'drawer-block');
    const cab = el('div', 'cabinet');
    const front = button(b.open, 'drawer-front');
    front.setAttribute('aria-expanded', 'false');
    const tray = el('div', 'tray');
    const folds = el('div', 'folds');
    tray.appendChild(folds);
    cab.append(front, tray);
    const view = el('div', 'poem-view');
    view.hidden = true;
    wrap.append(cab, view);
    const setOpen = (on, live) => {
      cab.classList.toggle('open', on);
      front.setAttribute('aria-expanded', String(on));
      $$('.fold', folds).forEach((f) => { f.tabIndex = on ? 0 : -1; });
      if (on && live) { mark(keyOpen); swish(); }
    };
    front.addEventListener('click', () => setOpen(!cab.classList.contains('open'), true));
    let returnTo = null;
    function openPoem(i) {
      const p = b.poems[i];
      returnTo = $$('.fold', folds)[i];
      view.textContent = '';
      const page = el('article', 'poem-page');
      page.dataset.tone = p.tone;
      const h = el('h3', '', p.title);
      h.tabIndex = -1;
      page.append(h, el('p', 'date', p.date));
      let k = 0;
      p.stanzas.forEach((st) => {
        const s = el('p', 'stanza');
        st.forEach((line) => { const ln = el('span', 'ln', line); ln.style.setProperty('--k', k++); s.appendChild(ln); });
        page.appendChild(s);
      });
      const act = el('div', 'actions');
      const fold = button(b.fold);
      fold.addEventListener('click', closePoem);
      act.appendChild(fold);
      page.appendChild(act);
      view.appendChild(page);
      view.hidden = false;
      cab.hidden = true;
      mark(`${ch.slug}:poem:${i}`);
      swish();
      h.focus({ preventScroll: true });
      scrollTo(page, 'start');
    }
    function closePoem() {
      view.hidden = true;
      view.textContent = '';
      cab.hidden = false;
      swish();
      if (returnTo) returnTo.focus({ preventScroll: true });
      scrollTo(cab);
    }
    b.poems.forEach((p, i) => {
      const f = button(p.title, 'fold');
      f.dataset.tone = p.tone;
      f.style.setProperty('--fr', [-4, 2, 5][i % 3] + 'deg');
      f.setAttribute('aria-label', UI.note(p.title));
      f.addEventListener('click', () => openPoem(i));
      cue(f, `${ch.slug}:poem:${i}`);
      folds.appendChild(f);
    });
    setOpen(done(keyOpen), false);
    if (!done(keyOpen)) cue(front, keyOpen);
    ctx.escape = () => { if (view.hidden) return false; closePoem(); return true; };
    return wrap;
  };

  R.scroll = (b, ch) => {
    const key = ch.slug + ':list';
    const wrap = el('div', 'scroll');
    const top = el('div', 'roller');
    top.setAttribute('aria-hidden', 'true');
    const paper = el('div', 'paper');
    const ol = el('ol');
    ol.setAttribute('aria-live', 'polite');
    paper.appendChild(ol);
    const handle = button(null, 'roller');
    handle.setAttribute('aria-label', UI.scrollHandle);
    handle.dataset.noSwipe = '';
    const count = el('p', 'count', b.counter(b.items.length));
    const tools = el('div', 'scroll-tools');
    const unroll = button(b.unroll);
    const all = button(b.all, 'btn quiet');
    tools.append(unroll, all);
    const doneLine = el('p', 'done-line', b.done);
    doneLine.hidden = true;
    wrap.append(top, paper, handle, count, tools, doneLine);
    const total = b.items.length;
    let shown = 0, timer = 0;
    const stopAuto = () => { clearInterval(timer); timer = 0; };
    function reveal(n, live) {
      const upto = Math.min(n, total);
      if (upto <= shown) return;
      while (shown < upto) {
        const li = el('li');
        li.append(el('span', 'like', b.prefix), ' ' + b.items[shown]);
        ol.appendChild(live ? li : off(li));
        shown++;
      }
      if (live) mark(key, shown);
      if (shown < total) return;
      stopAuto();
      tools.hidden = true;
      handle.disabled = true;
      doneLine.hidden = false;
      if (live) { chime(); setTimeout(() => scrollTo(doneLine), 300); } else off(doneLine);
    }
    unroll.addEventListener('click', () => {
      if (timer) { stopAuto(); return; }
      reveal(shown + 1, true);
      timer = setInterval(() => { reveal(shown + 1, true); scrollTo(handle); }, RM() ? 200 : 340);
    });
    all.addEventListener('click', () => { stopAuto(); reveal(total, true); });
    let dragY = null, base = 0, dragged = false;
    handle.addEventListener('pointerdown', (e) => {
      dragY = e.clientY; base = shown; dragged = false;
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
    });
    handle.addEventListener('pointermove', (e) => {
      if (dragY === null) return;
      const n = base + Math.floor((e.clientY - dragY) / 24);
      if (n > shown) { dragged = true; stopAuto(); reveal(n, true); }
    });
    ['pointerup', 'pointercancel'].forEach((t) => handle.addEventListener(t, () => { dragY = null; }));
    handle.addEventListener('click', () => { if (!dragged) reveal(shown + 1, true); dragged = false; });
    handle.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); reveal(shown + 1, true); } });
    reveal(+S.done[key] || 0, false);
    if (shown < total) { cue(handle, key + ':handle'); cue(unroll, key); }
    return wrap;
  };

  R.clauses = (b, ch) => {
    const wrap = el('div', 'contract-block');
    const ol = el('ol', 'contract');
    const doneLine = el('p', 'done-line', b.done);
    doneLine.hidden = true;
    const total = b.items.length;
    const signed = () => b.items.filter((_, i) => S.clauses[i]).length;
    b.items.forEach((c, i) => {
      const li = el('li', 'clause');
      const p = el('p');
      p.append(el('b', '', c.title), ' ' + c.text);
      const inits = el('div', 'inits');
      inits.appendChild(el('span', 'init co', b.co));
      const btn = button(b.button, 'btn small');
      btn.setAttribute('aria-label', UI.initial(i + 1));
      inits.appendChild(btn);
      li.append(p, inits);
      ol.appendChild(li);
      const ink = (anim) => {
        const ca = el('span', 'init ca', b.ca);
        btn.replaceWith(anim ? ca : off(ca));
      };
      btn.addEventListener('click', () => {
        S.clauses[i] = 1; save();
        const hadFocus = document.activeElement === btn;
        ink(true);
        swish();
        const nextBtn = $('.inits .btn', ol);
        if (hadFocus && nextBtn) nextBtn.focus({ preventScroll: true });
        if (signed() === total) setTimeout(() => { doneLine.hidden = false; chime(); say(b.done); scrollTo(doneLine); }, 700);
      });
      if (S.clauses[i]) ink(false); else cue(btn, `${ch.slug}:clause:${i}`);
    });
    $$('.init', ol).forEach((n) => n.classList.add('hand'));
    if (signed() === total) doneLine.hidden = false;
    wrap.append(ol, doneLine);
    return wrap;
  };

  // the rose in two halves: hers to ink, his already inked
  const HALF = [
    'M60 22C44 20 28 30 24 47C20 66 32 84 60 88',
    'M60 34C48 34 38 42 38 53C38 64 47 72 60 72',
    'M60 46C54 46 49 50 50 55C51 60 56 62 60 60',
    'M60 22C52 28 50 36 54 42',
    'M60 88C54 92 46 93 40 90',
    'M60 112C50 103 36 103 27 110C36 118 50 119 60 112',
  ];
  const STEM = 'M60 88C59 104 61 120 60 136';
  const HALF_WASH = 'M60 24C40 24 26 40 28 58C30 76 44 86 60 86C76 86 90 76 92 58C94 40 80 24 60 24Z';
  R.roseHalves = (b, ch, ctx) => {
    const wrap = el('div', 'halves');
    wrap.dataset.noSwipe = '';
    const paths = (extra) => HALF.map((d) => `<path d="${d}"${extra || ''}/>`).join('');
    const MIRROR = 'matrix(-1 0 0 1 120 0)';
    const maskId = ch.slug + '-trace';
    wrap.innerHTML = `<svg viewBox="0 0 120 140" role="img" aria-label="${UI.roseTrace}">
      <defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="140"><path class="trail" d="" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>
      <path class="wash" d="${HALF_WASH}"/>
      <g class="l">${paths()}<path class="stem" d="${STEM}"/></g>
      <g class="dots" transform="${MIRROR}">${paths()}</g>
      <g class="trace" mask="url(#${maskId})"><g class="r" transform="${MIRROR}">${paths()}</g></g>
      <g class="rh" transform="${MIRROR}">${paths(' pathLength="1"')}</g>
    </svg>`;
    const svg = $('svg', wrap), trail = $('.trail', wrap), traceG = $('.trace', wrap), rh = $('.rh', wrap);
    const hold = button(b.hold, 'btn small hold');
    hold.insertAdjacentHTML('beforeend', '<span class="hold-line" aria-hidden="true"></span>');
    const capSpot = el('div');
    wrap.append(hold, capSpot);
    let complete = false, samples = null, covered = 0, drawing = false, d = '', timer = 0;
    function finish(live) {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      traceG.removeAttribute('mask');
      wrap.classList.add('complete');
      hold.hidden = true;
      const cap = el('p', 'halves-cap', b.caption);
      capSpot.appendChild(live ? cap : off(cap));
      if (live) { S.rose = true; save(); chime(); say(b.caption); }
    }
    function sample() {
      samples = [];
      $$('.r path', wrap).forEach((p) => {
        const L = p.getTotalLength();
        for (let s = 0; s <= L; s += 3) { const pt = p.getPointAtLength(s); samples.push({ x: 120 - pt.x, y: pt.y, hit: false }); }
      });
    }
    const toSvg = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(m.inverse());
    };
    function hit(p) {
      if (!p) return;
      if (!samples) sample();
      samples.forEach((s) => { if (!s.hit && (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < 90) { s.hit = true; covered++; } });
      if (samples.length && covered / samples.length >= 0.8) finish(true);
    }
    svg.addEventListener('pointerdown', (e) => {
      if (complete) return;
      e.preventDefault();
      drawing = true;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
      const p = toSvg(e);
      if (!p) return;
      d += `M${fx(p.x)} ${fx(p.y)}`;
      trail.setAttribute('d', d);
      hit(p);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drawing || complete) return;
      const p = toSvg(e);
      if (!p) return;
      d += `L${fx(p.x)} ${fx(p.y)}`;
      trail.setAttribute('d', d);
      hit(p);
    });
    ['pointerup', 'pointercancel'].forEach((t) => svg.addEventListener(t, () => { drawing = false; }));
    // the accessible way: press and hold to ink it
    const start = () => { if (complete || timer) return; rh.classList.add('holding'); hold.classList.add('holding'); timer = setTimeout(() => { timer = 0; finish(true); }, 1600); };
    const stop = () => { if (complete) return; clearTimeout(timer); timer = 0; rh.classList.remove('holding'); hold.classList.remove('holding'); };
    hold.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; start(); try { hold.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ } });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => hold.addEventListener(t, stop));
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    hold.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } });
    hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } });
    if (S.rose) finish(false); else { cue(wrap, ch.slug + ':rose'); }
    return wrap;
  };

  R.signature = (b) => {
    const wrap = el('div', 'sigpad');
    const id = 'sig-label';
    const lab = el('p', 'lbl', b.label);
    lab.id = id;
    const canvas = el('canvas');
    canvas.width = 600; canvas.height = 160;
    canvas.dataset.noSwipe = '';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', UI.signPad);
    canvas.setAttribute('aria-describedby', id);
    const img = el('img');
    img.alt = UI.signSaved;
    img.hidden = true;
    const tools = el('div', 'sig-tools');
    const clear = button(b.clear, 'btn small quiet');
    const keep = button(b.keep, 'btn small');
    tools.append(clear, keep);
    wrap.append(lab, canvas, img, tools);
    const g = canvas.getContext('2d');
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--blue-500').trim() || '#2A5FD6';
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 3.4; g.strokeStyle = ink; g.fillStyle = ink;
    let drawing = false, last = null, dirty = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height }; };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drawing = true; dirty = true;
      last = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
      g.beginPath(); g.arc(last.x, last.y, 1.7, 0, Math.PI * 2); g.fill();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
      last = p;
    });
    ['pointerup', 'pointercancel'].forEach((t) => canvas.addEventListener(t, () => { drawing = false; }));
    const showPad = () => { img.hidden = true; img.removeAttribute('src'); canvas.hidden = false; keep.hidden = false; };
    const showSaved = () => { img.src = S.signature; img.hidden = false; canvas.hidden = true; keep.hidden = true; };
    clear.addEventListener('click', () => {
      g.clearRect(0, 0, canvas.width, canvas.height);
      dirty = false;
      if (S.signature) { S.signature = null; save(); }
      showPad();
    });
    keep.addEventListener('click', () => {
      if (!dirty) return;
      const url = canvas.toDataURL('image/png');
      if (!validSig(url)) return;
      S.signature = url; save();
      showSaved();
      chime();
    });
    if (S.signature) showSaved();
    return wrap;
  };

  R.stamp = (b, ch, ctx) => {
    const row = el('div', 'actions');
    const keep = el('button', 'stampbtn', b.keep);
    keep.type = 'button';
    row.appendChild(keep);
    const spot = el('div', 'stamp-spot');
    ctx.sheet.appendChild(spot);
    function render(data, fresh) {
      spot.textContent = '';
      const s = el('div', 'stamp ' + (fresh ? 'thunk' : 'static'));
      s.style.setProperty('--rot', data.rot + 'deg');
      s.style.setProperty('--t', (ctx.revealAt || 0).toFixed(2) + 's');
      s.innerHTML = stampSVG(Math.round(Math.abs(data.rot) * 10) + 3);
      const line = el('p', 'mono kept-line', b.keptLine(data.date));
      if (!fresh) { line.classList.add('fx'); line.style.setProperty('--t', (ctx.revealAt || 0).toFixed(2) + 's'); }
      spot.append(s, line);
      keep.textContent = b.kept;
      keep.disabled = true;
    }
    keep.addEventListener('click', () => {
      if (S.stamp) return;
      const data = {
        rot: Math.round((Math.random() * 16 - 8) * 10) / 10,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      S.stamp = data; save();
      render(data, true);
      crack(0.25);
      setTimeout(() => scrollTo(spot), 80);
    });
    if (!S.stamp) cue(keep, ch.slug + ':stamp');
    ctx.enter.push(() => {
      if (S.stamp && !$('.stamp', spot)) render(S.stamp, false);
      const st = $('.stamp.thunk', spot);
      if (st) st.classList.replace('thunk', 'static');
    });
    return row;
  };

  R.buttons = (b) => {
    const d = el('div', 'actions');
    b.items.forEach((it) => {
      const bt = button(it.label);
      if (it.needs === 'petals') { bt.dataset.needs = 'petals'; bt.hidden = !allPetals(); }
      bt.addEventListener('click', () => nav(it.to));
      d.appendChild(bt);
    });
    return d;
  };

  /* ===================== hold to turn (No Pressure) ===================== */
  const HOLD = { timer: 0, easy: false, focusTimer: 0, turnedAt: 0 };
  const holdPage = () => !!(cur && bySlug[cur].hold);
  const holdEasy = () => HOLD.easy || RM();
  function bindHold(btn) {
    const start = () => {
      if (HOLD.timer || !holdPage()) return;
      btn.classList.add('holding');
      HOLD.timer = setTimeout(() => { HOLD.timer = 0; HOLD.turnedAt = Date.now(); btn.classList.remove('holding'); goNext(); }, 1200);
    };
    const stop = () => { clearTimeout(HOLD.timer); HOLD.timer = 0; btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !holdPage()) return;
      start();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, stop));
    btn.addEventListener('contextmenu', (e) => { if (holdPage()) e.preventDefault(); });
    btn.addEventListener('keydown', (e) => {
      if (!holdPage() || (e.key !== ' ' && e.key !== 'Enter')) return;
      e.preventDefault();
      if (holdEasy()) { goNext(); return; }
      if (!e.repeat) start();
    });
    btn.addEventListener('keyup', (e) => { if (holdPage() && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); stop(); } });
    btn.addEventListener('focus', () => {
      clearTimeout(HOLD.focusTimer);
      HOLD.focusTimer = setTimeout(() => { HOLD.easy = true; if (holdPage()) btn.setAttribute('aria-label', UI.holdEasy); }, 5000);
    });
    btn.addEventListener('blur', () => clearTimeout(HOLD.focusTimer));
  }

  /* ===================== petals ===================== */
  const PETAL_POS = {
    prologue: { bottom: '6px', right: '10%', r: '-18deg' },
    'thirteen-years': { top: '4px', left: '4px', r: '40deg' },
    'blue-rules': { top: '4px', right: '4px', r: '-60deg' },
    'the-reader': { bottom: '6px', left: '8%', r: '120deg' },
    signs: { top: '4px', left: '4px', r: '10deg' },
    'long-list': { bottom: '6px', right: '22%', r: '200deg' },
    'fine-print': { top: '4px', right: '4px', r: '-120deg' },
  };
  const petalCount = () => PETALS.filter((s) => S.petals[s]).length;
  const allPetals = () => petalCount() === PETALS.length;
  function addPetal(ch, sheet) {
    if (S.petals[ch.slug]) return;
    const pos = PETAL_POS[ch.slug] || { bottom: '6px', right: '6px', r: '0deg' };
    const b = button(null, 'petal');
    b.setAttribute('aria-label', UI.petal);
    b.innerHTML = PETAL_SVG;
    ['top', 'right', 'bottom', 'left'].forEach((k) => { if (pos[k]) b.style[k] = pos[k]; });
    b.style.setProperty('--pr', pos.r);
    b.addEventListener('click', () => {
      S.petals[ch.slug] = 1; save();
      chime();
      const r = b.getBoundingClientRect(), t = $('#tocBtn').getBoundingClientRect();
      const fly = el('div', 'petal-fly');
      fly.innerHTML = PETAL_SVG;
      fly.style.left = (r.left + 13) + 'px';
      fly.style.top = (r.top + 13) + 'px';
      document.body.appendChild(fly);
      b.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.transform = `translate(${(t.left + t.width / 2 - r.left - 22).toFixed(0)}px, ${(t.top + t.height / 2 - r.top - 22).toFixed(0)}px) rotate(220deg) scale(.6)`;
        fly.style.opacity = '.15';
      }));
      setTimeout(() => fly.remove(), 1300);
      say(UI.petals(petalCount(), PETALS.length));
    });
    sheet.appendChild(b);
  }

  /* ===================== page builders ===================== */
  function header(ch) {
    const head = el('header', 'ch-head');
    let l = 0;
    if (ch.numeral || ch.label) {
      const p = el('p', 'ch-label bleed');
      p.style.setProperty('--l', l++);
      if (ch.numeral) { p.append(UI.chapterWord); p.appendChild(el('span', 'numeral', ch.numeral)); }
      else p.textContent = ch.label;
      head.appendChild(p);
    }
    const h = el('h2', 'ch-title bleed', ch.title);
    h.id = 't-' + ch.slug;
    h.style.setProperty('--l', l++);
    head.appendChild(h);
    if (ch.subtitle) { const s = el('p', 'ch-sub bleed', ch.subtitle); s.style.setProperty('--l', l++); head.appendChild(s); }
    head.insertAdjacentHTML('beforeend', ORN);
    return head;
  }

  function buildBlocks(ch, ctx, container) {
    const units = [];
    let lastWrap = null, t = 0.85;
    ch.blocks.forEach((b) => {
      if (b.type === 'margin') {
        if (lastWrap) { lastWrap.classList.add('with-note'); lastWrap.appendChild(R.margin(b)); ctx.sheet.classList.add('has-margin'); }
        return;
      }
      const node = R[b.type](b, ch, ctx);
      if (ch.reveal && b.type === 'prose') {
        // each paragraph is its own reveal unit
        Array.from(node.children).forEach((p) => { const w = el('div', 'blk'); w.appendChild(p); container.appendChild(w); units.push(w); lastWrap = w; });
        return;
      }
      const w = el('div', ch.reveal ? 'blk blk-wide' : 'block');
      w.style.setProperty('--t', t.toFixed(2) + 's');
      t += 0.22;
      w.appendChild(node);
      container.appendChild(w);
      units.push(w);
      lastWrap = w;
    });
    return units;
  }

  function buildChapter(ch, ctx) {
    const { sheet, sec } = ctx;
    if (ch.type === 'epilogue') sheet.classList.add('epilogue');
    if (ch.type === 'flower') { const fa = el('div', 'flower-art'); fa.innerHTML = roseSVG(); sheet.appendChild(fa); }
    if (ch.id === 'ch3') { const pr = el('div', 'pressed'); pr.innerHTML = roseSVG(); sheet.appendChild(pr); }
    sheet.appendChild(header(ch));
    const body = el('div', 'ch-body' + (ch.reveal ? ' prose' : ''));
    sheet.appendChild(body);
    const units = buildBlocks(ch, ctx, body);
    if (ch.type === 'epilogue' || ch.type === 'flower') {
      ctx.enter.push(() => $$('[data-needs="petals"]', sheet).forEach((b) => { b.hidden = !allPetals(); }));
    }
    if (ch.reveal === 'tap') {
      const act = el('div', 'actions');
      const more = button(ch.more);
      const turn = button(ch.turn, 'btn appear');
      more.hidden = true; turn.hidden = true;
      act.append(more, turn);
      sheet.appendChild(act);
      const key = ch.slug + ':read';
      let n = 0, started = false, lastGesture = 0;
      const next = () => {
        if (n >= units.length) return;
        units[n++].classList.add('shown');
        const fin = n >= units.length, hadFocus = document.activeElement === more;
        more.hidden = fin; turn.hidden = !fin;
        if (fin) mark(key);
        if (fin && hadFocus) turn.focus({ preventScroll: true });
        if (cur === ch.slug && n > 1) requestAnimationFrame(() => scrollTo(fin ? turn : more));
      };
      more.addEventListener('click', next);
      turn.addEventListener('click', goNext);
      cue(more, key);
      if (done(key)) { units.forEach((u) => u.classList.add('shown')); n = units.length; turn.hidden = false; started = true; }
      ctx.enter.push(() => { if (started) return; started = true; setTimeout(next, 1100); });
      // a downward scroll at the bottom of the page reads on, like "keep reading"
      const atBottom = () => sec.scrollTop + sec.clientHeight >= sec.scrollHeight - 6;
      const gestureNext = () => {
        const now = Date.now();
        if (cur !== ch.slug || !n || now - lastGesture < 900 || !atBottom()) return;
        lastGesture = now;
        next();
      };
      sec.addEventListener('wheel', (e) => { if (e.deltaY > 12) gestureNext(); }, { passive: true });
      let touchY = null;
      sec.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
      sec.addEventListener('touchend', (e) => { if (touchY !== null && touchY - e.changedTouches[0].clientY > 45) gestureNext(); touchY = null; }, { passive: true });
    }
    if (ch.reveal === 'timed') {
      body.classList.add('slow');
      const act = el('div', 'actions');
      const hold = button(null, 'btn hold appear');
      hold.appendChild(el('span', '', ch.hold));
      hold.insertAdjacentHTML('beforeend', '<span class="hold-line" aria-hidden="true"></span>');
      hold.hidden = true;
      act.appendChild(hold);
      sheet.appendChild(act);
      bindHold(hold);
      hold.addEventListener('click', () => { if (holdEasy()) goNext(); });
      const key = ch.slug + ':read';
      let started = false;
      if (done(key)) { units.forEach((u) => u.classList.add('shown')); hold.hidden = false; started = true; }
      ctx.enter.push(() => {
        if (started) return;
        started = true;
        const first = 1700, gap = 2900;
        units.forEach((u, i) => setTimeout(() => {
          u.classList.add('shown');
          if (cur === ch.slug && i) requestAnimationFrame(() => scrollTo(u));
        }, first + i * gap));
        setTimeout(() => {
          hold.hidden = false;
          mark(key);
          if (cur === ch.slug) scrollTo(hold);
        }, first + (units.length - 1) * gap + 2600);
      });
    }
  }

  function buildCover(ch, ctx) {
    const s = ctx.sheet;
    s.classList.add('cover');
    const corner = el('div', 'corner-rose');
    corner.innerHTML = roseSVG();
    const h = el('h1', 'title bleed', ch.title);
    h.id = 't-' + ch.slug;
    h.style.setProperty('--l', 0);
    const sub = el('p', 'subtitle bleed', ch.subtitle);
    sub.style.setProperty('--l', 1);
    const packet = frag(`<div class="packet"><div class="panel mid"></div><div class="panel flap bot"><div class="face in"></div><div class="face out"></div></div><div class="panel flap top"><div class="face in"></div><div class="face out"></div></div><button class="seal" type="button"><span class="seal-half l">${sealSVG()}</span><span class="seal-half r">${sealSVG()}</span></button></div>`);
    const seal = $('.seal', packet);
    seal.setAttribute('aria-label', ch.prompt);
    const prompt = el('p', 'mono prompt', ch.prompt);
    prompt.setAttribute('aria-hidden', 'true');
    const foot = el('p', 'mono foot', ch.footer);
    const links = el('div', 'cover-links');
    const resume = button(ch.resume, 'btn quiet');
    const jump = button(ch.jump, 'btn quiet');
    links.append(resume, jump);
    s.append(corner, h, sub, packet, prompt, foot, links);
    cue(seal, 'cover:seal');
    let opening = false;
    ctx.enter.push(() => {
      packet.classList.add('noanim');
      packet.classList.remove('open');
      seal.classList.remove('broken');
      void packet.offsetWidth;
      packet.classList.remove('noanim');
      opening = false;
      jump.hidden = !S.stamp;
      resume.hidden = !(S.last && S.last !== 'contents');
    });
    seal.addEventListener('click', () => {
      if (opening || cur !== 'cover') return;
      opening = true;
      seal.classList.add('broken');
      crack();
      setTimeout(() => packet.classList.add('open'), RM() ? 150 : 380);
      setTimeout(() => { nav('contents'); setTimeout(maybeCoach, RM() ? 300 : 1100); }, RM() ? 700 : 1900);
    });
    jump.addEventListener('click', () => nav('authors-note'));
    resume.addEventListener('click', () => { if (S.last) nav(S.last); });
  }

  function buildContents(ch, ctx) {
    ctx.sheet.appendChild(header(ch));
    const list = el('div', 'toc-wrap');
    ctx.sheet.appendChild(list);
    ctx.enter.push(() => renderToc(list));
  }

  function buildFinal(ch, ctx) {
    const s = ctx.sheet;
    s.classList.add('final');
    const rose = el('div', 'final-rose');
    rose.innerHTML = roseSVG();
    const epi = el('p', 'epigraph fx', ch.epigraph);
    epi.style.setProperty('--t', '.7s');
    const h = el('h2', 'ch-title bleed', ch.title);
    h.id = 't-' + ch.slug;
    h.style.setProperty('--l', 0);
    const letter = el('div', 'letter');
    s.append(rose, epi, h, letter);
    const base = 1.3, step = 0.38, lines = [ch.greeting].concat(ch.body);
    lines.forEach((t, i) => { const p = el('p', 'fx', t); p.style.setProperty('--t', (base + i * step).toFixed(2) + 's'); letter.appendChild(p); });
    const after = base + lines.length * step + 0.3;
    const at = (n, sec) => n.style.setProperty('--t', sec.toFixed(2) + 's');
    const lead = el('p', 'lead fx', ch.scribbleLead);
    const sw = el('div', 'scribble-wrap');
    sw.innerHTML = '<svg class="scribble" viewBox="0 0 150 44" role="img"></svg>';
    const scr = sw.firstChild;
    buildScribble(scr);
    const cap = el('p', 'caption hand fx', ch.caption);
    const sig = el('p', 'sig hand fx', ch.signature);
    const ps = el('p', 'ps mono fx', ch.ps);
    s.append(lead, sw, cap, sig, ps);
    at(lead, after);
    scr.style.setProperty('--t0', (after + 0.8).toFixed(2) + 's');
    at(cap, after + 2.7); at(sig, after + 3.4); at(ps, after + 4);
    const markSec = el('section', 'mark fx');
    at(markSec, after + 4.5);
    ctx.revealAt = after + 5;
    ch.blocks.forEach((b) => {
      const node = R[b.type](b, ch, ctx);
      if (b.type === 'stamp') { node.classList.add('fx'); at(node, after + 5); s.appendChild(node); return; }
      if (b.heading) { const hh = el('h3', 'sub-head', b.heading); markSec.appendChild(hh); }
      markSec.appendChild(node);
    });
    s.insertBefore(markSec, $('.stampbtn', s).parentNode);
  }

  /* ===================== contents list (page and drawer) ===================== */
  function stateIcon(state) {
    const w = el('span', 'ts');
    if (state === 'here') w.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="rib" d="M5 1h8v15l-4-3-4 3z"/></svg>';
    else if (state === 'read') w.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="check" d="M3 9.5c2 1 3 2.6 4 4.5 2-5 5-8.5 8-10.5"/></svg>';
    else w.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><circle class="open" cx="9" cy="9" r="3"/></svg>';
    w.appendChild(el('span', 'sr', state === 'here' ? UI.stateHere : state === 'read' ? UI.stateRead : UI.stateUnread));
    return w;
  }
  function tocItem(c) {
    const li = el('li');
    const a = el('a');
    a.href = '#/' + c.slug;
    const state = c.slug === cur ? 'here' : S.visited[c.slug] ? 'read' : 'unread';
    if (state === 'here') { li.classList.add('here'); a.setAttribute('aria-current', 'page'); }
    a.append(el('span', 'tn', c.numeral || ''), el('span', 'tt', c.title), el('span', 'dots'), stateIcon(state));
    a.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(false); nav(c.slug); });
    li.appendChild(a);
    return li;
  }
  function renderToc(container) {
    container.textContent = '';
    const ol = el('ol', 'toc');
    SEQ.filter((c) => c.slug !== 'contents').forEach((c) => ol.appendChild(tocItem(c)));
    if (allPetals()) { const li = tocItem(bySlug['pressed-flower']); li.classList.add('flower'); ol.appendChild(li); }
    container.append(ol, el('p', 'pressed-count', UI.petals(petalCount(), PETALS.length)));
  }

  /* ===================== drawer and coach mark ===================== */
  const drawer = $('#drawer'), scrim = $('#scrim'), tocBtn = $('#tocBtn');
  let drawerReturn = null, drawerTimer = 0;
  const drawerOpen = () => !drawer.hidden && drawer.classList.contains('open');
  function openDrawer() {
    clearTimeout(drawerTimer);
    renderToc($('#drawerList'));
    drawer.hidden = false; scrim.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add('open'); scrim.classList.add('open');
    tocBtn.setAttribute('aria-expanded', 'true');
    drawerReturn = document.activeElement;
    setTimeout(() => { const a = $('.toc li.here a', drawer) || $('.toc a', drawer); if (a) a.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer(restore) {
    if (drawer.hidden) return;
    drawer.classList.remove('open'); scrim.classList.remove('open');
    tocBtn.setAttribute('aria-expanded', 'false');
    drawerTimer = setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, RM() ? 0 : 450);
    if (restore !== false && drawerReturn && drawerReturn.focus) drawerReturn.focus({ preventScroll: true });
  }
  tocBtn.addEventListener('click', () => (drawerOpen() ? closeDrawer() : openDrawer()));
  scrim.addEventListener('click', () => closeDrawer());
  $('#drawerClose').addEventListener('click', () => closeDrawer());
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('a, button', drawer).filter((n) => !n.hidden);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  function maybeCoach() { if (!S.coach) $('#coach').hidden = false; }
  function dismissCoach() { $('#coach').hidden = true; S.coach = true; save(); }
  $('#coachOk').addEventListener('click', dismissCoach);

  /* ===================== router and page engine ===================== */
  const stages = {}, ctxs = {};
  let cur = null;
  const seqIndex = (slug) => SEQ.findIndex((c) => c.slug === slug);
  function neighbours(slug) {
    if (bySlug[slug].extra) return { prev: 'contents', next: null };
    const i = seqIndex(slug);
    return { prev: i > 0 ? SEQ[i - 1].slug : null, next: i < SEQ.length - 1 ? SEQ[i + 1].slug : null };
  }
  function routeFromHash() {
    const m = /^#\/([a-z0-9-]+)$/.exec(location.hash);
    return m && bySlug[m[1]] ? m[1] : 'cover';
  }
  function nav(slug) {
    if (!bySlug[slug]) return;
    const h = '#/' + slug;
    if (location.hash !== h) location.hash = h; else go(slug);
  }
  function goNext() { const n = cur && neighbours(cur).next; if (n) nav(n); }
  function goPrev() { const p = cur && neighbours(cur).prev; if (p) nav(p); }
  function flashClass(node, cls) { node.classList.add(cls); setTimeout(() => node.classList.remove(cls), 1000); }

  function updateChrome() {
    const ch = bySlug[cur], i = seqIndex(cur);
    $('#progressFill').style.width = (ch.extra ? 100 : (i / (SEQ.length - 1)) * 100).toFixed(1) + '%';
    const label = ch.numeral ? UI.chapterOf(ch.numeral, LAST_NUMERAL) : (ch.label || ch.title);
    $('#progressLabel').textContent = UI.progress(label);
    const { prev, next } = neighbours(cur);
    const pb = $('#prev'), nb = $('#next');
    pb.hidden = !prev;
    nb.hidden = !next;
    nb.classList.toggle('hold', !!ch.hold);
    nb.removeAttribute('aria-label');
    if (next) $('#nextLabel').textContent = ch.hold ? ch.hold : UI.next(bySlug[next].title);
  }

  function go(slug) {
    if (!bySlug[slug]) return;
    if (slug === 'pressed-flower' && !allPetals()) { slug = 'contents'; location.replace('#/contents'); }
    if (slug === cur) return;
    const from = cur ? stages[cur] : null, to = stages[slug];
    const fwd = cur ? bySlug[slug]._i > bySlug[cur]._i : true;
    if (from) {
      from.classList.remove('active', 'in-fwd', 'in-back', 'in-fade');
      flashClass(from, fwd ? 'out-fwd' : 'out-back');
      swish();
      ctxs[cur].leave.forEach((f) => f());
    }
    clearTimeout(HOLD.timer); HOLD.timer = 0;
    cur = slug;
    to.classList.remove('out-fwd', 'out-back');
    to.scrollTop = 0;
    to.classList.add('active');
    flashClass(to, from ? (fwd ? 'in-fwd' : 'in-back') : 'in-fade');
    document.body.dataset.route = slug;
    S.visited[slug] = 1;
    if (slug !== 'cover') S.last = slug;
    save();
    updateChrome();
    closeDrawer(false);
    if (slug !== 'contents' && slug !== 'cover' && !$('#coach').hidden) dismissCoach();
    ctxs[slug].enter.forEach((f) => f());
    // move focus to the new page's heading for keyboard and screen reader readers
    const h = to.querySelector('h1, h2');
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  addEventListener('hashchange', () => { if (!document.body.classList.contains('gated')) go(routeFromHash()); });

  $('#prev').addEventListener('click', goPrev);
  const nextBtn = $('#next');
  bindHold(nextBtn);
  // the release that ends a hold also clicks; it must not turn a second page
  nextBtn.addEventListener('click', () => { if (Date.now() - HOLD.turnedAt < 1000 || (holdPage() && !holdEasy())) return; goNext(); });

  /* ----- swipe: horizontal, at least 60px, never from sliders, canvas, feed or scroll handles ----- */
  let swipe = null;
  document.addEventListener('touchstart', (e) => {
    swipe = null;
    if (e.touches.length !== 1 || document.body.classList.contains('gated') || !drawer.hidden || cur === 'cover') return;
    const t = e.target;
    if (t.closest && t.closest('[data-no-swipe], input, textarea, canvas, select')) return;
    swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!swipe) return;
    const p = e.changedTouches[0], dx = p.clientX - swipe.x, dy = p.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) goNext(); else goPrev(); }
  }, { passive: true });

  /* ----- keyboard ----- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!drawer.hidden) { closeDrawer(); return; }
      if (!$('#coach').hidden) { dismissCoach(); return; }
      const c = cur && ctxs[cur];
      if (c && c.escape) c.escape();
      return;
    }
    if (document.body.classList.contains('gated') || !drawer.hidden || cur === 'cover') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
  });

  /* ----- the gate ----- */
  const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
  function showGate() {
    $('#gate').hidden = false;
    setTimeout(() => $('#gateIn').focus({ preventScroll: true }), 50);
  }
  $('#gateCard').addEventListener('submit', (e) => {
    e.preventDefault();
    const card = $('#gateCard'), input = $('#gateIn');
    if (CONTENT.gate.answers.indexOf(norm(input.value)) !== -1) {
      S.gate = true; save();
      input.blur();
      card.classList.add('away');
      setTimeout(() => { $('#gate').hidden = true; document.body.classList.remove('gated'); start(); }, RM() ? 400 : 700);
      return;
    }
    $('#gateMsg').textContent = '';
    requestAnimationFrame(() => { $('#gateMsg').textContent = CONTENT.gate.wrong; });
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    input.select();
  });

  /* ===================== boot ===================== */
  function start() {
    const slug = routeFromHash();
    go(slug);
    if (location.hash !== '#/' + cur) location.replace('#/' + cur);
  }
  CH.forEach((ch) => {
    const sec = el('section', 'stage');
    sec.id = 'p-' + ch.slug;
    sec.setAttribute('aria-labelledby', 't-' + ch.slug);
    const sheet = el('article', 'sheet');
    sec.appendChild(sheet);
    const ctx = { ch, sec, sheet, enter: [], leave: [], escape: null, revealAt: 0 };
    if (ch.type === 'cover') buildCover(ch, ctx);
    else if (ch.type === 'contents') buildContents(ch, ctx);
    else if (ch.type === 'final') buildFinal(ch, ctx);
    else buildChapter(ch, ctx);
    if (ch.petal) addPetal(ch, sheet);
    $('#book').appendChild(sec);
    stages[ch.slug] = sec;
    ctxs[ch.slug] = ctx;
  });
  $('#gatePrompt').textContent = CONTENT.gate.prompt;
  $('#gateIn').placeholder = CONTENT.gate.placeholder;
  $('#gateBtn').textContent = CONTENT.gate.button;
  $('#tocBtnLabel').textContent = UI.contents;
  $('#drawerTitle').textContent = UI.contentsTitle;
  $('#drawerClose').textContent = UI.close;
  $('#coachText').textContent = UI.coach;
  $('#coachOk').textContent = UI.coachOk;
  $('#prevLabel').textContent = UI.previous;
  soundLabel(S.sound);
  if (!GATE.enabled || S.gate) { document.body.classList.remove('gated'); start(); }
  else showGate();
})();
