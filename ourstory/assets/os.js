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

  /* Milana's page: one fixed vector, and a grid that turns from one basis to another */
  var FONT = "'Libre Franklin', 'Helvetica Neue', Arial, sans-serif";
  function basis(ctx, W, H, ink, t) {
    var blue = '#1398D1', m = Math.min(W, H), u = m / 7.4;
    var ox = W * 0.26, oy = H * 0.74;
    var k = still ? 1 : 0.5 - 0.5 * Math.cos(t * 0.5);
    var e = k * k * (3 - 2 * k);
    var th = 0.6 * e, sc = 1 + 0.24 * e, sh = 0.32 * e;
    var b1 = [sc * u * Math.cos(th), sc * u * Math.sin(th)];
    var b2 = [-sc * u * Math.sin(th + sh) * 0.92, sc * u * Math.cos(th + sh) * 0.92];
    var v = [3 * u, 2.1 * u];
    function X(p) { return ox + p[0]; }
    function Y(p) { return oy - p[1]; }
    function at(i, j) { return [i * b1[0] + j * b2[0], i * b1[1] + j * b2[1]]; }
    var i, j, a, b;
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    for (i = -8; i <= 10; i++) {
      ctx.globalAlpha = i === 0 ? 0.55 : 0.14;
      a = at(i, -8); b = at(i, 10);
      ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke();
      a = at(-8, i); b = at(10, i);
      ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); ctx.stroke();
    }
    ctx.globalAlpha = 0.7; ctx.fillStyle = ink;
    for (i = -8; i <= 10; i++) for (j = -8; j <= 10; j++) {
      a = at(i, j);
      if (X(a) < -4 || X(a) > W + 4 || Y(a) < -4 || Y(a) > H + 4) continue;
      ctx.beginPath(); ctx.arc(X(a), Y(a), m / 260, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    function arrow(p, color, w, head) {
      var ang = Math.atan2(-p[1], p[0]);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(X(p) - Math.cos(ang) * head * 0.6, Y(p) - Math.sin(ang) * head * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(p), Y(p));
      ctx.lineTo(X(p) - head * Math.cos(ang - 0.42), Y(p) - head * Math.sin(ang - 0.42));
      ctx.lineTo(X(p) - head * Math.cos(ang + 0.42), Y(p) - head * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
    }
    arrow(b1, ink, 3, m / 34);
    arrow(b2, ink, 3, m / 34);
    arrow(v, blue, m / 80, m / 18);
    ctx.fillStyle = '#E6F21A'; ctx.strokeStyle = '#191A19'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(v), Y(v), m / 42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    var det = b1[0] * b2[1] - b2[0] * b1[1];
    var c1 = (v[0] * b2[1] - b2[0] * v[1]) / det, c2 = (b1[0] * v[1] - v[0] * b1[1]) / det;
    ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 ' + Math.round(m / 30) + 'px ' + FONT;
    ctx.fillText('b₁', X(b1) + 8, Y(b1) + 18);
    ctx.fillText('b₂', X(b2) - 30, Y(b2) - 8);
    ctx.fillStyle = blue;
    ctx.fillText('v = her goals', X(v) + m / 30, Y(v) + m / 90);
    ctx.fillStyle = ink;
    ctx.font = '800 ' + Math.round(m / 24) + 'px ' + FONT;
    ctx.fillText('[v] = (' + c1.toFixed(2) + ', ' + c2.toFixed(2) + ')', m * 0.06, m * 0.1);
    ctx.font = '600 ' + Math.round(m / 34) + 'px ' + FONT;
    ctx.globalAlpha = 0.8;
    ctx.fillText(e < 0.5 ? 'basis: political science' : 'basis: applied math + stats', m * 0.06, m * 0.1 + m / 20);
    ctx.globalAlpha = 1;
  }

  /* Milana's page: why at the center, how and what moving outward from it */
  function circle(ctx, W, H, ink, t, step) {
    var m = Math.min(W, H), cx = W / 2, cy = H / 2, rings = [0.27, 0.42], x, y, k;
    ctx.fillStyle = ink;
    for (y = step / 2; y < H; y += step) {
      for (x = step / 2; x < W; x += step) {
        var r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / m, v = 0;
        for (k = 0; k < 2; k++) {
          var d = (r - rings[k]) / 0.03;
          var wave = still ? 1 : 0.55 + 0.45 * Math.sin(2 * Math.PI * (r * 3 - t * 0.35));
          var g = Math.exp(-d * d) * wave;
          if (g > v) v = g;
        }
        var rad = Math.min(1, v) * step * 0.56;
        if (rad < 0.45) continue;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
    }
    var pulse = still ? 1 : 1 + 0.05 * Math.sin(t * 1.6);
    ctx.fillStyle = '#E6F21A';
    ctx.beginPath(); ctx.arc(cx, cy, m * 0.135 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#191A19'; ctx.font = '850 ' + Math.round(m / 17) + 'px ' + FONT;
    ctx.fillText('why', cx, cy);
    ctx.fillStyle = ink; ctx.font = '750 ' + Math.round(m / 26) + 'px ' + FONT;
    ctx.fillText('how', cx, cy - m * 0.345);
    ctx.fillText('what', cx, cy - m * 0.482);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
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
      if (kind === 'basis') { basis(ctx, W, H, ink, t); return; }
      if (kind === 'circle') { circle(ctx, W, H, ink, t, step); return; }
      ctx.fillStyle = ink;
      for (var y = step / 2; y < H; y += step) {
        for (var x = step / 2; x < W; x += step) {
          var r = Math.min(1, field(kind, x / W, y / H, W, H, t)) * step * 0.56;
          if (r < 0.45) continue;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (still || !canObserve) {
      draw(kind === 'spiral' ? 99 : 0);
      if (document.fonts && (kind === 'basis' || kind === 'circle')) document.fonts.ready.then(function () { draw(99); });
      return;
    }
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

  /* Milana's type tester: sample lines, letter size and ink */
  document.querySelectorAll('.mk-type').forEach(function (box) {
    var input = box.querySelector('.mk-type__input');
    function grow() { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
    input.addEventListener('input', grow);
    if (document.fonts) document.fonts.ready.then(grow);
    grow();
    box.querySelectorAll('[data-sample]').forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-sample'); grow(); input.focus(); });
    });
    var size = box.querySelector('[data-size]');
    if (size) {
      size.value = Math.round(parseFloat(getComputedStyle(input).fontSize)) || 64;
      size.addEventListener('input', function () { box.style.setProperty('--mk-size', size.value + 'px'); grow(); });
    }
    var inks = box.querySelectorAll('[data-ink]');
    inks.forEach(function (b) {
      b.addEventListener('click', function () {
        inks.forEach(function (o) { o.classList.remove('is-on'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true');
        box.style.setProperty('--mk-ink-type', b.getAttribute('data-ink'));
      });
    });
  });
})();
