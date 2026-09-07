/**
 * LANTERN RUN — the pursuers and the chase camera.
 *
 * Three enforcers behind. They surge when the player is slow and drift back when the player is
 * flat out, so slowing down is what gets you caught. They trip on the piles the player knocks
 * over, and the trip is a VISIBLE stumble at the pile, not a number going down somewhere.
 *
 * The camera lives here too, because in this genre the camera is a game mechanic: it decides
 * whether the run reads as fast, whether the hero is big enough to read, and whether the frame
 * spends a third of the run inside a canopy.
 */
import { LANE, CHASE } from './config.js?v=202609071741';
import { loadArticulated, makeRig, bakeArticulated } from './player.js?v=202609071741';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

const PURSUER_HEIGHT = 1.82;     // from the style lock. Hero 1.75, pursuer 1.82.
const PURSUER_URL = './assets/pursuer_enforcer.js';

export async function createChase(THREE, scene, player, lane, opts = {}) {
  const C = { ...CHASE, ...opts };
  const CAM = { ...CHASE.camera, ...(opts.camera || {}) };
  const count = C.count || 3;

  // ---------------------------------------------------------------- the enforcers
  // One prototype load; ASSET caches by url so the three clones are cheap. Each is articulated
  // and runs the same distance-driven cycle as the hero: a chase in which the things chasing you
  // are sliding along in a T-pose is not a chase.
  const pursuers = [];
  const LINE = [-1.45, 0.15, 1.5, -0.7, 0.9];
  for (let i = 0; i < count; i++) {
    const fig = await loadArticulated(THREE, PURSUER_URL, PURSUER_HEIGHT);
    bakeArticulated(THREE, fig);
    const rig = makeRig(THREE, fig);
    const object = new THREE.Group();
    object.rotation.order = 'YXZ';
    object.name = 'enforcer' + i;
    object.add(fig.object);
    scene.add(object);
    rig.idle();
    rig.phase = (i * 0.37) % 1;      // or all three run in lockstep, which reads as one object
    // Object3D.clone shares materials, and all three of these come from one cached prototype, so
    // fading one would fade all three. Give each his own.
    // Clone by SOURCE material, not per mesh: cloning per mesh turns twelve shared materials into
    // ninety unshared ones and throws away every batch the bake just bought.
    const seenMat = new Map();
    object.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      let m = seenMat.get(o.material);
      if (!m) { m = o.material.clone(); seenMat.set(o.material, m); }
      o.material = m;
    });
    const mats = [...seenMat.values()];
    pursuers.push({
      mats, faded: false,
      object, rig, fig,
      pos: { x: LINE[i % LINE.length], y: 0, z: -(C.startGap + i * 2.4) },
      dist: C.startGap + i * 2.4,
      speed: C.speed,
      lag: LINE[i % LINE.length],
      stun: 0,             // seconds left of a stumble
      trip: 0,             // index into player.topples this one has consumed
      bank: 0, heading: 0, pitch: 0,
      shoutT: 1.5 + i * 1.3,
    });
  }

  // ---------------------------------------------------------------- the camera
  const camera = new THREE.PerspectiveCamera(CAM.fov, innerWidth / Math.max(1, innerHeight), 0.1, 320);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const camPos = new THREE.Vector3(0, CAM.up, -CAM.back);
  const look = new THREE.Vector3(0, 1.1, CAM.look);
  const wantPos = new THREE.Vector3();
  const headWorld = new THREE.Vector3();
  const dirToCam = new THREE.Vector3();
  const shakeV = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const ray = new THREE.Raycaster();
  ray.far = 40;

  let backNow = CAM.back;      // the distance actually in use, after the occlusion pull-in
  let fovNow = CAM.fov;
  let shake = 0, shakeT = 0, roll = 0;
  let beat = 0;                // "an enforcer just went down" — the camera gives it a moment
  let beatBack = 0, beatCool = 0;
  let attractT = 0, runT = 0;

  const occluders = [];
  if (lane && lane.group) occluders.push(lane.group);

  const fire = (n) => { const c = typeof window !== 'undefined' && window.__COUNT__; if (c && c[n]) c[n](); };

  const api = {
    pursuers,
    camera,
    gap: C.startGap,
    caught: false,
    squeeze: 0,
    blockedBy: '',
    update,
    attract,
  };

  /**
   * Occlusion.
   *
   * A chase camera that spends a third of the run inside an awning is the single most common way
   * this genre looks broken, and a still will not show it because you photograph the moments it
   * works. This build's first filmstrip had one frame in eight filled entirely by the underside of
   * a banner, and the cause was not the raycast: it was that the CORRECTION was damped. A smoothed
   * pull-in arrives a few frames after the frame that needed it, which is every frame that matters.
   *
   * So the ideal camera is smoothed and the correction is rigid, applied on top: three rays from
   * the hero's hips, chest and head to where the camera would like to be, and the camera gives up
   * however many metres the nearest of them says, instantly. It eases back OUT slowly, because a
   * camera that snaps out the moment a pole clears is a strobe.
   */
  const RAY_AT = [0.55, 1.05, 1.60];    // hips, chest, head of a 1.75 m figure
  const MIN_DIST = 2.7;                 // never closer than the hero can be read from
  const NEAR_SKIP = 1.9;                // an intruder inside this is at the hero's feet: pulling
  //                                       in cannot clear it, and a knocked-over pile behind the
  //                                       runner is not an occlusion, it is scenery.
  const DUCKS = [0.75, 1.45];           // how far the camera will drop to get UNDER something.
  //                                       The second one is for a hanging rack: when the hero
  //                                       slides under it the camera slides under it too, which
  //                                       looks better than any amount of pulling in.
  const FLOOR_Y = 0.8;                  // and never below this off the ground
  let squeezeNow = 0, dropNow = 0;

  /** Metres of pull-in the view from (cx,cy,cz) needs. 0 if the hero is clear. */
  function probe(cx, cy, cz, p) {
    let need = 0;
    for (const oy of RAY_AT) {
      headWorld.set(p.x, p.y + oy, p.z);
      dirToCam.set(cx - headWorld.x, cy - headWorld.y, cz - headWorld.z);
      const len = dirToCam.length();
      if (len < 0.3) continue;
      dirToCam.multiplyScalar(1 / len);
      ray.set(headWorld, dirToCam);
      ray.far = len;
      for (const g of occluders) {
        const hits = ray.intersectObject(g, true);
        for (const h of hits) {
          if (h.distance < NEAR_SKIP) continue;
          const want = len - h.distance + 0.55;    // sit this far in FRONT of the intruder
          if (want > need) { need = want; api.blockedBy = h.object.name || h.object.type; }
          break;
        }
      }
    }
    return need;
  }

  /**
   * Three answers to something getting between the camera and the hero, in the order they are
   * worth trying: duck UNDER it, pull IN in front of it, and if neither works, accept it — a
   * blocker inside MIN_DIST cannot be escaped by a camera that also has to keep the hero readable.
   *
   * The correction is rigid, never damped on the way in. This build's first filmstrip had one
   * frame in eight filled entirely by the underside of a banner, and the cause was not the
   * raycast; it was that the correction was smoothed and so arrived a few frames after the frame
   * that needed it, which is every frame that matters. It eases back OUT slowly, because a camera
   * that snaps out the moment a pole clears is a strobe.
   */
  function occlusionCorrect(dt, cam, p) {
    let need = 0, duck = 0;
    if (occluders.length) {
      need = probe(cam.x, cam.y, cam.z, p);
      for (const d of DUCKS) {
        if (need <= 0) break;
        if (cam.y - d < FLOOR_Y) break;
        const lowered = probe(cam.x, cam.y - d, cam.z, p);
        if (lowered < need - 0.05) { duck = d; need = lowered; }
        if (need <= 0) break;
      }
      const dist = Math.hypot(cam.x - p.x, cam.y - (p.y + 1.05), cam.z - p.z);
      if (need > dist - MIN_DIST) need = Math.max(0, dist - MIN_DIST);
    }
    squeezeNow = need > squeezeNow ? need : damp(squeezeNow, need, 2.4, dt);
    dropNow = duck > dropNow ? duck : damp(dropNow, duck, 2.4, dt);
    return squeezeNow;
  }

  function update(dt) {
    const p = player.pos;
    runT += dt;
    // The player starts at startSpeed and takes a couple of seconds to reach full pace, and a
    // pursuer surging at CHASE.surge against that eats the whole 14 m head start before the first
    // corner: measured in the assembled game, the gap was 5.8 m by 14 m and the run was over at 30
    // of 1100. For the first few seconds they hold station instead.
    const grace = clamp(1 - runT / 4.5, 0, 1);
    const speedN = clamp((player.speed - 4.0) / (9.0 - 4.0), 0, 1);

    // ------------------------------------------------------------ piles the player knocked over
    const piles = player.topples || [];

    // ------------------------------------------------------------ the enforcers
    let nearestZ = -Infinity;
    for (let i = 0; i < pursuers.length; i++) {
      const u = pursuers[i];

      // trip on any pile this one has not passed yet
      while (u.trip < piles.length && piles[u.trip].z < u.pos.z - 0.6) u.trip++;
      if (u.trip < piles.length) {
        const pile = piles[u.trip];
        if (u.pos.z >= pile.z - 0.7 && Math.abs(u.pos.x - pile.x) < 1.7) {
          u.trip++;
          u.stun = C.toppleCost;
          u.speed = 1.6;
          // The camera drops back so you SEE him go down. Only for the one nearest you, only when
          // he is close enough that dropping back can actually put him in frame, and not more than
          // once every couple of seconds, or a lane full of piles leaves the camera permanently
          // parked at arm's length and the hero the size of a thumbnail.
          const gapHim = p.z - u.pos.z;
          if (gapHim < 9.5 && gapHim <= api.gap + 0.5 && beatCool <= 0) {
            beat = 1;
            beatBack = clamp(gapHim + 1.9, CAM.back, 8.6);
            beatCool = 2.6;
          }
          fire('shout');
        }
      }

      const gapMe = p.z - u.pos.z;
      let want;
      if (u.stun > 0) {
        u.stun -= dt;
        want = 1.4;
      } else {
        // Surge when the player is slow, fall back when the player is flat out. The player's
        // speed is the only input that matters; that is the whole bargain of the game.
        want = lerp(C.surge, C.speed, speedN);
        if (gapMe > C.maxGap) want = C.surge * 1.25;        // never fall out of the game
        else if (gapMe > 8) want += 1.2;                     // and stay a threat
        // Inside about five metres he stops closing and HOVERS, matching the player's speed plus
        // a little. That is the only band in which he is on screen at all — a camera 5.2 m behind
        // the hero cannot show anything further back than 5.2 m — so the "he is on your heels"
        // state has to last, rather than being two frames on the way to catching you. How fast he
        // eats those last metres is set by how slow the player is, which keeps the bargain intact.
        if (gapMe < 5.0) want = Math.min(want, player.speed + 0.25 + 1.7 * (1 - speedN));
        if (grace > 0) want = Math.min(want, player.speed + 0.6 + 3.0 * (1 - grace));
        want -= i * 0.35;                                     // the pack strings out
      }
      u.speed = damp(u.speed, want, u.stun > 0 ? 14 : 2.6, dt);

      const nz = u.pos.z + u.speed * dt;
      // weave toward the player's line, each on his own offset, with real lag
      const wantX = clamp(p.x * 0.82 + u.lag * (0.35 + 0.65 * clamp(gapMe / 12, 0, 1)), -LANE.halfWalk - 0.5, LANE.halfWalk + 0.5);
      const nx = damp(u.pos.x, wantX, u.stun > 0 ? 1.2 : 2.4, dt);
      const vx = (nx - u.pos.x) / Math.max(dt, 1e-4);
      const dz = nz - u.pos.z;
      const dxs = nx - u.pos.x;
      u.pos.x = nx; u.pos.z = nz;

      const stumbling = u.stun > 0;
      const sN = clamp((u.speed - 3.5) / (C.surge - 3.5), 0, 1);
      u.rig.advance(Math.hypot(dz, dxs), stumbling ? 0.25 : sN);
      const turn = clamp(vx / 6, -1, 1);
      const out = u.rig.pose({
        speed: u.speed, speedN: stumbling ? 0.25 : sN, turn,
        state: stumbling ? 'stumble' : 'run',
        u: stumbling ? clamp(u.stun / C.toppleCost, 0, 1) : 0,
        t: performance.now() * 0.001 + i, dt,
      });
      u.bank = damp(u.bank, -turn * 0.22 + (stumbling ? 0.25 : 0), 8, dt);
      u.heading = damp(u.heading, Math.atan2(vx, Math.max(2, u.speed)) * 0.5, 8, dt);
      u.pitch = damp(u.pitch, (out.pitch || 0) + (stumbling ? 0.30 : 0), 10, dt);
      u.pos.y = Math.max(0, u.rig.bob + (out.drop || 0) - (stumbling ? 0.12 : 0));
      u.object.position.set(u.pos.x, u.pos.y, u.pos.z);
      u.object.rotation.set(u.pitch, u.heading, u.bank);
      u.dist = Math.max(0, p.z - u.pos.z);

      // shouts: more often the closer they are
      u.shoutT -= dt;
      if (u.shoutT <= 0) {
        u.shoutT = lerp(1.6, 5.5, clamp(u.dist / 16, 0, 1)) * (0.7 + Math.random() * 0.8);
        if (u.dist < 26) fire('shout');
      }

      // A pursuer only appears at all once he is closer to you than the camera is, and for the
      // first metre or two of that he is a wall of shoulder a hand's width from the lens: on the
      // first chase filmstrip he read as a detached head in the corner of the frame. Fade him in
      // across that band instead. Pushing the camera back to make room for him cannot work, since
      // the gap crosses the camera distance continuously and the push has to jump.
      const front = u.pos.z - camera.position.z;
      const op = clamp((front - 0.5) / 1.25, 0, 1);
      u.object.visible = op > 0.02;
      if (op < 0.999 || u.faded) {
        u.faded = op < 0.999;
        for (const m of u.mats) {
          if (m.transparent !== u.faded) { m.transparent = u.faded; m.depthWrite = !u.faded; m.needsUpdate = true; }
          m.opacity = op;
        }
      }

      if (u.pos.z > nearestZ) nearestZ = u.pos.z;
    }

    api.gap = Math.max(0, p.z - nearestZ);
    if (!api.caught && api.gap <= C.minGap) {
      api.caught = true;
      if (player.caughtBy) player.caughtBy();
    }

    camUpdate(dt, speedN);
  }

  function camUpdate(dt, speedN) {
    const p = player.pos;

    // fov and distance both open up with speed. Speed you cannot see is speed the build does not
    // have: this is the cheapest way to put it on screen and it cannot be measured, only seen.
    const wantFov = lerp(CAM.fov, CAM.fovSprint, speedN * speedN);
    fovNow = damp(fovNow, wantFov, 4.5, dt);

    // an enforcer just went down: the camera drops back for a moment so you SEE it happen rather
    // than reading a number. It eases in and out over about a second and a quarter.
    beat = Math.max(0, beat - dt / 1.25);
    beatCool = Math.max(0, beatCool - dt);
    const beatEase = Math.sin(Math.PI * clamp(beat, 0, 1));
    let wantBack = CAM.back * (1 + 0.06 * speedN);

    if (beat > 0) wantBack = lerp(wantBack, Math.max(wantBack, beatBack), beatEase);

    // the ideal camera, smoothed
    wantPos.set(p.x * 0.80, CAM.up * (1 + 0.05 * speedN) + p.y * 0.35, p.z - wantBack);
    camPos.x = damp(camPos.x, wantPos.x, 6.5, dt);
    camPos.y = damp(camPos.y, wantPos.y, 7.0, dt);
    // z is damped hard on purpose. A soft z lags by speed/rate metres at a constant velocity, so
    // a rate of 12 quietly added three quarters of a metre to every camera distance in the config.
    camPos.z = damp(camPos.z, wantPos.z, 26.0, dt);

    // the correction, rigid
    const squeeze = occlusionCorrect(dt, camPos, p);
    backNow = p.z - (camPos.z + squeeze);
    api.squeeze = squeeze; api.duck = dropNow;

    // shake: a hit, a near miss, an enforcer going down. Decays to nothing.
    const impact = player.impact || 0;
    if (impact > shake) shake = impact;
    shake = Math.max(0, shake - dt * 1.9);
    shakeT += dt * 34;
    const sAmp = shake * shake * 0.26;
    shakeV.set(Math.sin(shakeT * 1.7) * sAmp, Math.sin(shakeT * 2.3 + 1.1) * sAmp * 0.8, 0);
    roll = damp(roll, Math.sin(shakeT * 1.3) * sAmp * 0.10, 20, dt);

    camera.position.set(
      camPos.x + shakeV.x,
      Math.max(FLOOR_Y, camPos.y + shakeV.y - dropNow - Math.min(0.35, squeeze * 0.16)),
      camPos.z + squeeze,
    );

    // The camera NEVER takes its roll from the ground under the player. Tilting with the surface
    // normal feels clever for one second and then a clipped verge rolls the whole horizon twenty
    // degrees (docs/traps.md). Up is world up; the only roll is a decaying shake.
    look.set(p.x * 0.86, p.y * 0.5 + 1.12, p.z + CAM.look);
    camera.up.copy(UP);
    camera.lookAt(look);
    camera.rotateZ(roll);

    if (Math.abs(camera.fov - fovNow) > 0.01) { camera.fov = fovNow; camera.updateProjectionMatrix(); }
  }

  /** The menu camera: a slow drift, so the attract screen is not a still. */
  function attract(dt) {
    attractT += dt;
    const a = attractT * 0.25;
    const r = 5.6;
    camera.position.set(Math.sin(a) * r + player.pos.x * 0.5, 2.5 + Math.sin(a * 0.7) * 0.35, player.pos.z - Math.cos(a) * r);
    camera.up.copy(UP);
    camera.lookAt(player.pos.x, 1.05, player.pos.z);
    if (camera.fov !== CAM.fov) { camera.fov = CAM.fov; camera.updateProjectionMatrix(); }
  }

  // start the camera where it belongs rather than sliding in from the origin on frame one
  camPos.set(player.pos.x * 0.8, CAM.up, player.pos.z - CAM.back);
  camera.position.copy(camPos);
  camera.lookAt(player.pos.x, 1.1, player.pos.z + CAM.look);

  return api;
}
