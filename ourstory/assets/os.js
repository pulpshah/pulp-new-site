/* Our story: motion. Everything is readable without this file; it only adds movement.
   Respects prefers-reduced-motion: fields draw one still frame and nothing reveals. */
(function () {
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;
  if (!still && canObserve) root.classList.add('os-anim');

  /* Reading progress in the top bar */
  var bar = document.querySelector('.os-progress');
  function progress() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', h > 0 ? Math.min(1, window.scrollY / h).toFixed(4) : 0);
  }
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress);
  progress();

  /* Reveal on arrival */
  function reveal(el) {
    el.classList.add('is-in');
    el.querySelectorAll('[data-count]').forEach(count);
    el.querySelectorAll('.os-readout').forEach(readout);
  }
  var revealables = document.querySelectorAll('[data-reveal], .os-photo, .os-hl');
  if (root.classList.contains('os-anim')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(reveal);
  }

  /* Numbers that count up once, ending on the printed value */
  function count(el) {
    if (el.dataset.counted || still) return;
    el.dataset.counted = '1';
    var end = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var comma = el.hasAttribute('data-comma');
    var t0 = performance.now(), dur = 1400;
    function fmt(n) { n = Math.round(n); return (comma ? n.toLocaleString('en-US') : String(n)) + suffix; }
    function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(end * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(end);
    }
    requestAnimationFrame(step);
  }

  /* The readout illustration settles into its shares */
  function readout(el) {
    if (still) return;
    var spans = el.querySelectorAll('span');
    var target = [];
    spans.forEach(function (s) { target.push(s.style.flexGrow || '1'); s.style.flexGrow = '1'; });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { spans.forEach(function (s, i) { s.style.flexGrow = target[i]; }); });
    });
  }

  /* Halftone fields */
  function field(kind, nx, ny, W, H, t) {
    var v = 0, k, d, g;
    if (kind === 'stream') {
      for (k = 0; k < 8; k++) {
        var c = (k + 0.5) / 8;
        var env = 0.35 + 0.65 * Math.sin(Math.PI * nx);
        var yk = c + (0.3 / 8) * Math.sin(2 * Math.PI * ((1.1 + 0.37 * k) * nx + 0.17 * k - t * 0.06)) * env;
        d = (ny - yk) / (0.22 / 8);
        var pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(2 * Math.PI * ((2.3 + 0.21 * k) * nx + 0.41 * k - t * 0.11)));
        g = Math.exp(-d * d) * pulse;
        if (g > v) v = g;
      }
      return v;
    }
    if (kind === 'converge') {
      var tx = 0.82, ty = 0.5;
      if (nx <= tx) {
        var tt = nx / tx;
        for (k = 0; k < 11; k++) {
          var y0 = 0.06 + k * 0.088;
          var yc = ty + (y0 - ty) * Math.pow(1 - tt, 1.7) + 0.018 * Math.sin(2 * Math.PI * (2.6 * nx + 0.29 * k - t * 0.08)) * (1 - tt);
          var w = 0.01 + 0.014 * (1 - tt);
          d = (ny - yc) / w;
          var travel = 0.55 + 0.45 * Math.sin(2 * Math.PI * (tt * 1.5 - t * 0.25 + k * 0.07));
          g = Math.exp(-d * d) * (0.35 + 0.5 * tt) * (0.6 + 0.4 * travel);
          if (g > v) v = g;
        }
      }
      var dx = (nx - tx) * W, dy = (ny - ty) * H, s = Math.min(W, H) * (0.085 + 0.008 * Math.sin(t * 1.4));
      return Math.max(v, Math.exp(-(dx * dx + dy * dy) / (s * s)));
    }
    if (kind === 'resonance') {
      var beat = Math.abs(Math.cos(Math.PI * 1.5 * nx + 0.35 - t * 0.12));
      var carrier = 0.5 + 0.5 * Math.cos(2 * Math.PI * (7.75 * nx - t * 0.35));
      var half = 0.07 + 0.38 * beat;
      d = (ny - 0.5) / half;
      return (0.25 + 0.75 * carrier) * (0.3 + 0.7 * beat) * Math.max(0, 1 - d * d);
    }
    return 0;
  }

  function spiral(ctx, W, H, ink, t) {
    var m = Math.min(W, H), cx = W / 2, cy = H / 2, R = m * 0.44, r0 = m * 0.085, unit = m / 1000;
    var pts = [], th = -Math.PI / 2, i;
    for (i = 0; i < 50; i++) {
      var q = i / 49, r = r0 + (R - r0) * Math.pow(1 - q, 1.1);
      pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th), q]);
      th += (m * 0.034) / r;
    }
    var shown = still ? 50 : Math.min(50, Math.floor(t / 0.055));
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i = 0; i < shown; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
    if (shown === 50) ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = ink;
    for (i = 0; i < shown; i++) {
      var age = still ? 1 : Math.min(1, (t - i * 0.055) / 0.35);
      var breathe = still ? 1 : 1 + 0.07 * Math.sin(t * 1.3 + i * 0.4);
      var rad = (5 + 6 * pts[i][2]) * unit * 1.3 * age * breathe;
      ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], Math.max(0, rad), 0, Math.PI * 2); ctx.fill();
    }
    var tc = still ? 1 : Math.max(0, Math.min(1, (t - 50 * 0.055) / 0.5));
    if (tc > 0) {
      var pop = tc < 1 ? 1 - Math.pow(1 - tc, 3) * Math.cos(tc * 6) : 1 + 0.04 * Math.sin(t * 1.1);
      ctx.fillStyle = '#E6F21A';
      ctx.beginPath(); ctx.arc(cx, cy, 30 * unit * 1.35 * pop, 0, Math.PI * 2); ctx.fill();
    }
  }

  function inkFor(el) {
    var v = el.getAttribute('data-ink');
    if (v && v.indexOf('--') === 0) return getComputedStyle(el).getPropertyValue(v).trim() || '#372F5C';
    return v || '#372F5C';
  }

  function setup(el) {
    var ctx = el.getContext && el.getContext('2d');
    if (!ctx) return;
    var W = +el.getAttribute('data-w'), H = +el.getAttribute('data-h');
    var kind = el.getAttribute('data-kind'), step = +(el.getAttribute('data-step') || 12);
    var S = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * S; el.height = H * S;
    var visible = false, raf = 0, t0 = 0, last = 0;
    function draw(t) {
      var ink = inkFor(el);
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (kind === 'spiral') { spiral(ctx, W, H, ink, t); return; }
      ctx.fillStyle = ink;
      for (var y = step / 2; y < H; y += step) {
        for (var x = step / 2; x < W; x += step) {
          var r = Math.min(1, field(kind, x / W, y / H, W, H, t)) * step * 0.56;
          if (r < 0.45) continue;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (still || !canObserve) { draw(kind === 'spiral' ? 99 : 0); return; }
    function loop(now) {
      if (!visible) { raf = 0; return; }
      if (!t0) t0 = now;
      if (now - last > 33) { last = now; draw((now - t0) / 1000); }
      raf = requestAnimationFrame(loop);
    }
    draw(0);
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(el);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { visible = false; return; }
      var b = el.getBoundingClientRect();
      visible = b.bottom > 0 && b.top < window.innerHeight;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
  }
  document.querySelectorAll('canvas.os-field').forEach(setup);
})();
