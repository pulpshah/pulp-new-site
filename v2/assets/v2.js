/* Pulp v2: the site frame and The Long Argument. Everything reads without this file; it adds the modes, the dialogs,
   the photo tilt, the spine, the three layouts, the dice and the seat view. Nothing here sends data anywhere. */
(function () {
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function st(el, k, on) { var s = (el.getAttribute('data-state') || '').split(' ').filter(Boolean), i = s.indexOf(k); if (on === undefined) return i >= 0; if (on && i < 0) s.push(k); if (!on && i >= 0) s.splice(i, 1); if (s.length) el.setAttribute('data-state', s.join(' ')); else el.removeAttribute('data-state'); return !!on; }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

  /* Modes: system, light, dark, mono */
  function setMode(m) {
    if (m === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', m);
    store('pulp:theme', m === 'system' ? null : m);
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
    document.dispatchEvent(new CustomEvent('v2:mode'));
  }
  var cur = root.getAttribute('data-theme') || 'system';
  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.getAttribute('data-mode') === cur ? 'true' : 'false');
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });

  /* Dialogs */
  var opener = null;
  function openDialog(d, from) {
    if (!d || typeof d.showModal !== 'function') return;
    opener = from || document.activeElement;
    if (!d.open) d.showModal();
  }
  function closeDialog(d) { if (d && d.open) d.close(); }
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d) closeDialog(d);
      if (e.target.closest('[data-close]')) closeDialog(d);
    });
    d.addEventListener('close', function () { if (opener && document.contains(opener)) opener.focus(); });
  });
  document.querySelectorAll('[data-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var d = document.getElementById(b.getAttribute('data-open'));
      if (!d) return;
      e.preventDefault();
      document.querySelectorAll('dialog[open]').forEach(closeDialog);
      openDialog(d, b);
    });
  });

  /* Contact: a preview that checks the form and sends nothing */
  var form = document.querySelector('[data-contact]');
  if (form) {
    var status = form.querySelector('[data-status]');
    var check = function (f) {
      var i = f.querySelector('input, textarea');
      var ok = i.value.trim() !== '' && (i.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim()));
      f.setAttribute('data-state', ok ? 'valid' : 'invalid'); i.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };
    form.querySelectorAll('[data-field]').forEach(function (f) {
      f.querySelector('input, textarea').addEventListener('blur', function () { if (this.value !== '') check(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = Array.prototype.filter.call(form.querySelectorAll('[data-field]'), function (f) { return !check(f); });
      if (bad.length) { status.textContent = bad.length === 1 ? 'One answer needs a fix.' : bad.length + ' answers need a fix.'; bad[0].querySelector('input, textarea').focus(); return; }
      status.textContent = 'This preview sends nothing. On pulp.com.ai, this note goes to the team.';
    });
  }

  /* Photo tilt, from the live homepage (R-PHO-09): on a fine pointer, a photo leans away from the cursor inside its
     frame and a soft light follows the cursor, easing in and settling flat when the pointer leaves. On touch, a scroll
     light drifts across each photo as it crosses the screen, and a finger lights where it lands. Reduced motion: none. */
  (function () {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)'), calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    function touchy() { return !fine.matches && !calm.matches; }
    var kicks = [];
    document.querySelectorAll('[data-tilt]').forEach(function (box) {
      var img = box.querySelector('img'); if (!img) return;
      var small = box.hasAttribute('data-tilt-small');
      var AMP = small ? 3 : 1, SHIFT = small ? 6 : 12;
      var sheen = el('span', 'v2-sheen'); sheen.setAttribute('aria-hidden', 'true');
      img.insertAdjacentElement('afterend', sheen);
      box.classList.add('v2-tilt');
      var zone = box.closest('[data-tilt-zone]') || box;
      var t = { x: 0, y: 0, o: 0, k: 1 }, c = { x: 0, y: 0, o: 0, k: 1 }, raf = null, vis = false;
      var f = { on: false, x: 0, y: 0, k: 0.6, until: 0, sx: 0, sy: 0, st: 0, moved: false };
      function clamp(v) { return Math.max(-1, Math.min(1, v)); }
      function aimTouch(now) {
        if (f.on || now < f.until) { t.x = f.x; t.y = f.y; t.o = 1; t.k = f.k; return; }
        t.k = 0;
        if (!vis) { t.o = 0; return; }
        var r = box.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
        t.x = -0.85 + 1.7 * p; t.y = -0.5 + p; t.o = 0.7 * Math.sin(Math.PI * p);
      }
      function step() {
        raf = null;
        var now = performance.now(), touch = touchy();
        if (touch) aimTouch(now);
        c.x += (t.x - c.x) * 0.06; c.y += (t.y - c.y) * 0.06; c.o += (t.o - c.o) * 0.06; c.k += (t.k - c.k) * 0.1;
        var m = Math.hypot(c.x, c.y), k = c.k;
        img.style.translate = (-c.x * SHIFT * k).toFixed(2) + 'px ' + (-c.y * SHIFT * 0.75 * k).toFixed(2) + 'px';
        img.style.rotate = m * k > 0.001 ? (-c.y).toFixed(3) + ' ' + c.x.toFixed(3) + ' 0 ' + (m * AMP * k).toFixed(3) + 'deg' : 'none';
        img.style.scale = (1 + 0.04 * c.o * k).toFixed(4);
        sheen.style.setProperty('--lx', (50 + c.x * 45).toFixed(1) + '%'); sheen.style.setProperty('--ly', (50 + c.y * 45).toFixed(1) + '%');
        sheen.style.opacity = c.o.toFixed(3);
        var busy = touch && (f.on || now < f.until);
        if (busy || Math.abs(t.x - c.x) + Math.abs(t.y - c.y) + Math.abs(t.o - c.o) + Math.abs(t.k - c.k) > 0.002) raf = requestAnimationFrame(step);
        else if (!t.o) { c.x = c.y = c.o = 0; img.style.translate = img.style.rotate = img.style.scale = ''; sheen.style.opacity = '0'; }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(step); }
      kicks.push(function () { if (vis) kick(); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; kick(); }).observe(box);
      zone.addEventListener('pointermove', function (e) {
        if (!fine.matches || calm.matches || e.pointerType === 'touch') return;
        var r = box.getBoundingClientRect();
        t.x = clamp((e.clientX - r.left) / r.width * 2 - 1); t.y = clamp((e.clientY - r.top) / r.height * 2 - 1); t.o = 1; t.k = 1; kick();
      }, { passive: true });
      zone.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; t.x = 0; t.y = 0; t.o = 0; kick(); });
      function at(p) { var r = box.getBoundingClientRect(); f.x = clamp((p.clientX - r.left) / r.width * 2 - 1); f.y = clamp((p.clientY - r.top) / r.height * 2 - 1); }
      zone.addEventListener('touchstart', function (e) {
        if (!touchy() || e.touches.length !== 1) return;
        var p = e.touches[0];
        if (p.clientX < 24 || p.clientX > innerWidth - 24) return;
        f.on = true; f.moved = false; f.k = 0.6; f.sx = p.clientX; f.sy = p.clientY; f.st = performance.now(); at(p); kick();
      }, { passive: true });
      zone.addEventListener('touchmove', function (e) {
        if (!f.on || e.touches.length !== 1) { f.on = false; return; }
        var p = e.touches[0], dx = p.clientX - f.sx, dy = p.clientY - f.sy;
        if (!f.moved && Math.hypot(dx, dy) > 10) { f.moved = true; if (Math.abs(dx) > Math.abs(dy)) f.k = 1; }
        at(p); kick();
      }, { passive: true });
      zone.addEventListener('touchend', function () {
        if (!f.on) return; f.on = false;
        if (!f.moved && performance.now() - f.st < 300) f.until = performance.now() + 180;
        kick();
      }, { passive: true });
      zone.addEventListener('touchcancel', function () { f.on = false; kick(); }, { passive: true });
    });
    var queued = false;
    addEventListener('scroll', function () {
      if (!touchy() || queued) return; queued = true;
      requestAnimationFrame(function () { queued = false; kicks.forEach(function (k) { k(); }); });
    }, { passive: true });
  })();

  /* ---------- The Long Argument ---------- */
  var dataEl = document.getElementById('la-data');
  if (!dataEl) return;
  var LA = JSON.parse(dataEl.textContent);
  var byN = {}; LA.entries.forEach(function (e) { byN[e.n] = e; });
  var groupOf = {}; LA.groups.forEach(function (g) { groupOf[g.id] = g; });
  var N = LA.entries.length, FIRST = LA.entries[0].n, LAST = LA.entries[N - 1].n;
  var anchor = Math.max.apply(null, LA.entries.map(function (e) { return e.y; })) + 1;
  var ago = function (y) { return Math.log10(Math.max(1, anchor - y)); };
  var FAR = Math.max.apply(null, LA.entries.map(function (e) { return ago(e.y); }));
  var NEAR = Math.min.apply(null, LA.entries.map(function (e) { return ago(e.y); }));
  var trueFrac = function (y) { return (FAR - ago(y)) / ((FAR - NEAR) || 1); };
  var EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

  function css(el, v, fb) { var x = getComputedStyle(el).getPropertyValue(v).trim(); return x || fb; }

  /* The spine: every seat evenly on one line, fanned from its true time, links as arcs, parts as bands */
  function spine(canvas, opts) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var tip = canvas.parentElement.querySelector('.la-spine__tip');
    var W = 0, H = 0, S = Math.min(2, window.devicePixelRatio || 1), hot = 0, t0 = 0, raf = 0, shown = still ? 1 : 0;
    var geo = {};
    function layout() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(320, r.width); H = Math.max(180, r.height);
      canvas.width = W * S; canvas.height = H * S;
      var x0 = 18, x1 = W - 18;
      geo = { x0: x0, x1: x1, rulerY: H * 0.16, lineY: H * 0.52, bandY: H * 0.52 + 14 };
      geo.even = function (i) { return x0 + (i / (N - 1)) * (x1 - x0); };
      geo.true = function (y) { return x0 + trueFrac(y) * (x1 - x0); };
    }
    function draw() {
      var ink = css(canvas, '--feature-type', '#F0F0EC'), mute = css(canvas, '--feature-muted', '#E7E3F6'), hl = '#E6F21A';
      ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H);
      var k = Math.max(0, Math.min(1, shown));
      var upto = Math.floor(k * N);
      ctx.strokeStyle = mute; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(geo.x0, geo.rulerY); ctx.lineTo(geo.x1, geo.rulerY); ctx.stroke();
      ctx.fillStyle = mute; ctx.font = '700 11px ' + css(canvas, '--f', 'sans-serif'); ctx.textAlign = 'center';
      [[-2000, '2000 BCE'], [1, '1 CE'], [1000, '1000'], [1500, '1500'], [1800, '1800'], [1900, '1900'], [2000, '2000']].forEach(function (p) {
        var x = geo.true(p[0]); ctx.globalAlpha = 0.85; ctx.fillText(p[1], x, geo.rulerY - 9);
        ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x, geo.rulerY - 3); ctx.lineTo(x, geo.rulerY + 3); ctx.stroke();
      });
      for (var i = 0; i < upto; i++) {
        var e = LA.entries[i], on = hot === e.n;
        ctx.globalAlpha = on ? 0.95 : 0.16; ctx.strokeStyle = on ? hl : ink; ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(geo.true(e.y), geo.rulerY); ctx.lineTo(geo.even(i), geo.lineY); ctx.stroke();
      }
      ctx.textAlign = 'center';
      LA.groups.forEach(function (g, gi) {
        if (g.rowWith) return;
        var a = geo.even(g.from - 1) - 4, b = geo.even(Math.min(g.to, N) - 1) + 4;
        ctx.globalAlpha = gi % 2 ? 0.14 : 0.26; ctx.fillStyle = mute;
        ctx.fillRect(a, geo.bandY, b - a, 8);
        ctx.globalAlpha = 0.9; ctx.fillStyle = mute; ctx.font = '800 11px ' + css(canvas, '--f', 'sans-serif');
        ctx.fillText(g.numeral, (a + b) / 2, geo.bandY + 24);
      });
      LA.links.forEach(function (l) {
        if (l.to > upto && l.from > upto) return;
        var a = geo.even(l.from - 1), b = geo.even(l.to - 1), on = hot && (hot === l.from || hot === l.to);
        var r = (b - a) / 2, cy = geo.bandY + 34;
        ctx.globalAlpha = on ? 0.95 : 0.22 * k; ctx.strokeStyle = on ? hl : mute; ctx.lineWidth = on ? 1.8 : 1;
        ctx.beginPath(); ctx.ellipse((a + b) / 2, cy, Math.max(1, r), Math.min(H - cy - 6, Math.max(6, r * 0.42)), 0, 0, Math.PI); ctx.stroke();
      });
      for (i = 0; i < upto; i++) {
        e = LA.entries[i];
        var last = e.n === LAST, hit = hot === e.n;
        ctx.globalAlpha = 1; ctx.fillStyle = last || hit ? hl : ink;
        ctx.beginPath(); ctx.arc(geo.even(i), geo.lineY, last ? 6 : hit ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      if (!t0) t0 = now;
      shown = Math.min(1, (now - t0) / 1800);
      draw();
      if (shown < 1) raf = requestAnimationFrame(frame); else raf = 0;
    }
    function pick(ev) {
      var r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      var i = Math.round(((x - geo.x0) / (geo.x1 - geo.x0)) * (N - 1));
      if (i < 0 || i >= N || Math.abs(y - geo.lineY) > 70) return 0;
      return LA.entries[i].n;
    }
    canvas.addEventListener('pointermove', function (ev) {
      var n = pick(ev);
      if (n !== hot) { hot = n; draw(); }
      if (tip) {
        if (!n) { tip.classList.remove('is-on'); return; }
        var e = byN[n], i = LA.entries.indexOf(e);
        tip.innerHTML = '';
        tip.appendChild(el('b', '', e.n + ' · ' + e.t)); tip.appendChild(el('span', '', e.when + ' · ' + e.place));
        tip.style.left = Math.min(Math.max(geo.even(i), 90), W - 90) + 'px'; tip.style.top = (geo.lineY - 12) + 'px';
        tip.classList.add('is-on');
      }
    });
    canvas.addEventListener('pointerleave', function () { hot = 0; draw(); if (tip) tip.classList.remove('is-on'); });
    canvas.addEventListener('click', function (ev) { var n = pick(ev); if (n && opts && opts.onPick) opts.onPick(n); });
    layout(); draw();
    if (!still) new IntersectionObserver(function (es) { if (es[0].isIntersecting && !t0 && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
    window.addEventListener('resize', function () { layout(); draw(); });
    document.addEventListener('v2:mode', draw);
  }

  var seatDialog = document.getElementById('la-seat');
  document.querySelectorAll('.la-spine canvas').forEach(function (c) {
    spine(c, { onPick: function (n) { if (seatDialog) openSeat(n); else location.href = c.getAttribute('data-href') + '#seat-' + n; } });
  });

  /* The dice, from the live homepage's footer: random faces on load; a roll tumbles them, flickers through faces and
     lands on a new pair (each die changes), then jumps to a random seat */
  var diceTpl = document.getElementById('la-dice');
  function face(not) { var f; do { f = 1 + Math.floor(Math.random() * 6); } while (f === not); return f; }
  function roll(btn, done) {
    var dies = btn.querySelectorAll('.p-die');
    if (st(btn, 'rolling')) return;
    var start = Array.prototype.map.call(dies, function (d) { return +d.getAttribute('data-face'); });
    var end = [face(start[0])]; end.push(face(start[1])); if (end[1] === end[0]) end[1] = face(end[0]);
    if (still) { Array.prototype.forEach.call(dies, function (d, i) { d.setAttribute('data-face', end[i]); }); done(); return; }
    st(btn, 'rolling', 0); void btn.offsetWidth; st(btn, 'rolling', 1);
    var ticks = [40, 50, 60, 70, 85, 100, 120, 150];
    (function tick(i) {
      if (i < ticks.length) { Array.prototype.forEach.call(dies, function (d) { d.setAttribute('data-face', face(+d.getAttribute('data-face'))); }); setTimeout(function () { tick(i + 1); }, ticks[i]); return; }
      Array.prototype.forEach.call(dies, function (d, k) { d.setAttribute('data-face', end[k]); });
      done();
      setTimeout(function () { st(btn, 'rolling', 0); }, 900);
    })(0);
  }
  function randomSeat() { var n; do { n = LA.entries[Math.floor(Math.random() * N)].n; } while (n === seatN && N > 1); return n; }
  if (diceTpl) document.querySelectorAll('[data-dice-slot]').forEach(function (slot) {
    var btn = diceTpl.content.firstElementChild.cloneNode(true);
    btn.querySelectorAll('.p-die').forEach(function (d) { d.setAttribute('data-face', face()); });
    var label = slot.getAttribute('data-dice-text');
    if (label) btn.querySelector('.la-dice__t').textContent = label; else btn.classList.add('la-dice--compact');
    btn.addEventListener('click', function () {
      var to = randomSeat(), was = seatN;
      roll(btn, function () { openSeat(to, { dir: was ? Math.sign(to - was) : 1, travel: true, from: btn, fromYear: was ? byN[was].y : byN[FIRST].y }); });
    });
    slot.replaceWith(btn);
  });

  /* The seat view: the whole print in a steady frame, the golden circle as bullets, the year on a rail that counts and
     slides between seats. Arrows step; holding one speeds up through time and eases out when let go. */
  function pieceInto(node, e) {
    var i = e.piece.indexOf(e.mark);
    if (i < 0) { node.textContent = e.piece; return; }
    node.appendChild(document.createTextNode(e.piece.slice(0, i)));
    node.appendChild(el('span', 'la-mark', e.mark));
    node.appendChild(document.createTextNode(e.piece.slice(i + e.mark.length)));
  }
  function richInto(node, text) {
    var re = /\[\[(\d+)(?:\|([^\]]+))?\]\]/g, last = 0, m;
    while ((m = re.exec(text))) {
      node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var k = +m[1], o = byN[k], a = el('a', 'la-ref', m[2] || (o ? o.t : String(k)));
      a.href = '#seat-' + k; a.setAttribute('data-seat', k); node.appendChild(a); last = re.lastIndex;
    }
    node.appendChild(document.createTextNode(text.slice(last)));
  }
  function yearText(v) { var r = Math.round(v); return r < 1 ? Math.max(1, -r) + ' BCE' : r < 1000 ? r + ' CE' : String(r); }
  var seatN = 0;
  if (seatDialog) {
    var Q = function (s) { return seatDialog.querySelector(s); };
    var rail = Q('[data-rail]'), yearEl = Q('[data-year]'), track = Q('[data-track]'), mark = Q('[data-mark]'), ruler = Q('[data-ruler]');
    var pic = Q('[data-pic]'), frameEl = Q('.la-dlg__frame'), imgs = [Q('[data-a]'), Q('[data-b]')], pend = Q('[data-pend]'), front = 0, picReq = 0;
    var text = Q('[data-text]'), live = Q('[data-live]'), prevB = Q('[data-prev]'), nextB = Q('[data-next]');
    var ticksDone = false;
    function buildTrack() {
      if (ticksDone) return; ticksDone = true;
      [[-2000, '2000 BCE'], [1, '1 CE'], [1000, '1000'], [1500, '1500'], [1800, '1800'], [1900, '1900'], [2000, '2000']].forEach(function (p) {
        var t = el('span', 'la-dlg__tick', p[1]); t.style.left = (trueFrac(p[0]) * 100) + '%'; track.appendChild(t);
      });
      LA.entries.forEach(function (e) { var d = el('i', e.n === LAST ? 'is-101' : ''); d.style.left = (trueFrac(e.y) * 100) + '%'; track.appendChild(d); });
    }
    /* the year: an eased count toward the seat's year, so fast travel reads as time rushing past */
    var yr = { v: null, to: 0, raf: 0, approx: false, k: 0.18 };
    function paintYear(rest) { yearEl.textContent = (rest && yr.approx ? 'c. ' : '') + yearText(yr.v); }
    function yearStep() {
      yr.raf = 0;
      var d = yr.to - yr.v;
      if (Math.abs(d) < 0.6) { yr.v = yr.to; paintYear(true); return; }
      yr.v += d * yr.k + (d > 0 ? 0.4 : -0.4);
      paintYear(false);
      yr.raf = requestAnimationFrame(yearStep);
    }
    function yearTo(y, approx, opts) {
      yr.to = y; yr.approx = approx; yr.k = opts.travel ? 0.085 : opts.fast ? 0.3 : 0.18;
      if (yr.v === null || still) { yr.v = opts.fromYear != null && !still ? opts.fromYear : y; }
      if (still || yr.v === y) { yr.v = y; paintYear(true); return; }
      if (!yr.raf) yr.raf = requestAnimationFrame(yearStep);
    }
    function markTo(y, opts) {
      mark.style.transitionDuration = still ? '0ms' : opts.travel ? '900ms' : opts.fast ? '120ms' : '420ms';
      mark.style.left = (trueFrac(y) * 100) + '%';
    }
    var cached = {};
    function preload(n) { [n - 2, n - 1, n + 1, n + 2].forEach(function (k) { var e = byN[k]; if (e && e.pic && !cached[k]) { cached[k] = new Image(); cached[k].src = e.pic.big; } }); }
    function showPic(e) {
      if (!e.pic) { imgs.forEach(function (i) { i.classList.remove('is-on'); }); pend.hidden = false; pend.querySelector('b').textContent = e.n; return; }
      pend.hidden = true;
      var want = e.pic.big, tok = ++picReq, cur = imgs[front];
      if (cur.getAttribute('src') === want) { cur.classList.add('is-on'); cur.alt = e.pic.alt; return; }
      var nx = imgs[1 - front];
      nx.onload = function () { if (tok !== picReq) return; nx.classList.add('is-on'); cur.classList.remove('is-on'); front = 1 - front; };
      nx.alt = e.pic.alt; nx.src = want;
    }
    function list(node, items) {
      node.innerHTML = '';
      items.forEach(function (it) {
        var li = el('li');
        if (it.label) li.appendChild(el('b', '', it.label + ' '));
        richInto(li, it.text); node.appendChild(li);
      });
    }
    var announce = 0;
    function openSeat(n, opts) {
      opts = opts || {};
      var e = byN[n]; if (!e) return;
      var dir = opts.dir || (seatN ? Math.sign(n - seatN) : 0), was = seatN;
      seatN = n;
      buildTrack();
      var g = groupOf[e.g];
      Q('[data-seat-part]').textContent = g ? (g.numeral === '101' ? 'The 101st piece' : g.numeral + ' · ' + g.name) : '';
      Q('[data-seat-count]').textContent = e.n === 101 ? '101' : String(e.n).padStart(2, '0') + ' / 100';
      Q('h2').textContent = e.t;
      Q('[data-when]').textContent = e.place + ', ' + e.when;
      var pc = Q('[data-piece]'); pc.innerHTML = ''; pieceInto(pc, e);
      var c = e.c || { what: [], how: [], why: {} };
      list(Q('[data-what]'), c.what.map(function (t) { return { text: t }; }));
      list(Q('[data-how]'), c.how.map(function (t) { return { text: t }; }));
      list(Q('[data-why]'), [c.why.pulp ? { label: 'For Pulp.', text: c.why.pulp } : null, c.why.today ? { label: 'For people today.', text: c.why.today } : null].filter(Boolean));
      Q('.la-dlg__circle').hidden = !e.c;
      var cap = Q('[data-cap]'); cap.innerHTML = '';
      if (e.pic) {
        cap.appendChild(document.createTextNode(e.pic.caption + ' '));
        if (e.pic.credit) cap.appendChild(document.createTextNode((e.pic.creditLabel || 'Photo') + ': ' + e.pic.credit + ', ' + e.pic.license + ', printed as halftone by Pulp. '));
        else cap.appendChild(document.createTextNode(e.pic.license + '; printed as halftone by Pulp. '));
        if (e.pic.sourceUrl) { var a = el('a', '', 'Source'); a.href = e.pic.sourceUrl; a.rel = 'noopener'; cap.appendChild(a); }
      }
      var ul = Q('[data-links]'); ul.innerHTML = '';
      LA.links.forEach(function (l) {
        var other = l.from === n ? l.to : l.to === n ? l.from : 0;
        if (!other) return;
        var o = byN[other], li = el('li'), lk = el('a');
        lk.href = '#seat-' + other; lk.setAttribute('data-seat', other);
        lk.appendChild(el('b', '', (other > n ? 'Calls forward to ' : 'Called back by ') + other + ' · ' + o.t));
        lk.appendChild(el('span', '', l.why));
        li.appendChild(lk); ul.appendChild(li);
      });
      prevB.disabled = n <= FIRST; nextB.disabled = n >= LAST;
      showPic(e); preload(n);
      var opening = !seatDialog.open;
      if (opening) { yr.v = null; openDialog(seatDialog, opts.from); }
      yearTo(e.y, e.approx, opening && !opts.travel ? {} : opts);
      markTo(e.y, opening && !opts.travel ? { fast: true } : opts);
      if (!opening || opts.travel) {
        text.scrollTop = 0;
        if (!still && text.animate && was !== n) {
          text.getAnimations && text.getAnimations().forEach(function (an) { an.cancel(); });
          var dx = (dir || 1) * (opts.fast ? 10 : 24);
          text.animate([{ opacity: 0, transform: 'translateX(' + dx + 'px)' }, { opacity: 1, transform: 'none' }], { duration: opts.fast ? 130 : 340, easing: EASE });
        }
      }
      clearTimeout(announce);
      announce = setTimeout(function () { live.textContent = 'Seat ' + e.n + ', ' + e.t + ', ' + e.when + '.'; }, opts.fast ? 500 : 60);
      try { history.replaceState(null, '', '#seat-' + n); } catch (err) {}
    }
    window.__laOpen = openSeat;

    /* speed: tap steps once; holding repeats, faster and faster to a floor; letting go coasts a few slowing steps */
    var nav = { dir: 0, held: false, timer: 0, iv: 0 };
    function stepBy(d, fast) { var n = Math.max(FIRST, Math.min(LAST, seatN + d)); if (n !== seatN) openSeat(n, { dir: d, fast: fast }); }
    function press(d) {
      if (nav.held && nav.dir === d) return;
      clearTimeout(nav.timer);
      nav.dir = d; nav.held = true; nav.iv = 300;
      stepBy(d, false);
      nav.timer = setTimeout(function tick() {
        if (!nav.held) return;
        nav.iv = still ? 220 : Math.max(48, nav.iv * 0.8);
        stepBy(nav.dir, nav.iv < 170);
        nav.timer = setTimeout(tick, nav.iv);
      }, 380);
    }
    function release() {
      if (!nav.held) return;
      nav.held = false; clearTimeout(nav.timer);
      if (still || nav.iv >= 170) return;
      var iv = nav.iv, d = nav.dir, k = 0;
      (function coast() {
        iv *= 1.7; k++;
        if (iv > 360 || k > 4) return;
        nav.timer = setTimeout(function () { stepBy(d, iv < 170); coast(); }, iv);
      })();
    }
    [[prevB, -1], [nextB, 1]].forEach(function (p) {
      var b = p[0], d = p[1];
      b.addEventListener('pointerdown', function (ev) { if (ev.button) return; ev.preventDefault(); press(d); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { b.addEventListener(t, release); });
      b.addEventListener('click', function (ev) { if (ev.detail === 0) stepBy(d, false); });
    });
    seatDialog.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); if (!ev.repeat) press(ev.key === 'ArrowLeft' ? -1 : 1); }
      if (ev.key === 'Home') { ev.preventDefault(); openSeat(FIRST, { dir: -1, travel: true }); }
      if (ev.key === 'End') { ev.preventDefault(); openSeat(LAST, { dir: 1, travel: true }); }
    });
    seatDialog.addEventListener('keyup', function (ev) { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') release(); });
    seatDialog.addEventListener('close', function () {
      release(); clearTimeout(nav.timer); yr.v = null;
      try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    });
    /* scroll over the picture or the rail: every 60 px of travel is one seat, and the wheel's own momentum eases it out */
    var acc = 0, lastWheel = 0;
    function onWheel(ev) {
      var d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (ev.deltaMode === 1) d *= 16;
      ev.preventDefault();
      var now = performance.now(); if (now - lastWheel > 350) acc = 0;
      var quick = now - lastWheel < 90; lastWheel = now;
      acc += d;
      while (Math.abs(acc) >= 60) { var s = acc > 0 ? 1 : -1; acc -= s * 60; stepBy(s, quick); }
    }
    rail.addEventListener('wheel', onWheel, { passive: false });
    pic.addEventListener('wheel', onWheel, { passive: false });
    seatDialog.addEventListener('wheel', function (ev) {
      if (ev.target.closest('[data-rail], [data-pic]')) return;
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) * 1.5) onWheel(ev);
    }, { passive: false });
    /* swipe the picture: a flick travels farther, then slows */
    var sw = null;
    pic.addEventListener('pointerdown', function (ev) { if (ev.pointerType === 'mouse') return; sw = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
    pic.addEventListener('pointerup', function (ev) {
      if (!sw) return;
      var dx = ev.clientX - sw.x, dy = ev.clientY - sw.y, dt = Math.max(1, performance.now() - sw.t); sw = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      var d = dx < 0 ? 1 : -1, steps = still ? 1 : Math.max(1, Math.min(8, Math.round(Math.abs(dx) / dt * 2.4))), iv = 46;
      (function go(k) { if (k >= steps) return; stepBy(d, k < steps - 1); iv *= 1.32; setTimeout(function () { go(k + 1); }, iv); })(0);
    });
    pic.addEventListener('pointercancel', function () { sw = null; });
    /* drag along the rail's timeline to scrub through time */
    function seatAt(x) {
      var r = track.getBoundingClientRect(), f = (x - r.left) / r.width, best = FIRST, bd = 9;
      LA.entries.forEach(function (e) { var dd = Math.abs(trueFrac(e.y) - f); if (dd < bd) { bd = dd; best = e.n; } });
      return best;
    }
    var scrub = false;
    ruler.addEventListener('pointerdown', function (ev) { scrub = true; ruler.setPointerCapture(ev.pointerId); var n = seatAt(ev.clientX); if (n !== seatN) openSeat(n, { fast: true }); });
    ruler.addEventListener('pointermove', function (ev) { if (!scrub) return; var n = seatAt(ev.clientX); if (n !== seatN) openSeat(n, { fast: true }); });
    ruler.addEventListener('pointerup', function () { scrub = false; });
    ruler.addEventListener('pointercancel', function () { scrub = false; });

    seatDialog.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-seat]'); if (!a) return; ev.preventDefault();
      var to = +a.getAttribute('data-seat'); openSeat(to, { dir: Math.sign(to - seatN), travel: Math.abs(to - seatN) > 1 });
    });
    document.querySelectorAll('.la-card:not(.la-card--next)').forEach(function (c) {
      c.addEventListener('click', function (ev) { ev.preventDefault(); openSeat(+c.getAttribute('data-n'), { from: c.querySelector('a') }); });
    });
    document.querySelectorAll('[data-open-seat]').forEach(function (a) {
      a.addEventListener('click', function (ev) { ev.preventDefault(); openSeat(+a.getAttribute('data-open-seat'), { from: a }); });
    });
    var m = /^#seat-(\d+)$/.exec(location.hash);
    if (m) setTimeout(function () { openSeat(+m[1]); }, 60);
  }

  /* Sticky offset: a part heading lands below both bars */
  var laBar = document.querySelector('.la-bar');
  if (laBar) {
    var stick = function () {
      var top = document.querySelector('.v2-bar');
      document.documentElement.style.setProperty('--la-stick', ((top ? top.offsetHeight : 64) + laBar.offsetHeight) + 'px');
    };
    stick();
    if (window.ResizeObserver) new ResizeObserver(stick).observe(laBar); else window.addEventListener('resize', stick);
  }

  /* Read next: jump to a seat in its row */
  document.querySelectorAll('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var card = document.getElementById('seat-' + a.getAttribute('data-jump'));
      if (!card) return;
      ev.preventDefault();
      card.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center', inline: 'center' });
      if (card.animate && !still) card.animate([{ boxShadow: '0 0 0 0 #E6F21A' }, { boxShadow: '0 0 0 6px #E6F21A' }, { boxShadow: '0 0 0 0 #E6F21A' }], { duration: 1400, easing: 'ease-out' });
      var l = card.querySelector('a'); if (l) l.focus({ preventScroll: true });
    });
  });

  /* Three layouts over one record. The wall stands upright (time across, eras stacking up) or lies on its side (time
     down, eras stacking across); turning it swaps the axes in one quick move. */
  var board = document.querySelector('.la-board');
  if (!board) return;
  var cards = Array.prototype.slice.call(board.querySelectorAll('.la-card:not(.la-card--next)'));
  var rule = document.querySelector('[data-la-rule]'), turn = document.querySelector('[data-wall-turn]');
  var RULES = { rows: 'Rows by part: one row per part, read left to right, then down. Each row ends with Read next.',
    line: 'One long line: all 101 in order, a wider gap between parts, then what comes next. Scroll sideways to travel.',
    wall: 'True-time wall: 25 columns of real time on a log scale; where an era crowds, its seats stack.',
    side: 'The wall on its side: 25 rows of real time, oldest at the top; where an era crowds, its seats line up across.' };
  var orient = store('pulp:la-wall') === 'side' ? 'side' : 'up';
  var ticks = [];
  function clearWall() {
    board.style.height = '';
    cards.forEach(function (c) { c.style.left = ''; c.style.top = ''; });
    ticks.forEach(function (t) { t.remove(); }); ticks = [];
  }
  function placeWall() {
    var w = board.clientWidth, COLS = 25, gap = 6, gutter = 4;
    var col = function (y) { return Math.round(trueFrac(y) * (COLS - 1)); };
    var stack = {}, maxK = 0;
    cards.forEach(function (c) { var k = col(byN[+c.getAttribute('data-n')].y); stack[k] = (stack[k] || 0) + 1; maxK = Math.max(maxK, stack[k]); });
    var seen = {}, tw, th;
    var labels = [[-2000, '2000 BCE'], [1, '1 CE'], [1500, '1500'], [1800, '1800'], [1900, '1900'], [2000, '2000']];
    board.classList.toggle('is-side', orient === 'side');
    if (orient === 'side') {
      var lab = Math.min(84, Math.max(56, w * 0.07));
      tw = Math.max(24, Math.min(72, Math.floor((w - lab - gutter) / maxK) - gap)); th = Math.round(tw * 0.78);
      board.style.setProperty('--tile', tw + 'px'); board.style.setProperty('--tileh', th + 'px');
      cards.forEach(function (c) {
        var k = col(byN[+c.getAttribute('data-n')].y), s = seen[k] || 0; seen[k] = s + 1;
        c.style.left = (lab + s * (tw + gap)) + 'px'; c.style.top = (8 + k * (th + gap)) + 'px';
      });
      board.style.height = (COLS * (th + gap) + 24) + 'px';
      var axis = el('div', 'la-wall__axis'); axis.style.left = (lab - 10) + 'px'; axis.style.height = (COLS * (th + gap)) + 'px'; axis.style.top = '6px';
      board.appendChild(axis); ticks.push(axis);
      labels.forEach(function (p) {
        var t = el('div', 'la-wall__tick la-wall__tick--side', p[1]); t.style.left = (lab - 16) + 'px'; t.style.top = (8 + col(p[0]) * (th + gap) + th / 2) + 'px';
        board.appendChild(t); ticks.push(t);
      });
      return;
    }
    var pitch = (w - 2 * gutter) / COLS;
    tw = Math.max(26, Math.min(72, Math.floor(pitch - 6))); th = Math.round(tw * 1.25);
    var base = maxK * (th + gap) + 12;
    board.style.setProperty('--tile', tw + 'px'); board.style.setProperty('--tileh', th + 'px');
    cards.forEach(function (c) {
      var k = col(byN[+c.getAttribute('data-n')].y), s = seen[k] || 0; seen[k] = s + 1;
      c.style.left = (gutter + k * pitch + (pitch - tw) / 2) + 'px';
      c.style.top = (base - (s + 1) * (th + gap) + gap) + 'px';
    });
    board.style.height = (base + 56) + 'px';
    var line = el('div', 'la-wall__base'); line.style.top = (base + 4) + 'px'; board.appendChild(line); ticks.push(line);
    labels.forEach(function (p) {
      var t = el('div', 'la-wall__tick', p[1]); t.style.left = (gutter + col(p[0]) * pitch + pitch / 2) + 'px'; t.style.top = (base + 14) + 'px';
      board.appendChild(t); ticks.push(t);
    });
  }
  function flip(change, ms) {
    var first = new Map();
    if (!still) cards.forEach(function (c) { var r = c.getBoundingClientRect(); if (r.bottom > -200 && r.top < innerHeight + 200 && r.right > -200 && r.left < innerWidth + 200) first.set(c, r); });
    change();
    if (still) return;
    var i = 0;
    first.forEach(function (r0, c) {
      var r1 = c.getBoundingClientRect();
      if (!c.animate || !r1.width) return;
      var dx = r0.left - r1.left, dy = r0.top - r1.top, sx = r0.width / r1.width, sy = r0.height / r1.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01) return;
      c.animate([{ transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transformOrigin: '0 0', transform: 'none' }],
        { duration: ms, delay: Math.min(140, (i++) * 1.4), easing: EASE, fill: 'backwards' });
    });
  }
  function setLayout(mode, animate) {
    var go = function () {
      board.classList.remove('is-line', 'is-wall', 'is-side');
      clearWall();
      if (mode === 'line') board.classList.add('is-line');
      if (mode === 'wall') { board.classList.add('is-wall'); placeWall(); }
    };
    if (animate) flip(go, 720); else go();
    if (rule) rule.textContent = RULES[mode === 'wall' && orient === 'side' ? 'side' : mode];
    if (turn) { turn.hidden = mode !== 'wall'; }
    store('pulp:la-layout', mode);
    if (animate) { var top = board.getBoundingClientRect().top; if (top < 0) window.scrollTo({ top: window.scrollY + top - 140 }); }
  }
  function paintTurn() {
    if (!turn) return;
    turn.setAttribute('aria-pressed', orient === 'side' ? 'true' : 'false');
    turn.querySelector('span').textContent = orient === 'side' ? 'Stand it up' : 'Turn sideways';
  }
  if (turn) turn.addEventListener('click', function () {
    orient = orient === 'side' ? 'up' : 'side'; store('pulp:la-wall', orient); paintTurn();
    flip(function () { clearWall(); placeWall(); }, 560);
    if (rule) rule.textContent = RULES[orient === 'side' ? 'side' : 'wall'];
  });
  paintTurn();
  var radios = document.querySelectorAll('input[name="la-layout"]');
  var saved = store('pulp:la-layout');
  var narrow = window.matchMedia('(max-width: 560px)');
  radios.forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) setLayout(r.value, true); });
    if (saved && r.value === saved && !(narrow.matches && saved === 'wall')) r.checked = true;
  });
  var start = document.querySelector('input[name="la-layout"]:checked');
  setLayout(start ? start.value : 'rows', false);
  window.addEventListener('resize', function () { if (board.classList.contains('is-wall')) { clearWall(); placeWall(); } });
})();
