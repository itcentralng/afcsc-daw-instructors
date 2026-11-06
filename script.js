/* ============================================================
   OUR INSTRUCTORS — Department of Air Warfare kiosk app logic
   ============================================================ */

(function () {
  'use strict';

  var STAGE_W = 1920, STAGE_H = 1080;
  var IDLE_TIMEOUT_MS = 100000; // 100 s without a touch -> back to the welcome screen
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Welcome: speed the honours board rises at, in px per second.
  var HONOURS_SPEED = 26;

  // Chief Instructors: the line moves on by itself; a touch holds it.
  var CI_INTERVAL = 9000;   // ms each Chief Instructor is shown
  var CI_RESUME = 20000;    // ms of quiet before it starts moving again

  var C = DAW_CONTENT, R = DAW_ROLL;
  var STAFF = R.staff;
  var COURSES = { senior: R.seniorCourse, junior: R.juniorCourse };

  var state = {
    screen: 'attract', course: 'senior', ci: { senior: 0, junior: 0 },
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
  function img(src, alt, cls) {
    var i = document.createElement('img');
    i.src = src; i.alt = alt || ''; i.draggable = false;
    if (cls) i.className = cls;
    return i;
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
  var NOW = new Date();
  var TODAY = { y: NOW.getFullYear(), m: NOW.getMonth() + 1, d: NOW.getDate() };
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
    return fmtLong(p.from) + ' — ' + (p.to ? fmtLong(p.to) : (p.current ? t('present') : t('tbc')));
  }
  function tenureYears(p) {
    if (!p.from) return t('tbc');
    var a = yearOf(p.from);
    if (!p.to && !p.current) return 'From ' + a;
    var b = p.to ? yearOf(p.to) : t('present');
    return a === b ? String(a) : a + '–' + b;
  }
  // Duration, to the precision both dates allow.
  function durationOf(p) {
    var a = parts(p.from), b = parts(endIso(p));
    if (!a || !b) return t('tbc');
    if (a.m && b.m) {
      var months = (b.y - a.y) * 12 + (b.m - a.m), days = 0;
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

  function rankInfo(r) { return C.ranks[r] || { name: r, plural: r, insignia: null }; }
  function rankFull(r) { return rankInfo(r).name; }
  function insignia(r) { return rankInfo(r).insignia; }
  function nameOf(p) { return (p.initials ? p.initials + ' ' : '') + p.surname; }
  function shortName(p) { return p.rank + ' ' + nameOf(p); }
  function letterOf(p) { return p.surname.charAt(0).toUpperCase(); }
  function staffByNo(no) { return STAFF[no - 1]; }
  function courseLabel(c) { return c === 'senior' ? t('seniorCourse') : t('juniorCourse'); }
  function isAllied(p) { return p.service === 'raf' || p.service === 'gaf'; }
  function countLabel(n) { return n === 1 ? t('officer') : t('officers'); }

  function nameInto(node, p) {
    node.innerHTML = '';
    if (p.initials) node.appendChild(make('small', null, p.initials));
    node.appendChild(document.createTextNode(p.surname));
  }
  // A reference card: a small mark, a label and a name.
  function ref(mark, label, name, gold, onTap) {
    var b = make('button', 'ref' + (gold ? ' ref--gold' : ''));
    b.appendChild(make('span', 'ref-mark', mark));
    var tx = make('span', 'ref-text');
    tx.appendChild(make('span', 'ref-label', label));
    tx.appendChild(make('span', 'ref-name', name));
    b.appendChild(tx);
    b.addEventListener('click', onTap);
    return b;
  }

  function byDate(a, b) { return (a.from || '').localeCompare(b.from || '') || a.no - b.no; }
  function byName(a, b) { return a.surname.localeCompare(b.surname) || (a.initials || '').localeCompare(b.initials || '') || byDate(a, b); }

  /* ---------------- stage scaling ---------------- */
  function scaleStage() {
    var s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    el.stage.style.transform = 'scale(' + s + ')';
  }
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
  }

  /* ---------------- background music ---------------- */
  // Plays assets/audio/ambient.mp3 on a loop: softly on the welcome screen,
  // a little louder once a visitor begins. A missing file means silence.
  var AMBIENT_SRC = 'assets/audio/ambient.mp3';
  var AMBIENT_VOLUME = 0.3, AMBIENT_ATTRACT_VOLUME = 0.15, AMBIENT_FADE_MS = 1200;
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
  // "chiefs" opens the Chief Instructors at the course last shown;
  // "senior" and "junior" open it at that course.
  function showScreen(id) {
    closeRecord(true);
    stopCi();
    stopHonours();
    var screenId = id;
    if (id === 'senior' || id === 'junior') { state.course = id; screenId = 'chiefs'; }
    if (screenId === 'attract') resetSearch();
    state.screen = screenId;
    if (ambient && !ambient.paused) fadeAmbient(ambientTarget());
    Object.keys(el.screens).forEach(function (k) { el.screens[k].classList.toggle('active', k === screenId); });
    el.topbar.classList.toggle('hidden', screenId === 'attract');
    var section = screenId;
    el.topbarNav.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === section); });
    if (screenId === 'attract') startHonours();
    if (screenId === 'staff') el.cards.scrollTop = 0;
    if (screenId === 'chiefs') enterChiefs();
    if (screenId === 'search') renderResults();
    resetIdleTimer();
  }

  /* ---------------- welcome: honours board ---------------- */
  var honoursRaf = null, honoursPos = 0, honoursLast = null, honoursHalf = 0;
  var FIRST_YEAR, LAST_YEAR, YEARS = [];

  function buildHonours() {
    // the whole roll in order of posting, a year heading before each new year; twice, for a seamless loop
    var sorted = STAFF.slice().sort(byDate);
    for (var rep = 0; rep < 2; rep++) {
      var lastY = null;
      sorted.forEach(function (p) {
        var y = yearOf(p.from);
        if (y !== lastY) { el.honoursRoll.appendChild(make('div', 'hr-year', String(y))); lastY = y; }
        var row = make('div', 'hr-name');
        row.appendChild(document.createTextNode(nameOf(p)));
        row.appendChild(make('small', null, p.rank));
        el.honoursRoll.appendChild(row);
      });
    }
  }
  function startHonours() {
    stopHonours();
    honoursHalf = el.honoursRoll.scrollHeight / 2;
    honoursLast = null;
    function step(now) {
      if (honoursLast !== null) {
        honoursPos += (now - honoursLast) / 1000 * HONOURS_SPEED;
        if (honoursHalf && honoursPos >= honoursHalf) honoursPos -= honoursHalf;
        el.honoursRoll.style.transform = 'translateY(' + (-honoursPos) + 'px)';
      }
      honoursLast = now;
      honoursRaf = requestAnimationFrame(step);
    }
    honoursRaf = requestAnimationFrame(step);
  }
  function stopHonours() { if (honoursRaf) { cancelAnimationFrame(honoursRaf); honoursRaf = null; } }

  function buildAttract() {
    buildHonours();
    el.welcomeSub.innerHTML = '';
    el.welcomeSub.appendChild(make('b', null, String(R.seniorCourse.length + R.juniorCourse.length)));
    el.welcomeSub.appendChild(document.createTextNode(' Chief Instructor tours · '));
    el.welcomeSub.appendChild(make('b', null, String(STAFF.length)));
    el.welcomeSub.appendChild(document.createTextNode(' ' + t('directingStaff') + ' since ' + FIRST_YEAR));

    // the ranks held on posting, junior to senior, with how many officers
    var counts = {};
    STAFF.forEach(function (p) { counts[p.rank] = (counts[p.rank] || 0) + 1; });
    Object.keys(C.ranks).forEach(function (r) {
      if (!counts[r]) return;
      var item = make('div', 'parade-item');
      item.appendChild(img(insignia(r), rankFull(r)));
      var tx = make('div', 'parade-text');
      tx.appendChild(make('b', null, String(counts[r])));
      tx.appendChild(make('span', null, rankInfo(r).plural));
      item.appendChild(tx);
      el.parade.appendChild(item);
    });
  }

  /* ---------------- home ---------------- */
  function arrivalsIn(y) { return STAFF.filter(function (p) { return yearOf(p.from) === y; }); }
  function onStaffIn(y) { return STAFF.filter(function (p) { return p.from && yearOf(p.from) <= y && endYear(p) >= y; }); }

  function buildHome() {
    var max = 1;
    var counts = YEARS.map(function (y) { var n = onStaffIn(y).length; max = Math.max(max, n); return n; });
    el.homeStaffArt.appendChild(make('span', 'fa-label', t('onStaffIn') + ' each year'));
    var bars = make('span', 'fa-bars');
    counts.forEach(function (n, i) {
      var b = make('i', YEARS[i] === LAST_YEAR ? 'is-now' : '');
      b.style.height = (n / max * 100) + '%';
      bars.appendChild(b);
    });
    el.homeStaffArt.appendChild(bars);
    var axis = make('span', 'fa-axis');
    [FIRST_YEAR, Math.round((FIRST_YEAR + LAST_YEAR) / 2), LAST_YEAR].forEach(function (y) { axis.appendChild(make('span', null, String(y))); });
    el.homeStaffArt.appendChild(axis);
    el.homeStaffMeta.textContent = STAFF.length + ' officers · ' + FIRST_YEAR + '–' + LAST_YEAR;

    // Chief Instructors: one folder, a panel for each course (tap a panel for that course)
    var total = 0;
    ['senior', 'junior'].forEach(function (c) {
      var list = COURSES[c];
      total += list.length;
      var now = list.filter(isServing).pop() || list[list.length - 1];
      var box = make('span', 'fa-course');
      box.setAttribute('data-course', c);
      box.appendChild(img(insignia(now.rank), rankFull(now.rank)));
      var tx = make('span', 'fa-course-text');
      tx.appendChild(make('span', 'fa-course-name', courseLabel(c)));
      tx.appendChild(make('b', null, String(list.length)));
      tx.appendChild(make('span', null, 'Appointments since ' + yearOf(list[0].from)));
      tx.appendChild(make('em', null, shortName(now)));
      tx.appendChild(make('small', null, (isServing(now) ? 'Serving · ' : 'Latest · ') + tenureYears(now)));
      box.appendChild(tx);
      box.addEventListener('click', function (e) { e.stopPropagation(); showScreen(c); });
      el.homeChiefsArt.appendChild(box);
    });
    el.homeChiefsMeta.textContent = total + ' appointments · ' + t('seniorCourse') + ' and ' + t('juniorCourse');
    el.homeSearchMeta.textContent = (STAFF.length + total) + ' entries on the rolls';
  }

  /* ---------------- directing staff ---------------- */
  var touchMoved = false;

  function staffCard(p) {
    var serving = isServing(p);
    var card = make('button', 'icard' + (serving ? ' icard--serving' : ''));
    card.setAttribute('aria-label', rankFull(p.rank) + ' ' + nameOf(p));
    var board = make('span', 'icard-board');
    if (insignia(p.rank)) board.appendChild(img(insignia(p.rank), rankFull(p.rank)));
    card.appendChild(board);
    var tx = make('span', 'icard-text');
    var top = make('span', 'icard-top');
    top.appendChild(make('b', null, p.rank.toUpperCase()));
    top.appendChild(make('span', null, 'DS ' + p.no));
    tx.appendChild(top);
    var name = make('span', 'icard-name'); nameInto(name, p); tx.appendChild(name);
    tx.appendChild(make('span', 'icard-spec', p.specialty || (isAllied(p) ? C.services[p.service].name : t('specialtyMissing'))));
    var foot = make('span', 'icard-foot');
    foot.appendChild(make('span', 'icard-dates', tenureYears(p)));
    var flags = make('span', 'icard-flags');
    if (serving) flags.appendChild(make('span', 'flag flag--serving', t('serving')));
    if (p.chief) flags.appendChild(make('span', 'flag flag--ci', 'CI'));
    if (isAllied(p)) flags.appendChild(make('span', 'flag', C.services[p.service].short));
    foot.appendChild(flags);
    tx.appendChild(foot);
    card.appendChild(tx);
    return card;
  }

  function branchMembers(id) {
    if (id === 'allied') return STAFF.filter(isAllied);
    return STAFF.filter(function (p) { return p.branch === id; });
  }

  function currentList() {
    if (state.mode === 'year') return (state.yearScope === 'in' ? arrivalsIn(state.year) : onStaffIn(state.year)).sort(byDate);
    if (state.mode === 'name') return STAFF.filter(function (p) { return letterOf(p) === state.letter; }).sort(byName);
    if (state.mode === 'branch') return branchMembers(state.branch).sort(byDate);
    return STAFF.filter(isServing).sort(byDate);
  }

  function caption() {
    if (state.mode === 'year') return state.yearScope === 'in' ? 'joined the Directing Staff in ' + state.year : 'on the Directing Staff in ' + state.year;
    if (state.mode === 'name') return 'with surnames beginning ' + state.letter;
    if (state.mode === 'branch') {
      var br = C.branches.filter(function (b) { return b.id === state.branch; })[0];
      return 'in ' + br.label + ' · ' + br.note;
    }
    return 'serving on the Directing Staff today';
  }

  function renderStaff() {
    var list = currentList();
    el.deskCount.textContent = String(list.length);
    el.deskCaption.textContent = countLabel(list.length) + ' ' + caption();
    el.cards.innerHTML = '';
    if (!list.length) el.cards.appendChild(make('div', 'cards-empty', t('noOne')));
    list.forEach(function (p, i) {
      var card = staffCard(p);
      card.style.animationDelay = Math.min(i * 0.02, 0.4) + 's';
      card.addEventListener('click', function () { if (!touchMoved) openRecord(p.no, list); });
      el.cards.appendChild(card);
    });
    el.cards.scrollTop = 0;
  }

  function setMode(mode) {
    state.mode = mode;
    Array.prototype.forEach.call(el.staffModes.children, function (b) { b.classList.toggle('active', b.getAttribute('data-mode') === mode); });
    ['year', 'name', 'branch', 'serving'].forEach(function (m) { $('pane-' + m).classList.toggle('active', m === mode); });
    el.ribbonWrap.classList.toggle('hidden', mode !== 'year');
    el.yearScope.innerHTML = '';
    if (mode === 'year') buildScope();
    renderStaff();
  }

  // Year ribbon: a column per year; sweep a finger along it to move through time.
  function buildRibbon() {
    var maxOn = 1;
    var data = YEARS.map(function (y) {
      var on = onStaffIn(y).length;
      maxOn = Math.max(maxOn, on);
      return { y: y, on: on, inn: arrivalsIn(y).length };
    });
    el.ribbonCols = data.map(function (d) {
      var tick = d.y % 5 === 0;
      var col = make('div', 'ryear' + (tick ? ' is-tick' : ''));
      var bars = make('div', 'ryear-bars');
      var on = make('span', 'ryear-on'); on.style.height = (d.on / maxOn * 100) + '%';
      var inn = make('span', 'ryear-in'); inn.style.height = (d.inn / maxOn * 100) + '%';
      bars.appendChild(on); bars.appendChild(inn);
      col.appendChild(bars);
      var lab = make('div', 'ryear-label', String(d.y));
      lab.setAttribute('data-year', String(d.y));
      col.appendChild(lab);
      el.ribbon.appendChild(col);
      return col;
    });

    var sweeping = false;
    function pick(e) {
      var r = el.ribbon.getBoundingClientRect();
      var k = Math.max(0, Math.min(YEARS.length - 1, Math.floor((e.clientX - r.left) / r.width * YEARS.length)));
      if (YEARS[k] !== state.year) setYear(YEARS[k]);
    }
    el.ribbon.addEventListener('pointerdown', function (e) {
      sweeping = true;
      try { el.ribbon.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      pick(e);
    });
    el.ribbon.addEventListener('pointermove', function (e) { if (sweeping) pick(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { el.ribbon.addEventListener(ev, function () { sweeping = false; }); });
  }

  function buildScope() {
    el.yearScope.innerHTML = '';
    [['in', t('joinedIn') + ' ' + state.year, arrivalsIn(state.year).length],
     ['on', t('onStaffIn') + ' ' + state.year, onStaffIn(state.year).length]].forEach(function (s) {
      var b = make('button', s[0] === state.yearScope ? 'active' : '', s[1]);
      b.appendChild(make('small', null, String(s[2])));
      b.addEventListener('click', function () { state.yearScope = s[0]; buildScope(); renderStaff(); });
      el.yearScope.appendChild(b);
    });
  }

  function setYear(y) {
    state.year = y;
    el.ribbonCols.forEach(function (c, i) { c.classList.toggle('is-active', YEARS[i] === y); });
    buildScope();
    renderStaff();
  }

  function buildLetters() {
    var counts = {};
    STAFF.forEach(function (p) { var l = letterOf(p); counts[l] = (counts[l] || 0) + 1; });
    for (var c = 65; c <= 90; c++) {
      (function (L) {
        if (!state.letter && counts[L]) state.letter = L;
        var b = make('button', 'letter' + (L === state.letter ? ' active' : ''), L);
        b.appendChild(make('small', null, counts[L] ? String(counts[L]) : '—'));
        b.disabled = !counts[L];
        b.addEventListener('click', function () {
          state.letter = L;
          Array.prototype.forEach.call(el.letters.children, function (n) { n.classList.toggle('active', n === b); });
          renderStaff();
        });
        el.letters.appendChild(b);
      })(String.fromCharCode(c));
    }
  }

  function buildBranches() {
    C.branches.forEach(function (br) {
      var n = branchMembers(br.id).length;
      if (!n) return;
      var b = make('button', 'branch' + (br.id === state.branch ? ' active' : ''));
      b.appendChild(make('span', null, br.label));
      b.appendChild(make('b', null, String(n)));
      b.addEventListener('click', function () {
        state.branch = br.id;
        Array.prototype.forEach.call(el.branches.children, function (x) { x.classList.toggle('active', x === b); });
        renderStaff();
      });
      el.branches.appendChild(b);
    });
  }

  function buildStaff() {
    el.staffYears.textContent = FIRST_YEAR + '–' + LAST_YEAR + ' · ' + STAFF.length + ' officers';
    [['year', t('modeYear'), null], ['name', t('modeName'), null], ['branch', t('modeBranch'), null],
     ['serving', t('modeServing'), STAFF.filter(isServing).length]].forEach(function (m) {
      var b = make('button', 'mode', m[1]);
      b.setAttribute('data-mode', m[0]);
      if (m[2] !== null) b.appendChild(make('small', null, String(m[2])));
      b.addEventListener('click', function () { setMode(m[0]); });
      el.staffModes.appendChild(b);
    });
    buildRibbon();
    buildLetters();
    buildBranches();
    // open on the first year with a real intake (not a lone early posting)
    state.year = YEARS.filter(function (y) { return arrivalsIn(y).length >= 3; })[0] || YEARS[0];
    el.ribbonCols.forEach(function (c, i) { c.classList.toggle('is-active', YEARS[i] === state.year); });
    setMode('year');

    el.cards.addEventListener('pointerdown', function () { touchMoved = false; });
    el.cards.addEventListener('touchmove', function () { touchMoved = true; }, { passive: true });
    // a mouse can drag the cards too
    var dragY = null, startTop = 0;
    el.cards.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') { dragY = e.clientY; startTop = el.cards.scrollTop; } });
    window.addEventListener('pointermove', function (e) {
      if (dragY === null) return;
      var dy = e.clientY - dragY;
      if (Math.abs(dy) > 8) touchMoved = true;
      el.cards.scrollTop = startTop - dy;
    });
    window.addEventListener('pointerup', function () { dragY = null; });
  }

  /* ---------------- personnel file (one officer) ---------------- */
  function openRecord(no, list, direction) {
    var p = staffByNo(no);
    if (!p) return;
    var wasOpen = !!state.record;
    state.record = no;
    state.recordList = list && list.length ? list : [p];
    stopCi();

    el.recordRef.textContent = 'DS ' + pad2(p.no) + ' / ' + STAFF.length + (p.svcNo ? '   ·   ' + p.svcNo : '');
    el.recordInsignia.src = insignia(p.rank) || '';
    el.recordInsignia.alt = rankFull(p.rank);
    el.recordRankFull.textContent = rankFull(p.rank);

    el.recordTags.innerHTML = '';
    if (isServing(p)) el.recordTags.appendChild(make('span', 'badge badge--serving', t('serving')));
    if (isAllied(p)) el.recordTags.appendChild(make('span', 'badge badge--gold', C.services[p.service].name));
    var br = C.branches.filter(function (b) { return b.id === p.branch; })[0];
    if (br) el.recordTags.appendChild(make('span', 'badge', br.label));

    nameInto(el.recordName, p);

    el.recordFacts.innerHTML = '';
    [
      [t('rank'), rankFull(p.rank)],
      [t('serviceNo'), p.svcNo],
      [t('specialty'), p.specialty],
      [t('service'), p.service ? C.services[p.service].name : null],
      [t('tour'), tenureLong(p), true],
      [t('duration'), durationOf(p), true]
    ].forEach(function (f) {
      var d = make('div', f[2] ? 'is-wide' : null);
      d.appendChild(make('dt', null, f[0]));
      d.appendChild(make('dd', f[1] ? null : 'is-missing', f[1] || t('notRecorded')));
      el.recordFacts.appendChild(d);
    });

    el.recordLinks.innerHTML = '';
    (p.chief || []).forEach(function (r) {
      var ci = COURSES[r.course][r.no - 1];
      el.recordLinks.appendChild(ref(pad2(ci.no), t('alsoChief') + ' · ' + courseLabel(r.course),
        shortName(ci) + ' · ' + tenureYears(ci), true, function () { showChief(r.course, r.no - 1); }));
    });

    // others posted in the same month (only where the month is recorded)
    el.recordIntake.innerHTML = '';
    if (p.from && p.from.length >= 7) {
      var month = p.from.slice(0, 7);
      var mates = STAFF.filter(function (q) { return q !== p && q.from && q.from.slice(0, 7) === month; }).sort(byDate).slice(0, 12);
      if (mates.length) {
        el.recordIntake.appendChild(make('span', 'file-intake-label', t('sameIntake') + ' · ' + fmtLong(month)));
        var row = make('div', 'file-intake-list');
        mates.forEach(function (q) {
          var b = make('button', 'mate');
          b.appendChild(make('small', null, q.rank));
          b.appendChild(document.createTextNode(nameOf(q)));
          b.addEventListener('click', function () { openRecord(q.no, mates.concat([p]).sort(byDate), 1); });
          row.appendChild(b);
        });
        el.recordIntake.appendChild(row);
      }
    }

    var k = state.recordList.indexOf(p);
    el.recordPos.textContent = k >= 0 ? (k + 1) + ' of ' + state.recordList.length : '';
    el.recordPrev.disabled = k <= 0;
    el.recordNext.disabled = k < 0 || k >= state.recordList.length - 1;

    el.record.classList.remove('hidden');
    if (wasOpen) restartAnimation(el.recordCard, direction ? (direction < 0 ? 'enter-prev' : 'enter-next') : 'enter-next');
    resetIdleTimer();
  }
  function stepRecord(dir) {
    if (!state.record) return;
    var list = state.recordList, k = list.indexOf(staffByNo(state.record)) + dir;
    if (k >= 0 && k < list.length) openRecord(list[k].no, list, dir);
  }
  function closeRecord(silent) {
    if (!state.record) return;
    state.record = null;
    el.record.classList.add('hidden');
    el.recordCard.classList.remove('enter-next', 'enter-prev');
    if (!silent && state.screen === 'chiefs') holdCi();
  }

  /* ---------------- chief instructors: line of succession ---------------- */
  var ciTimer = null;
  function chiefList() { return COURSES[state.course]; }

  function buildChain() {
    var list = chiefList();
    el.chain.innerHTML = '';
    el.chainAxis.innerHTML = '';
    el.links = list.map(function (p, i) {
      var b = make('button', 'link' + (isServing(p) ? ' is-serving' : ''), String(p.no));
      b.setAttribute('aria-label', ordinal(p.no) + ' ' + t('chiefInstructor') + ': ' + shortName(p));
      b.appendChild(make('span', 'link-progress'));
      b.addEventListener('click', function () { showChief(state.course, i); });
      el.chain.appendChild(b);
      return b;
    });
    // a year mark under the first appointment of each decade
    var seen = {}, lastAt = -99;
    list.forEach(function (p, i) {
      var dec = Math.floor(yearOf(p.from) / 10) * 10;
      if (seen[dec]) return;
      seen[dec] = true;
      if (i - lastAt < 3) return;   // too close to the previous label to read
      lastAt = i;
      var s = make('span', null, i === 0 ? String(yearOf(p.from)) : dec + 's');
      s.style.left = ((i + 0.5) / list.length * 100) + '%';
      el.chainAxis.appendChild(s);
    });
  }

  function renderChief(i, direction, auto) {
    var list = chiefList(), p = list[i];
    state.ci[state.course] = i;

    el.ciInsignia.src = insignia(p.rank) || '';
    el.ciInsignia.alt = rankFull(p.rank);
    el.ciOrdinal.textContent = ordinal(p.no) + ' ' + t('chiefInstructor') + ' · ' + courseLabel(state.course);
    var serving = isServing(p);
    el.ciTag.textContent = serving ? t('serving') : '';
    el.ciTag.className = 'badge' + (serving ? ' badge--serving' : '');
    el.ciRank.textContent = rankFull(p.rank);
    nameInto(el.ciName, p);
    el.ciTenure.textContent = tenureLong(p);
    el.ciDuration.textContent = durationOf(p);

    el.ciLinks.innerHTML = '';
    if (p.staff) {
      var ds = staffByNo(p.staff);
      el.ciLinks.appendChild(ref('DS', t('asStaff') + ' · ' + tenureYears(ds), shortName(ds) + (ds.specialty ? ' · ' + ds.specialty : ''), true,
        function () { openRecord(ds.no, [ds]); }));
      // the same officer as Chief Instructor of the other course
      (ds.chief || []).forEach(function (r) {
        if (r.course === state.course) return;
        var other = COURSES[r.course][r.no - 1];
        el.ciLinks.appendChild(ref(pad2(other.no), t('chiefInstructor') + ' · ' + courseLabel(r.course), tenureYears(other), false,
          function () { showChief(r.course, r.no - 1); }));
      });
    }

    el.ciNeighbours.innerHTML = '';
    if (i > 0) el.ciNeighbours.appendChild(ref(pad2(list[i - 1].no), t('precededBy') + ' · ' + tenureYears(list[i - 1]), shortName(list[i - 1]), false,
      function () { showChief(state.course, i - 1, -1); }));
    if (i < list.length - 1) el.ciNeighbours.appendChild(ref(pad2(list[i + 1].no), t('succeededBy') + ' · ' + tenureYears(list[i + 1]), shortName(list[i + 1]), false,
      function () { showChief(state.course, i + 1, 1); }));

    el.ciCount.innerHTML = '';
    el.ciCount.appendChild(make('b', null, String(i + 1)));
    el.ciCount.appendChild(document.createTextNode(' ' + t('of') + ' ' + list.length));
    el.ciPrev.disabled = i === 0;
    el.ciNext.disabled = i === list.length - 1;

    el.links.forEach(function (b, k) {
      b.classList.toggle('is-active', k === i);
      var bar = b.lastChild;
      bar.classList.remove('run');
      if (k === i && auto) { void bar.offsetWidth; bar.style.animationDuration = CI_INTERVAL + 'ms'; bar.classList.add('run'); }
    });
    restartAnimation(el.ciBody, direction ? (direction < 0 ? 'enter-prev' : 'enter-next') : null);
  }

  function scheduleCi(delay) {
    stopCi();
    ciTimer = setTimeout(function () {
      ciTimer = null;
      renderChief((state.ci[state.course] + 1) % chiefList().length, 1, true);
      scheduleCi(CI_INTERVAL);
    }, delay);
  }
  function stopCi() { if (ciTimer) { clearTimeout(ciTimer); ciTimer = null; } }
  function holdCi() {
    if (el.links) el.links.forEach(function (b) { b.lastChild.classList.remove('run'); });
    scheduleCi(CI_RESUME);
  }

  function enterChiefs() {
    var list = chiefList(), last = list[list.length - 1];
    el.ciTitle.textContent = t('chiefsTitle') + ' · ' + courseLabel(state.course);
    Array.prototype.forEach.call(el.ciSwitch.children, function (b) { b.classList.toggle('active', b.getAttribute('data-course') === state.course); });
    el.ciYears.textContent = yearOf(list[0].from) + '–' + (isServing(last) ? t('present') : endYear(last)) + ' · ' + list.length + ' appointments';
    buildChain();
    renderChief(state.ci[state.course] || 0, null, true);
    scheduleCi(CI_INTERVAL);
  }

  // Shows a Chief Instructor at a visitor's request (holds the auto-advance).
  function showChief(course, i, direction) {
    var list = COURSES[course];
    if (i < 0 || i >= list.length) return;
    closeRecord(true);
    if (state.screen !== 'chiefs' || state.course !== course) {
      state.ci[course] = i;
      showScreen(course);
    }
    renderChief(i, direction || (i >= state.ci[course] ? 1 : -1), false);
    holdCi();
    resetIdleTimer();
  }

  /* ---------------- search: name or service number ---------------- */
  var query = '';
  var KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL/', 'ZXCVBNM-'];
  var MAX_STAFF_RESULTS = 60;

  function alnum(x) { return (x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function words(p) { return ((p.initials || '') + ' ' + p.surname).toUpperCase().replace(/[’'.]/g, '').split(/[\s-]+/).filter(Boolean); }
  function svcOf(p) { return p.svcNo || (p.staff ? staffByNo(p.staff).svcNo : null); }

  // Score how well an officer matches the query (0 = no match). Every word
  // typed must begin one of the officer's names, or appear in the service number.
  function score(p, q) {
    var qa = alnum(q);
    if (!qa) return 0;
    var svc = alnum(svcOf(p));
    if (/[0-9]/.test(qa)) {
      if (!svc) return 0;
      if (svc === qa || svc.replace(/^[A-Z]+/, '') === qa) return 100;
      return svc.indexOf(qa) >= 0 || svc.replace(/^[A-Z]+/, '').indexOf(qa) === 0 ? 60 : 0;
    }
    var w = words(p), sur = alnum(p.surname), total = 0;
    var tokens = q.toUpperCase().replace(/[’'.]/g, '').split(/[\s-]+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i], best = 0;
      if (alnum(tk) === sur) best = 50;
      w.forEach(function (x) { if (x === tk) best = Math.max(best, 40); else if (x.indexOf(tk) === 0) best = Math.max(best, 25); });
      if (!best && tk.length >= 3 && sur.indexOf(alnum(tk)) >= 0) best = 10;
      if (!best) return 0;
      total += best;
    }
    return total;
  }
  function search(list, q) {
    return list.map(function (p) { return { p: p, s: score(p, q) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || byName(a.p, b.p); })
      .map(function (r) { return r.p; });
  }

  function buildKeyboard() {
    KEY_ROWS.forEach(function (row) {
      var r = make('div', 'key-row');
      row.split('').forEach(function (k) {
        var b = make('button', 'key', k);
        b.addEventListener('click', function () { typeKey(k); });
        r.appendChild(b);
      });
      el.keyboard.appendChild(r);
    });
    var last = make('div', 'key-row');
    [['space', t('space'), function () { typeKey(' '); }],
     ['back', '⌫', function () { query = query.slice(0, -1); renderResults(); }],
     ['clear', t('clear'), function () { query = ''; renderResults(); }]].forEach(function (k) {
      var b = make('button', 'key key--' + k[0], k[1]);
      b.addEventListener('click', k[2]);
      last.appendChild(b);
    });
    el.keyboard.appendChild(last);
  }
  function typeKey(k) {
    if (query.length >= 24) return;
    if (k === ' ' && (!query || / $/.test(query))) return;
    query += k;
    renderResults();
  }
  function resetSearch() { query = ''; if (el.queryText) renderResults(); }

  function chiefResult(p, course) {
    var b = ref(pad2(p.no), ordinal(p.no) + ' ' + t('chiefInstructor') + ' · ' + courseLabel(course) + ' · ' + tenureYears(p),
      shortName(p) + (svcOf(p) ? '  ·  ' + svcOf(p) : ''), true,
      function () { showChief(course, p.no - 1); });
    b.classList.add('result-ci');
    return b;
  }

  function renderResults() {
    el.queryText.textContent = query;
    el.queryPlaceholder.classList.toggle('hidden', !!query);
    el.resultsHead.innerHTML = '';
    el.results.innerHTML = '';
    if (!alnum(query)) {
      el.results.appendChild(make('p', 'results-note', t('searchStart')));
      return;
    }
    var cis = [];
    ['senior', 'junior'].forEach(function (c) { search(COURSES[c], query).forEach(function (p) { cis.push({ p: p, c: c }); }); });
    var ds = search(STAFF, query);
    var count = make('div', 'desk-count');
    count.appendChild(make('b', null, String(cis.length + ds.length)));
    count.appendChild(make('span', null, (cis.length + ds.length === 1 ? 'match' : 'matches') + ' for “' + query.trim() + '”'));
    el.resultsHead.appendChild(count);
    if (!cis.length && !ds.length) {
      el.results.appendChild(make('p', 'results-note', t('searchEmpty') + ' “' + query.trim() + '”.'));
      return;
    }
    if (cis.length) {
      el.results.appendChild(make('h3', 'results-group', t('chiefsTitle') + ' · ' + cis.length));
      var ciBox = make('div', 'results-ci');
      cis.forEach(function (r) { ciBox.appendChild(chiefResult(r.p, r.c)); });
      el.results.appendChild(ciBox);
    }
    if (ds.length) {
      el.results.appendChild(make('h3', 'results-group', t('directingStaff') + ' · ' + ds.length));
      var grid = make('div', 'results-ds');
      var shown = ds.slice(0, MAX_STAFF_RESULTS);
      shown.forEach(function (p) {
        var card = staffCard(p);
        card.addEventListener('click', function () { openRecord(p.no, shown); });
        grid.appendChild(card);
      });
      el.results.appendChild(grid);
      if (ds.length > shown.length) el.results.appendChild(make('p', 'results-note', 'And ' + (ds.length - shown.length) + ' more: keep typing to narrow the search.'));
    }
    el.results.scrollTop = 0;
  }

  /* ---------------- swipe ---------------- */
  function addSwipe(node, onSwipe) {
    var x0 = null, y0 = null;
    node.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    node.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
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
    ['stage', 'topbar', 'parade', 'record', 'strips'].forEach(function (id) { el[id] = $(id); });
    el.topbarNav = $('topbar-nav');
    el.screens = { attract: $('screen-attract'), home: $('screen-home'), staff: $('screen-staff'), chiefs: $('screen-chiefs'), search: $('screen-search') };
    el.homeChiefsArt = $('home-chiefs-art'); el.homeChiefsMeta = $('home-chiefs-meta'); el.homeSearchMeta = $('home-search-meta');
    el.ciSwitch = $('ci-switch');
    el.keyboard = $('keyboard'); el.queryText = $('query-text'); el.queryPlaceholder = $('query-placeholder');
    el.resultsHead = $('results-head'); el.results = $('results');
    el.honoursRoll = $('honours-roll'); el.welcomeSub = $('welcome-sub');
    el.homeStaffArt = $('home-staff-art'); el.homeStaffMeta = $('home-staff-meta');
    el.staffYears = $('staff-years'); el.staffModes = $('staff-modes');
    el.letters = $('letters'); el.branches = $('branches');
    el.ribbonWrap = $('ribbon-wrap'); el.ribbon = $('ribbon'); el.yearScope = $('year-scope');
    el.deskCount = $('desk-count'); el.deskCaption = $('desk-caption'); el.cards = $('staff-cards');
    el.ciYears = $('ci-years'); el.ciTitle = $('ci-title'); el.chain = $('chain'); el.chainAxis = $('chain-axis');
    el.ciBody = $('ci-body'); el.ciInsignia = $('ci-insignia'); el.ciOrdinal = $('ci-ordinal'); el.ciTag = $('ci-tag');
    el.ciRank = $('ci-rank'); el.ciName = $('ci-name'); el.ciTenure = $('ci-tenure'); el.ciDuration = $('ci-duration');
    el.ciLinks = $('ci-links'); el.ciNeighbours = $('ci-neighbours'); el.ciCount = $('ci-count');
    el.ciPrev = $('ci-prev'); el.ciNext = $('ci-next');
    el.recordCard = $('record-card'); el.recordRef = $('record-ref'); el.recordInsignia = $('record-insignia');
    el.recordRankFull = $('record-rank-full'); el.recordTags = $('record-tags'); el.recordName = $('record-name');
    el.recordFacts = $('record-facts'); el.recordLinks = $('record-links'); el.recordIntake = $('record-intake');
    el.recordPos = $('record-pos'); el.recordPrev = $('record-prev'); el.recordNext = $('record-next');
    el.idleOverlay = $('idle-overlay'); el.btnSound = $('btn-sound');

    FIRST_YEAR = Math.min.apply(null, STAFF.map(function (p) { return yearOf(p.from) || 9999; }));
    LAST_YEAR = Math.max(TODAY.y, Math.max.apply(null, STAFF.map(function (p) { return yearOf(p.from) || 0; })));
    for (var y = FIRST_YEAR; y <= LAST_YEAR; y++) YEARS.push(y);

    applyStaticI18n();
    buildAttract();
    buildHome();
    buildStaff();
    buildKeyboard();
    renderResults();
    Array.prototype.forEach.call(el.ciSwitch.children, function (b) {
      var c = b.getAttribute('data-course');
      b.lastChild.textContent = COURSES[c].length + ' appointments';
      b.addEventListener('click', function () {
        if (c === state.course) return;
        stopCi(); state.course = c; enterChiefs();
      });
    });

    el.screens.attract.addEventListener('click', function () { showScreen('home'); });
    $('btn-close').addEventListener('click', function () { window.close(); });
    el.btnSound.addEventListener('click', toggleAmbient);
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { showScreen(b.getAttribute('data-nav')); });
    });

    el.ciPrev.addEventListener('click', function () { showChief(state.course, state.ci[state.course] - 1, -1); });
    el.ciNext.addEventListener('click', function () { showChief(state.course, state.ci[state.course] + 1, 1); });
    addSwipe(el.ciBody, function (dir) { showChief(state.course, state.ci[state.course] + dir, dir); });
    el.screens.chiefs.addEventListener('pointerdown', function () { if (state.screen === 'chiefs' && !state.record) holdCi(); });

    $('record-close').addEventListener('click', function () { closeRecord(); });
    el.record.addEventListener('click', function (e) { if (e.target === el.record) closeRecord(); });
    el.recordPrev.addEventListener('click', function () { stepRecord(-1); });
    el.recordNext.addEventListener('click', function () { stepRecord(1); });
    addSwipe(el.recordCard, stepRecord);

    document.addEventListener('keydown', function (e) {
      if (state.record) {
        if (e.key === 'Escape') closeRecord();
        if (e.key === 'ArrowLeft') stepRecord(-1);
        if (e.key === 'ArrowRight') stepRecord(1);
      } else if (state.screen === 'search') {
        // a physical keyboard types into the search too (without pressing on-screen buttons)
        if (/^([a-z0-9\/ -]|Backspace|Escape|Enter)$/i.test(e.key)) e.preventDefault();
        if (/^[a-z0-9\/-]$/i.test(e.key)) typeKey(e.key.toUpperCase());
        else if (e.key === ' ') typeKey(' ');
        else if (e.key === 'Backspace') { query = query.slice(0, -1); renderResults(); }
        else if (e.key === 'Escape') { query = ''; renderResults(); }
      } else if (state.screen === 'chiefs') {
        if (e.key === 'ArrowLeft') showChief(state.course, state.ci[state.course] - 1, -1);
        if (e.key === 'ArrowRight') showChief(state.course, state.ci[state.course] + 1, 1);
      }
    });

    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', scaleStage);
    scaleStage();
    startHonours();
    startAmbient();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
