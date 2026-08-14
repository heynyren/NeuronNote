/**
 * PROGRESS TRACKING & REWARDS
 * ===========================
 * Same idea as the Denken 3 Shuu study app: a daily goal, a streak of days in a
 * row, a 17-week heat calendar, and badges for the milestones worth remembering.
 *
 * Why a notebook needs this
 * ------------------------
 * Spaced repetition answers "what should I review today". It does not answer
 * "am I actually keeping this up". Without the second half, skipping three days
 * looks exactly like not skipping them — and skipping three days is how people
 * stop altogether. A streak and a shelf of badges make *showing up* something
 * you can see, count, and lose.
 *
 * Three rules, copied from Denken because they have proven themselves
 * -------------------------------------------------------------------
 *  1. A badge, once earned, is NEVER taken back — not even if the numbers drop
 *     later. A reward you can have repossessed is not a reward.
 *  2. If today's goal is not met yet, the streak counts back from yesterday, so
 *     it does not read as broken while you are still mid-morning.
 *  3. Locked badges are not previewed anywhere until they unlock. The surprise
 *     is most of the pleasure.
 *
 * This file holds the maths and the rendering. Reading and writing is handed in
 * by the host (`NN.getProgress` / `NN.saveProgress` in shared.js), so the same
 * file serves the extension and the Android app.
 */
'use strict';
(function (root) {

  const NN = root.NN = root.NN || {};

  const DAY = 86400000;
  const DEFAULT_GOAL = 15;

  /* ================================================================== */
  /* Dates                                                              */
  /* ================================================================== */

  /**
   * Today in LOCAL time as YYYY-MM-DD.
   * Deliberately not toISOString(): that converts to UTC, so anyone east of
   * Greenwich would have their small hours filed under yesterday and lose a
   * streak they had earned.
   */
  NN.pDay = function (d) {
    const t = d ? new Date(d) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
  };

  NN.pAddDays = function (iso, n) {
    const parts = iso.split('-').map(Number);
    return NN.pDay(new Date(parts[0], parts[1] - 1, parts[2] + n));
  };

  function prettyDay(iso) {
    const parts = iso.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2])
      .toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ================================================================== */
  /* Shape and merge                                                    */
  /* ================================================================== */

  /**
   * On disk:
   *   {
   *     v: 1,
   *     goal: 15,                     reviews per day that count as "done"
   *     goalAt: 1723600000000,        when the goal last changed (for merging)
   *     log: { '2026-08-14': { r, y, n, s, dawn, night } },
   *     badges: { 'streak-7': '2026-08-14' }
   *   }
   *
   * Per day: r = reviews, y = "got it", n = "not yet", s = passages saved,
   *          dawn = reviewed before 6am, night = reviewed after 11pm.
   */
  function empty() {
    return { v: 1, goal: DEFAULT_GOAL, goalAt: 0, log: {}, badges: {} };
  }

  NN.normalizeProgress = function (d) {
    const o = empty();
    if (!d || typeof d !== 'object') return o;
    if (typeof d.goal === 'number' && d.goal > 0) o.goal = Math.min(500, Math.round(d.goal));
    if (typeof d.goalAt === 'number') o.goalAt = d.goalAt;
    if (d.log && typeof d.log === 'object') {
      Object.keys(d.log).forEach((k) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
        const v = d.log[k] || {};
        o.log[k] = {
          r: v.r || 0, y: v.y || 0, n: v.n || 0, s: v.s || 0,
          dawn: v.dawn ? 1 : 0, night: v.night ? 1 : 0
        };
      });
    }
    if (d.badges && typeof d.badges === 'object') {
      Object.keys(d.badges).forEach((k) => {
        if (typeof d.badges[k] === 'string') o.badges[k] = d.badges[k];
      });
    }
    return o;
  };

  /**
   * Merge two progress records when syncing.
   *
   * Deliberately NOT the "newest updatedAt wins" rule the notes use. Notes are
   * independent records, each with its own timestamp, so comparing timestamps is
   * enough. Progress is not: reviewing 8 passages on the phone and 5 on the
   * laptop today means both numbers are real, and neither side may erase the
   * other. So:
   *
   *   · counts per day → take the LARGER (never the sum: once the two devices
   *     have synced, adding would double-count the reviews just received)
   *   · badges         → union, keeping the EARLIER date
   *   · daily goal     → whichever was changed last
   */
  NN.mergeProgress = function (a, b) {
    const x = NN.normalizeProgress(a);
    const y = NN.normalizeProgress(b);
    const out = empty();
    out.goal = y.goalAt > x.goalAt ? y.goal : x.goal;
    out.goalAt = Math.max(x.goalAt, y.goalAt);

    const days = {};
    Object.keys(x.log).forEach((d) => { days[d] = 1; });
    Object.keys(y.log).forEach((d) => { days[d] = 1; });
    Object.keys(days).forEach((d) => {
      const p = x.log[d] || {}, q = y.log[d] || {};
      out.log[d] = {
        r: Math.max(p.r || 0, q.r || 0),
        y: Math.max(p.y || 0, q.y || 0),
        n: Math.max(p.n || 0, q.n || 0),
        s: Math.max(p.s || 0, q.s || 0),
        dawn: (p.dawn || q.dawn) ? 1 : 0,
        night: (p.night || q.night) ? 1 : 0
      };
    });

    const ids = {};
    Object.keys(x.badges).forEach((i) => { ids[i] = 1; });
    Object.keys(y.badges).forEach((i) => { ids[i] = 1; });
    Object.keys(ids).forEach((id) => {
      const p = x.badges[id], q = y.badges[id];
      out.badges[id] = (!p || (q && q < p)) ? q : p;
    });
    return out;
  };

  /* ================================================================== */
  /* Statistics                                                         */
  /* ================================================================== */

  function streakOf(d, today) {
    const goal = Math.max(1, d.goal);
    const met = (iso) => (d.log[iso] ? d.log[iso].r : 0) >= goal;

    const fromYesterday = !met(today);
    let current = 0;
    let cursor = fromYesterday ? NN.pAddDays(today, -1) : today;
    while (met(cursor)) { current += 1; cursor = NN.pAddDays(cursor, -1); }

    let longest = 0, run = 0;
    Object.keys(d.log).sort().forEach((iso) => {
      if (!met(iso)) return;
      run = met(NN.pAddDays(iso, -1)) ? run + 1 : 1;
      if (run > longest) longest = run;
    });

    return {
      current,
      longest: Math.max(longest, current),
      // Had a streak yesterday but today is not done yet — worth a nudge.
      atRisk: fromYesterday && current > 0
    };
  }

  function sumOf(d, field) {
    let n = 0;
    Object.keys(d.log).forEach((k) => { n += d.log[k][field] || 0; });
    return n;
  }
  function bestDay(d) {
    let n = 0;
    Object.keys(d.log).forEach((k) => { if ((d.log[k].r || 0) > n) n = d.log[k].r; });
    return n;
  }
  function anyFlag(d, flag) {
    return Object.keys(d.log).some((k) => !!d.log[k][flag]);
  }

  /**
   * Everything the Progress panel shows and every badge condition needs.
   * @param {object} d      progress record
   * @param {object} extra  numbers taken from the notes themselves
   */
  NN.progressOverview = function (d, extra) {
    const today = NN.pDay();
    const t = d.log[today] || { r: 0, y: 0, n: 0, s: 0 };
    const goal = Math.max(1, d.goal);
    const days = Object.keys(d.log);
    return {
      day: today,
      goal,
      today: {
        reviews: t.r || 0,
        got: t.y || 0,
        missed: t.n || 0,
        saved: t.s || 0,
        left: Math.max(0, goal - (t.r || 0)),
        ratio: Math.min(1, (t.r || 0) / goal),
        met: (t.r || 0) >= goal
      },
      streak: streakOf(d, today),
      totalReviews: sumOf(d, 'r'),
      totalGot: sumOf(d, 'y'),
      daysMet: days.filter((k) => (d.log[k].r || 0) >= goal).length,
      daysActive: days.filter((k) => (d.log[k].r || 0) > 0).length,
      bestDay: bestDay(d),
      dawn: anyFlag(d, 'dawn'),
      night: anyFlag(d, 'night'),
      badges: d.badges,
      notes: extra || {}
    };
  };

  /** A continuous run of days (blanks included) for the heat calendar. */
  NN.progressSeries = function (d, count) {
    const end = NN.pDay();
    const out = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const iso = NN.pAddDays(end, -i);
      const v = d.log[iso] || {};
      out.push({ day: iso, reviews: v.r || 0 });
    }
    return out;
  };

  /* ================================================================== */
  /* Badges                                                             */
  /* ================================================================== */

  const clamp = (v, target) => Math.max(0, Math.min(1, v / target));

  function milestone(id, glyph, name, desc, target, value) {
    return {
      id, glyph, name, desc, target,
      earned: (v) => value(v) >= target,
      ratio: (v) => clamp(value(v), target),
      value
    };
  }

  /**
   * Badges for a reading notebook.
   *
   * Three kinds on purpose, because they reward three different kinds of effort:
   *   · showing up  — streaks, total reviews
   *   · collecting  — passages saved, passages committed to long-term memory
   *   · curating    — writing your own notes, labelling, keeping the desk clear
   *
   * Someone who only grinds reviews still earns badges, and so does someone who
   * reads slowly but annotates everything. Nobody is left out.
   */
  NN.BADGES = [
    milestone('first-review', 'seedling', 'First step', 'Review your first passage', 1,
      (v) => v.totalReviews),
    milestone('first-goal', 'target', 'On schedule', 'Hit your daily goal for the first time', 1,
      (v) => v.daysMet),

    milestone('streak-3', 'flame', 'Three in a row', 'Keep a 3-day streak', 3, (v) => v.streak.longest),
    milestone('streak-7', 'flame', 'A full week', 'Keep a 7-day streak', 7, (v) => v.streak.longest),
    milestone('streak-30', 'mountain', 'A steady month', 'Keep a 30-day streak', 30, (v) => v.streak.longest),
    milestone('streak-100', 'gem', 'One hundred days', 'Keep a 100-day streak', 100, (v) => v.streak.longest),

    milestone('reviews-100', 'book', '100 reviews', 'Review 100 times', 100, (v) => v.totalReviews),
    milestone('reviews-500', 'books', '500 reviews', 'Review 500 times', 500, (v) => v.totalReviews),
    milestone('reviews-2000', 'brain', '2000 reviews', 'Review 2000 times', 2000, (v) => v.totalReviews),

    milestone('saved-100', 'notebook', 'A hundred passages', 'Save 100 passages', 100,
      (v) => v.notes.total || 0),
    milestone('saved-500', 'notebook', 'A proper library', 'Save 500 passages', 500,
      (v) => v.notes.total || 0),

    milestone('mastered-100', 'seal', 'Sticking', '100 passages at a 14-day interval or longer', 100,
      (v) => v.notes.longTerm || 0),
    milestone('mastered-500', 'trophy', 'Deep shelf', '500 passages at a 14-day interval or longer', 500,
      (v) => v.notes.longTerm || 0),

    milestone('annotated-25', 'quill', 'Annotator', 'Write your own note on 25 passages', 25,
      (v) => v.notes.annotated || 0),
    milestone('annotated-150', 'crown', 'Scholar', 'Write your own note on 150 passages', 150,
      (v) => v.notes.annotated || 0),
    milestone('labels-5', 'tags', 'Well filed', 'Use 5 different labels', 5,
      (v) => v.notes.labels || 0),
    milestone('sources-25', 'compass', 'Wide reader', 'Save from 25 different sites', 25,
      (v) => v.notes.sources || 0),

    milestone('burst', 'bolt', 'Deep session', 'Review 50 passages in a single day', 50, (v) => v.bestDay),
    milestone('active-30', 'calendar', 'Thirty days present', 'Study on 30 different days', 30,
      (v) => v.daysActive),

    {
      id: 'dawn', glyph: 'sunrise', name: 'Early bird', desc: 'Review before 6am', target: 1,
      earned: (v) => v.dawn, ratio: (v) => (v.dawn ? 1 : 0), value: (v) => (v.dawn ? 1 : 0)
    },
    {
      id: 'night', glyph: 'moon', name: 'Night owl', desc: 'Review after 11pm', target: 1,
      earned: (v) => v.night, ratio: (v) => (v.night ? 1 : 0), value: (v) => (v.night ? 1 : 0)
    },
    {
      id: 'inbox-zero', glyph: 'sunrise', name: 'Clear desk',
      desc: 'Nothing due, with at least 20 passages in the schedule', target: 1,
      // "Nothing due" is only an achievement once a schedule of some size is
      // actually running. A fresh install with an empty notebook satisfies it
      // on a technicality — hence the floor of 20.
      earned: (v) => (v.notes.due || 0) === 0 && (v.notes.studying || 0) >= 20,
      ratio: (v) => ((v.notes.due || 0) === 0 ? clamp(v.notes.studying || 0, 20) : 0),
      value: (v) => ((v.notes.due || 0) === 0 ? 1 : 0)
    },
    {
      id: 'over-goal', glyph: 'rocket', name: 'Overachiever',
      desc: 'Review double your daily goal in one day', target: 1,
      earned: (v) => v.bestDay >= v.goal * 2,
      ratio: (v) => clamp(v.bestDay, Math.max(2, v.goal * 2)),
      value: (v) => v.bestDay
    }
  ];

  /** Badges just unlocked, as { id: day }. Never removes an earned badge. */
  NN.newlyEarnedBadges = function (view, have, day) {
    const fresh = {};
    NN.BADGES.forEach((b) => {
      if (have[b.id]) return;
      let ok = false;
      try { ok = !!b.earned(view); } catch (e) { ok = false; }
      if (ok) fresh[b.id] = day;
    });
    return fresh;
  };

  /* ================================================================== */
  /* Badge glyphs                                                       */
  /* ================================================================== */

  /**
   * Drawn by hand in Neuron Note's own line-art style — the same 3px round
   * stroke as the brand mark and the empty state, so a badge looks like it grew
   * here rather than being pasted in from an icon pack.
   */
  const GLYPHS = {
    seedling: '<path d="M32 54 V30"/><path d="M32 34 C22 34 16 28 16 19 C26 19 32 25 32 34Z"/><path d="M32 30 C42 30 48 24 48 15 C38 15 32 21 32 30Z"/>',
    target: '<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="11"/><circle cx="32" cy="32" r="3.4" fill="currentColor" stroke="none"/>',
    // Pointed, notched tip: two plain teardrops nested read as a water drop at
    // 26px, which is the size the badge grid actually uses.
    flame: '<path d="M32 57 C20 57 12 48 12 37 C12 25 23 19 26 5 C31 12 36 16 39 22 C42 19 43 15 43 12 C50 20 52 29 52 37 C52 48 44 57 32 57Z"/><path d="M32 57 C26 57 22 52 22 46 C22 40 29 37 30 29 C36 35 42 40 42 46 C42 52 38 57 32 57Z"/>',
    mountain: '<path d="M6 50 L24 20 L36 38 L43 28 L58 50 Z"/><path d="M24 20 L30 30"/>',
    gem: '<path d="M18 14 H46 L58 28 L32 54 L6 28 Z"/><path d="M6 28 H58"/><path d="M18 14 L24 28 L32 54"/><path d="M46 14 L40 28 L32 54"/>',
    book: '<path d="M12 14 H28 A6 6 0 0 1 32 19 V52 A6 6 0 0 0 28 48 H12 Z"/><path d="M52 14 H36 A6 6 0 0 0 32 19 V52 A6 6 0 0 1 36 48 H52 Z"/>',
    books: '<path d="M12 18 H22 V52 H12 Z"/><path d="M26 14 H36 V52 H26 Z"/><path d="M40 20 L50 18 L54 52 L44 54 Z"/>',
    brain: '<path d="M28 12 C20 12 16 17 16 22 C11 24 10 30 13 34 C10 38 12 45 18 46 C19 51 24 54 30 52 V12Z"/><path d="M36 12 C44 12 48 17 48 22 C53 24 54 30 51 34 C54 38 52 45 46 46 C45 51 40 54 34 52 V12Z"/>',
    notebook: '<path d="M18 10 H50 V54 H18 Z"/><path d="M18 10 A6 6 0 0 0 12 16 V48 A6 6 0 0 1 18 42"/><path d="M28 22 H42"/><path d="M28 32 H42"/>',
    seal: '<circle cx="32" cy="28" r="17"/><path d="M24 28 l6 6 l12 -13"/><path d="M22 43 L18 58 L32 51 L46 58 L42 43"/>',
    trophy: '<path d="M20 10 H44 V26 A12 12 0 0 1 20 26 Z"/><path d="M20 14 H12 V20 A8 8 0 0 0 20 28"/><path d="M44 14 H52 V20 A8 8 0 0 1 44 28"/><path d="M32 38 V46"/><path d="M22 54 H42"/><path d="M26 46 H38 L42 54 H22 Z"/>',
    quill: '<path d="M14 52 C14 32 30 12 52 10 C50 32 34 46 18 48"/><path d="M14 52 L28 38"/>',
    crown: '<path d="M10 44 L14 18 L24 30 L32 14 L40 30 L50 18 L54 44 Z"/><path d="M10 44 H54"/>',
    tags: '<path d="M8 30 V12 H26 L48 34 L30 52 Z"/><path d="M17 21 h.02"/><path d="M30 12 H38 L58 32 L44 46"/>',
    compass: '<circle cx="32" cy="32" r="22"/><path d="M42 22 L36 36 L22 42 L28 28 Z"/>',
    bolt: '<path d="M36 6 L14 36 H30 L28 58 L50 28 H34 Z"/>',
    calendar: '<rect x="10" y="14" width="44" height="40" rx="5"/><path d="M10 26 H54"/><path d="M22 8 V18"/><path d="M42 8 V18"/><path d="M24 40 l5 5 l11 -12"/>',
    sunrise: '<path d="M6 48 H58"/><path d="M14 38 A18 18 0 0 1 50 38"/><path d="M32 8 V16"/><path d="M12 18 L17 23"/><path d="M52 18 L47 23"/>',
    moon: '<path d="M46 38 A20 20 0 1 1 26 12 A16 16 0 0 0 46 38Z"/>',
    rocket: '<path d="M32 6 C42 16 46 28 46 40 L38 48 H26 L18 40 C18 28 22 16 32 6Z"/><circle cx="32" cy="26" r="5"/><path d="M26 48 L22 58 L32 52 L42 58 L38 48"/>'
  };

  function glyphSvg(name, size) {
    const d = GLYPHS[name] || GLYPHS.seal;
    return '<svg class="pg-glyph" viewBox="0 0 64 64" width="' + size + '" height="' + size +
      '" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + d + '</g></svg>';
  }
  NN.badgeGlyph = glyphSvg;

  /* ================================================================== */
  /* Rendering                                                          */
  /* ================================================================== */

  function elm(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * Render the whole Progress panel into a container.
   * @param {HTMLElement} host
   * @param {{get:Function, save:Function, stats:Function}} io
   */
  NN.renderProgress = function (host, io) {
    return Promise.all([io.get(), io.stats()]).then((r) => {
      const data = NN.normalizeProgress(r[0]);
      const view = NN.progressOverview(data, r[1]);
      host.textContent = '';
      host.appendChild(cardToday(view));
      host.appendChild(cardNumbers(view));
      host.appendChild(cardHeat(data, view));
      host.appendChild(cardBadges(view));
      host.appendChild(cardGoal(view, io, () => NN.renderProgress(host, io)));
      return view;
    });
  };

  function cardToday(view) {
    const card = elm('div', 'pg-card');

    const row = elm('div', 'pg-today');
    const ring = elm('div', 'pg-ring' + (view.today.met ? ' met' : ''));
    ring.style.setProperty('--p', String(Math.round(view.today.ratio * 100)));
    const val = elm('div', 'pg-ring-val');
    val.appendChild(elm('b', null, String(view.today.reviews)));
    val.appendChild(elm('span', null, 'of ' + view.goal));
    ring.appendChild(val);
    row.appendChild(ring);

    const side = elm('div', 'pg-today-side');
    side.appendChild(elm('p', 'pg-lead', view.today.met
      ? 'Today’s goal is done'
      : view.today.left + ' more review' + (view.today.left === 1 ? '' : 's') + ' to go'));
    side.appendChild(elm('p', 'pg-sub', view.today.met
      ? 'Anything beyond this is a bonus — the streak is already counted.'
      : 'Every card you grade in Study counts towards this.'));

    const bar = elm('div', 'pg-bar' + (view.today.met ? ' met' : ''));
    const fill = elm('i');
    fill.style.width = Math.round(view.today.ratio * 100) + '%';
    bar.appendChild(fill);
    side.appendChild(bar);

    const bits = elm('p', 'pg-bits');
    bits.textContent = view.today.got + ' got it · ' + view.today.missed + ' to revisit'
      + (view.today.saved ? ' · ' + view.today.saved + ' newly saved' : '');
    side.appendChild(bits);

    row.appendChild(side);
    card.appendChild(row);
    return card;
  }

  function cardNumbers(view) {
    const card = elm('div', 'pg-card');
    const grid = elm('div', 'pg-stats');
    const cell = (label, value, mod) => {
      const c = elm('div', 'pg-stat' + (mod ? ' ' + mod : ''));
      c.appendChild(elm('span', 'k', label));
      c.appendChild(elm('span', 'v', String(value)));
      grid.appendChild(c);
    };
    cell('Current streak', view.streak.current, 'hot');
    cell('Longest streak', view.streak.longest);
    cell('Reviews all time', view.totalReviews);
    cell('Days studied', view.daysActive);
    card.appendChild(grid);

    if (view.streak.atRisk) {
      card.appendChild(elm('p', 'pg-warn',
        'Your ' + view.streak.current + '-day streak is still open — ' + view.goal
        + ' reviews today keeps it alive.'));
    }
    return card;
  }

  function cardHeat(data, view) {
    const card = elm('div', 'pg-card');
    card.appendChild(elm('h3', 'pg-h', 'Last 17 weeks'));

    const days = NN.progressSeries(data, 17 * 7);
    // Offset so the first cell lands on a Monday and every column is one week.
    const first = days[0];
    const offset = first ? (new Date(first.day + 'T00:00:00').getDay() + 6) % 7 : 0;

    const wrap = elm('div', 'pg-heat');
    let col = elm('div', 'pg-week');
    for (let i = 0; i < offset; i += 1) {
      const blank = elm('i');
      blank.style.visibility = 'hidden';
      col.appendChild(blank);
    }
    let inCol = offset;

    days.forEach((d) => {
      if (inCol === 7) { wrap.appendChild(col); col = elm('div', 'pg-week'); inCol = 0; }
      const cell = elm('i');
      const lv = d.reviews === 0 ? 0
        : d.reviews >= view.goal * 0.6 ? 3
        : d.reviews >= view.goal * 0.3 ? 2 : 1;
      cell.dataset.lv = String(lv);
      if (d.reviews >= view.goal) cell.dataset.met = '1';
      cell.title = prettyDay(d.day) + ' — ' + d.reviews + ' review' + (d.reviews === 1 ? '' : 's');
      col.appendChild(cell);
      inCol += 1;
    });
    wrap.appendChild(col);
    card.appendChild(wrap);

    const key = elm('div', 'pg-key');
    key.appendChild(elm('span', null, 'Fewer'));
    [0, 1, 2, 3].forEach((lv) => {
      const c = elm('i');
      c.dataset.lv = String(lv);
      key.appendChild(c);
    });
    key.appendChild(elm('span', null, 'More'));
    const met = elm('i');
    met.dataset.met = '1';
    met.style.marginLeft = '8px';
    key.appendChild(met);
    key.appendChild(elm('span', null, 'goal met'));
    card.appendChild(key);
    return card;
  }

  function cardBadges(view) {
    const card = elm('div', 'pg-card');
    const have = Object.keys(view.badges).length;
    card.appendChild(elm('h3', 'pg-h', 'Badges ' + have + '/' + NN.BADGES.length));

    // Earned first (oldest first), then the locked ones nearest to unlocking.
    const list = NN.BADGES.slice().sort((a, b) => {
      const ea = view.badges[a.id] ? 1 : 0;
      const eb = view.badges[b.id] ? 1 : 0;
      if (ea !== eb) return eb - ea;
      if (ea) return view.badges[a.id] < view.badges[b.id] ? -1 : 1;
      let ra = 0, rb = 0;
      try { ra = a.ratio(view); } catch (e) { /* a badge that throws just sorts last */ }
      try { rb = b.ratio(view); } catch (e) { /* same */ }
      return rb - ra;
    });

    const grid = elm('div', 'pg-badges');
    list.forEach((b) => {
      const when = view.badges[b.id];
      const cell = elm('div', 'pg-badge' + (when ? ' earned' : ''));
      const sym = elm('div', 'pg-sym');
      sym.innerHTML = glyphSvg(b.glyph, 26);
      cell.appendChild(sym);
      cell.appendChild(elm('div', 'pg-name', b.name));
      cell.appendChild(elm('div', 'pg-desc', b.desc));
      if (when) {
        cell.appendChild(elm('div', 'pg-when', prettyDay(when)));
      } else {
        let ratio = 0, value = 0;
        try { ratio = b.ratio(view); value = b.value(view); } catch (e) { /* leave at zero */ }
        const track = elm('div', 'pg-prog');
        const fill = elm('i');
        fill.style.width = Math.round(ratio * 100) + '%';
        track.appendChild(fill);
        cell.appendChild(track);
        if (b.target > 1) cell.appendChild(elm('div', 'pg-desc', value + ' / ' + b.target));
      }
      grid.appendChild(cell);
    });
    card.appendChild(grid);
    return card;
  }

  function cardGoal(view, io, redraw) {
    const card = elm('div', 'pg-card');
    card.appendChild(elm('h3', 'pg-h', 'Daily goal'));
    card.appendChild(elm('p', 'pg-sub',
      'Reach this many reviews and the day counts towards your streak. '
      + 'Pick something you can hit on a bad day — a long streak beats a big number.'));

    const row = elm('div', 'pg-goal');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '500';
    input.value = String(view.goal);
    row.appendChild(input);

    const set = (n) => io.save((d) => {
      const next = NN.normalizeProgress(d);
      next.goal = Math.max(1, Math.min(500, Math.round(n) || DEFAULT_GOAL));
      next.goalAt = Date.now();
      return next;
    }).then(redraw);

    const save = elm('button', 'btn sm', 'Save');
    save.type = 'button';
    save.addEventListener('click', () => set(parseInt(input.value, 10)));
    row.appendChild(save);

    [5, 10, 15, 25].forEach((n) => {
      const chip = elm('button', 'pg-chip' + (view.goal === n ? ' on' : ''), String(n));
      chip.type = 'button';
      chip.addEventListener('click', () => set(n));
      row.appendChild(chip);
    });
    card.appendChild(row);
    return card;
  }

  /* ================================================================== */
  /* Celebration                                                        */
  /* ================================================================== */

  const CONFETTI = ['#FFD75E', '#007D7A', '#B7EBD8', '#BFDDFA', '#FBC9D2', '#DCD1FA'];

  /**
   * Pop the congratulations card. Locked badges are announced nowhere else, so
   * this is the first time you see one — which is the whole point.
   */
  NN.celebrateBadges = function (ids, done) {
    const list = (ids || [])
      .map((id) => NN.BADGES.filter((b) => b.id === id)[0])
      .filter(Boolean);
    if (!list.length) { if (done) done(); return; }

    let host = document.getElementById('pgCelebrate');
    if (!host) {
      host = elm('div', 'pg-celebrate');
      host.id = 'pgCelebrate';
      document.body.appendChild(host);
    }
    host.textContent = '';

    const card = elm('div', 'pg-cel-card');

    const confetti = elm('div', 'pg-confetti');
    for (let i = 0; i < 24; i += 1) {
      const bit = elm('i');
      bit.style.left = ((i * 4.1) % 100) + '%';
      bit.style.background = CONFETTI[i % CONFETTI.length];
      bit.style.animationDelay = ((i % 8) * 0.17) + 's';
      bit.style.animationDuration = (2.1 + (i % 5) * 0.3) + 's';
      confetti.appendChild(bit);
    }
    card.appendChild(confetti);

    card.appendChild(elm('p', 'pg-cel-kicker',
      list.length > 1 ? list.length + ' badges unlocked' : 'Badge unlocked'));

    const grid = elm('div', 'pg-cel-list' + (list.length > 1 ? ' many' : ''));
    list.forEach((b, i) => {
      const one = elm('div', 'pg-cel-badge');
      one.style.animationDelay = (i * 0.13) + 's';
      const sym = elm('div', 'pg-cel-sym');
      sym.innerHTML = glyphSvg(b.glyph, list.length > 1 ? 30 : 42);
      one.appendChild(sym);
      one.appendChild(elm('div', 'pg-cel-name', b.name));
      one.appendChild(elm('div', 'pg-cel-desc', b.desc));
      grid.appendChild(one);
    });
    card.appendChild(grid);

    const ok = elm('button', 'btn', 'Keep going');
    ok.type = 'button';
    card.appendChild(ok);

    const close = () => {
      host.hidden = true;
      document.removeEventListener('keydown', onKey);
      if (done) done();
    };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
    ok.addEventListener('click', close);
    host.addEventListener('click', (e) => { if (e.target === host) close(); });
    document.addEventListener('keydown', onKey);

    host.appendChild(card);
    host.hidden = false;
  };

})(typeof window !== 'undefined' ? window : self);
