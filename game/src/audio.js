/**
 * LANTERN RUN — sound.
 *
 * createAudio() -> { unlock(), play(name, opts), music(on), duck(x) }
 *
 * WebAudio directly: each file is fetched once, decoded once into an AudioBuffer, and played
 * through a ring of pre-built GainNodes. An HTMLAudioElement pool would allocate an element and
 * a decode per voice and stutter the first time a footfall lands on a frame that is already busy.
 *
 * Buses:   voice ──▶ sfx  ─┐
 *          crowd/sizzle ──▶ bed ──▶ lowpass ─┤
 *          music ──────────────────▶ music ──┼──▶ comp ──▶ master ──▶ out
 *
 * A file that fails to decode is logged loudly, once, and then plays as silence. It never throws
 * into the frame loop; gates.md's "a warning is not a gate" cuts the other way here, an audio
 * file is not worth killing a game over, but it must be shouted about in the console.
 */

const DIR = './audio/';                     // relative. never '/audio/'.

// Everything except music is fetched at construction: ~528 KB all in, and none of it is awaited,
// so the loading bar never waits on it. music.mp3 is the one big file (1.29 MB at the time of
// writing, and it has already been regenerated once mid-jam, so do not trust that number) and it
// is fetched from unlock() — after the player has pressed RUN and the game is already playable.
const EAGER = ['bell', 'caught', 'crash_crate', 'crash_glass', 'crowd', 'footfall',
               'gong', 'pickup', 'scrape', 'shout', 'sizzle', 'whoosh'];
const LAZY = ['music'];

const VOICES = 20;                          // concurrent one-shots
const MIN_GAP = {                           // ms between two plays of the same name
  footfall: 55, scrape: 90, whoosh: 90, pickup: 40, _default: 25,
};
const BASE_VOL = {                          // per-sound trim, so main.js does not have to care
  footfall: 0.5, whoosh: 0.7, scrape: 0.75, pickup: 0.9, bell: 0.95, gong: 1.0,
  caught: 1.0, shout: 0.65, crash_crate: 0.85, crash_glass: 0.8, _default: 0.8,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    console.error('[audio] no WebAudio in this browser: the game runs silent');
    return { unlock() {}, play() {}, music() {}, duck() {} };
  }

  // Constructing the context is allowed before a gesture; it simply starts suspended.
  let ctx;
  try { ctx = new AC({ latencyHint: 'interactive' }); }
  catch (e) {
    console.error('[audio] could not create an AudioContext, the game runs silent', e);
    return { unlock() {}, play() {}, music() {}, duck() {} };
  }

  // ---------------------------------------------------------------- graph
  const master = ctx.createGain(); master.gain.value = 0.0;         // faded up on unlock
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 3.2;
  comp.attack.value = 0.004; comp.release.value = 0.22;
  comp.connect(master); master.connect(ctx.destination);

  const sfxBus = ctx.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(comp);

  const bedLP = ctx.createBiquadFilter(); bedLP.type = 'lowpass';
  bedLP.frequency.value = 14000; bedLP.Q.value = 0.6; bedLP.connect(comp);
  const bedBus = ctx.createGain(); bedBus.gain.value = 0.0; bedBus.connect(bedLP);

  const musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(comp);

  // ---------------------------------------------------------------- buffers
  const buf = Object.create(null);           // name -> AudioBuffer
  const dead = Object.create(null);          // name -> true, once it has failed and been shouted about
  const pending = Object.create(null);       // name -> Promise

  function load(name) {
    if (buf[name] || dead[name] || pending[name]) return pending[name] || Promise.resolve();
    const url = DIR + name + '.mp3';
    pending[name] = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return r.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab))
      .then((b) => { buf[name] = b; onLoaded(name); })
      .catch((e) => {
        dead[name] = true;
        console.error('[audio] FAILED to load ' + url + ' — that sound will be silent for the ' +
                      'whole run. Everything else carries on.', e);
      })
      .finally(() => { delete pending[name]; });
    return pending[name];
  }

  for (const n of EAGER) load(n);

  // ---------------------------------------------------------------- voice ring
  // Pre-built gains, reused forever. play() allocates exactly one AudioBufferSourceNode, which
  // the spec requires to be single-use; nothing else per call, no closure, no options object.
  const ring = new Array(VOICES);
  for (let i = 0; i < VOICES; i++) {
    const g = ctx.createGain(); g.gain.value = 1; g.connect(sfxBus);
    ring[i] = { g, src: null };
  }
  let ringI = 0;
  const lastAt = Object.create(null);

  function play(name, opts) {
    const b = buf[name];
    if (!b) { if (!dead[name]) load(name); return; }
    if (ctx.state !== 'running') return;

    const now = performance.now();
    const gapMs = MIN_GAP[name] || MIN_GAP._default;
    if (now - (lastAt[name] || -1e9) < gapMs) return;
    lastAt[name] = now;

    const slot = ring[ringI]; ringI = ringI + 1 === VOICES ? 0 : ringI + 1;
    if (slot.src) { try { slot.src.stop(); } catch (_) {} try { slot.src.disconnect(); } catch (_) {} slot.src = null; }

    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = opts && opts.rate ? clamp(opts.rate, 0.25, 4) : 1;
    slot.g.gain.value = (BASE_VOL[name] || BASE_VOL._default) * (opts && opts.vol != null ? opts.vol : 1);
    src.connect(slot.g);
    src.start();
    slot.src = src;
  }

  // ---------------------------------------------------------------- bed + music
  const bedNames = ['crowd', 'sizzle'];
  const bedSrc = Object.create(null);
  const BED_TRIM = { crowd: 1.0, sizzle: 0.55 };

  function startBed(name) {
    if (bedSrc[name] || !buf[name] || ctx.state !== 'running') return;
    const g = ctx.createGain(); g.gain.value = BED_TRIM[name] || 1; g.connect(bedBus);
    const s = ctx.createBufferSource();
    s.buffer = buf[name]; s.loop = true;
    // sizzle offset so the two loops do not phase together into an obvious cycle
    s.connect(g);
    s.start(0, name === 'sizzle' ? Math.random() * buf[name].duration : 0);
    bedSrc[name] = s;
  }

  let musicSrc = null, musicWanted = false;
  function startMusic() {
    if (musicSrc || !musicWanted || !buf.music || ctx.state !== 'running') return;
    const s = ctx.createBufferSource();
    s.buffer = buf.music; s.loop = true;
    s.connect(musicBus); s.start();
    musicSrc = s;
    ramp(musicBus.gain, curMusicVol(), 1.2);
  }

  function onLoaded(name) {
    if (name === 'music') startMusic();
    else if (bedNames.indexOf(name) >= 0 && unlocked) startBed(name);
  }

  function music(on) {
    musicWanted = !!on;
    if (on) { load('music'); startMusic(); }
    else if (musicSrc) {
      const s = musicSrc; musicSrc = null;
      ramp(musicBus.gain, 0, 0.5);
      setTimeout(() => { try { s.stop(); } catch (_) {} try { s.disconnect(); } catch (_) {} }, 700);
    }
  }

  // ---------------------------------------------------------------- unlock
  let unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const go = () => {
      ramp(master.gain, 1, 0.35);
      for (const n of bedNames) startBed(n);
      applyDuck(true);
      // the big music file starts downloading only now, with the game already playable
      for (const n of LAZY) load(n);
      startMusic();
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(go).catch((e) => {
        console.error('[audio] the AudioContext refused to resume from the start gesture', e);
      });
    } else go();
    // Safari sometimes suspends again on the first backgrounding; nudge it back on return.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ctx.state === 'suspended') ctx.resume().catch(() => {});
    });
  }

  // ---------------------------------------------------------------- duck
  // duck(gap) is the tension knob, called every frame with metres to the nearest pursuer.
  // It is NOT a linear volume slide: as they close, the music comes UP and forward while the
  // market bed drops AND is filtered down, so the world goes muffled and the chase gets loud.
  let tension = -1, lastDuckAt = 0;

  function curMusicVol() { const t = tension < 0 ? 0 : tension; return 0.30 + 0.58 * t; }

  function applyDuck(force) {
    const t = tension < 0 ? 0 : tension;
    const now = ctx.currentTime;
    // bed: falls away fast once they are close, and never quite to nothing
    const bed = 0.62 * Math.pow(1 - t, 1.7) + 0.05;
    // and gets muffled: 15 kHz open street down to a 620 Hz thud
    const cut = 620 + 14400 * Math.pow(1 - t, 2.2);
    bedBus.gain.setTargetAtTime(bed, now, force ? 0.05 : 0.28);
    bedLP.frequency.setTargetAtTime(cut, now, force ? 0.05 : 0.32);
    if (musicSrc) {
      musicBus.gain.setTargetAtTime(curMusicVol(), now, force ? 0.05 : 0.22);
      musicSrc.playbackRate.setTargetAtTime(1 + 0.055 * t, now, 0.6);   // pushes, doesn't detune
    }
    sfxBus.gain.setTargetAtTime(0.95 - 0.18 * t, now, 0.3);             // room for the music
  }

  function duck(gap) {
    if (!unlocked) return;
    const g = typeof gap === 'number' && isFinite(gap) ? Math.max(0, gap) : 26;
    const raw = clamp(1 - g / 24, 0, 1);
    const t = raw * raw * (3 - 2 * raw);
    const now = performance.now();
    // scheduling a param 60 times a second is pointless churn; only move on a real change
    if (Math.abs(t - tension) < 0.015 && now - lastDuckAt < 250) return;
    tension = t; lastDuckAt = now;
    applyDuck(false);
  }

  function ramp(param, to, secs) {
    const now = ctx.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(to, now + secs);
    } catch (_) { param.value = to; }
  }

  // Not part of the contract; a read-only window on the buses so a gate can prove the duck curve
  // instead of taking this file's word for it.
  function _dbg() {
    return {
      state: ctx.state, tension,
      bed: +bedBus.gain.value.toFixed(4), bedCut: Math.round(bedLP.frequency.value),
      music: +musicBus.gain.value.toFixed(4), sfx: +sfxBus.gain.value.toFixed(4),
      master: +master.gain.value.toFixed(3),
      loaded: Object.keys(buf), failed: Object.keys(dead),
      musicPlaying: !!musicSrc,
    };
  }

  return { unlock, play, music, duck, _dbg };
}
