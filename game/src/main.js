/**
 * LANTERN RUN — boot, the frame loop, and the telemetry the gate reads.
 *
 * The lead owns this file. Every subsystem is behind the interface in ../CONTRACT.md; if a module
 * is missing this file still boots and says which one, because a game that dies silently at import
 * is the failure mode docs/gates.md warns about.
 */
import * as THREE from 'three';
import { LANE, PLAYER, CHASE, SCORE, BUDGET, NIGHT } from './config.js?v=202609071741';
import { setSurfaceDefaults } from '../surfaces.js?v=202609071741';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
setSurfaceDefaults({ on: true });

// ---------------------------------------------------------------- state
const G = {
  started: false, over: false, won: false,
  t: 0, dt: 0, frame: 0, score: 0,
  dodges: 0, vaults: 0, slides: 0, topples: 0, lanterns: 0,
  fps: 60, _fpsT: performance.now(), _fpsN: 0,
};

let lane, player, chase, night, hud, audio, fx;
let boot = null;

function fail(where, e) {
  console.error('[boot]', where, e);
  const el = document.getElementById('loadmsg');
  if (el) el.textContent = 'failed in ' + where + ': ' + (e && e.message ? e.message : e);
  throw e;
}

async function start() {
  const progress = (p, msg) => {
    const b = document.getElementById('barf'); if (b) b.style.width = Math.round(p * 100) + '%';
    const m = document.getElementById('loadmsg'); if (m) m.textContent = msg || '';
  };

  progress(0.05, 'lighting');
  const { createNight } = await import('../night.js?v=202609071741').catch((e) => fail('night.js', e));
  night = createNight(THREE, renderer, scene, NIGHT);

  progress(0.2, 'building the lane');
  const { buildLane } = await import('./lane.js?v=202609071741').catch((e) => fail('lane.js', e));
  lane = await buildLane(THREE, scene, { ...LANE, night, onProgress: (p) => progress(0.2 + p * 0.5, 'building the lane') });

  progress(0.72, 'the runner');
  const { createPlayer } = await import('./player.js?v=202609071741').catch((e) => fail('player.js', e));
  player = await createPlayer(THREE, scene, lane, PLAYER);

  progress(0.84, 'the chase');
  const { createChase } = await import('./chase.js?v=202609071741').catch((e) => fail('chase.js', e));
  chase = await createChase(THREE, scene, player, lane, CHASE);

  progress(0.92, 'effects');
  const { createFx } = await import('./fx.js?v=202609071741').catch((e) => fail('fx.js', e));
  fx = createFx(THREE, scene, { lane, player, chase });

  progress(0.97, 'sound');
  const { createAudio } = await import('./audio.js?v=202609071741').catch((e) => fail('audio.js', e));
  audio = createAudio();

  progress(1, '');
  const { createHud } = await import('./hud.js?v=202609071741').catch((e) => fail('hud.js', e));
  hud = createHud({ onStart: begin, onRestart: () => location.reload() });

  onResize();
  addEventListener('resize', onResize);

  // One frame rendered before the menu, so the first real frame is not a compile stall.
  night.render(chase.camera, 0);

  window.__READY__ = true;
  window.__START__ = begin;
  hud.show('menu');
  loop(performance.now());
}

function begin() {
  if (G.started) return;
  G.started = true;
  hud.show('play');
  audio.unlock();
  audio.music(true);
  audio.play('bell');
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  if (chase && chase.camera) { chase.camera.aspect = innerWidth / innerHeight; chase.camera.updateProjectionMatrix(); }
  if (night && night.resize) night.resize(innerWidth, innerHeight);
  if (hud && hud.resize) hud.resize();
}

// ---------------------------------------------------------------- loop
let last = performance.now();

function loop(now) {
  requestAnimationFrame(loop);
  // fps from REAL elapsed time. A counter that divides by the clamped delta is pinned to a
  // constant and reports a healthy number on a build running at one frame a second.
  G._fpsN++;
  if (now - G._fpsT >= 500) { G.fps = Math.round((G._fpsN * 1000) / (now - G._fpsT)); G._fpsT = now; G._fpsN = 0; }

  const real = (now - last) / 1000;
  last = now;
  const dt = Math.min(real, 0.05);   // clamped for the simulation only
  G.dt = dt; G.frame++;

  if (G.started && !G.over) {
    G.t += dt;
    player.update(dt, hud.input, lane);
    lane.update(player.pos.z, dt);
    chase.update(dt);
    fx.update(dt);

    G.score = Math.floor(player.pos.z * SCORE.perMetre)
      + G.dodges * SCORE.perDodge + G.vaults * SCORE.perVault
      + G.topples * SCORE.perTopple + G.lanterns * SCORE.perLantern;

    if (chase.caught) endRun(false);
    else if (player.pos.z >= LANE.length) endRun(true);

    hud.set({
      score: G.score, gap: chase.gap, speed: player.speed,
      distance: player.pos.z, length: LANE.length, state: player.state,
    });
    audio.duck(chase.gap);
  } else if (!G.started) {
    // the attract camera drifts so the menu is not a still
    chase && chase.attract && chase.attract(dt);
  }

  night.render(chase.camera, dt);
  telemetry();
}

function endRun(won) {
  G.over = true; G.won = won;
  audio.music(false);
  audio.play(won ? 'gong' : 'caught');
  hud.show(won ? 'won' : 'lost');
  hud.set({ score: G.score, distance: player.pos.z, length: LANE.length });
}

function telemetry() {
  const info = renderer.info.render;
  const ahead = lane && player ? lane.sampleAhead(player.pos.z, 18)[0] : null;
  window.__GAME__ = {
    pos: player ? [player.pos.x, player.pos.z] : [0, 0],
    fps: G.fps,
    frame: G.frame,
    speed: player ? player.speed : 0,
    score: G.score,
    over: G.over,
    won: G.won,
    draws: info.calls,
    tris: info.triangles,
    gap: chase ? chase.gap : 0,
    lane: player ? player.lane : 0,
    state: player ? player.state : 'idle',
    dodges: G.dodges, vaults: G.vaults, slides: G.slides, topples: G.topples,
    aheadX: ahead ? ahead.x : null,
    aheadKind: ahead ? ahead.kind : null,
    aheadZ: ahead ? ahead.z : null,
    heroBox: player && chase ? player.screenBox(chase.camera, renderer) : null,
    distance: player ? player.pos.z : 0,
    length: LANE.length,
    budget: BUDGET,
  };
}

// Counters the subsystems bump. Kept on window so no module has to import main.
window.__COUNT__ = {
  dodge: () => { G.dodges++; },
  vault: () => { G.vaults++; if (audio) audio.play('whoosh'); },
  slide: () => { G.slides++; if (audio) audio.play('scrape'); },
  topple: () => { G.topples++; if (audio) audio.play(Math.random() < 0.5 ? 'crash_crate' : 'crash_glass'); },
  lantern: () => { G.lanterns++; if (audio) audio.play('pickup'); },
  step: () => { if (audio) audio.play('footfall', { vol: 0.4, rate: 0.9 + Math.random() * 0.25 }); },
  shout: () => { if (audio) audio.play('shout'); },
};

start().catch((e) => fail('start', e));
