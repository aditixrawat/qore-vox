/* Pebble Qore™ Vox landing page: plain JavaScript, no frameworks.
   Page states (colour, tabs, FAQ, menu, scroll chapters…) are pre-rendered per screen size
   in data/data-{d,t,m}.js and applied to the live DOM with a small in-place patcher. */
(function () {
  'use strict';
  var root = document.getElementById('qv-root');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.2,0.7,0.2,1)';
  var TINT = [[0.10, 0.11, 0.12, 1], [0.16, 0.27, 0.52, 1], [0.33, 0.23, 0.17, 1]];
  var ORBIT = ['250deg 72deg', '250deg 72deg', '250deg 72deg', '50deg 124deg'];
  var ORBIT_R = ['0.055m', '0.055m', '0.055m', '0.082m'];
  var SPOT_NAMES = ['Mic', 'Record button', 'Privacy light', '4PD sensor'];
  var D, bp, ctx, world, spot, last = null, cache = {}, Zv = {}, toastT, mv = null, hs = null, observers = [];
  var vtabLock = null;
  var healthRun = 0;
  var HEALTH_NUMS = [
    ['330', 82],
    ['338', 12907],
    ['344', 67],
    ['354', 59],
    ['397', 23],
    ['434', 95],
    ['457', 69]
  ];

  function pick() { var w = window.innerWidth; return w >= 980 ? 'd' : w >= 640 ? 't' : 'm'; }
  function load(name, cb) {
    window.QVD = window.QVD || {};
    if (window.QVD[name]) return cb();
    var s = document.createElement('script'); s.src = 'data/data-' + name + '.js?v=copy37'; s.onload = cb; document.head.appendChild(s);
  }

  // ---------- string table ----------
  function S(i) {
    var c = cache[bp] || (cache[bp] = {}); if (c[i] != null) return c[i];
    var e = D.T[i], s;
    if (typeof e === 'string') s = e; else { var r = S(e[0]); s = r.slice(0, e[1]) + e[3] + r.slice(r.length - e[2]); }
    return (c[i] = s);
  }
  function K(i) { return D.K[i]; }
  function frag(html) { var t = document.createElement('template'); t.innerHTML = html; return t.content.firstElementChild; }

  // ---------- DOM patcher ----------
  function keep(n) { return n && n.nodeType === 1 && n.hasAttribute('data-keep'); }
  function morph(a, b) {
    if (keep(a)) return a;
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.parentNode.replaceChild(b, a); return b; }
    if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return a; }
    var i, ba = b.attributes, aa = a.attributes;
    for (i = ba.length - 1; i >= 0; i--) { var n = ba[i].name, v = ba[i].value; if (a.getAttribute(n) !== v) a.setAttribute(n, v); }
    for (i = aa.length - 1; i >= 0; i--) { if (!b.hasAttribute(aa[i].name)) a.removeAttribute(aa[i].name); }
    var ac = a.firstChild, bc = b.firstChild;
    while (bc) {
      var nb = bc.nextSibling;
      if (!ac) a.appendChild(bc);
      else { var nx = ac.nextSibling; if (!keep(ac)) morph(ac, bc); ac = nx; }
      bc = nb;
    }
    while (ac) { var n2 = ac.nextSibling; if (!keep(ac)) a.removeChild(ac); ac = n2; }
    return a;
  }

  // ---------- render ----------
  function render() {
    var ids = world.slice(), keys = ids.map(K), base = D.B[ctx], baseByKey = {};
    base.forEach(function (id) { baseByKey[K(id)] = id; });
    Object.keys(Zv).forEach(function (d) {
      var ov = (D.Z[ctx][d] || {})[Zv[d]]; if (!ov) return;
      Object.keys(ov).forEach(function (k) { var ix = keys.indexOf(k); if (ix >= 0 && ids[ix] === baseByKey[k]) ids[ix] = ov[k]; });
    });
    var live = [].slice.call(root.children), byKey = {}, used = {}, prev = null;
    live.forEach(function (el) { if (el.__k) byKey[el.__k] = el; });
    ids.forEach(function (id) {
      var k = K(id), el = byKey[k];
      if (!el) { el = frag(S(id)); el.__k = k; el.__id = id; }
      else if (el.__id !== id) { var n = morph(el, frag(S(id))); if (n !== el) { n.__k = k; el = n; } el.__id = id; }
      used[k] = 1;
      var next = prev ? prev.nextSibling : root.firstChild;
      if (el !== next) root.insertBefore(el, next);
      prev = el;
    });
    live.forEach(function (el) { if (!used[el.__k] && el.parentNode === root) root.removeChild(el); });
    afterRender();
  }
  function ref(name) { return root.querySelector('[data-ref="' + name + '"]'); }
  function unitOf(el) { while (el && el.parentNode !== root) el = el.parentNode; return el; }

  // ---------- actions ----------
  var GALLERY_LABELS = ['Front', 'Angle', 'Side'];
  function galleryIds() {
    var A = D.A[ctx], base = D.B[ctx], u = A['8r3djt'].u, slot = 2, i;
    for (i = 0; i < u.length; i++) if (u[i] !== base[i]) { slot = i; break; }
    return [base[slot], A['8r3djt'].u[slot], A['1ffr29v'].u[slot]];
  }
  function shopSlot() {
    var g = galleryIds(), i;
    for (i = 0; i < world.length; i++) if (g.indexOf(world[i]) >= 0) return i;
    return 3;
  }
  function galleryIndex() {
    var g = galleryIds(), j = g.indexOf(world[shopSlot()]);
    return j < 0 ? 0 : j;
  }
  function goGallery(j) {
    var g = galleryIds(), n = g.length;
    j = ((j % n) + n) % n;
    var i = shopSlot();
    world = world.slice();
    world[i] = g[j];
    last = 'gallery';
    render();
  }
  var MOVE_TABS = ['Sleep', 'Activity', 'Sports'];
  var moveAuto = 0, movePause = 0;
  function moveTabSlot() {
    var A = D.A[ctx], u = A['t49z4d'] && A['t49z4d'].u, base = D.B[ctx], i;
    if (!u) return 9;
    for (i = 0; i < u.length; i++) if (u[i] !== base[i]) return i;
    return 9;
  }
  function moveTabIds() {
    var A = D.A[ctx], slot = moveTabSlot();
    return [D.B[ctx][slot], A['t49z4d'].u[slot], A['p15mgp'].u[slot]];
  }
  function goMoveTab(j) {
    var ids = moveTabIds(), slot = moveTabSlot();
    world = world.slice();
    world[slot] = ids[j];
    last = 'movetab';
    render();
  }
  function goVoiceTab(j) {
    j = Math.max(0, Math.min(3, j));
    vtabLock = String(j);
    Zv.vtab = String(j);
    if (j === 0) { world = D.B[ctx].slice(); last = null; }
    else {
      var sig = j === 1 ? '1d69h2i' : j === 2 ? '1eg340' : '1segsum';
      var m = D.A[ctx] && D.A[ctx][sig];
      if (m && m.u) { world = m.u.slice(); last = sig; }
    }
    render();
  }
  function goDesignSpot(j) {
    spot = j;
    if (j === 0) { world = D.B[ctx].slice(); last = null; }
    else {
      var A = D.A[ctx], k, found = null;
      for (k in A) if (A[k] && A[k].s === j && A[k].u) { found = k; break; }
      if (found) { world = A[found].u.slice(); last = found; }
    }
    render();
  }
  function act(sig, m, el, e) {
    if (el && /Replay/.test(el.textContent || '')) { replayDemo(); return; }
    if (m.t && last === sig) { world = D.B[ctx].slice(); last = null; }
    else if ('c' in m) { ctx = m.c; world = D.B[ctx].slice(); last = null; }
    else if (m.u) { world = m.u.slice(); last = sig; }
    else if (!m.sc && !m.sb) return;
    if (m.u || 'c' in m || m.t) spot = ('s' in m) ? m.s : D.init.spot;
    if (m.u || 'c' in m || m.t || m.sc) render();
    if (m.sc) {
      if (m.sc.indexOf('getElementById') >= 0) { var f = document.getElementById('faq'); if (f) window.scrollTo({ top: f.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); }
      else {
        var isDay = m.sc.indexOf('goDay') >= 0, n = isDay ? 5 : 3, u = unitOf(el);
        var list = [].filter.call(u ? u.querySelectorAll('[data-x]') : [], function (x) { var mm = D.A[ctx][x.getAttribute('data-x')]; return mm && mm.sc === m.sc; });
        var i = Math.max(0, list.indexOf(el)) % n, pin = ref(isDay ? 'dayRef' : 'vPinRef');
        if (pin) { var top = pin.getBoundingClientRect().top + window.scrollY, span = pin.offsetHeight - window.innerHeight; window.scrollTo({ top: top + span * ((i + 0.5) / n), behavior: reduce ? 'auto' : 'smooth' }); }
      }
    }
    if (m.sb) goUc(m.sb > 0 ? 1 : -1);
    if (world.some(function (id) { return K(id) === 'role-status'; })) {
      clearTimeout(toastT);
      toastT = setTimeout(function () { world = world.filter(function (id) { return K(id) !== 'role-status'; }); render(); }, 3800);
    }
  }
  function replayDemo() {
    var d = ref('demoRef'); if (!d) return;
    var n = frag(d.outerHTML); n.__k = d.__k; n.__id = d.__id; d.parentNode.replaceChild(n, d);
  }
  function goUc(dir) {
    var uc = ref('ucRef'); if (!uc) return;
    var cards = uc.querySelectorAll('[data-dc-tpl="641"]');
    if (!cards.length) return;
    var pad = parseFloat(window.getComputedStyle(uc).paddingLeft) || 0;
    var sl = uc.scrollLeft;
    var n = cards.length;
    var i, best = 0, bestD = Infinity, t;
    for (i = 0; i < n; i++) {
      t = cards[i].offsetLeft - pad;
      var d = Math.abs(t - sl);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (uc._ucI != null && Math.abs((cards[uc._ucI].offsetLeft - pad) - sl) <= 48) best = uc._ucI;
    var next = (best + dir + n) % n;
    uc._ucI = next;
    var max = Math.max(0, uc.scrollWidth - uc.clientWidth);
    var left = Math.max(0, Math.min(max, cards[next].offsetLeft - pad));
    uc.style.setProperty('scroll-snap-type', 'none', 'important');
    if (uc._snapT) clearTimeout(uc._snapT);
    if (uc._tw) cancelAnimationFrame(uc._tw);
    function restoreSnap() {
      uc._snapT = setTimeout(function () { uc.style.setProperty('scroll-snap-type', 'x mandatory'); }, 60);
    }
    if (reduce) { uc.scrollLeft = left; restoreSnap(); return; }
    var from = uc.scrollLeft, t0 = performance.now(), ms = 320;
    function step(now) {
      var u = Math.min(1, (now - t0) / ms);
      var e = 1 - Math.pow(1 - u, 3);
      uc.scrollLeft = from + (left - from) * e;
      if (u < 1) uc._tw = requestAnimationFrame(step);
      else { uc.scrollLeft = left; restoreSnap(); }
    }
    uc._tw = requestAnimationFrame(step);
  }
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-x]'); if (!el || !root.contains(el)) return;
    if (el.closest('#shop')) {
      var lab = el.getAttribute('aria-label') || '';
      if (lab === 'Previous image') { goGallery(galleryIndex() - 1); return; }
      if (lab === 'Next image') { goGallery(galleryIndex() + 1); return; }
      var gi = GALLERY_LABELS.indexOf(lab);
      if (gi >= 0) { goGallery(gi); return; }
    }
    if (el.getAttribute('role') === 'tab') {
      var tab = ((el.querySelector('.sc-interp') || el).textContent || '').trim();
      if (el.closest('[aria-label="Compare with"]') && tab === 'Wellness bands') {
        world = D.B[ctx].slice(); last = null; render(); return;
      }
      var ti = MOVE_TABS.indexOf(tab);
      if (ti >= 0) { movePause = performance.now() + 9000; moveAuto = 0; goMoveTab(ti); return; }
    }
    var nameEl = el.querySelector('[data-dc-tpl="572"] .sc-interp, [data-dc-tpl="197"] .sc-interp, [data-dc-tpl="237"] .sc-interp');
    var clickLab = ((nameEl || el.querySelector('.sc-interp') || el).textContent || '').replace(/\s+/g, ' ').trim();
    if (el.closest('[data-dc-tpl="235"]')) {
      var PHONE_LAB = { Transcribe: 1, Summary: 2, Summarize: 2, Summarise: 2, 'Segment Summary': 3 };
      if (PHONE_LAB[clickLab] != null) { goVoiceTab(PHONE_LAB[clickLab]); return; }
    }
    if (el.closest('[data-dc-tpl="192"]')) {
      var LEFT_LAB = { Record: 0, Transcribe: 1, Summarise: 2 };
      if (LEFT_LAB[clickLab] != null) { goVoiceTab(LEFT_LAB[clickLab]); return; }
    }
    var DESIGN_LAB = { Mic: 0, 'Record button': 1, 'Privacy light': 2, '4PD sensor': 3 };
    if (DESIGN_LAB[clickLab] != null && el.closest('#design')) {
      goDesignSpot(DESIGN_LAB[clickLab]);
      return;
    }
    var ucLab = el.getAttribute('aria-label') || '';
    var ucSig = el.getAttribute('data-x') || '';
    if (ucSig === 'ip0q4p' || ucSig === '1gu1unz' || ucLab === 'Previous' || ucLab === 'Next') {
      goUc(ucSig === 'ip0q4p' || ucLab === 'Previous' ? -1 : 1);
      return;
    }
    var sig = el.getAttribute('data-x'), m = D && D.A[ctx] && D.A[ctx][sig]; if (!m) return;
    if (m.pd) e.preventDefault();
    act(sig, m, el, e);
  });
  root.addEventListener('keydown', function (e) {
    var sp = e.target.closest && e.target.closest('[data-ref="splitRef"]');
    if (sp && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); setSplit(sp, (sp.__sp == null ? 50 : sp.__sp) + (e.key === 'ArrowLeft' ? -5 : 5)); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-x][tabindex]:not(button):not(a)')) { e.preventDefault(); e.target.click(); }
  });

  // ---------- hero split + finishes tilt ----------
  var drag = null, finX = null, splitPid = null;
  var splitShown = 84, splitFrom = 84, splitGoal = 16, splitT0 = 0, splitHold = 0, splitPause = 0;
  function setSplit(el, p) { p = Math.max(8, Math.min(92, p)); splitShown = p; el.__sp = p; el.style.setProperty('--split', p + '%'); el.setAttribute('aria-valuenow', Math.round(p)); }
  function splitAt(el, e) { var r = el.getBoundingClientRect(); setSplit(el, ((e.clientX - r.left) / r.width) * 100); }
  function restoreSplit() {
    var sp = ref('splitRef'); if (!sp) return;
    if (sp.__sp == null) sp.__sp = splitShown;
    sp.style.setProperty('--split', sp.__sp + '%');
    sp.setAttribute('aria-valuenow', Math.round(sp.__sp));
  }
  function driveSplit(now) {
    if (reduce) return;
    var sp = ref('splitRef'); if (!sp) return;
    if (drag) { splitPause = now + 2600; splitFrom = splitShown; splitHold = splitPause; return; }
    if (now < splitPause) return;
    if (!splitT0) { splitT0 = now; splitHold = now + 700; setSplit(sp, splitShown); return; }
    if (now < splitHold) return;
    if (!splitFrom && splitFrom !== 0) splitFrom = splitShown;
    var u = Math.min(1, (now - splitHold) / 1700);
    var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    setSplit(sp, splitFrom + (splitGoal - splitFrom) * e);
    if (u < 1) return;
    splitFrom = splitGoal;
    splitGoal = splitGoal < 50 ? 84 : 16;
    splitHold = now + 1500;
  }
  function driveMoveTabs(now) {
    if (reduce || now < movePause) return;
    var sec = document.querySelector('[data-screen-label="05b Sleep, Move, Play"]');
    if (!sec) return;
    var r = sec.getBoundingClientRect();
    var on = r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.28;
    if (!on) { moveAuto = 0; return; }
    if (!moveAuto) { moveAuto = now + 2800; return; }
    if (now < moveAuto) return;
    var tabs = sec.querySelectorAll('[role="tab"]'), cur = 0, i;
    for (i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') cur = i;
    goMoveTab((cur + 1) % MOVE_TABS.length);
    moveAuto = now + 3400;
  }
  function beginSplit(sp, e) {
    if (!sp || e.target.closest('a, button, [data-x]')) return;
    drag = sp; splitPid = e.pointerId;
    try { sp.setPointerCapture(e.pointerId); } catch (err) {}
    splitAt(sp, e);
    e.preventDefault();
  }
  root.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest('[data-ref="splitHandle"]');
    var sp = e.target.closest('[data-ref="splitRef"]');
    if (handle && sp) beginSplit(sp, e);
    else if (sp && e.pointerType !== 'touch') beginSplit(sp, e);
    if (e.target.closest('[data-ref="finRef"]')) finX = e.clientX;
  });
  root.addEventListener('pointermove', function (e) {
    if (drag) { splitAt(drag, e); e.preventDefault(); }
    var fin = e.target.closest && e.target.closest('[data-ref="finRef"]'), t = ref('finTiltRef');
    if (fin && t && !reduce && e.pointerType !== 'touch') { var r = fin.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; t.style.transform = 'perspective(1200px) rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 8) + 'deg)'; }
  });
  root.addEventListener('pointerleave', function () { var t = ref('finTiltRef'); if (t) t.style.transform = ''; }, true);
  function endSplit(e) {
    if (drag && splitPid != null) { try { drag.releasePointerCapture(splitPid); } catch (err) {} }
    drag = null; splitPid = null;
    if (finX != null) { var d = e.clientX - finX; finX = null; if (Math.abs(d) > 50) { ctx = (ctx + (d < 0 ? 1 : 2)) % 3; world = D.B[ctx].slice(); last = null; render(); } }
  }
  window.addEventListener('pointerup', endSplit);
  window.addEventListener('pointercancel', endSplit);

  // ---------- scroll-driven chapters ----------
  var raf = 0;
  function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; tick(); }); }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - window.innerHeight; return span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0; }
  function tick() {
    var ch = false;
    function set(d, v) { v = String(v); if (Zv[d] !== v) { Zv[d] = v; ch = true; } }
    var vp = ref('vPinRef');
    if (vp) {
      var p = prog(vp), f1 = ref('vFillRef'), f2 = ref('vFillRef2');
      if (f1) f1.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      if (f2) f2.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      var autoTab = String(Math.min(2, Math.floor(p * 3)));
      if (vtabLock != null && autoTab !== vtabLock) vtabLock = null;
      set('vtab', vtabLock != null ? vtabLock : autoTab);
    }
    var dy = ref('dayRef');
    if (dy) { var q = prog(dy), df = ref('dayFillRef'); if (df) df.style.height = (q * 100) + '%'; set('day', Math.min(4, Math.floor(q * 5))); }
    var h = ref('heroRef'), bz = document.getElementById('buy'), br = bz ? bz.getBoundingClientRect() : null;
    set('bar', (h ? h.getBoundingClientRect().bottom < 60 : false) && !(br && br.top < window.innerHeight && br.bottom > 0));
    var chap = 'overview';
    ['voice', 'health', 'finishes', 'compare'].forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 160) chap = id; });
    set('chap', chap);
    var rec = ref('recRef') || document.getElementById('health');
    if (rec) {
      var rr = rec.getBoundingClientRect();
      if (rr.top < window.innerHeight * 0.62 && rr.bottom > window.innerHeight * 0.28) {
        if (Zv.recOn !== 'true') healthRun = 0;
        set('recOn', 'true');
      }
    }
    if (ch) render();
    placeDayCard();
    syncAnims();
  }
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    var vh = window.innerHeight || 800, vw = window.innerWidth || 400;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return false;
    var n = el;
    while (n && n !== root) {
      if (n.style && n.style.opacity !== '' && parseFloat(n.style.opacity) === 0) return false;
      n = n.parentElement;
    }
    return true;
  }
  function syncAnims() {
    if (reduce) return;
    var list = root.querySelectorAll('[style*="animation:"], .vox-press');
    var start = [], i, el;
    for (i = 0; i < list.length; i++) {
      el = list[i];
      var on = onScreen(el);
      var going = el.classList.contains('vox-go');
      if (on && !going) start.push(el);
      else if (!on && going) el.classList.remove('vox-go');
    }
    if (!start.length) return;
    for (i = 0; i < start.length; i++) start[i].classList.add('vox-anim-reset');
    void root.offsetWidth;
    for (i = 0; i < start.length; i++) {
      start[i].classList.remove('vox-anim-reset');
      start[i].classList.add('vox-go');
    }
  }
  function placeDayCard() {
    var dy = ref('dayRef');
    if (!dy) return;
    var sticky = dy.firstElementChild;
    var card = dy.querySelector('[data-dc-tpl="168"]');
    if (!sticky || !card) return;
    if (bp === 'd') {
      sticky.style.paddingBottom = '';
      if (sticky.dataset.dayPad) { sticky.style.paddingTop = ''; delete sticky.dataset.dayPad; }
      if (card.dataset.dayH) {
        card.style.height = 'min(100%, 640px)';
        delete card.dataset.dayH;
      }
      return;
    }
    var copyEl = dy.querySelector('[data-dc-tpl="153"]');
    var bar = document.querySelector('[data-dc-tpl="760"]');
    var barH = 16;
    if (bar) {
      var br = bar.getBoundingClientRect();
      if (br.top < window.innerHeight && br.bottom > 0) barH = Math.ceil(bar.offsetHeight + 20);
    }
    sticky.style.paddingTop = '8px';
    sticky.style.paddingBottom = barH + 'px';
    sticky.dataset.dayPad = '1';
    var copyH = copyEl ? copyEl.offsetHeight : 0;
    var gap = 12;
    var gapEl = dy.querySelector('[data-dc-tpl="152"]');
    if (gapEl) {
      var g = parseFloat(window.getComputedStyle(gapEl).rowGap || window.getComputedStyle(gapEl).gap);
      if (g) gap = g;
    }
    var cs = window.getComputedStyle(sticky);
    var pt = parseFloat(cs.paddingTop) || 8;
    var pb = parseFloat(cs.paddingBottom) || barH;
    var avail = sticky.clientHeight - pt - pb;
    var cardH = Math.round(Math.max(152, avail - copyH - gap));
    if (card.style.height !== cardH + 'px') {
      card.style.height = cardH + 'px';
      card.dataset.dayH = '1';
    }
  }

  // ---------- reveal on scroll ----------
  function reveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var el = e.target; io.unobserve(el); var d = +(el.getAttribute('data-r') || 0);
        el.style.transition = 'opacity .7s ' + EASE + ' ' + d + 'ms, transform .7s ' + EASE + ' ' + d + 'ms'; el.style.opacity = '1'; el.style.transform = 'none';
        syncAnims();
        setTimeout(function () { el.style.transition = ''; el.style.transform = ''; syncAnims(); }, 800 + d);
      });
    }, { threshold: 0.1 });
    observers.push(io);
    root.querySelectorAll('[data-r]').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      el.style.opacity = '0'; el.style.transform = 'translateY(22px)'; io.observe(el);
    });
  }
  function once(name, dim, opts) {
    var el = ref(name); if (!el || Zv[dim] === 'true') return;
    var o = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      o.disconnect();
      if (dim === 'recOn') healthRun = 0;
      Zv[dim] = 'true'; render();
    }, opts);
    o.observe(el); observers.push(o);
  }
  function setupObservers() {
    observers.forEach(function (o) { o.disconnect(); }); observers = [];
    reveal();
    once('demoRef', 'demoGo', { threshold: 0.3 });
    once('recRef', 'recOn', { threshold: 0.28, rootMargin: '0px 0px -18% 0px' });
    var health = document.getElementById('health');
    if (health && Zv.recOn !== 'true') {
      var ho = new IntersectionObserver(function (es) {
        if (!es.some(function (e) { return e.isIntersecting; })) return;
        ho.disconnect(); healthRun = 0; Zv.recOn = 'true'; render();
      }, { threshold: 0.28, rootMargin: '0px 0px -18% 0px' });
      ho.observe(health); observers.push(ho);
    }
    if (document.getElementById('design')) loadMV();
  }

  // ---------- 3D model ----------
  function findPh() { var all = root.querySelectorAll('div'), i; for (i = 0; i < all.length; i++) { if (!all[i].children.length && all[i].textContent.trim() === 'Loading 3D model…') return all[i]; } return null; }
  var mvTries = 0;
  function loadMV() {
    if (mv) {
      if (!mv.isConnected) { var ph0 = findPh(); if (ph0) ph0.parentNode.replaceChild(mv, ph0); }
      return;
    }
    if (!document.getElementById('mv-js')) { var s = document.createElement('script'); s.type = 'module'; s.id = 'mv-js'; s.src = 'vendor/model-viewer.min.js'; document.head.appendChild(s); }
    customElements.whenDefined('model-viewer').then(function (C) {
      C.meshoptDecoderLocation = 'vendor/meshopt_decoder.js';
      var ph = findPh();
      if (!ph) {
        if (mvTries++ < 25) setTimeout(loadMV, 250);
        return;
      }
      if (mv) {
        if (!mv.isConnected) ph.parentNode.replaceChild(mv, ph);
        return;
      }
      mv = document.createElement('model-viewer');
      var at = { src: 'assets/vox/qore-vox.glb?v=bip1', poster: 'assets/vox/qore-vox-poster.webp', alt: 'Qore™ Vox 3D model you can rotate', 'camera-controls': '', 'disable-zoom': '', 'touch-action': 'pan-y', 'interaction-prompt': 'none', 'shadow-intensity': '0', exposure: '1.25', 'environment-image': 'neutral', 'interpolation-decay': '140', 'min-camera-orbit': 'auto auto 40%', orientation: '180deg 0deg 0deg', 'data-keep': '' };
      Object.keys(at).forEach(function (k) { mv.setAttribute(k, at[k]); });
      mv.style.cssText = 'width:100%;height:100%;background:transparent;--poster-color:transparent;display:block;';
      mv.addEventListener('load', function () { placeHotspots(); tint(); updateMV(); });
      ph.parentNode.replaceChild(mv, ph); updateMV();
    });
  }
  function placeHotspots() {
    if (!mv || hs) return;
    // Side face, left to right: mic dot, record pill, privacy light. 4PD is the underside window.
    var F = [['-0.0125m 0.0064m -0.0108m', '-1m 0m 0m'], ['-0.0131m 0.0049m 0m', '-1m 0m 0m'], ['-0.0125m 0.0057m 0.0112m', '-1m 0m 0m'], ['0m -0.0024m 0m', '0m -1m 0m']];
    hs = F.map(function (f, i) {
      var b = document.createElement('button');
      b.setAttribute('slot', 'hotspot-' + i); b.setAttribute('data-position', f[0]); b.setAttribute('data-normal', f[1]);
      b.setAttribute('data-visibility-attribute', 'visible'); b.setAttribute('aria-label', SPOT_NAMES[i]); b.textContent = String(i + 1);
      b.addEventListener('click', function (ev) { ev.stopPropagation(); goDesignSpot(i); });
      mv.appendChild(b); return b;
    });
  }
  function tint() {
    if (!mv || !mv.model) return; var c = TINT[ctx];
    mv.model.materials.forEach(function (m) { m.pbrMetallicRoughness.setBaseColorFactor(c); m.pbrMetallicRoughness.setRoughnessFactor(0.55); m.pbrMetallicRoughness.setMetallicFactor(0.15); });
  }
  function updateMV() {
    if (!mv) return;
    mv.setAttribute('camera-orbit', ORBIT[spot] + ' ' + ORBIT_R[spot]);
    mv.setAttribute('camera-target', hs ? hs[spot].getAttribute('data-position') : 'auto auto auto');
    (hs || []).forEach(function (b, i) {
      var on = i === spot;
      b.style.cssText = 'position:relative;width:' + (on ? 40 : 32) + 'px;height:' + (on ? 40 : 32) + 'px;padding:0;border:0;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-family:Figtree,sans-serif;font-size:13px;font-weight:700;color:#002d46;transition:all .3s ' + EASE + ';background:' + (on ? '#52b6aa' : 'rgba(255,255,255,0.92)') + ';box-shadow:' + (on ? '0 0 0 6px rgba(82,182,170,0.28), 0 8px 20px rgba(0,45,70,0.25)' : '0 0 0 4px rgba(255,255,255,0.45), 0 6px 16px rgba(0,45,70,0.2)');
    });
  }
  function healthNode(tpl) {
    var sec = document.getElementById('health'); if (!sec) return null;
    var el = sec.querySelector('[data-dc-tpl="' + tpl + '"]'); if (!el) return null;
    return el.querySelector('.sc-interp') || el;
  }
  function writeHealth(el, n) { el.textContent = String(n); }
  function playHealth(force) {
    var sec = document.getElementById('health'); if (!sec) return;
    if (Zv.recOn !== 'true') return;
    if (healthRun === 1 && !force) return;
    if (healthRun === 2 && !force) {
      HEALTH_NUMS.forEach(function (p) { var el = healthNode(p[0]); if (el) writeHealth(el, p[1]); });
      return;
    }
    healthRun = 1;
    var dur = reduce ? 0 : 1400, t0 = performance.now();
    function frame(now) {
      var u = dur ? Math.min(1, (now - t0) / dur) : 1;
      var e = 1 - Math.pow(1 - u, 3);
      HEALTH_NUMS.forEach(function (p) {
        var el = healthNode(p[0]); if (!el) return;
        writeHealth(el, Math.round(p[1] * e));
      });
      if (u < 1) requestAnimationFrame(frame);
      else healthRun = 2;
    }
    requestAnimationFrame(frame);
  }
  var lastCtx = null;
  function afterRender() {
    if (mv && !mv.isConnected) { var ph = findPh(); if (ph) ph.parentNode.replaceChild(mv, ph); }
    if (lastCtx !== ctx) { lastCtx = ctx; tint(); }
    updateMV();
    playHealth(false);
    restoreSplit();
    markPress();
    wireHealthTips();
    wireWave();
    syncAnims();
  }

  var wsInst = null, wsHost = null;
  function wireWave() {
    var host = document.getElementById('rbWave');
    if (!host || typeof WaveSurfer === 'undefined') return;
    if (wsInst && wsHost === host && host.dataset.ws === '1') return;
    if (wsInst) {
      try { wsInst.destroy(); } catch (err) {}
      wsInst = null;
    }
    wsHost = host;
    host.innerHTML = '';
    host.dataset.ws = '1';
    var h = Math.max(72, Math.min(128, Math.round(host.clientHeight * 0.72) || 96));
    wsInst = WaveSurfer.create({
      container: host,
      waveColor: 'rgb(0, 45, 70)',
      progressColor: 'rgb(0, 45, 70)',
      url: 'assets/audio/vox-wave.wav',
      minPxPerSec: 100,
      dragToSeek: false,
      height: h,
      cursorWidth: 0,
      hideScrollbar: true,
      fillParent: true,
      autoCenter: false,
      autoScroll: false,
      normalize: true,
      interact: false
    });
    try { wsInst.setMuted(true); wsInst.setVolume(0); } catch (err) {}
    var media = wsInst.getMediaElement && wsInst.getMediaElement();
    if (media) { media.style.display = 'none'; media.muted = true; media.pause(); }
    wsInst.once('decode', function () {
      try { wsInst.zoom(100); } catch (err) {}
      try { wsInst.setTime(0); } catch (err) {}
    });
  }

  var HEALTH_TIPS = {
    Recovery: 'How ready you are today, from last night’s sleep and recent strain.',
    'Heart Rate': 'Beats per minute, tracked day and night so you can see rest and effort.',
    HRV: 'Heart-rate variability. Higher often means you are recovered; lower can mean stress or fatigue.',
    'Blood Oxygen': 'SpO2 from the 4PD sensors, shown as a daily range.',
    Stress: 'How loaded your body feels right now, from relaxed to stressed.'
  };
  var healthTipBound = false;
  function wireHealthTips() {
    var cards = root.querySelectorAll('.h1txnnru, .h1u8ihyy, .h1he6khm, .h1sy4s3e, .h1kn28vu');
    var i, el, title, tip, key;
    for (i = 0; i < cards.length; i++) {
      el = cards[i];
      if (el.querySelector('.vox-tip')) continue;
      title = el.innerText || '';
      tip = null;
      for (key in HEALTH_TIPS) {
        if (Object.prototype.hasOwnProperty.call(HEALTH_TIPS, key) && title.indexOf(key) >= 0) { tip = HEALTH_TIPS[key]; break; }
      }
      if (!tip) continue;
      el.classList.add('vox-hcard');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', key + '. ' + tip);
      var pop = document.createElement('span');
      pop.className = 'vox-tip';
      var kEl = document.createElement('span');
      kEl.className = 'vox-tip-k';
      kEl.textContent = key;
      var bEl = document.createElement('span');
      bEl.className = 'vox-tip-b';
      bEl.textContent = tip;
      pop.appendChild(kEl);
      pop.appendChild(bEl);
      el.appendChild(pop);
    }
    if (healthTipBound) return;
    healthTipBound = true;
    root.addEventListener('click', function (e) {
      var card = e.target.closest('.vox-hcard');
      var open = root.querySelectorAll('.vox-hcard.vox-tip-on');
      var j;
      if (!card) {
        for (j = 0; j < open.length; j++) open[j].classList.remove('vox-tip-on');
        return;
      }
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 980) return;
      e.preventDefault();
      var was = card.classList.contains('vox-tip-on');
      for (j = 0; j < open.length; j++) open[j].classList.remove('vox-tip-on');
      if (!was) card.classList.add('vox-tip-on');
    });
  }

  function markPress() {
    if (!document.getElementById('vox-press-css')) {
      var css = document.createElement('style');
      css.id = 'vox-press-css';
      css.textContent = '.vox-press-wrap{position:relative;display:block;width:62%;max-width:220px;line-height:0}' +
        '.vox-press-wrap img{display:block;width:100%;height:auto}' +
        '.vox-press{position:absolute;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,20,32,.4);pointer-events:none}' +
        '.vox-press-fin{left:57%;top:25%}' +
        '.vox-press-34{left:66%;top:34%}' +
        '.vox-press::after{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px solid #3d8cff;animation:voxRing 1.5s ease-out infinite}';
      document.head.appendChild(css);
    }
    var demo = ref('demoRef'); if (!demo) return;
    var img = demo.querySelector('img[alt*="recording"]');
    if (!img || img.parentElement.classList.contains('vox-press-wrap')) return;
    var wrap = document.createElement('span');
    wrap.className = 'vox-press-wrap';
    img.style.width = '100%';
    img.style.maxWidth = 'none';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    var hit = document.createElement('span');
    hit.className = 'vox-press' + (/\bfin-b\.webp/.test(img.getAttribute('src') || '') ? ' vox-press-fin' : ' vox-press-34');
    hit.setAttribute('aria-hidden', 'true');
    wrap.appendChild(hit);
  }

  // ---------- boot / breakpoints ----------
  function start(name, keepState) {
    bp = name; D = window.QVD[bp];
    if (!keepState) { ctx = D.init.colour; spot = D.init.spot; }
    world = D.B[ctx].slice(); last = null;
    healthRun = 0;
    if (reduce) { Zv.demoGo = 'true'; Zv.recOn = 'true'; }
    root.innerHTML = '';
    render(); tick(); setupObservers();
  }
  function boot() {
    var b = pick();
    load(b, function () { start(b, false); });
    window.addEventListener('scroll', onScroll, { passive: true });
    requestAnimationFrame(function splitLoop(now) { driveSplit(now); driveMoveTabs(now); requestAnimationFrame(splitLoop); });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var nb = pick(); if (nb !== bp) load(nb, function () { start(nb, true); }); else onScroll(); }, 150);
    });
  }
  boot();
})();
