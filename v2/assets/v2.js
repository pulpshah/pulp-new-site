/* Pulp v2: the site frame and The Long Argument. Everything reads without this file; it adds the modes,
   the dialogs, the spine, the three layouts and the seat view. Nothing here sends data anywhere. */
(function () {
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

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

  /* ---------- The Long Argument ---------- */
  var dataEl = document.getElementById('la-data');
  if (!dataEl) return;
  var LA = JSON.parse(dataEl.textContent);
  var byN = {}; LA.entries.forEach(function (e) { byN[e.n] = e; });
  var groupOf = {}; LA.groups.forEach(function (g) { groupOf[g.id] = g; });
  var N = LA.entries.length;
  var anchor = Math.max.apply(null, LA.entries.map(function (e) { return e.y; })) + 1;
  var ago = function (y) { return Math.log10(anchor - y); };
  var FAR = Math.max.apply(null, LA.entries.map(function (e) { return ago(e.y); }));
  var NEAR = Math.min.apply(null, LA.entries.map(function (e) { return ago(e.y); }));

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
      geo.true = function (y) { return x0 + ((FAR - ago(y)) / ((FAR - NEAR) || 1)) * (x1 - x0); };
    }
    function draw() {
      var ink = css(canvas, '--feature-type', '#F0F0EC'), mute = css(canvas, '--feature-muted', '#E7E3F6'), hl = '#E6F21A';
      ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H);
      var k = Math.max(0, Math.min(1, shown));
      var upto = Math.floor(k * N);
      // ruler
      ctx.strokeStyle = mute; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(geo.x0, geo.rulerY); ctx.lineTo(geo.x1, geo.rulerY); ctx.stroke();
      ctx.fillStyle = mute; ctx.font = '700 11px ' + css(canvas, '--f', 'sans-serif'); ctx.textAlign = 'center';
      [[-2000, '2000 BCE'], [1, '1 CE'], [1000, '1000'], [1500, '1500'], [1800, '1800'], [1900, '1900'], [2000, '2000']].forEach(function (p) {
        var x = geo.true(p[0]); ctx.globalAlpha = 0.85; ctx.fillText(p[1], x, geo.rulerY - 9);
        ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x, geo.rulerY - 3); ctx.lineTo(x, geo.rulerY + 3); ctx.stroke();
      });
      // fans
      for (var i = 0; i < upto; i++) {
        var e = LA.entries[i], on = hot === e.n;
        ctx.globalAlpha = on ? 0.95 : 0.16; ctx.strokeStyle = on ? hl : ink; ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(geo.true(e.y), geo.rulerY); ctx.lineTo(geo.even(i), geo.lineY); ctx.stroke();
      }
      // bands
      ctx.textAlign = 'center';
      LA.groups.forEach(function (g, gi) {
        if (g.rowWith) return;
        var a = geo.even(g.from - 1) - 4, b = geo.even(Math.min(g.to, N) - 1) + 4;
        ctx.globalAlpha = gi % 2 ? 0.14 : 0.26; ctx.fillStyle = mute;
        ctx.fillRect(a, geo.bandY, b - a, 8);
        ctx.globalAlpha = 0.9; ctx.fillStyle = mute; ctx.font = '800 11px ' + css(canvas, '--f', 'sans-serif');
        ctx.fillText(g.numeral, (a + b) / 2, geo.bandY + 24);
      });
      // links as arcs under the line
      LA.links.forEach(function (l) {
        if (l.to > upto && l.from > upto) return;
        var a = geo.even(l.from - 1), b = geo.even(l.to - 1), on = hot && (hot === l.from || hot === l.to);
        var r = (b - a) / 2, cy = geo.bandY + 34;
        ctx.globalAlpha = on ? 0.95 : 0.22 * k; ctx.strokeStyle = on ? hl : mute; ctx.lineWidth = on ? 1.8 : 1;
        ctx.beginPath(); ctx.ellipse((a + b) / 2, cy, Math.max(1, r), Math.min(H - cy - 6, Math.max(6, r * 0.42)), 0, 0, Math.PI); ctx.stroke();
      });
      // dots
      for (i = 0; i < upto; i++) {
        e = LA.entries[i];
        var last = e.n === LA.entries[N - 1].n, hit = hot === e.n;
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
        var b = document.createElement('b'); b.textContent = e.n + ' · ' + e.t; tip.appendChild(b);
        var s = document.createElement('span'); s.textContent = e.when + ' · ' + e.place; tip.appendChild(s);
        tip.style.left = Math.min(Math.max(geo.even(i), 90), W - 90) + 'px'; tip.style.top = (geo.lineY - 12) + 'px';
        tip.classList.add('is-on');
      }
    });
    canvas.addEventListener('pointerleave', function () { hot = 0; draw(); if (tip) tip.classList.remove('is-on'); });
    canvas.addEventListener('click', function (ev) { var n = pick(ev); if (n && opts && opts.onPick) opts.onPick(n); });
    layout(); draw();
    if (!still) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !t0 && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
    }
    window.addEventListener('resize', function () { layout(); draw(); });
    document.addEventListener('v2:mode', draw);
  }

  var seatDialog = document.getElementById('la-seat');
  document.querySelectorAll('.la-spine canvas').forEach(function (c) {
    spine(c, { onPick: function (n) { if (seatDialog) openSeat(n); else location.href = c.getAttribute('data-href') + '#seat-' + n; } });
  });

  /* The seat view */
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function pieceInto(node, e) {
    var i = e.piece.indexOf(e.mark);
    if (i < 0) { node.textContent = e.piece; return; }
    node.appendChild(document.createTextNode(e.piece.slice(0, i)));
    node.appendChild(el('span', 'la-mark', e.mark));
    node.appendChild(document.createTextNode(e.piece.slice(i + e.mark.length)));
  }
  var seatN = 0;
  function openSeat(n, from) {
    if (!seatDialog) return;
    var e = byN[n]; if (!e) return;
    seatN = n;
    var g = groupOf[e.g];
    var pic = seatDialog.querySelector('.la-dialog__pic'); pic.innerHTML = '';
    if (e.pic) { var im = el('img'); im.src = e.pic.big; im.alt = e.pic.alt; im.width = 920; im.height = 720; pic.appendChild(im); }
    else { var p = el('div', 'la-card__pend'); p.appendChild(el('b', '', String(e.n))); p.appendChild(el('span', '', 'Picture comes later')); pic.appendChild(p); }
    seatDialog.querySelector('[data-seat-part]').textContent = g ? g.numeral + ' · ' + g.name : '';
    seatDialog.querySelector('[data-seat-count]').textContent = e.n === 101 ? '101' : String(e.n).padStart(2, '0') + ' / 100';
    seatDialog.querySelector('h2').textContent = e.t;
    seatDialog.querySelector('.la-dialog__when').textContent = e.place + ', ' + e.when;
    var pc = seatDialog.querySelector('.la-dialog__piece'); pc.innerHTML = ''; pieceInto(pc, e);
    var cap = seatDialog.querySelector('.la-dialog__cap'); cap.innerHTML = '';
    if (e.pic) {
      cap.appendChild(document.createTextNode(e.pic.caption + ' '));
      if (e.pic.credit) cap.appendChild(document.createTextNode((e.pic.creditLabel || 'Photo') + ': ' + e.pic.credit + ', ' + e.pic.license + ', printed as halftone by Pulp. '));
      else cap.appendChild(document.createTextNode(e.pic.license + '; printed as halftone by Pulp. '));
      if (e.pic.sourceUrl) { var a = el('a', '', 'Source'); a.href = e.pic.sourceUrl; a.rel = 'noopener'; cap.appendChild(a); }
    }
    var ul = seatDialog.querySelector('.la-dialog__links'); ul.innerHTML = '';
    LA.links.forEach(function (l) {
      var other = l.from === n ? l.to : l.to === n ? l.from : 0;
      if (!other) return;
      var o = byN[other], li = el('li'), lk = el('a');
      lk.href = '#seat-' + other; lk.setAttribute('data-seat', other);
      lk.appendChild(el('b', '', (other > n ? 'Calls forward to ' : 'Called back by ') + other + ' · ' + o.t));
      lk.appendChild(el('span', '', l.why));
      li.appendChild(lk); ul.appendChild(li);
    });
    seatDialog.querySelector('[data-prev]').disabled = n <= 1;
    seatDialog.querySelector('[data-next]').disabled = n >= N;
    if (!seatDialog.open) openDialog(seatDialog, from);
    try { history.replaceState(null, '', '#seat-' + n); } catch (err) {}
  }
  if (seatDialog) {
    seatDialog.querySelector('[data-prev]').addEventListener('click', function () { openSeat(seatN - 1); });
    seatDialog.querySelector('[data-next]').addEventListener('click', function () { openSeat(seatN + 1); });
    seatDialog.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-seat]'); if (!a) return; ev.preventDefault(); openSeat(+a.getAttribute('data-seat'));
    });
    seatDialog.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' && seatN > 1) openSeat(seatN - 1);
      if (ev.key === 'ArrowRight' && seatN < N) openSeat(seatN + 1);
    });
    seatDialog.addEventListener('close', function () { try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {} });
    document.querySelectorAll('.la-card').forEach(function (c) {
      c.addEventListener('click', function (ev) { ev.preventDefault(); openSeat(+c.getAttribute('data-n'), c.querySelector('a')); });
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
      card.animate && !still && card.animate([{ boxShadow: '0 0 0 0 #E6F21A' }, { boxShadow: '0 0 0 6px #E6F21A' }, { boxShadow: '0 0 0 0 #E6F21A' }], { duration: 1400, easing: 'ease-out' });
      var l = card.querySelector('a'); if (l) l.focus({ preventScroll: true });
    });
  });

  /* Three layouts over one record */
  var board = document.querySelector('.la-board');
  if (!board) return;
  var cards = Array.prototype.slice.call(board.querySelectorAll('.la-card'));
  var rule = document.querySelector('[data-la-rule]');
  var RULES = { rows: 'Rows by part: one row per part, read left to right, then down. Each row ends with Read next.', line: 'One long line: all 101 in order, a wider gap between parts. Scroll sideways to travel.', wall: 'True-time wall: 25 columns of real time on a log scale; where an era crowds, its seats stack.' };
  var ticks = [];
  function clearWall() {
    board.style.height = '';
    cards.forEach(function (c) { c.style.left = ''; c.style.top = ''; });
    ticks.forEach(function (t) { t.remove(); }); ticks = [];
  }
  function placeWall() {
    var w = board.clientWidth, COLS = 25, gap = 6, gutter = 4;
    var pitch = (w - 2 * gutter) / COLS, tw = Math.max(26, Math.min(72, Math.floor(pitch - 6))), th = Math.round(tw * 1.25);
    var stack = {}, maxK = 0;
    var col = function (y) { return Math.round(((FAR - ago(y)) / ((FAR - NEAR) || 1)) * (COLS - 1)); };
    cards.forEach(function (c) { var e = byN[+c.getAttribute('data-n')]; var k = col(e.y); stack[k] = (stack[k] || 0) + 1; maxK = Math.max(maxK, stack[k]); });
    var base = maxK * (th + gap) + 12, seen = {};
    board.style.setProperty('--tile', tw + 'px'); board.style.setProperty('--tileh', th + 'px');
    cards.forEach(function (c) {
      var e = byN[+c.getAttribute('data-n')], k = col(e.y), s = seen[k] || 0; seen[k] = s + 1;
      c.style.left = (gutter + k * pitch + (pitch - tw) / 2) + 'px';
      c.style.top = (base - (s + 1) * (th + gap) + gap) + 'px';
    });
    board.style.height = (base + 56) + 'px';
    var line = el('div', 'la-wall__base'); line.style.top = (base + 4) + 'px'; board.appendChild(line); ticks.push(line);
    [[-2000, '2000 BCE'], [1, '1 CE'], [1500, '1500'], [1800, '1800'], [1900, '1900'], [2000, '2000']].forEach(function (p) {
      var t = el('div', 'la-wall__tick', p[1]); t.style.left = (gutter + col(p[0]) * pitch + pitch / 2) + 'px'; t.style.top = (base + 14) + 'px';
      board.appendChild(t); ticks.push(t);
    });
  }
  function setLayout(mode, animate) {
    var first = new Map();
    if (animate && !still) cards.forEach(function (c) { var r = c.getBoundingClientRect(); if (r.bottom > -100 && r.top < innerHeight + 100 && r.right > -100 && r.left < innerWidth + 100) first.set(c, r); });
    board.classList.remove('is-line', 'is-wall');
    clearWall();
    if (mode === 'line') board.classList.add('is-line');
    if (mode === 'wall') { board.classList.add('is-wall'); placeWall(); }
    if (rule) rule.textContent = RULES[mode];
    store('pulp:la-layout', mode);
    if (!animate || still) return;
    var top = board.getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 140 });
    first.forEach(function (r0, c) {
      var r1 = c.getBoundingClientRect();
      if (!c.animate || !r1.width) return;
      var dx = r0.left - r1.left, dy = r0.top - r1.top, sx = r0.width / r1.width, sy = r0.height / r1.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01) return;
      c.animate([{ transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transformOrigin: '0 0', transform: 'none' }], { duration: 720, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
  }
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
