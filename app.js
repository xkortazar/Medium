'use strict';

/* =========================================================
   Constantes y utilidades
   ========================================================= */
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_DEG = 360 * (1 - 1 / PHI); // 137.5077…
const GOLDEN_RAD = GOLDEN_DEG * Math.PI / 180;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
const ARM_OPTIONS = [5, 8, 13, 21, 34, 55];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (x, d = 3) => x.toFixed(d).replace('.', ',');

/** Ajusta el tamaño interno del canvas a su tamaño en pantalla (pantallas HiDPI). */
function fitCanvas(canvas, aspect) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || canvas.width;
  const h = aspect ? w / aspect : (canvas.clientHeight || canvas.height);
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
    return true;
  }
  return false;
}

/** Ejecuta el bucle de animación sólo mientras el elemento es visible. */
function whileVisible(el, frame) {
  let visible = false, raf = 0;
  const loop = (t) => { frame(t); raf = visible ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }).observe(el);
}

/* ---------- Paletas: u ∈ [0,1] → [r,g,b] ---------- */
function gradient(stops) {
  return (u) => {
    u = clamp(u, 0, 1) * (stops.length - 1);
    const i = Math.min(Math.floor(u), stops.length - 2), f = u - i;
    const a = stops[i], b = stops[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  };
}
function hsl(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const PALETTES = {
  sunflower: gradient([[70, 25, 5], [190, 70, 10], [245, 150, 30], [255, 215, 60], [255, 245, 190]]),
  ocean: gradient([[5, 20, 60], [10, 80, 170], [20, 170, 220], [120, 230, 240], [230, 255, 255]]),
  neon: gradient([[60, 0, 110], [220, 20, 160], [255, 80, 120], [40, 200, 255], [200, 255, 250]]),
  rainbow: (u) => hsl(u, 0.95, 0.55),
};
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Posiciones del modelo de Vogel, normalizadas a radio 1. */
function vogel(n, angleRad = GOLDEN_RAD) {
  const pts = new Array(n);
  const s = 1 / Math.sqrt(Math.max(n - 1, 1));
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(i) * s, th = i * angleRad;
    pts[i] = { i, r, th, x: r * Math.cos(th), y: r * Math.sin(th) };
  }
  return pts;
}

/** Mejor fracción p/q (q ≤ maxQ) para x ∈ [0,1]. */
function bestFraction(x, maxQ) {
  let best = { p: 0, q: 1, err: Infinity };
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(x * q), err = Math.abs(x - p / q);
    if (err < best.err - 1e-12) best = { p, q, err };
  }
  return best;
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/* =========================================================
   1. Portada: filotaxis que respira
   ========================================================= */
(function hero() {
  const canvas = $('#hero-canvas'), ctx = canvas.getContext('2d');
  window.addEventListener('resize', () => fitCanvas(canvas));
  fitCanvas(canvas);
  whileVisible(canvas, (t) => {
    fitCanvas(canvas);
    const W = canvas.width, H = canvas.height;
    const R = Math.hypot(W, H) / 2;
    const n = Math.round(clamp((W * H) / 900, 600, 2600));
    const c = R / Math.sqrt(n);
    const s = t / 1000;
    const angle = (GOLDEN_DEG + 0.025 * Math.sin(s * 0.12)) * Math.PI / 180;
    const rot = s * 0.03;
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, W, H);
    const pal = PALETTES.sunflower;
    for (let i = 1; i < n; i++) {
      const r = c * Math.sqrt(i), th = i * angle + rot;
      const u = i / n;
      const wave = 0.5 + 0.5 * Math.sin(u * 24 - s * 1.6);
      ctx.fillStyle = rgb(pal(0.25 + 0.7 * wave * (1 - u * 0.5)), 0.25 + 0.6 * (1 - u) * (0.4 + 0.6 * wave));
      ctx.beginPath();
      ctx.arc(W / 2 + r * Math.cos(th), H / 2 + r * Math.sin(th), c * (0.32 + 0.12 * wave), 0, Math.PI * 2);
      ctx.fill();
    }
  });
})();

/* =========================================================
   2. Modelo de Vogel interactivo
   ========================================================= */
const vogelLab = (function () {
  const canvas = $('#vogel-canvas'), ctx = canvas.getContext('2d');
  const angle = $('#angle'), count = $('#count'), dot = $('#dot'), grow = $('#grow');
  const angleOut = $('#angle-out'), countOut = $('#count-out'), dotOut = $('#dot-out'), hint = $('#angle-hint');
  let shown = +count.value, holdUntil = 0, dirty = true;

  function describe(a) {
    if (Math.abs(a - GOLDEN_DEG) < 0.002) {
      return 'Ángulo áureo: ninguna semilla queda alineada con otra y el disco se llena sin huecos.';
    }
    const f = bestFraction(a / 360, 60);
    if (f.err * 360 < 0.02) {
      return `≈ ${f.p}/${f.q} de vuelta: las semillas se apilan en ${f.q} radios rectos.`;
    }
    const d = a - GOLDEN_DEG;
    return `A ${fmt(Math.abs(d), 3)}° del ángulo áureo: aparecen brazos curvos y huecos que se agrandan hacia el borde.`;
  }

  function sync() {
    const a = +angle.value;
    angleOut.textContent = `${a.toFixed(3)}°`;
    countOut.textContent = count.value;
    dotOut.textContent = (+dot.value).toFixed(2);
    hint.textContent = describe(a);
    $$('#vogel .presets button').forEach((b) => b.classList.toggle('active', Math.abs(+b.dataset.angle - a) < 0.0005));
    if (!grow.checked) shown = +count.value;
    dirty = true;
  }

  function draw() {
    fitCanvas(canvas, 1);
    const W = canvas.width, R = W / 2 * 0.94;
    const N = +count.value, n = Math.floor(shown);
    const a = +angle.value * Math.PI / 180;
    const c = R / Math.sqrt(N);
    const rad = Math.min(c * 0.5 * +dot.value, W / 30);
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, W, W);
    const pal = PALETTES.sunflower;
    for (let i = 0; i < n; i++) {
      const r = c * Math.sqrt(i), th = i * a;
      ctx.fillStyle = rgb(pal(0.3 + 0.7 * (1 - i / N)));
      ctx.beginPath();
      ctx.arc(W / 2 + r * Math.cos(th), W / 2 + r * Math.sin(th), rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  [angle, count, dot].forEach((el) => el.addEventListener('input', sync));
  grow.addEventListener('change', () => { shown = grow.checked ? 0 : +count.value; dirty = true; });
  $$('#vogel .presets button').forEach((b) => b.addEventListener('click', () => { angle.value = b.dataset.angle; sync(); }));
  window.addEventListener('resize', () => { dirty = true; });

  whileVisible(canvas, (t) => {
    if (grow.checked) {
      const N = +count.value;
      if (shown < N) { shown = Math.min(N, shown + Math.max(1, N / 240)); dirty = true; if (shown >= N) holdUntil = t + 1500; }
      else if (t > holdUntil) { shown = 0; }
    }
    if (dirty) { draw(); dirty = false; }
  });
  sync();

  return {
    setAngle(a) { angle.value = a; sync(); },
  };
})();

/* =========================================================
   3. Aproximaciones de Fibonacci al ángulo áureo
   ========================================================= */
(function fractions() {
  const canvas = $('#fraction-canvas'), ctx = canvas.getContext('2d');
  const table = $('#fib-table');
  // p/q = F(k)/F(k+2) → fracción de vuelta; converge a 1/φ²
  const rows = [];
  for (let k = 1; k + 2 < FIB.length - 1; k++) rows.push({ p: FIB[k], q: FIB[k + 2] });
  const golden = { p: null, q: null, golden: true };

  table.innerHTML = '<tr><th>Fracción</th><th>Ángulo</th><th>Error</th><th>Radios</th><th></th></tr>' +
    rows.map((r) => {
      const a = 360 * r.p / r.q;
      return `<tr><td>${r.p}/${r.q}</td><td>${fmt(a, 3)}°</td><td>${fmt(a - GOLDEN_DEG, 3)}°</td><td>${r.q}</td>` +
        `<td><button data-angle="${a}">probar</button></td></tr>`;
    }).join('') +
    `<tr><td>1/φ²</td><td>${fmt(GOLDEN_DEG, 3)}°</td><td>0</td><td>∞</td><td><button data-angle="${GOLDEN_DEG.toFixed(3)}">probar</button></td></tr>`;
  table.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    vogelLab.setAngle(b.dataset.angle);
    $('#vogel').scrollIntoView({ behavior: 'smooth' });
  }));

  const show = [rows[2], rows[3], rows[4], rows[5], golden];
  function draw() {
    fitCanvas(canvas, 600 / 220);
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, W, H);
    const cell = W / show.length, R = Math.min(cell, H * 0.8) * 0.42, N = 260;
    const c = R / Math.sqrt(N);
    show.forEach((f, j) => {
      const a = f.golden ? GOLDEN_RAD : 2 * Math.PI * f.p / f.q;
      const cx = cell * (j + 0.5), cy = H * 0.44;
      for (let i = 0; i < N; i++) {
        const r = c * Math.sqrt(i), th = i * a;
        ctx.fillStyle = rgb(PALETTES.sunflower(0.35 + 0.65 * (1 - i / N)));
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(th), cy + r * Math.sin(th), c * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = f.golden ? '#f5b53d' : '#9aa2b3';
      ctx.font = `${Math.round(H * 0.075)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(f.golden ? 'ángulo áureo' : `${f.p}/${f.q}`, cx, H * 0.94);
    });
  }
  window.addEventListener('resize', draw);
  draw();
})();

/* =========================================================
   4. Parastiquias
   ========================================================= */
(function spirals() {
  const canvas = $('#spiral-canvas'), ctx = canvas.getContext('2d');
  const box = $('#k-buttons'), lines = $('#show-lines'), hint = $('#k-hint');
  const N = 1000, pts = vogel(N);
  let k = 21;

  [5, 8, 13, 21, 34, 55, 89].forEach((v) => {
    const b = document.createElement('button');
    b.textContent = `k = ${v}`;
    b.dataset.k = v;
    b.addEventListener('click', () => { k = v; draw(); });
    box.appendChild(b);
  });

  function draw() {
    fitCanvas(canvas, 1);
    const W = canvas.width, R = W / 2 * 0.94;
    const sp = R / Math.sqrt(N - 1); // separación típica entre vecinos ≈ sp·1,8
    box.querySelectorAll('button').forEach((b) => b.classList.toggle('active', +b.dataset.k === k));
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, W, W);
    const X = (p) => W / 2 + p.x * R, Y = (p) => W / 2 + p.y * R;
    const color = (i) => hsl((i % k) / k, 0.85, 0.58);

    if (lines.checked) {
      ctx.lineWidth = Math.max(1, W / 500);
      for (let i = 0; i + k < N; i++) {
        const a = pts[i], b = pts[i + k];
        const d = Math.hypot(a.x - b.x, a.y - b.y) * R;
        if (d > sp * 3.2) continue; // sólo unimos vecinos cercanos
        ctx.strokeStyle = rgb(color(i), 0.55);
        ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke();
      }
    }
    for (const p of pts) {
      ctx.fillStyle = rgb(color(p.i));
      ctx.beginPath(); ctx.arc(X(p), Y(p), sp * 0.42, 0, Math.PI * 2); ctx.fill();
    }

    // ¿En qué zona es k el número de vecinos visible? r ≈ zona donde n ~ k²·0,4 … k²·1,1 aprox.
    const inner = Math.sqrt(clamp(0.2 * k * k / N, 0, 1)), outer = Math.sqrt(clamp(1.1 * k * k / N, 0, 1));
    const zone = outer <= 0.35 ? 'cerca del centro' : inner >= 0.55 ? 'en el borde exterior' : 'en la zona media';
    hint.textContent = k * k * 0.2 > N
      ? `Con ${N} semillas el disco aún no es lo bastante grande para que se vean ${k} espirales.`
      : `${k} espirales, más nítidas ${zone}. Las vecinas de Fibonacci (${FIB[FIB.indexOf(k) - 1]} y ${FIB[FIB.indexOf(k) + 1]}) giran en sentido contrario o dominan en otros anillos.`;
  }
  lines.addEventListener('change', draw);
  window.addEventListener('resize', draw);
  draw();
})();

/* =========================================================
   5. Audio: análisis y fuentes
   ========================================================= */
const audio = (function () {
  const BANDS = 32, FMIN = 40, FMAX = 12000;
  let ctx = null, analyser = null, freq = null, current = null, name = 'idle';
  const bands = new Float32Array(BANDS);
  const peaks = new Float32Array(BANDS);
  let bassAvg = 0, lastBeat = 0, energy = 0;
  const status = $('#audio-status');

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      freq = new Uint8Array(analyser.frequencyBinCount);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stop() {
    if (current) { current.stop(); current = null; }
    name = 'idle';
    status.textContent = 'Sin audio: modo reposo.';
  }

  /* ---- Ritmo de demostración sintetizado (120 BPM) ---- */
  function demo() {
    stop();
    const ac = ensure();
    const master = ac.createGain();
    master.gain.value = 0.45;
    master.connect(analyser);
    master.connect(ac.destination);

    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const bpm = 118, step = 60 / bpm / 4; // semicorcheas
    const bassNotes = [41.2, 41.2, 49, 36.7]; // Mi, Mi, Sol, Re (Hz)
    const chords = [[164.8, 196, 246.9], [164.8, 196, 246.9], [196, 246.9, 293.7], [146.8, 185, 220]];
    let next = ac.currentTime + 0.1, s = 0, timer = 0;

    const kick = (t) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
    };
    const hat = (t, open) => {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000;
      g.gain.setValueAtTime(open ? 0.25 : 0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.25 : 0.05));
      src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + 0.3);
    };
    const snare = (t) => {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + 0.2);
    };
    const bass = (t, hz) => {
      const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz * 2;
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(150, t + step * 1.8);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.9);
      o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + step * 2);
    };
    const pad = (t, notes) => {
      notes.forEach((hz) => [1, 1.004].forEach((det) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'triangle'; o.frequency.value = hz * 2 * det;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + step * 16);
        o.connect(g).connect(master); o.start(t); o.stop(t + step * 16 + 0.05);
      }));
    };
    const arp = (t, hz) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = hz * 4;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.9);
      o.connect(g).connect(master); o.start(t); o.stop(t + step);
    };

    function schedule() {
      while (next < ac.currentTime + 0.2) {
        const bar = Math.floor(s / 16) % 4, pos = s % 16;
        if (pos % 4 === 0) kick(next);
        if (pos === 4 || pos === 12) snare(next);
        if (pos % 2 === 1) hat(next, pos === 15);
        if (pos % 4 === 2 || pos === 0 || pos === 7) bass(next, bassNotes[bar]);
        if (pos === 0) pad(next, chords[bar]);
        if (s % 64 >= 32 && pos % 2 === 0) arp(next, chords[bar][(pos / 2) % 3]);
        next += step; s++;
      }
    }
    schedule();
    timer = setInterval(schedule, 50);
    current = { stop() { clearInterval(timer); master.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(() => master.disconnect(), 400); } };
    name = 'demo';
    status.textContent = 'Reproduciendo ritmo sintetizado a 118 BPM.';
  }

  async function mic() {
    stop();
    const ac = ensure();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = ac.createMediaStreamSource(stream);
      src.connect(analyser); // no a la salida: evitaría realimentación
      current = { stop() { src.disconnect(); stream.getTracks().forEach((t) => t.stop()); } };
      name = 'mic';
      status.textContent = 'Escuchando el micrófono. Pon música cerca o da palmas.';
    } catch (e) {
      status.textContent = `No se pudo abrir el micrófono (${e.name || e}).`;
    }
  }

  function file(f) {
    stop();
    const ac = ensure();
    const el = new Audio();
    el.src = URL.createObjectURL(f);
    el.loop = true;
    const src = ac.createMediaElementSource(el);
    src.connect(analyser);
    src.connect(ac.destination);
    el.play().catch((e) => { status.textContent = `No se pudo reproducir: ${e.message}`; });
    current = { stop() { el.pause(); src.disconnect(); URL.revokeObjectURL(el.src); } };
    name = 'file';
    status.textContent = `Reproduciendo «${f.name}».`;
  }

  /** Actualiza bandas logarítmicas y detección de golpes. Devuelve true si hay golpe. */
  function update(t) {
    let beat = false;
    if (name !== 'idle' && analyser) {
      analyser.getByteFrequencyData(freq);
      const binHz = ctx.sampleRate / analyser.fftSize;
      for (let b = 0; b < BANDS; b++) {
        const f0 = FMIN * Math.pow(FMAX / FMIN, b / BANDS), f1 = FMIN * Math.pow(FMAX / FMIN, (b + 1) / BANDS);
        const i0 = Math.floor(f0 / binHz), i1 = Math.max(i0 + 1, Math.ceil(f1 / binHz));
        let m = 0;
        for (let i = i0; i < i1 && i < freq.length; i++) m = Math.max(m, freq[i]);
        // Compensa la caída natural de energía en agudos
        const v = clamp((m / 255) * (1 + b / BANDS * 0.6), 0, 1);
        const shaped = clamp((v - 0.25) / 0.75, 0, 1);
        bands[b] = shaped > bands[b] ? shaped : bands[b] * 0.86 + shaped * 0.14;
      }
    } else {
      // Modo reposo: una respiración lenta y ruido suave
      for (let b = 0; b < BANDS; b++) {
        const v = 0.18 + 0.14 * Math.sin(t / 1400 + b * 0.35) + 0.06 * Math.sin(t / 530 - b * 0.9);
        bands[b] = clamp(v * (1 - b / BANDS * 0.5), 0, 1);
      }
    }
    const bass = (bands[0] + bands[1] + bands[2] + bands[3]) / 4;
    bassAvg = bassAvg * 0.94 + bass * 0.06;
    if (name !== 'idle' && bass > 0.3 && bass > bassAvg * 1.25 && t - lastBeat > 220) { beat = true; lastBeat = t; }
    let e = 0; for (let b = 0; b < BANDS; b++) { e += bands[b]; peaks[b] = Math.max(bands[b], peaks[b] - 0.012); }
    energy = e / BANDS;
    return beat;
  }

  /** Nivel interpolado en u ∈ [0,1] (graves → agudos). */
  function level(u) {
    const x = clamp(u, 0, 1) * (BANDS - 1), i = Math.floor(x), f = x - i;
    return lerp(bands[i], bands[Math.min(i + 1, BANDS - 1)], f);
  }

  return {
    BANDS, bands, peaks, demo, mic, file, stop, update, level,
    get energy() { return energy; }, get active() { return name !== 'idle'; }, get sinceBeat() { return lastBeat; },
  };
})();

/* =========================================================
   6. Pantalla LED simulada
   ========================================================= */
(function display() {
  const canvas = $('#led-canvas'), ctx = canvas.getContext('2d');
  const spec = $('#spectrum'), sctx = spec.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d');
  const ledCount = $('#led-count'), gain = $('#gain'), arms = $('#arms'), diffuser = $('#diffuser');
  let mode = 'radial', palette = 'sunflower', leds = [], ripples = [], flash = 0;

  function build() {
    leds = vogel(+ledCount.value);
    $('#led-count-out').textContent = ledCount.value;
  }
  function syncLabels() {
    $('#gain-out').textContent = (+gain.value).toFixed(2);
    $('#arms-out').textContent = ARM_OPTIONS[+arms.value];
  }

  const pick = (group, key, set) => $$(`${group} button`).forEach((b) => b.addEventListener('click', () => {
    $$(`${group} button`).forEach((x) => x.classList.toggle('active', x === b));
    set(b.dataset[key]);
  }));
  pick('#modes', 'mode', (v) => { mode = v; });
  pick('#palettes', 'palette', (v) => { palette = v; });
  ledCount.addEventListener('input', build);
  gain.addEventListener('input', syncLabels);
  arms.addEventListener('input', syncLabels);

  $('#src-demo').addEventListener('click', () => audio.demo());
  $('#src-mic').addEventListener('click', () => audio.mic());
  $('#src-stop').addEventListener('click', () => audio.stop());
  $('#src-file').addEventListener('change', (e) => { if (e.target.files[0]) audio.file(e.target.files[0]); e.target.value = ''; });

  build(); syncLabels();

  /** Brillo (0..1) y posición en la paleta (0..1) de un LED. */
  function shade(p, s, k, g) {
    const u = p.r; // 0 centro, 1 borde
    let v = 0, hue = u;
    switch (mode) {
      case 'radial': {
        v = audio.level(u) * g;
        hue = u * 0.8 + 0.1 * Math.sin(s * 0.3);
        break;
      }
      case 'arms': {
        const a = (p.i % k) / k;
        const w = (a + s * 0.04) % 1;
        const band = 1 - Math.abs(2 * w - 1); // simétrico para que no haya saltos
        v = audio.level(band) * g * (0.35 + 0.65 * Math.sqrt(u));
        hue = band;
        break;
      }
      case 'bloom': {
        const reach = clamp(audio.energy * g * 1.8, 0, 1.05);
        const edge = clamp((reach - u) * 8, 0, 1);
        v = edge * (0.4 + 0.6 * audio.level(u));
        hue = (p.i / leds.length + s * 0.05) % 1;
        break;
      }
      case 'spin': {
        const e = audio.energy * g;
        const phase = (p.i % k) / k * Math.PI * 2 + u * 6 - s * (0.6 + e * 3);
        v = (0.5 + 0.5 * Math.cos(phase)) ** 3 * (0.3 + audio.level(u) * g * 1.2);
        hue = (u + s * 0.02) % 1;
        break;
      }
    }
    for (const r of ripples) {
      const d = (u - r.r) / 0.06;
      v += r.a * Math.exp(-d * d);
    }
    v += flash * 0.25;
    return [clamp(v, 0, 1), hue];
  }

  whileVisible(canvas, (t) => {
    if (fitCanvas(canvas, 1)) { off.width = canvas.width; off.height = canvas.height; }
    if (off.width !== canvas.width) { off.width = canvas.width; off.height = canvas.height; }
    fitCanvas(spec, 720 / 80);
    const W = canvas.width, R = W / 2 * 0.92, s = t / 1000;
    const beat = audio.update(t);
    const g = +gain.value, k = ARM_OPTIONS[+arms.value];
    const pal = PALETTES[palette];

    if (beat) {
      ripples.push({ r: 0, a: 0.9 });
      if (mode === 'bloom') flash = 1;
    }
    ripples = ripples.filter((r) => { r.r += 0.022; r.a *= 0.965; return r.r < 1.2 && r.a > 0.02; });
    flash *= 0.85;

    // Tamaño de LED según densidad
    const pitch = R / Math.sqrt(leds.length);
    const size = pitch * 0.42;

    octx.fillStyle = '#030304';
    octx.fillRect(0, 0, W, W);
    for (const p of leds) {
      const [v, hue] = shade(p, s, k, g);
      const x = W / 2 + p.x * R, y = W / 2 + p.y * R;
      // LED apagado: cápsula gris tenue
      octx.fillStyle = '#16171b';
      octx.beginPath(); octx.arc(x, y, size, 0, Math.PI * 2); octx.fill();
      if (v > 0.01) {
        const c = pal(clamp(hue * 0.75 + v * 0.25, 0, 1));
        const b = Math.pow(v, 1.6); // corrección gamma aproximada
        octx.fillStyle = `rgb(${c[0] * b | 0},${c[1] * b | 0},${c[2] * b | 0})`;
        octx.beginPath(); octx.arc(x, y, size, 0, Math.PI * 2); octx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.drawImage(off, 0, 0);
    if (diffuser.checked) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${Math.max(2, pitch * 0.9)}px)`;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(off, 0, 0);
      ctx.filter = `blur(${Math.max(4, pitch * 2.6)}px)`;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(off, 0, 0);
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }

    // Espectro
    const SW = spec.width, SH = spec.height, bw = SW / audio.BANDS;
    sctx.fillStyle = '#07080b';
    sctx.fillRect(0, 0, SW, SH);
    for (let b = 0; b < audio.BANDS; b++) {
      const v = audio.bands[b], h = v * (SH - 6);
      sctx.fillStyle = rgb(pal(0.3 + 0.7 * (b / audio.BANDS)));
      sctx.fillRect(b * bw + 1, SH - h, bw - 2, h);
      sctx.fillStyle = 'rgba(255,255,255,.55)';
      sctx.fillRect(b * bw + 1, SH - audio.peaks[b] * (SH - 6) - 2, bw - 2, 2);
    }
    const beatAge = t - audio.sinceBeat;
    if (audio.active && beatAge < 150) {
      sctx.fillStyle = `rgba(245,181,61,${1 - beatAge / 150})`;
      sctx.beginPath(); sctx.arc(SW - 14, 14, 7, 0, Math.PI * 2); sctx.fill();
    }
  });
})();

/* =========================================================
   7. Exportar coordenadas
   ========================================================= */
(function exporter() {
  const nIn = $('#exp-n'), cIn = $('#exp-c'), info = $('#exp-info');

  function points() {
    const n = clamp(Math.round(+nIn.value || 1), 1, 5000), c = Math.max(0.1, +cIn.value || 10);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const r = c * Math.sqrt(i), th = i * GOLDEN_RAD;
      pts.push({ i, r, th, x: r * Math.cos(th), y: r * Math.sin(th) });
    }
    return { n, c, pts };
  }

  function minSpacing(pts) {
    // Rejilla espacial para buscar el vecino más cercano sin O(n²)
    const cell = Math.max(1e-6, pts.length > 1 ? Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) * 2 : 1);
    const grid = new Map(), key = (a, b) => `${a},${b}`;
    for (const p of pts) {
      const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
      (grid.get(k) || grid.set(k, []).get(k)).push(p);
    }
    let best = Infinity;
    for (const p of pts) {
      const gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const q of grid.get(key(gx + dx, gy + dy)) || []) {
          if (q === p) continue;
          best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
        }
      }
    }
    return best;
  }

  function refresh() {
    const { n, c, pts } = points();
    const d = 2 * c * Math.sqrt(n - 1);
    const sp = n > 1 ? minSpacing(pts) : 0;
    info.textContent = `Diámetro total ≈ ${fmt(d, 1)} mm · separación mínima entre centros ≈ ${fmt(sp, 1)} mm · consumo máx. ≈ ${fmt(n * 0.06, 1)} A a 5 V.`;
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('#exp-csv').addEventListener('click', () => {
    const { pts } = points();
    download('filotaxis.csv', 'index,r_mm,theta_deg,x_mm,y_mm\n' +
      pts.map((p) => [p.i, p.r.toFixed(3), ((p.th * 180 / Math.PI) % 360).toFixed(3), p.x.toFixed(3), p.y.toFixed(3)].join(',')).join('\n'), 'text/csv');
  });

  $('#exp-svg').addEventListener('click', () => {
    const { n, c, pts } = points();
    const R = c * Math.sqrt(n - 1) + c, hole = Math.min(5, c * 0.6);
    const body = pts.map((p) => `<circle cx="${p.x.toFixed(3)}" cy="${p.y.toFixed(3)}" r="${(hole / 2).toFixed(3)}"/>`).join('\n  ');
    download('filotaxis.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${(2 * R).toFixed(2)}mm" height="${(2 * R).toFixed(2)}mm" viewBox="${-R} ${-R} ${2 * R} ${2 * R}">\n` +
      `  <circle cx="0" cy="0" r="${R.toFixed(3)}" fill="none" stroke="red" stroke-width="0.2"/>\n` +
      `  <g fill="none" stroke="black" stroke-width="0.1">\n  ${body}\n  </g>\n</svg>\n`, 'image/svg+xml');
  });

  $('#exp-c-code').addEventListener('click', () => {
    const { n, pts } = points();
    const maxR = pts[n - 1].r || 1;
    const u8 = (x) => clamp(Math.round(x), 0, 255);
    const radius = pts.map((p) => u8(p.r / maxR * 255));
    const angle = pts.map((p) => u8(((p.th / (2 * Math.PI)) % 1) * 256 % 256));
    const wrap = (arr) => arr.map((v, i) => (i % 16 === 0 ? '\n  ' : '') + v).join(', ');
    download('phyllotaxis_map.h',
      `// Mapa de ${n} LED en disposición de filotaxis (ángulo áureo)\n` +
      `// radius: 0 = centro, 255 = borde · angle: 0..255 = 0..360°\n` +
      `#pragma once\n#include <stdint.h>\n\n#define NUM_LEDS ${n}\n\n` +
      `const uint8_t led_radius[NUM_LEDS] = {${wrap(radius)}\n};\n\n` +
      `const uint8_t led_angle[NUM_LEDS] = {${wrap(angle)}\n};\n`, 'text/x-c');
  });

  nIn.addEventListener('input', refresh);
  cIn.addEventListener('input', refresh);
  refresh();
})();
