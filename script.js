/* ============================================================
   OUR INSTRUCTORS — Department of Air Warfare kiosk app logic
   ============================================================ */

(function () {
  'use strict';

  var STAGE_W = 1920, STAGE_H = 1080;
  var IDLE_TIMEOUT_MS = 100000; // 100 s without a touch -> back to the welcome screen
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // The card track drifts slowly on its own, pauses while a visitor browses,
  // and resumes after a quiet spell, bouncing between the two ends.
  var AUTO_SCROLL_SPEED = 0.45;          // px per frame (~27 px/s)
  var AUTO_SCROLL_START_DELAY = 2200;    // ms before the drift begins, and at each end
  var AUTO_SCROLL_RESUME_DELAY = 10000;  // ms of quiet before it resumes
  var AUTO_SCROLL_END_EPSILON = 2;

  // The welcome board flips one row over to the next officer this often.
  var BOARD_ROWS = 9, BOARD_FLIP_MS = 1500;

  // Chief Instructors: the spotlight moves on by itself; a touch holds it.
  var SPOT_INTERVAL = 8000;   // ms each Chief Instructor stays in the spotlight
  var SPOT_RESUME = 15000;    // ms of quiet before it starts moving again

  var C = DAW_CONTENT, R = DAW_ROLL;
  var STAFF = R.staff;
  var COURSES = { senior: R.seniorCourse, junior: R.juniorCourse };

  var state = {
    screen: 'attract', course: 'senior', spot: { senior: 0, junior: 0 },
    mode: 'year', year: null, yearScope: 'in', letter: null, branch: 'aircrew',
    record: null, recordList: null
  };
  var el = {};
  var idleTimer = null;

  /* ---------------- helpers ---------------- */
  function t(key) { var v = C.ui[key]; return v !== undefined ? v : key; }
  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function restartAnimation(node, cls) {
    node.classList.remove('enter-next', 'enter-prev');
    void node.offsetWidth;
    if (cls) node.classList.add(cls);
  }

  /* ---------------- dates at the precision recorded ----------------
     "1978", "1991-02" or "1984-08-06" */
  function parts(iso) {
    if (!iso) return null;
    var p = iso.split('-');
    return { y: +p[0], m: p[1] ? +p[1] : null, d: p[2] ? +p[2] : null };
  }
  function todayParts() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  var TODAY = todayParts();
  var TODAY_ISO = TODAY.y + '-' + pad2(TODAY.m) + '-' + pad2(TODAY.d);

  function fmtLong(iso) {
    var p = parts(iso);
    if (!p) return '';
    if (!p.m) return String(p.y);
    if (!p.d) return MONTHS[p.m - 1] + ' ' + p.y;
    return p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y;
  }
  function yearOf(iso) { return iso ? +iso.slice(0, 4) : null; }

  function isServing(p) { return !!p.current || (p.to && p.to >= TODAY_ISO); }
  function endIso(p) { return p.to || (p.current ? TODAY_ISO : null); }
  // Last year an officer was on the staff; the start year if the end is not recorded.
  function endYear(p) { var e = endIso(p); return e ? yearOf(e) : yearOf(p.from); }

  function tenureLong(p) {
    if (!p.from) return t('tbc');
    var end = p.to ? fmtLong(p.to) : (p.current ? t('present') : t('tbc'));
    return fmtLong(p.from) + ' — ' + end;
  }
  function tenureYears(p) {
    if (!p.from) return t('tbc');
    var a = yearOf(p.from);
    if (!p.to && !p.current) return 'From ' + a;
    var b = p.to ? yearOf(p.to) : t('present');
    return a === b ? String(a) : a + ' — ' + b;
  }
  // Duration, to the precision both dates allow.
  function durationOf(p) {
    var a = parts(p.from), b = parts(endIso(p));
    if (!a || !b) return t('tbc');
    if (a.m && b.m) {
      var months = (b.y - a.y) * 12 + (b.m - a.m);
      var days = 0;
      if (a.d && b.d) {
        days = b.d - a.d;
        if (days < 0) { months--; days += new Date(b.y, b.m - 1, 0).getDate(); }
      }
      var y = Math.floor(months / 12), m = months % 12, out = [];
      if (y) out.push(plural(y, 'year'));
      if (m) out.push(plural(m, 'month'));
      if (!out.length) out.push(a.d && b.d ? plural(days, 'day') : 'Under a month');
      return out.join(', ');
    }
    var years = b.y - a.y;
    return years > 0 ? 'About ' + plural(years, 'year') : 'Under a year';
  }

  function rankFull(r) { return C.ranks[r] || r; }
  function nameOf(p) { return (p.initials ? p.initials + ' ' : '') + p.surname; }
  function shortName(p) { return p.rank + ' ' + nameOf(p); }
  function letterOf(p) { return p.surname.charAt(0).toUpperCase(); }
  function serviceShort(p) { return p.service && C.services[p.service] ? C.services[p.service].short : null; }
  function staffByNo(no) { return STAFF[no - 1]; }
  function courseLabel(c) { return c === 'senior' ? t('seniorCourse') : t('juniorCourse'); }

  // Rank braid as worn on the shoulder board.
  var BRAID = { 'Sqn Ldr': ['', 'thin', ''], 'Wg Cdr': ['', '', ''], 'Gp Capt': ['', '', '', ''], 'Air Cdre': ['wide'] };
  function braid(rank, large) {
    var b = make('span', 'braid' + (large ? ' braid--lg' : ''));
    (BRAID[rank] || []).forEach(function (k) { b.appendChild(make('i', k)); });
    b.setAttribute('aria-label', rankFull(rank));
    return b;
  }

  function chipContent(mono, label, name) {
    var frag = document.createDocumentFragment();
    frag.appendChild(make('span', 'chip-thumb', mono));
    var text = make('span', 'chip-text');
    text.appendChild(make('span', 'chip-label', label));
    text.appendChild(make('span', 'chip-name', name));
    frag.appendChild(text);
    return frag;
  }

  function byDate(a, b) { return (a.from || '').localeCompare(b.from || '') || a.no - b.no; }
  function byName(a, b) { return a.surname.localeCompare(b.surname) || (a.initials || '').localeCompare(b.initials || '') || byDate(a, b); }

  /* ---------------- stage scaling ---------------- */
  function scaleStage() {
    var s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    el.stage.style.transform = 'scale(' + s + ')';
  }
  function currentScale() {
    var m = /scale\(([\d.]+)\)/.exec(el.stage.style.transform);
    return m ? parseFloat(m[1]) : 1;
  }
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
  }

  /* ---------------- background music ---------------- */
  // Plays assets/audio/ambient.mp3 on a loop: softly on the welcome screen,
  // a little louder once a visitor begins. A missing file means silence.
  var AMBIENT_SRC = 'assets/audio/ambient.mp3';
  var AMBIENT_VOLUME = 0.35, AMBIENT_ATTRACT_VOLUME = 0.18, AMBIENT_FADE_MS = 1200;
  var ambient = null, ambientMuted = false, ambientFadeRaf = null;

  function ambientTarget() { return ambientMuted ? 0 : (state.screen === 'attract' ? AMBIENT_ATTRACT_VOLUME : AMBIENT_VOLUME); }
  function startAmbient() {
    if (ambient) return;
    var audio = new Audio(AMBIENT_SRC);
    audio.loop = true; audio.volume = 0; ambient = audio;
    audio.addEventListener('error', function () { ambient = null; el.btnSound.classList.add('hidden'); });
    audio.addEventListener('playing', function () { el.btnSound.classList.remove('hidden'); });
    playAmbient();
  }
  function playAmbient() {
    if (!ambient || ambientMuted) return;
    ambient.play().then(function () { fadeAmbient(ambientTarget()); })
      .catch(function () { document.addEventListener('pointerdown', playAmbient, { once: true }); });
  }
  function fadeAmbient(target, onDone) {
    if (!ambient) return;
    if (ambientFadeRaf) cancelAnimationFrame(ambientFadeRaf);
    var audio = ambient, from = audio.volume, t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / AMBIENT_FADE_MS);
      audio.volume = from + (target - from) * k;
      if (k < 1) { ambientFadeRaf = requestAnimationFrame(step); return; }
      ambientFadeRaf = null;
      if (onDone) onDone();
    }
    ambientFadeRaf = requestAnimationFrame(step);
  }
  function toggleAmbient() {
    ambientMuted = !ambientMuted;
    el.btnSound.classList.toggle('is-muted', ambientMuted);
    el.btnSound.setAttribute('aria-pressed', String(ambientMuted));
    el.btnSound.setAttribute('aria-label', ambientMuted ? 'Play background music' : 'Mute background music');
    if (ambientMuted) fadeAmbient(0, function () { if (ambient && ambientMuted) ambient.pause(); });
    else playAmbient();
  }

  /* ---------------- navigation ---------------- */
  // "senior" and "junior" share the Chief Instructors screen.
  function showScreen(id) {
    closeRecord();
    stopSpot();
    stopBoard();
    staffTrack.stop();
    var screenId = id;
    if (id === 'senior' || id === 'junior') { state.course = id; screenId = 'chiefs'; }
    state.screen = screenId;
    if (ambient && !ambient.paused) fadeAmbient(ambientTarget());
    Object.keys(el.screens).forEach(function (k) { el.screens[k].classList.toggle('active', k === screenId); });
    el.topbar.classList.toggle('hidden', screenId === 'attract');
    var section = screenId === 'chiefs' ? state.course : screenId;
    el.topbarNav.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === section); });
    if (screenId === 'attract') startBoard();
    if (screenId === 'staff') staffTrack.enter();
    if (screenId === 'chiefs') enterChiefs();
    resetIdleTimer();
  }

  /* ---------------- welcome: movements board ---------------- */
  var boardTimer = null, clockTimer = null, boardQueue = [], boardNext = 0, boardRow = 0;

  function shuffled(list) {
    var a = list.slice(), seed = 20261106;
    for (var i = a.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      var j = Math.floor(seed / 233280 * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function branchLabel(p) {
    if (p.service === 'raf' || p.service === 'gaf') return C.services[p.service].name.replace(' Air Force', ' AF');
    return p.specialty || '—';
  }
  function fillBoardRow(row, p) {
    row.innerHTML = '';
    row.appendChild(make('span', 'b-tour', tenureYears(p).replace(' — ', '–').replace(t('present'), 'NOW')));
    row.appendChild(make('span', 'b-rank', p.rank));
    row.appendChild(make('span', 'b-name', nameOf(p)));
    row.appendChild(make('span', 'b-branch', branchLabel(p)));
    var serving = isServing(p), allied = p.service === 'raf' || p.service === 'gaf';
    row.appendChild(make('span', 'b-status' + (serving ? ' is-serving' : (allied ? ' is-allied' : '')),
      serving ? 'On staff' : (allied ? 'Allied' : 'Completed')));
  }
  function buildAttract() {
    boardQueue = shuffled(STAFF);
    for (var i = 0; i < BOARD_ROWS; i++) {
      var row = make('div', 'board-row');
      fillBoardRow(row, boardQueue[i]);
      el.boardRows.appendChild(row);
    }
    boardNext = BOARD_ROWS;

    var serving = STAFF.filter(isServing).length;
    el.boardFoot.innerHTML = '';
    var a = make('span'); a.appendChild(make('b', null, String(STAFF.length))); a.appendChild(document.createTextNode(' ' + t('directingStaff') + ' on the roll'));
    var b = make('span'); b.appendChild(make('b', null, String(serving))); b.appendChild(document.createTextNode(' ' + t('modeServing').toLowerCase()));
    el.boardFoot.appendChild(a); el.boardFoot.appendChild(b);

    var first = Math.min.apply(null, STAFF.map(function (p) { return yearOf(p.from) || 9999; }));
    var forces = {};
    STAFF.forEach(function (p) { if (p.service) forces[p.service] = 1; });
    [
      [STAFF.length, t('directingStaff')],
      [R.seniorCourse.length + R.juniorCourse.length, 'Chief Instructor tours'],
      [first, 'Since'],
      [Object.keys(forces).length, 'Air forces']
    ].forEach(function (s) {
      var g = make('div', 'gauge');
      g.appendChild(make('b', null, String(s[0])));
      g.appendChild(make('span', null, s[1]));
      el.attractStats.appendChild(g);
    });
  }
  function tickClock() {
    var n = new Date();
    el.boardClock.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes()) + ':' + pad2(n.getSeconds());
  }
  function flipBoard() {
    var row = el.boardRows.children[boardRow];
    fillBoardRow(row, boardQueue[boardNext % boardQueue.length]);
    row.classList.remove('flip'); void row.offsetWidth; row.classList.add('flip');
    boardNext++;
    boardRow = (boardRow + 1) % BOARD_ROWS;
  }
  function startBoard() {
    stopBoard();
    tickClock();
    clockTimer = setInterval(tickClock, 1000);
    boardTimer = setInterval(flipBoard, BOARD_FLIP_MS);
  }
  function stopBoard() {
    if (boardTimer) { clearInterval(boardTimer); boardTimer = null; }
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  /* ---------------- home ---------------- */
  var YEARS = [];   // every year from the first posting to this one
  var FIRST_YEAR, LAST_YEAR;

  function arrivalsIn(y) { return STAFF.filter(function (p) { return yearOf(p.from) === y; }); }
  function onStaffIn(y) { return STAFF.filter(function (p) { return p.from && yearOf(p.from) <= y && endYear(p) >= y; }); }

  function buildHome() {
    var max = 1;
    var counts = YEARS.map(function (y) { var n = arrivalsIn(y).length; max = Math.max(max, n); return n; });
    var sky = make('span', 'home-skyline');
    counts.forEach(function (n, i) {
      var bar = make('i', YEARS[i] === LAST_YEAR ? 'is-now' : '');
      bar.style.height = (n / max * 100) + '%';
      sky.appendChild(bar);
    });
    el.homeStaffArt.appendChild(sky);
    var axis = make('span', 'home-skyline-axis');
    [FIRST_YEAR, Math.round((FIRST_YEAR + LAST_YEAR) / 2), LAST_YEAR].forEach(function (y) { axis.appendChild(make('span', null, String(y))); });
    el.homeStaffArt.appendChild(axis);
    el.homeStaffMeta.textContent = STAFF.length + ' officers · Since ' + FIRST_YEAR;

    ['senior', 'junior'].forEach(function (c) {
      var list = COURSES[c], box = make('span', 'home-strips');
      list.slice(-3).reverse().forEach(function (p) {
        var s = make('span', 'home-strip' + (isServing(p) ? ' is-now' : ''));
        s.appendChild(make('b', null, String(p.no)));
        s.appendChild(make('span', null, shortName(p)));
        s.appendChild(make('em', null, tenureYears(p)));
        box.appendChild(s);
      });
      el['home' + (c === 'senior' ? 'Senior' : 'Junior') + 'Art'].appendChild(box);
      el['home' + (c === 'senior' ? 'Senior' : 'Junior') + 'Meta'].textContent =
        list.length + ' appointments · Since ' + yearOf(list[0].from);
    });
  }

  /* ---------------- drifting track ---------------- */
  var dragMoved = false;

  function Track(node, screenId) {
    var self = this, timer = null, raf = null, dir = 1, pos = 0;
    this.stop = function () {
      if (timer) { clearTimeout(timer); timer = null; }
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    };
    this.schedule = function (delay) {
      self.stop();
      timer = setTimeout(function () { timer = null; raf = requestAnimationFrame(step); }, delay);
    };
    this.enter = function () {
      node.scrollLeft = 0; pos = 0; dir = 1;
      self.schedule(AUTO_SCROLL_START_DELAY);
    };
    function step() {
      var max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      if (Math.abs(pos - node.scrollLeft) >= 1) pos = node.scrollLeft;
      pos = Math.max(0, Math.min(max, pos + AUTO_SCROLL_SPEED * dir));
      node.scrollLeft = pos;
      var atEnd = dir > 0 ? pos >= max - AUTO_SCROLL_END_EPSILON : pos <= AUTO_SCROLL_END_EPSILON;
      if (atEnd) { dir = -dir; self.schedule(AUTO_SCROLL_START_DELAY); return; }
      raf = requestAnimationFrame(step);
    }

    // Touch scrolls natively; this adds the same for a mouse.
    var startX = 0, startLeft = 0, dragging = false;
    node.addEventListener('pointerdown', function (e) {
      self.stop(); dragMoved = false;
      if (e.pointerType !== 'mouse') return;
      dragging = true; startX = e.clientX; startLeft = node.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = (e.clientX - startX) / currentScale();
      if (Math.abs(dx) > 8) dragMoved = true;
      node.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      dragging = false;
      if (state.screen === screenId && !state.record) self.schedule(AUTO_SCROLL_RESUME_DELAY);
    });
    node.addEventListener('touchmove', function () { dragMoved = true; }, { passive: true });
    node.addEventListener('wheel', function (e) {
      self.stop();
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) node.scrollLeft += e.deltaY;
      self.schedule(AUTO_SCROLL_RESUME_DELAY);
    }, { passive: true });
  }

  function buildChips(root, items, active, onPick) {
    root.innerHTML = '';
    items.forEach(function (it) {
      var b = make('button', 'chip' + (it.id === active ? ' active' : ''), it.label);
      if (it.note !== undefined) b.appendChild(make('small', null, it.note));
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(root.children, function (c) { c.classList.toggle('active', c === b); });
        onPick(it.id);
      });
      root.appendChild(b);
    });
  }

  /* ---------------- directing staff ---------------- */
  var staffTrack;

  function staffCard(p) {
    var serving = isServing(p);
    var card = make('button', 'scard' + (serving ? ' scard--serving' : ''));
    card.setAttribute('aria-label', rankFull(p.rank) + ' ' + nameOf(p));
    var top = make('span', 'scard-top');
    top.appendChild(braid(p.rank));
    top.appendChild(make('span', 'scard-rank', p.rank));
    top.appendChild(make('span', 'scard-no', 'DS ' + p.no));
    card.appendChild(top);
    var name = make('span', 'scard-name');
    if (p.initials) name.appendChild(make('small', null, p.initials));
    name.appendChild(document.createTextNode(p.surname));
    card.appendChild(name);
    card.appendChild(make('span', 'scard-spec', p.specialty || (p.service && p.service !== 'naf' ? C.services[p.service].name : t('specialtyMissing'))));
    var foot = make('span', 'scard-foot');
    foot.appendChild(make('span', 'scard-dates', tenureYears(p)));
    var flags = make('span', 'scard-flags');
    if (serving) flags.appendChild(make('span', 'mini-tag mini-tag--gold', t('serving')));
    if (p.chief) flags.appendChild(make('span', 'mini-tag mini-tag--ci', 'CI'));
    var svc = serviceShort(p);
    if (svc && p.service !== 'naf') flags.appendChild(make('span', 'mini-tag', svc));
    foot.appendChild(flags);
    card.appendChild(foot);
    return card;
  }

  function currentStaffList() {
    var list;
    if (state.mode === 'year') {
      list = state.yearScope === 'in' ? arrivalsIn(state.year) : onStaffIn(state.year);
      return list.sort(byDate);
    }
    if (state.mode === 'name') return STAFF.filter(function (p) { return letterOf(p) === state.letter; }).sort(byName);
    if (state.mode === 'branch') return branchMembers(state.branch).sort(byDate);
    return STAFF.filter(isServing).sort(byDate);
  }

  function branchMembers(id) {
    if (id === 'allied') return STAFF.filter(function (p) { return p.service === 'raf' || p.service === 'gaf'; });
    return STAFF.filter(function (p) { return p.branch === id; });
  }

  function renderStaff() {
    var list = currentStaffList();
    el.staffTrack.innerHTML = '';
    if (!list.length) {
      el.staffTrack.appendChild(make('div', 'staff-empty', t('noOne')));
    } else {
      var grid = make('div', 'staff-grid');
      list.forEach(function (p, i) {
        var card = staffCard(p);
        card.style.animationDelay = Math.min(i * 0.025, 0.6) + 's';
        card.addEventListener('click', function () { if (!dragMoved) openRecord(p.no, list); });
        grid.appendChild(card);
      });
      el.staffTrack.appendChild(grid);
    }
    if (state.screen === 'staff') staffTrack.enter();
  }

  function setMode(mode) {
    state.mode = mode;
    ['year', 'name', 'branch', 'serving'].forEach(function (m) { $('pane-' + m).classList.toggle('hidden', m !== mode); });
    renderStaff();
  }

  // Year ribbon: a column per year; sweep a finger along it to move through time.
  function buildRibbon() {
    var maxOn = 1;
    var data = YEARS.map(function (y) {
      var on = onStaffIn(y).length, inn = arrivalsIn(y).length;
      maxOn = Math.max(maxOn, on);
      return { y: y, on: on, inn: inn };
    });
    el.ribbonCols = [];
    data.forEach(function (d) {
      // label every fifth year, and the first and last unless a fifth year is next to them
      var tick = d.y % 5 === 0 || ((d.y === FIRST_YEAR || d.y === LAST_YEAR) && d.y % 5 > 1 && d.y % 5 < 4);
      var col = make('div', 'ryear' + (tick ? ' is-tick' : ''));
      var bars = make('div', 'ryear-bars');
      var on = make('span', 'ryear-on'); on.style.height = (d.on / maxOn * 100) + '%';
      var inn = make('span', 'ryear-in'); inn.style.height = (d.inn / maxOn * 100) + '%';
      bars.appendChild(on); bars.appendChild(inn);
      col.appendChild(bars);
      col.appendChild(make('div', 'ryear-label', String(d.y)));
      el.ribbon.appendChild(col);
      el.ribbonCols.push(col);
    });

    var sweeping = false;
    function pick(e) {
      var r = el.ribbon.getBoundingClientRect();
      var k = Math.floor((e.clientX - r.left) / r.width * YEARS.length);
      k = Math.max(0, Math.min(YEARS.length - 1, k));
      if (YEARS[k] !== state.year) setYear(YEARS[k]);
    }
    el.ribbon.addEventListener('pointerdown', function (e) {
      sweeping = true; staffTrack.stop();
      try { el.ribbon.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      pick(e);
    });
    el.ribbon.addEventListener('pointermove', function (e) { if (sweeping) pick(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { el.ribbon.addEventListener(ev, function () { sweeping = false; }); });
  }

  function setYear(y) {
    state.year = y;
    el.ribbonCols.forEach(function (c, i) { c.classList.toggle('is-active', YEARS[i] === y); });
    el.ribbonYear.textContent = String(y);
    buildChips(el.yearScope, [
      { id: 'in', label: t('joinedIn') + ' ' + y, note: String(arrivalsIn(y).length) },
      { id: 'on', label: t('onStaffIn') + ' ' + y, note: String(onStaffIn(y).length) }
    ], state.yearScope, function (id) { state.yearScope = id; renderStaff(); });
    renderStaff();
  }

  function buildLetters() {
    var counts = {};
    STAFF.forEach(function (p) { var l = letterOf(p); counts[l] = (counts[l] || 0) + 1; });
    for (var c = 65; c <= 90; c++) {
      (function (L) {
        var b = make('button', 'letter', L);
        b.appendChild(make('small', null, counts[L] ? String(counts[L]) : '—'));
        b.disabled = !counts[L];
        if (!state.letter && counts[L]) state.letter = L;
        b.addEventListener('click', function () {
          state.letter = L;
          Array.prototype.forEach.call(el.letters.children, function (n) { n.classList.toggle('active', n === b); });
          renderStaff();
        });
        el.letters.appendChild(b);
      })(String.fromCharCode(c));
    }
    Array.prototype.forEach.call(el.letters.children, function (n) { n.classList.toggle('active', n.firstChild.nodeValue === state.letter); });
  }

  function buildBranches() {
    C.branches.forEach(function (br) {
      var n = branchMembers(br.id).length;
      if (!n) return;
      var b = make('button', 'branch' + (br.id === state.branch ? ' active' : ''));
      b.appendChild(make('b', null, String(n)));
      b.appendChild(make('span', null, br.label));
      b.appendChild(make('em', null, br.note));
      b.addEventListener('click', function () {
        state.branch = br.id;
        Array.prototype.forEach.call(el.branches.children, function (x) { x.classList.toggle('active', x === b); });
        renderStaff();
      });
      el.branches.appendChild(b);
    });
  }

  function buildStaff() {
    el.staffYears.textContent = FIRST_YEAR + ' — ' + t('present') + ' · ' + STAFF.length + ' officers';
    staffTrack = new Track(el.staffTrack, 'staff');

    var serving = STAFF.filter(isServing);
    buildChips(el.staffModes, [
      { id: 'year', label: t('modeYear') },
      { id: 'name', label: t('modeName') },
      { id: 'branch', label: t('modeBranch') },
      { id: 'serving', label: t('modeServing'), note: String(serving.length) }
    ], state.mode, setMode);

    el.servingLine.innerHTML = '';
    el.servingLine.appendChild(make('b', null, String(serving.length)));
    el.servingLine.appendChild(document.createTextNode('officers are on the Directing Staff of the Department today'));

    buildRibbon();
    buildLetters();
    buildBranches();
    // open on the first year with a real intake (not a lone early posting)
    var opening = YEARS.filter(function (y) { return arrivalsIn(y).length >= 3; })[0] || YEARS[0];
    setYear(opening);
  }

  /* ---------------- record of one officer ---------------- */
  function openRecord(no, list, direction) {
    var p = staffByNo(no);
    if (!p) return;
    state.record = no;
    state.recordList = list && list.length ? list : [p];
    staffTrack.stop();
    stopSpot();

    el.recordNo.textContent = String(p.no);
    el.recordOf.textContent = t('of') + ' ' + STAFF.length + ' ' + t('directingStaff');
    el.recordBoard.innerHTML = '';
    el.recordBoard.appendChild(braid(p.rank, true));
    el.recordRankFull.textContent = rankFull(p.rank);

    el.recordTags.innerHTML = '';
    if (isServing(p)) el.recordTags.appendChild(make('span', 'tag tag--current', t('serving')));
    if (p.service && p.service !== 'naf') el.recordTags.appendChild(make('span', 'tag tag--gold', C.services[p.service].name));
    if (p.branch) {
      var br = C.branches.filter(function (b) { return b.id === p.branch; })[0];
      if (br) el.recordTags.appendChild(make('span', 'tag', br.label));
    }

    el.recordName.innerHTML = '';
    if (p.initials) el.recordName.appendChild(make('small', null, p.initials));
    el.recordName.appendChild(document.createTextNode(p.surname));

    el.recordFacts.innerHTML = '';
    [
      [t('rank'), rankFull(p.rank)],
      [t('serviceNo'), p.svcNo],
      [t('specialty'), p.specialty],
      [t('tour'), tenureLong(p)],
      [t('duration'), durationOf(p)],
      [t('service'), p.service ? C.services[p.service].name : null]
    ].forEach(function (f) {
      var d = make('div');
      d.appendChild(make('dt', null, f[0]));
      d.appendChild(make('dd', f[1] ? null : 'is-missing', f[1] || t('notRecorded')));
      el.recordFacts.appendChild(d);
    });

    el.recordLinks.innerHTML = '';
    (p.chief || []).forEach(function (ref) {
      var ci = COURSES[ref.course][ref.no - 1];
      var b = make('button', 'chip-btn chip-btn--gold');
      b.appendChild(chipContent(String(ci.no), t('alsoChief') + ' · ' + courseLabel(ref.course), shortName(ci) + ' · ' + tenureYears(ci)));
      b.addEventListener('click', function () { showChief(ref.course, ref.no - 1); });
      el.recordLinks.appendChild(b);
    });

    // others posted in the same month (only where the month is recorded)
    el.recordIntake.innerHTML = '';
    if (p.from && p.from.length >= 7) {
      var month = p.from.slice(0, 7);
      var mates = STAFF.filter(function (q) { return q !== p && q.from && q.from.slice(0, 7) === month; }).sort(byDate).slice(0, 10);
      if (mates.length) {
        el.recordIntake.appendChild(make('span', 'record-intake-label', t('sameIntake') + ' · ' + fmtLong(month)));
        var row = make('div', 'record-intake-list');
        mates.forEach(function (q) {
          var b = make('button', 'mate');
          b.appendChild(make('small', null, q.rank));
          b.appendChild(document.createTextNode(nameOf(q)));
          b.addEventListener('click', function () { openRecord(q.no, mates.concat([p]).sort(byDate)); });
          row.appendChild(b);
        });
        el.recordIntake.appendChild(row);
      }
    }

    var k = state.recordList.indexOf(p);
    el.recordPrev.disabled = k <= 0;
    el.recordNext.disabled = k < 0 || k >= state.recordList.length - 1;

    el.record.classList.remove('hidden');
    restartAnimation(el.recordCard, direction ? (direction < 0 ? 'enter-prev' : 'enter-next') : null);
    resetIdleTimer();
  }

  function stepRecord(dir) {
    if (!state.record) return;
    var list = state.recordList, k = list.indexOf(staffByNo(state.record)) + dir;
    if (k >= 0 && k < list.length) openRecord(list[k].no, list, dir);
  }

  function closeRecord() {
    if (!state.record) return;
    state.record = null;
    el.record.classList.add('hidden');
    if (state.screen === 'staff') staffTrack.schedule(AUTO_SCROLL_RESUME_DELAY);
    if (state.screen === 'chiefs') holdSpot();
  }

  /* ---------------- chief instructors: spotlight + strips ---------------- */
  var spotTimer = null;

  function chiefList() { return COURSES[state.course]; }

  function buildStrips() {
    var list = chiefList();
    el.strips.innerHTML = '';
    el.strips.style.gridTemplateRows = 'repeat(' + Math.ceil(list.length / 2) + ', 1fr)';
    el.stripNodes = list.map(function (p, i) {
      var s = make('button', 'strip' + (isServing(p) ? ' is-current' : ''));
      s.setAttribute('aria-label', rankFull(p.rank) + ' ' + nameOf(p));
      s.appendChild(make('b', null, pad2(p.no)));
      s.appendChild(make('span', null, shortName(p)));
      s.appendChild(make('em', null, tenureYears(p)));
      s.addEventListener('click', function () { showChief(state.course, i); });
      el.strips.appendChild(s);
      return s;
    });
  }

  function renderSpot(i, direction, auto) {
    var list = chiefList(), p = list[i];
    state.spot[state.course] = i;

    el.plateLabel.textContent = courseLabel(state.course);
    var ord = ordinal(p.no);
    el.plateNo.innerHTML = '';
    el.plateNo.appendChild(document.createTextNode(String(p.no)));
    el.plateNo.appendChild(make('sup', null, ord.slice(-2)));
    el.plateBoard.innerHTML = '';
    el.plateBoard.appendChild(braid(p.rank, true));
    el.plateOrdinal.textContent = t('chiefInstructor');

    var serving = isServing(p);
    el.spotTag.textContent = serving ? t('serving') : courseLabel(state.course);
    el.spotTag.className = 'tag' + (serving ? ' tag--current' : (state.course === 'senior' ? ' tag--gold' : ''));
    el.spotRank.textContent = rankFull(p.rank);
    el.spotName.innerHTML = '';
    if (p.initials) el.spotName.appendChild(make('small', null, p.initials));
    el.spotName.appendChild(document.createTextNode(p.surname));
    el.spotTenure.textContent = tenureLong(p);
    el.spotDuration.textContent = durationOf(p);

    el.spotLinks.innerHTML = '';
    if (p.staff) {
      var ds = staffByNo(p.staff);
      var b = make('button', 'chip-btn chip-btn--gold');
      b.appendChild(chipContent('DS', t('asStaff') + ' · ' + tenureYears(ds), shortName(ds) + (ds.specialty ? ' · ' + ds.specialty : '')));
      b.addEventListener('click', function () { openRecord(ds.no, [ds]); });
      el.spotLinks.appendChild(b);
      // the same officer as Chief Instructor of the other course
      (ds.chief || []).forEach(function (ref) {
        if (ref.course === state.course) return;
        var other = COURSES[ref.course][ref.no - 1];
        var c = make('button', 'chip-btn');
        c.appendChild(chipContent(String(other.no), t('chiefInstructor') + ' · ' + courseLabel(ref.course), tenureYears(other)));
        c.addEventListener('click', function () { showChief(ref.course, ref.no - 1); });
        el.spotLinks.appendChild(c);
      });
    }
    var row = make('div', 'spot-links-row');
    if (i > 0) row.appendChild(successionChip(i - 1, t('precededBy'), -1));
    if (i < list.length - 1) row.appendChild(successionChip(i + 1, t('succeededBy'), 1));
    el.spotLinks.appendChild(row);

    el.spotCount.innerHTML = '';
    el.spotCount.appendChild(document.createTextNode(t('chiefInstructor') + ' '));
    el.spotCount.appendChild(make('b', null, String(i + 1)));
    el.spotCount.appendChild(document.createTextNode(' ' + t('of') + ' ' + list.length));
    el.spotPrev.disabled = i === 0;
    el.spotNext.disabled = i === list.length - 1;

    el.stripNodes.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    restartAnimation(el.spotCard, direction ? (direction < 0 ? 'enter-prev' : 'enter-next') : null);

    el.spotProgress.classList.remove('run');
    void el.spotProgress.offsetWidth;
    if (auto) { el.spotProgress.style.animationDuration = SPOT_INTERVAL + 'ms'; el.spotProgress.classList.add('run'); }
  }

  function successionChip(i, label, dir) {
    var p = chiefList()[i];
    var b = make('button', 'chip-btn');
    b.appendChild(chipContent(String(p.no), label, shortName(p)));
    b.addEventListener('click', function () { showChief(state.course, i, dir); });
    return b;
  }

  function scheduleSpot(delay) {
    stopSpot();
    spotTimer = setTimeout(function () {
      spotTimer = null;
      renderSpot((state.spot[state.course] + 1) % chiefList().length, 1, true);
      scheduleSpot(SPOT_INTERVAL);
    }, delay);
  }
  function stopSpot() { if (spotTimer) { clearTimeout(spotTimer); spotTimer = null; } }
  function holdSpot() {
    el.spotProgress.classList.remove('run');
    scheduleSpot(SPOT_RESUME);
  }

  function enterChiefs() {
    var list = chiefList();
    el.ciTitle.textContent = state.course === 'senior' ? t('seniorTitle') : t('juniorTitle');
    var last = list[list.length - 1];
    el.ciYears.textContent = yearOf(list[0].from) + ' — ' + (isServing(last) ? t('present') : endYear(last)) + ' · ' + list.length + ' appointments';
    buildStrips();
    renderSpot(state.spot[state.course] || 0, null, true);
    scheduleSpot(SPOT_INTERVAL);
  }

  // Shows a Chief Instructor in the spotlight at a visitor's request (holds the auto-advance).
  function showChief(course, i, direction) {
    var list = COURSES[course];
    if (i < 0 || i >= list.length) return;
    closeRecord();
    if (state.screen !== 'chiefs' || state.course !== course) {
      state.spot[course] = i;
      showScreen(course);
    }
    renderSpot(i, direction || (i >= state.spot[course] ? 1 : -1), false);
    holdSpot();
    resetIdleTimer();
  }

  /* ---------------- swipe ---------------- */
  function addSwipe(node, onSwipe) {
    var x0 = null, y0 = null;
    node.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    node.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = (e.clientX - x0) / currentScale(), dy = (e.clientY - y0) / currentScale();
      x0 = null;
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
    });
  }

  /* ---------------- idle ---------------- */
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (state.screen === 'attract') return;
    idleTimer = setTimeout(function () {
      el.idleOverlay.classList.remove('hidden');
      setTimeout(function () { el.idleOverlay.classList.add('hidden'); showScreen('attract'); }, 1600);
    }, IDLE_TIMEOUT_MS);
  }

  /* ---------------- init ---------------- */
  function init() {
    el.stage = $('stage');
    el.topbar = $('topbar');
    el.topbarNav = $('topbar-nav');
    el.screens = { attract: $('screen-attract'), home: $('screen-home'), staff: $('screen-staff'), chiefs: $('screen-chiefs') };
    el.boardRows = $('board-rows'); el.boardClock = $('board-clock'); el.boardFoot = $('board-foot'); el.attractStats = $('attract-stats');
    el.homeStaffArt = $('home-staff-art'); el.homeStaffMeta = $('home-staff-meta');
    el.homeSeniorArt = $('home-senior-art'); el.homeSeniorMeta = $('home-senior-meta');
    el.homeJuniorArt = $('home-junior-art'); el.homeJuniorMeta = $('home-junior-meta');
    el.staffYears = $('staff-years'); el.staffModes = $('staff-modes'); el.staffTrack = $('staff-track');
    el.ribbon = $('ribbon'); el.ribbonYear = $('ribbon-year'); el.yearScope = $('year-scope');
    el.letters = $('letters'); el.branches = $('branches'); el.servingLine = $('serving-line');
    el.ciYears = $('ci-years'); el.ciTitle = $('ci-title'); el.strips = $('strips');
    el.spotCard = $('spot-card'); el.plateNo = $('plate-no'); el.plateLabel = $('plate-label');
    el.plateBoard = $('plate-board'); el.plateOrdinal = $('plate-ordinal'); el.spotProgress = $('spot-progress');
    el.spotTag = $('spot-tag'); el.spotRank = $('spot-rank'); el.spotName = $('spot-name');
    el.spotTenure = $('spot-tenure'); el.spotDuration = $('spot-duration'); el.spotLinks = $('spot-links');
    el.spotCount = $('spot-count'); el.spotPrev = $('spot-prev'); el.spotNext = $('spot-next');
    el.record = $('record'); el.recordCard = $('record-card'); el.recordNo = $('record-no'); el.recordOf = $('record-of');
    el.recordBoard = $('record-board'); el.recordRankFull = $('record-rank-full'); el.recordTags = $('record-tags');
    el.recordName = $('record-name'); el.recordFacts = $('record-facts'); el.recordLinks = $('record-links');
    el.recordIntake = $('record-intake'); el.recordPrev = $('record-prev'); el.recordNext = $('record-next');
    el.idleOverlay = $('idle-overlay');
    el.btnSound = $('btn-sound');

    FIRST_YEAR = Math.min.apply(null, STAFF.map(function (p) { return yearOf(p.from) || 9999; }));
    LAST_YEAR = Math.max(TODAY.y, Math.max.apply(null, STAFF.map(function (p) { return yearOf(p.from) || 0; })));
    for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) YEARS.push(y);

    applyStaticI18n();
    buildAttract();
    buildHome();
    buildStaff();

    el.screens.attract.addEventListener('click', function () { showScreen('home'); });
    $('btn-home').addEventListener('click', function () { showScreen('home'); });
    $('btn-close').addEventListener('click', function () { window.close(); });
    el.btnSound.addEventListener('click', toggleAmbient);
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { showScreen(b.getAttribute('data-nav')); });
    });

    el.spotPrev.addEventListener('click', function () { showChief(state.course, state.spot[state.course] - 1, -1); });
    el.spotNext.addEventListener('click', function () { showChief(state.course, state.spot[state.course] + 1, 1); });
    addSwipe(el.spotCard, function (dir) { showChief(state.course, state.spot[state.course] + dir, dir); });
    el.screens.chiefs.addEventListener('pointerdown', function () { if (state.screen === 'chiefs' && !state.record) holdSpot(); });

    $('record-close').addEventListener('click', closeRecord);
    el.record.addEventListener('click', function (e) { if (e.target === el.record) closeRecord(); });
    el.recordPrev.addEventListener('click', function () { stepRecord(-1); });
    el.recordNext.addEventListener('click', function () { stepRecord(1); });
    addSwipe(el.recordCard, stepRecord);

    document.addEventListener('keydown', function (e) {
      if (state.record) {
        if (e.key === 'Escape') closeRecord();
        if (e.key === 'ArrowLeft') stepRecord(-1);
        if (e.key === 'ArrowRight') stepRecord(1);
      } else if (state.screen === 'chiefs') {
        if (e.key === 'ArrowLeft') showChief(state.course, state.spot[state.course] - 1, -1);
        if (e.key === 'ArrowRight') showChief(state.course, state.spot[state.course] + 1, 1);
      }
    });

    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', scaleStage);
    scaleStage();
    startBoard();
    startAmbient();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
