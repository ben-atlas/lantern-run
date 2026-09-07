/**
 * LANTERN RUN — HUD, menus, and input.
 *
 * createHud(handlers) -> { show(screen), set(fields), input, resize, dispose }
 *   handlers: { onStart(), onRestart() }
 *   screen:   'menu' | 'play' | 'won' | 'lost'
 *   input:    a LIVE object { steer, run, jump, slide } mutated by keyboard and touch.
 *
 * ------------------------------------------------------------------------------------------
 * EDGE TRIGGER CONVENTION for `jump` and `slide` — read this before changing anything.
 *
 * They are LATCHES with a read-marked, next-frame release. Concretely:
 *
 *   - a key press / button tap / swipe sets the latch;
 *   - `input.jump` is a getter. While latched it returns `true` and records the frame it was
 *     first read on. It therefore reads `true` as many times as you like WITHIN one frame,
 *     which matters because player.js may well test it twice in one update;
 *   - the HUD's own rAF, which is registered before main.js's loop and so always runs first in
 *     a frame, clears any latch that was read on an EARLIER frame.
 *
 * The net effect is exactly one frame of `true` per press, and it is guaranteed to be seen:
 * a plain "set true, clear at end of frame" pulse can be set and cleared between two of
 * main.js's reads and lose the input entirely, which is the classic dropped-jump bug.
 * A latch that is never read (game paused, menu up) is dropped after LATCH_TTL ms so it does
 * not fire the moment play resumes.
 * ------------------------------------------------------------------------------------------
 */

const LATCH_TTL = 400;      // ms an unread latch survives
const DEAD = 12;            // px of stick travel that is not steering
const FULL = 62;            // px of stick travel that is full lock
const SPRINT_UP = 30;       // px of upward stick travel that means sprint
const SWIPE_DOWN = 34;      // px of downward travel that means slide
const TAP_MS = 240;         // a press shorter than this, that did not move, is a vault
const TAP_PX = 22;
const HOLD_MS = 150;        // a press held longer than this is a sprint

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createHud(handlers = {}) {
  const $ = (id) => document.getElementById(id);

  const el = {
    load: $('load'), hud: $('hud'), touch: $('touch'), danger: $('danger'),
    menu: $('menu'), won: $('won'), lost: $('lost'),
    startb: $('startb'), wonb: $('wonb'), lostb: $('lostb'),
    progfill: $('progfill'), distn: $('distn'), distl: $('distl'),
    scoren: $('scoren'),
    gap: $('gap'), gapfill: $('gapfill'), gapnum: $('gapnum'),
    wonscore: $('wonscore'), wondist: $('wondist'),
    lostscore: $('lostscore'), lostdist: $('lostdist'),
    toast: $('toast'), menukeys: $('menukeys'),
    stick: $('stick'), stickbase: $('stickbase'), sticknub: $('sticknub'),
    act: $('act'), bjump: $('bjump'), bslide: $('bslide'), acthint: $('acthint'),
  };

  const off = [];                                     // teardown list
  const on = (t, ev, fn, opt) => { if (t) { t.addEventListener(ev, fn, opt); off.push([t, ev, fn, opt]); } };

  // ------------------------------------------------------------------ input state
  let frameId = 0;
  const key = { left: false, right: false, sprint: false };
  const pad = { steer: 0, run: false };               // what touch is asking for

  let jumpAt = 0, jumpRead = 0;                       // 0 = not latched
  let slideAt = 0, slideRead = 0;

  const latchJump = () => { if (!jumpAt) { jumpAt = performance.now(); jumpRead = 0; } };
  const latchSlide = () => { if (!slideAt) { slideAt = performance.now(); slideRead = 0; } };

  const input = {
    steer: 0,
    run: false,
    get jump() { if (!jumpAt) return false; if (!jumpRead) jumpRead = frameId || 1; return true; },
    get slide() { if (!slideAt) return false; if (!slideRead) slideRead = frameId || 1; return true; },
    // let anything that wants to force one do so through the same latch
    set jump(v) { if (v) latchJump(); else { jumpAt = 0; jumpRead = 0; } },
    set slide(v) { if (v) latchSlide(); else { slideAt = 0; slideRead = 0; } },
  };

  // ------------------------------------------------------------------ keyboard
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint', ArrowUp: 'sprint', KeyW: 'sprint',
  };
  const JUMPK = { Space: 1 };
  const SLIDEK = { ControlLeft: 1, ControlRight: 1, ArrowDown: 1, KeyS: 1 };

  function onKeyDown(e) {
    if (e.repeat) {
      if (KEYS[e.code]) e.preventDefault();
      return;                                          // auto-repeat must not re-latch
    }
    if (KEYS[e.code]) { key[KEYS[e.code]] = true; e.preventDefault(); return; }
    if (JUMPK[e.code]) { latchJump(); e.preventDefault(); return; }
    if (SLIDEK[e.code]) { latchSlide(); e.preventDefault(); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && screen !== 'play') {
      e.preventDefault();
      if (screen === 'menu') fireStart(); else fireRestart();
    }
  }
  function onKeyUp(e) { if (KEYS[e.code]) { key[KEYS[e.code]] = false; e.preventDefault(); } }
  function blur() { key.left = key.right = key.sprint = false; pad.steer = 0; pad.run = false; }

  on(window, 'keydown', onKeyDown, { passive: false });
  on(window, 'keyup', onKeyUp, { passive: false });
  on(window, 'blur', blur);

  // ------------------------------------------------------------------ start / restart
  // Bound to a REAL click AND a REAL touchstart. gates.md records a build that shipped
  // unstartable on every phone for a fortnight because every check called __START__() directly;
  // touchstart with preventDefault() is what makes the first tap count, and preventing the
  // default also suppresses the synthetic click so the handler cannot fire twice.
  let armed = true;
  function fireStart() {
    if (!armed) return; armed = false; setTimeout(() => { armed = true; }, 500);
    try { handlers.onStart && handlers.onStart(); } catch (e) { console.error('[hud] onStart', e); }
  }
  function fireRestart() {
    if (!armed) return; armed = false; setTimeout(() => { armed = true; }, 500);
    try { handlers.onRestart && handlers.onRestart(); } catch (e) { console.error('[hud] onRestart', e); }
  }
  function bindPress(node, fn) {
    if (!node) return;
    on(node, 'click', (e) => { e.preventDefault(); fn(); });
    on(node, 'touchstart', (e) => { e.preventDefault(); node.classList.add('dn'); fn(); }, { passive: false });
    on(node, 'touchend', () => node.classList.remove('dn'), { passive: true });
    on(node, 'touchcancel', () => node.classList.remove('dn'), { passive: true });
  }
  bindPress(el.startb, fireStart);
  bindPress(el.wonb, fireRestart);
  bindPress(el.lostb, fireRestart);

  // ------------------------------------------------------------------ touch, or its absence
  // A hidden touch control on a laptop is worse than none: a check holds it, nothing moves, and
  // the game gets the blame. So on a fine pointer the whole block leaves the DOM.
  const coarse = () => (navigator.maxTouchPoints > 0) ||
    (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  let touchHome = null;
  function syncTouchPresence() {
    if (!el.touch) return;
    if (coarse()) {
      if (!el.touch.isConnected && touchHome) touchHome.appendChild(el.touch);
    } else if (el.touch.isConnected) {
      touchHome = el.touch.parentNode;
      el.touch.remove();
    }
  }
  touchHome = el.touch ? el.touch.parentNode : null;
  syncTouchPresence();
  if (window.matchMedia) {
    const mq = matchMedia('(pointer: coarse)');
    const h = () => syncTouchPresence();
    if (mq.addEventListener) { mq.addEventListener('change', h); off.push([mq, 'change', h, undefined]); }
  }

  // --- stick: reads the vector FROM WHERE THE FINGER LANDED. Pressing its centre and holding
  //     still is deliberately not input.
  let stickId = null, sx0 = 0, sy0 = 0, stickSlid = false;
  function stickStart(t) {
    stickId = t.identifier; sx0 = t.clientX; sy0 = t.clientY; stickSlid = false;
    const r = el.stick.getBoundingClientRect();
    el.stickbase.style.left = el.sticknub.style.left = (sx0 - r.left) + 'px';
    el.stickbase.style.top = el.sticknub.style.top = (sy0 - r.top) + 'px';
    el.stick.classList.add('live');
  }
  function stickMove(t) {
    const dx = t.clientX - sx0, dy = t.clientY - sy0;
    const mag = Math.abs(dx);
    pad.steer = mag <= DEAD ? 0 : clamp(Math.sign(dx) * ((mag - DEAD) / (FULL - DEAD)), -1, 1);
    pad.run = dy < -SPRINT_UP;
    if (dy > SWIPE_DOWN && !stickSlid) { stickSlid = true; latchSlide(); }
    if (dy < 0) stickSlid = false;
    const r = el.stick.getBoundingClientRect();
    el.sticknub.style.left = (sx0 - r.left + clamp(dx, -FULL, FULL)) + 'px';
    el.sticknub.style.top = (sy0 - r.top + clamp(dy, -FULL, FULL)) + 'px';
  }
  function stickEnd() {
    stickId = null; pad.steer = 0; pad.run = false;
    el.stick.classList.remove('live');
  }

  // --- action side: tap = vault, drag down = slide, hold = sprint.
  let actId = null, ax0 = 0, ay0 = 0, actT0 = 0, actMoved = 0, actSlid = false, actSprint = false;
  function actStart(t) {
    actId = t.identifier; ax0 = t.clientX; ay0 = t.clientY;
    actT0 = performance.now(); actMoved = 0; actSlid = false; actSprint = false;
  }
  function actMove(t) {
    const dx = t.clientX - ax0, dy = t.clientY - ay0;
    actMoved = Math.max(actMoved, Math.hypot(dx, dy));
    if (dy > SWIPE_DOWN && !actSlid) { actSlid = true; latchSlide(); }
    if (dy < -SWIPE_DOWN && !actSlid) { actSlid = true; latchJump(); }   // flick up also vaults
  }
  function actEnd() {
    const held = performance.now() - actT0;
    if (!actSlid && held < TAP_MS && actMoved < TAP_PX) latchJump();
    actId = null; actSprint = false;
    if (el.acthint) el.acthint.classList.remove('on');
  }

  const isBtn = (t) => {
    const n = document.elementFromPoint(t.clientX, t.clientY);
    return !!(n && n.closest && n.closest('.tbtn'));
  };

  function onTouchStart(e) {
    if (screen !== 'play') return;
    for (const t of e.changedTouches) {
      if (isBtn(t)) continue;                                  // the round buttons own their taps
      const left = t.clientX < innerWidth * 0.5;
      if (left && stickId === null) { stickStart(t); e.preventDefault(); }
      else if (!left && actId === null) { actStart(t); e.preventDefault(); }
    }
  }
  function onTouchMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickMove(t); e.preventDefault(); }
      else if (t.identifier === actId) { actMove(t); e.preventDefault(); }
    }
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickEnd(); }
      else if (t.identifier === actId) { actEnd(); }
    }
  }
  on(window, 'touchstart', onTouchStart, { passive: false });
  on(window, 'touchmove', onTouchMove, { passive: false });
  on(window, 'touchend', onTouchEnd, { passive: false });
  on(window, 'touchcancel', onTouchEnd, { passive: false });
  on(window, 'contextmenu', (e) => { if (screen === 'play') e.preventDefault(); });

  function bindTouchButton(node, fn) {
    if (!node) return;
    on(node, 'touchstart', (e) => { e.preventDefault(); e.stopPropagation(); node.classList.add('dn'); fn(); }, { passive: false });
    on(node, 'touchend', (e) => { e.preventDefault(); node.classList.remove('dn'); }, { passive: false });
    on(node, 'touchcancel', () => node.classList.remove('dn'), { passive: true });
    on(node, 'mousedown', (e) => { e.preventDefault(); node.classList.add('dn'); fn(); });
    on(node, 'mouseup', () => node.classList.remove('dn'));
  }
  bindTouchButton(el.bjump, latchJump);
  bindTouchButton(el.bslide, latchSlide);

  // ------------------------------------------------------------------ screens
  let screen = 'load';
  const SCREENS = { menu: el.menu, won: el.won, lost: el.lost };

  function show(name) {
    screen = name;
    // main.js never hides the loading screen itself; the first show() is what lifts it.
    // pointer-events go off in the SAME tick as the fade starts. They used not to, and for the
    // 360 ms of the fade a full-screen, invisible, z-index-60 overlay sat on top of the start
    // button and swallowed the press. The repo's own harness/live.mjs found it: it presses as
    // soon as __READY__ goes true, which is exactly inside that window, and reported a game that
    // would not start from either a real click or a real touch.
    if (el.load && el.load.style.display !== 'none') {
      el.load.style.pointerEvents = 'none';
      el.load.style.opacity = '0';
      el.load.style.transition = 'opacity .35s';
      setTimeout(() => { if (el.load) el.load.style.display = 'none'; }, 360);
    }
    for (const k in SCREENS) if (SCREENS[k]) SCREENS[k].classList.toggle('on', k === name);
    if (el.hud) el.hud.classList.toggle('on', name === 'play');
    if (el.touch) el.touch.classList.toggle('on', name === 'play');
    if (name !== 'play') {
      blur(); stickEnd(); actId = null;
      if (el.danger) { el.danger.style.opacity = '0'; el.danger.classList.remove('beat'); }
    }
    if (name === 'won' || name === 'lost') {
      const b = name === 'won' ? el.wonb : el.lostb;
      if (b) setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (_) {} }, 30);
    }
  }

  // ------------------------------------------------------------------ readouts
  // Cached so the HUD does not write to the DOM sixty times a second for numbers that did not
  // change; a HUD that reflows every frame costs more than the scene it sits on.
  const last = { score: -1, dist: -1, len: -1, gapN: -1, gapPct: -1, close: -1, prog: -1 };

  function set(f) {
    if (!f) return;
    if (f.length != null && f.length !== last.len) {
      last.len = f.length;
      if (el.distl) el.distl.textContent = Math.round(f.length);
    }
    if (f.score != null) {
      const s = Math.max(0, Math.round(f.score));
      if (s !== last.score) {
        last.score = s;
        if (el.scoren) el.scoren.textContent = s;
        if (el.wonscore) el.wonscore.textContent = s;
        if (el.lostscore) el.lostscore.textContent = s;
      }
    }
    if (f.distance != null) {
      const d = Math.max(0, Math.round(f.distance));
      if (d !== last.dist) {
        last.dist = d;
        if (el.distn) el.distn.textContent = d;
        if (el.wondist) el.wondist.textContent = d;
        if (el.lostdist) el.lostdist.textContent = d;
      }
      const len = last.len > 0 ? last.len : 1100;
      const p = Math.round(clamp(f.distance / len, 0, 1) * 1000) / 10;
      if (p !== last.prog) { last.prog = p; if (el.progfill) el.progfill.style.width = p + '%'; }
    }
    if (f.gap != null) setGap(f.gap);
  }

  // The gap is the whole tension of the game, so it is drawn twice: a bar at the right edge you
  // can read with the corner of your eye, and the frame itself reddening and beating faster as
  // they close. Neither asks you to look away from the lane.
  function setGap(gap) {
    const g = Math.max(0, gap);
    const n = Math.round(g);
    if (n !== last.gapN) {
      last.gapN = n;
      if (el.gapnum) el.gapnum.textContent = n <= 0 ? '0' : n;
    }
    // closeness: 0 at 26 m and beyond, 1 at contact. Non-linear so the last few metres move it
    // a long way, which is where the tension actually lives.
    const raw = clamp(1 - g / 26, 0, 1);
    const close = raw * raw * (3 - 2 * raw);
    const pct = Math.round(close * 100);
    if (pct !== last.gapPct) {
      last.gapPct = pct;
      if (el.gapfill) el.gapfill.style.height = pct + '%';
    }
    const band = close > 0.62 ? 2 : close > 0.34 ? 1 : 0;
    if (band !== last.close) {
      last.close = band;
      if (el.gap) el.gap.classList.toggle('close', band >= 1);
      if (el.gapnum) el.gapnum.classList.toggle('hot', band >= 2);
      if (el.gapfill) el.gapfill.classList.toggle('hot', band >= 2);
      if (el.danger) el.danger.classList.toggle('beat', band >= 1);
    }
    // beat period: a lazy 0.9 s at arm's length down to 0.22 s on your heels.
    const beat = (0.9 - 0.68 * close).toFixed(2) + 's';
    if (el.gap) el.gap.style.setProperty('--beat', beat);
    if (el.danger) {
      el.danger.style.setProperty('--beat', beat);
      el.danger.style.opacity = close < 0.22 ? '0' : (close * 0.9).toFixed(2);
    }
  }

  let toastT = 0;
  function toast(text, ms = 900) {
    if (!el.toast) return;
    el.toast.textContent = text; el.toast.style.opacity = '1';
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.toast.style.opacity = '0'; }, ms);
  }

  // ------------------------------------------------------------------ per-frame
  // Registered here, before main.js registers its loop, so this runs FIRST every frame. The
  // latch release above depends on that ordering.
  let raf = 0;
  function tick() {
    frameId++;
    const now = performance.now();
    if (jumpAt && ((jumpRead && jumpRead !== frameId) || now - jumpAt > LATCH_TTL)) { jumpAt = 0; jumpRead = 0; }
    if (slideAt && ((slideRead && slideRead !== frameId) || now - slideAt > LATCH_TTL)) { slideAt = 0; slideRead = 0; }

    const k = (key.right ? 1 : 0) - (key.left ? 1 : 0);
    input.steer = clamp(k !== 0 ? k : pad.steer, -1, 1);
    input.run = key.sprint || pad.run || actSprint;

    if (actId !== null && !actSprint && now - actT0 > HOLD_MS && actMoved < TAP_PX) {
      actSprint = true;
      if (el.acthint) el.acthint.classList.add('on');
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // ------------------------------------------------------------------ resize
  function resize() {
    syncTouchPresence();
    if (stickId !== null) stickEnd();
  }

  function dispose() {
    cancelAnimationFrame(raf);
    clearTimeout(toastT);
    for (const [t, ev, fn, opt] of off) { try { t.removeEventListener(ev, fn, opt); } catch (_) {} }
    off.length = 0;
  }

  // keyboard legend on the menu, only where there is a keyboard
  if (el.menukeys) {
    el.menukeys.innerHTML = coarse()
      ? 'DRAG LEFT PAD TO STEER &nbsp;·&nbsp; TAP RIGHT TO VAULT &nbsp;·&nbsp; SWIPE DOWN TO SLIDE &nbsp;·&nbsp; HOLD TO SPRINT'
      : '<u>&larr;</u> <u>&rarr;</u> STEER &nbsp; <u>SPACE</u> VAULT &nbsp; <u>CTRL</u> SLIDE &nbsp; <u>&uarr;</u>/<u>SHIFT</u> SPRINT';
  }

  return { show, set, input, resize, dispose, toast };
}
