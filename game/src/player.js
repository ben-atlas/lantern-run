/**
 * LANTERN RUN — the runner.
 *
 * The hero is an articulated figure animated entirely in code. Nothing here is keyframed data:
 * the run cycle is a set of smooth functions of ONE number, the cycle phase, and that phase is
 * advanced by DISTANCE TRAVELLED, not by time. That is the whole reason the legs stay planted
 * when the speed changes: a time-driven cycle at a fixed cadence has the feet skating backwards
 * the moment the runner accelerates, and every "why does it look like it's on ice" bug in this
 * genre is that one. Metres per stride is a property of the body; strides per second falls out.
 *
 * The figure loads with { keepHierarchy: true }. The default merge in assetlib welds it into one
 * mesh per material and drops userData with the nodes that carried it: it renders perfectly and
 * never moves a limb again, and no still frame shows you. See docs/traps.md.
 *
 * Rotation signs, because they are counter-intuitive and every one of them is a silent bug:
 * Rx(a) maps a limb pointing at -Y to (0, -cos a, -sin a), so a POSITIVE rotation.x swings a
 * hanging limb BACKWARD, and maps the body's front (+Z) DOWNWARD. Therefore
 *   hip/shoulder forward swing = NEGATIVE x       knee/ankle flexion = POSITIVE x
 *   elbow flexion (forearm forward) = NEGATIVE x  torso forward lean = POSITIVE x
 */
import { ASSET, bakeStatic } from '../assetlib.js?v=202609071741';
import { LANE } from './config.js?v=202609071741';

/** Every joint this animation drives. Missing any of them is a hard failure, not a warning. */
export const RUNNER_JOINTS = [
  'hips', 'spine', 'chest', 'head',
  'leftShoulder', 'leftElbow', 'rightShoulder', 'rightElbow',
  'leftHip', 'leftKnee', 'leftAnkle', 'rightHip', 'rightKnee', 'rightAnkle',
];

/**
 * Load an articulated figure and PROVE it is articulated.
 *
 * ASSET() never throws into a game loop; an unloadable module returns an empty Group and the
 * game carries on with an invisible hero. And a figure loaded without keepHierarchy arrives
 * welded, with userData gone. Both of those are silent, so both are checked here by hand and
 * both fail loudly with the names of what is missing.
 */
export async function loadArticulated(THREE, url, height) {
  const object = await ASSET(url, { height, keepHierarchy: true, surfaces: true });
  let meshes = 0;
  object.traverse((o) => { if (o.isMesh) meshes++; });
  if (meshes === 0) {
    throw new Error(`[runner] ${url} loaded no geometry at all. ASSET() swallows an import error `
      + `and returns an empty Group; check the module parses and default-exports a function.`);
  }
  const j = object.userData && object.userData.joints;
  if (!j || typeof j !== 'object') {
    throw new Error(`[runner] ${url} exposes no userData.joints. An articulated figure must set `
      + `g.userData.joints = { ${RUNNER_JOINTS.join(', ')} } and be loaded with keepHierarchy.`);
  }
  const missing = RUNNER_JOINTS.filter((n) => !(j[n] && j[n].isObject3D));
  if (missing.length) {
    throw new Error(`[runner] ${url} is missing joints: ${missing.join(', ')}. `
      + `Present: ${Object.keys(j).join(', ') || '(none)'}. Each must be an Object3D pivoted AT `
      + `the joint, not at the limb's centre.`);
  }
  // Chirality. A figure faces +Z with +Y up, so the character's LEFT is +X: left = up x forward.
  // Every asymmetric pose in this file depends on that — the slide leads with the left leg and
  // trails the right, the vault reaches with one arm, and every limb's abduction sign is per side.
  // A figure whose joint MAP is mirrored (the names read off a front render rather than off the
  // model, which is a mirror) animates almost right, which is worse than animating wrong, and a
  // symmetric run cycle will never show it. So check it, in the figure's own space, at load.
  const local = (node) => object.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
  object.updateMatrixWorld(true);
  const lh = local(j.leftHip), rh = local(j.rightHip);
  const ls = local(j.leftShoulder), rs = local(j.rightShoulder);
  if (!(lh.x - rh.x > 0.02) || !(ls.x - rs.x > 0.02)) {
    throw new Error(`[runner] ${url} has its left and right joints mirrored: with the figure `
      + `facing +Z the character's left is +X, so leftHip.x must exceed rightHip.x. Measured `
      + `leftHip.x=${lh.x.toFixed(3)} rightHip.x=${rh.x.toFixed(3)}, `
      + `leftShoulder.x=${ls.x.toFixed(3)} rightShoulder.x=${rs.x.toFixed(3)}.`);
  }

  return { object, joints: j, meshes };
}

/**
 * Bake an articulated figure down to as few draw calls as its skeleton allows.
 *
 * keepHierarchy skips assetlib's merge, which is the whole point — merging is what makes a figure
 * unable to move. But it also means every part of every figure is its own draw call, and measured
 * here that was 65 for the hero and 90 for each of three enforcers: 335 of a 900 call budget spent
 * on four objects, before the market itself draws anything.
 *
 * Everything hanging off ONE joint is rigid with respect to that joint, so it can be merged
 * without losing a thing. Collect each joint's own geometry, stopping at the next joint down,
 * bake it in that joint's local space, and hang the result back on the joint.
 */
export function bakeArticulated(THREE, fig) {
  const joints = new Set(Object.values(fig.joints));
  const root = fig.object;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4();

  const owners = [{ node: root, meshes: [] }];
  for (const j of joints) owners.push({ node: j, meshes: [] });

  // walk from each owner, stopping at any other joint: those meshes belong to that joint instead
  for (const owner of owners) {
    const stack = [...owner.node.children];
    while (stack.length) {
      const n = stack.pop();
      if (joints.has(n)) continue;                 // someone else's geometry
      if (n.isMesh) owner.meshes.push(n);
      for (const c of n.children) stack.push(c);
    }
  }

  let before = 0, after = 0;
  for (const { node, meshes } of owners) {
    before += meshes.length;
    if (meshes.length < 2) { after += meshes.length; continue; }
    inv.copy(node.matrixWorld).invert();
    const tmp = new THREE.Group();
    for (const m of meshes) {
      const c = new THREE.Mesh(m.geometry, m.material);
      c.castShadow = m.castShadow; c.receiveShadow = m.receiveShadow;
      rel.multiplyMatrices(inv, m.matrixWorld);
      rel.decompose(c.position, c.quaternion, c.scale);
      tmp.add(c);
    }
    const baked = bakeStatic(tmp);
    for (const m of meshes) if (m.parent) m.parent.remove(m);
    while (baked.children.length) node.add(baked.children[0]);
    let n = 0; node.traverse((o) => { if (o.isMesh) n++; });
    after += n;
  }
  root.updateMatrixWorld(true);
  return { before, after };
}


// ---------------------------------------------------------------- hero separation
/**
 * Round 1's critic failed this build on one property: "the hero has no separation from the set it
 * is standing in", unfindable at 1:1 in three of eight gate frames. Height was not the problem.
 * Three causes, all on this object, all here.
 *
 * 1. HUE. The runner's jacket was 0x1d5f8a, the style lock's deep blue tarp, which is also on the
 *    tarpaulins, the barrels, the drums, the crates, the shutters and the scooters. The hero was
 *    wearing the set dressing's colour. HERO_HUE below is the one hue in this game that belongs to
 *    the hero and to nothing else, and it was picked to sit off every hue the market already uses:
 *    away from market red 0xc4442f, away from warm bulb 0xffb45a, away from cold neon 0x63e0ff,
 *    away from jade and tarp blue. It pairs with the warm orange t-shirt band the asset already
 *    carries below the jacket hem rather than fighting it.
 * 2. RIM. Every stall in frame blazes orange and the hero received none of it, so the silhouette
 *    dissolved into whatever was behind it. Two cool lights ride with the runner, from behind and
 *    above, so a bright edge traces the head, shoulders and trailing leg wherever in the lane he
 *    is. They follow position only, never the bank or the slide pitch, or the rim swings.
 * 3. CONTACT. The shoes met full-brightness unbroken wet asphalt: no shadow, no occlusion, no
 *    reflection, on a surface that is a mirror everywhere else in the same frame. A soft ellipse
 *    plus a short reflection smear running back toward the camera.
 */
export const HERO_HUE = 0xff2f7d;          // courier magenta. HERO ONLY. Nothing else may use it.
const HERO_HUE_FROM = '1d5f8a';            // the tarp blue it replaces, on the jacket and shoe flash

const SEP = {
  rimColour: 0x63e0ff,       // the lock's cold neon: the market's own cool source
  rimKey: 22.0,              // candela, back-left, the edge that draws the silhouette
  rimFill: 9.0,              // back-right, so the far shoulder is not black
  rimRange: 3.3,             // hard cut. Longer and the cone's spill becomes a blue pool of road
  //                            travelling with the player, which reads as a bug rather than as a
  //                            rim; short, it is a halo the runner carries and the wet asphalt
  //                            under him catches, which is the contact cue we wanted anyway.
  shadowW: 0.80,             // metres, about 1.2x shoulder width
  shadowD: 1.00,
  shadowAlpha: 0.66,         // peak darkening at the centre of the ellipse
  smearLen: 1.55,            // metres of reflection trailing back toward the camera
  smearW: 0.62,
  smearAlpha: 0.34,
};

/**
 * Repaint one colour of the figure. Hard-fails if it finds nothing, because the whole separation
 * fix is this hue and an asset that quietly changes its jacket would put the hero back inside the
 * set dressing with nothing to say so. Materials are cloned first: surfaces.js shares one material
 * per recipe-and-colour, so mutating in place would reach further than the hero.
 */
function retint(root, fromHex, toHex) {
  const swapped = new Map();
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    if (o.material.color.getHexString() !== fromHex) return;
    let m = swapped.get(o.material);
    if (!m) { m = o.material.clone(); m.color.setHex(toHex); swapped.set(o.material, m); }
    o.material = m; n++;
  });
  if (!n) {
    throw new Error(`[runner] nothing on the hero is 0x${fromHex}, so the hero-only colour was `
      + `never applied and the runner is wearing the market's own palette. The jacket material in `
      + `assets/hero_runner.js changed; update HERO_HUE_FROM in src/player.js to match it.`);
  }
  return n;
}

/** A soft round alpha falloff, for the contact shadow. Generated, not a file. */
function radialTexture(THREE, power) {
  const N = 96, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const a = Math.pow(1 - d, power);
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * a);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A streak: brightest at the feet end, fading along its length and softening at the edges. */
function smearTexture(THREE) {
  const W = 32, H = 128, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);                       // 0 at the far end, 1 at the feet
    const along = Math.pow(v, 2.2);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W * 2 - 1;
      const across = Math.pow(Math.max(0, 1 - Math.abs(u)), 1.5);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * along * across);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- cycle shapes
const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
/** dt-correct exponential smoothing. A raw lerp(a,b,0.1) is frame-rate dependent. */
const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

/** Shortest distance between two phases on the 0..1 ring. */
function ring(q, c) { const d = Math.abs(frac(q - c + 0.5) - 0.5); return d; }
/** A raised-cosine hump on the phase ring: 1 at the centre, 0 outside the half-width. */
function bump(q, c, w) { const d = ring(q, c); return d >= w ? 0 : 0.5 * (1 + Math.cos(Math.PI * d / w)); }

/**
 * Thigh angle, positive forward. Contact near q=0, toe-off near q=0.22, peak reach at q=0.70.
 * Two harmonics rather than one: a pure sine gives a skater's even swing with no drive phase.
 */
function thighCurve(q) { return 0.18 + 0.60 * Math.cos(TAU * (q - 0.70)) + 0.10 * Math.cos(2 * TAU * (q - 0.35)); }
/** Knee flexion, always positive: a knee bends one way. Big hump in swing, small one in stance. */
function kneeCurve(q) { return 0.12 + 1.55 * bump(q, 0.58, 0.38) + 0.35 * bump(q, 0.05, 0.30); }
/** Ankle: plantarflex through toe-off, dorsiflex through the swing so the toe clears. */
function ankleCurve(q) { return -0.05 + 0.45 * bump(q, 0.22, 0.22) - 0.30 * bump(q, 0.72, 0.30); }
/** The arm mirrors the opposite leg with a shorter, rounder swing. */
function armCurve(q) { return 0.10 + 0.70 * Math.cos(TAU * (q - 0.70)); }
function elbowCurve(q) { return 1.25 + 0.45 * Math.max(0, Math.cos(TAU * (q - 0.75))); }

/**
 * The rig: one figure, one phase, and a pose for every state. Shared by the hero and by the
 * three pursuers, because a chase in which the things chasing you are not running is not a chase.
 */
export function makeRig(THREE, fig) {
  const J = fig.joints;
  const B = {};                                   // bind pose, so everything below is additive
  for (const n of RUNNER_JOINTS) B[n] = J[n].rotation.clone();

  // Poses are written into a buffer and applied at the end of the frame rather than straight onto
  // the joints. That buys the one thing a state machine of poses needs: a cross-fade. Without it
  // a vault ends by snapping the legs from a tuck into whatever phase the run cycle had reached,
  // and it reads as a dropped frame every single time.
  const T = {};
  for (const n of RUNNER_JOINTS) T[n] = [0, 0, 0];
  const set = (n, x, y, z) => { const t = T[n]; t[0] = x; t[1] = y || 0; t[2] = z || 0; };

  const rig = {
    object: fig.object,
    joints: J,
    phase: 0,
    bob: 0,          // vertical body bob, metres, applied by the owner to the group's y
    _state: 'run',
    _blend: 0,

    /**
     * Metres covered by one full cycle. NOT a guess: it is the distance the planted foot actually
     * sweeps backwards under the hip over the stance window, measured off these same curves by
     * work/eng_run/fk.mjs. Get it wrong and the foot slides forward under the runner every stride,
     * which is the one tell that a run cycle is faked — and the amount was 10% at a sprint and
     * over 30% at a jog before this was measured rather than assumed.
     */
    cycleLength(speedN) { return 1.70 + 2.36 * clamp(speedN === undefined ? 1 : speedN, 0, 1); },

    /**
     * Advance by DISTANCE. Returns the number of footplants crossed, so the caller fires
     * footstep sound and dust at the moment a foot actually meets the ground. The plant is a
     * little before the nominal phase zero, which is where the sole is genuinely lowest.
     */
    advance(distance, speedN) {
      const before = this.phase;
      const step = distance / this.cycleLength(speedN);
      this.phase = frac(before + step);
      const PLANT = 0.05;
      return Math.max(0, Math.floor((before + step + PLANT) * 2) - Math.floor((before + PLANT) * 2));
    },

    /** s: { speed, speedN 0..1, turn -1..1, state, u 0..1 through the state, t } */
    pose(s) {
      const state = s.state || 'run';
      if (state !== this._state) { this._state = state; this._blend = 0.22; }
      const turn = clamp(s.turn || 0, -1, 1);
      let out;
      if (state === 'vault') out = this.poseVault(s, turn);
      else if (state === 'slide') out = this.poseSlide(s, turn);
      else out = this.poseRun(s, turn);

      // crisp in steady state, soft for a fifth of a second either side of a state change
      const dt = clamp(s.dt || 1 / 60, 1 / 240, 0.05);
      this._blend = Math.max(0, this._blend - dt);
      const k = 1 - Math.exp(-(this._blend > 0 ? 13 : 60) * dt);
      for (const n of RUNNER_JOINTS) {
        const t = T[n], b = B[n], r = J[n].rotation;
        r.set(lerp(r.x, b.x + t[0], k), lerp(r.y, b.y + t[1], k), lerp(r.z, b.z + t[2], k));
      }
      return out;
    },

    poseRun(s, turn) {
      const p = this.phase;
      const n = clamp(s.speedN === undefined ? 1 : s.speedN, 0, 1);
      const amp = 0.55 + 0.45 * n;            // a jog is a small cycle, a sprint is a big one
      const st = s.state === 'stumble' ? clamp(s.u || 0, 0, 1) : 0;

      // --- legs. Right is half a cycle behind left; that half cycle IS the run.
      for (let side = 0; side < 2; side++) {
        const q = frac(p + side * 0.5);
        const out = side ? -1 : 1;             // +x is the runner's left when facing +z
        set(side ? 'rightHip' : 'leftHip', -thighCurve(q) * amp, 0, out * (0.05 + 0.05 * st));
        set(side ? 'rightKnee' : 'leftKnee', Math.max(0.02, kneeCurve(q) * amp * (1 + 0.25 * st)));
        set(side ? 'rightAnkle' : 'leftAnkle', ankleCurve(q) * amp);
      }

      // --- arms, mirrored across the body from the legs on the same side
      for (let side = 0; side < 2; side++) {
        const qa = frac(p + side * 0.5 + 0.5);
        const out = side ? -1 : 1;
        // a stumble throws the arms up and wide; a run keeps them in and driving
        const flail = st * (0.9 + 0.5 * Math.sin((s.t || 0) * 19 + side * 2.1));
        set(side ? 'rightShoulder' : 'leftShoulder',
          -armCurve(qa) * amp * (1 - st) - flail, -out * 0.10 * amp, out * (0.16 + 0.9 * st));
        set(side ? 'rightElbow' : 'leftElbow', -(elbowCurve(qa) * amp * (1 - 0.5 * st) + 0.4 * st));
      }

      // --- torso. Lean grows with speed; the pelvis and the chest counter-rotate, which is what
      // makes a figure read as running rather than as a mannequin sliding forward.
      const twist = Math.sin(TAU * p) * amp;
      const drop = Math.cos(TAU * p) * amp;      // pelvic drop, quarter cycle out of phase
      const lean = (0.15 + 0.23 * n) * (1 - 0.3 * st) + 0.55 * st;
      set('hips', 0.04 * st, -0.13 * twist, 0.07 * drop - turn * 0.05);
      set('spine', lean * 0.45, 0.08 * twist, -turn * 0.10);
      set('chest', lean * 0.55, 0.20 * twist, -turn * 0.16);
      set('head', -lean * 0.55 - 0.10 * st, -0.10 * twist, turn * 0.08);

      // Two rises per cycle: the body is lowest at each midstance, highest in each flight. Shaped
      // so the low point is ZERO rather than the mean, or the runner spends half of every stride
      // three centimetres into the ground.
      this.bob = -0.015 - 0.05 * st
        + (0.09 + 0.06 * n) * 0.5 * (1 - Math.cos(2 * TAU * (p - 0.12)));
      return { pitch: 0, drop: 0 };
    },

    /**
     * Tuck and reach. Knees to the chest over the obstacle, then the lead leg reaches FORWARD to
     * take the landing and the trail leg extends behind, which is the attitude the run cycle wants
     * to start from. The first version reached by straightening both legs, which drove the knee
     * angle negative — a knee that bends backwards, in a build where nothing else would show it.
     */
    poseVault(s, turn) {
      const u = clamp(s.u || 0, 0, 1);
      const tuck = Math.sin(Math.PI * clamp(u * 1.12, 0, 1));      // peaks just past mid-flight
      const reach = clamp((u - 0.58) / 0.42, 0, 1);                // the landing attitude, late
      const push = clamp(1 - u / 0.28, 0, 1);                      // the takeoff drive

      set('leftHip', -(0.30 + 1.25 * tuck + 0.38 * reach), 0, 0.06);
      set('leftKnee', Math.max(0.05, 0.28 + 1.55 * tuck + 0.22 * reach));
      set('leftAnkle', 0.25 * push - 0.28 * reach);
      set('rightHip', -(0.15 + 1.05 * tuck) + 0.55 * push + 0.50 * reach, 0, -0.06);
      set('rightKnee', Math.max(0.05, 0.42 + 1.70 * tuck + 0.30 * reach));
      set('rightAnkle', 0.40 * push + 0.20 * reach - 0.15 * tuck);

      // arms: both drive forward and up off the ground, then come down for the landing
      const arm = 1.35 * Math.sin(Math.PI * clamp(u * 1.4, 0, 1));
      set('leftShoulder', -arm, -0.1, 0.28);
      set('rightShoulder', -arm * 0.8, 0.1, -0.34);
      set('leftElbow', -(0.55 + 0.5 * tuck));
      set('rightElbow', -(0.75 + 0.5 * tuck));

      set('hips', 0.25 * tuck, 0, -turn * 0.06);
      set('spine', 0.22 + 0.30 * tuck - 0.10 * reach, 0.05, -turn * 0.12);
      set('chest', 0.18 + 0.26 * tuck - 0.12 * reach, 0.05, -turn * 0.14);
      set('head', -0.30 - 0.15 * tuck);
      this.bob = -0.02;
      return { pitch: 0.10 * tuck - 0.06 * reach, drop: 0 };
    },

    /**
     * A knee slide. The hips drop to about half a metre, the lead leg goes out with the heel
     * skimming, the trailing shin folds under so the knee is the thing on the ground, and the
     * chest comes down over the lead knee.
     *
     * The recline lives mostly in the SPINE, not in the root. A big root pitch throws the whole
     * figure back through the air and reads as sitting in an invisible chair: the first version of
     * this pitched the root 50 degrees and the hips never came below 0.86 m.
     */
    poseSlide(s, turn) {
      const u = clamp(s.u || 0, 0, 1);
      const on = clamp(u / 0.14, 0, 1) * clamp((1 - u) / 0.20, 0, 1);   // ease in, ease out
      set('leftHip', -(0.78 * on), 0, 0.20 * on);        // lead leg thrown forward, heel skimming
      set('leftKnee', 0.34 * on + 0.05);
      set('leftAnkle', -0.40 * on);
      set('rightHip', 0.30 * on, 0, -0.16 * on);         // trailing shin folds under the knee
      set('rightKnee', 1.80 * on + 0.05);
      set('rightAnkle', 0.50 * on);
      set('leftShoulder', -0.62 * on, 0, 0.40 * on);
      set('rightShoulder', 1.05 * on, 0, -0.52 * on);    // trailing arm back for balance
      set('leftElbow', -0.95 * on);
      set('rightElbow', -0.30 * on);
      set('hips', -0.10 * on, 0, 0);
      set('spine', 0.48 * on, 0.10 * on, -turn * 0.10);  // the chest comes down over the lead knee
      set('chest', 0.36 * on, 0.10 * on, -turn * 0.10);
      set('head', -0.62 * on);
      this.bob = -0.02;
      // pitch reclines the figure about the HIPS; drop takes the hips down to about half a metre
      return { pitch: -0.34 * on, drop: -0.45 * on };
    },

    /** A standing pose for the menu, so the attract screen is not a T-pose. */
    idle() {
      this.phase = 0.14;
      this._state = 'run';
      this.pose({ speed: 0, speedN: 0.12, turn: 0, state: 'run', t: 0, dt: 1 });
      this.bob = 0;
    },
  };
  return rig;
}

// ---------------------------------------------------------------- screen box
/**
 * The hero's box on screen, in pixels.
 *
 * Built from each mesh's cached bounding SPHERE rather than from Box3.setFromObject, which unions
 * the axis-aligned box of every rotated part and inflates a running figure by a good margin (see
 * docs/traps.md). A sphere is rotation-invariant, so the union is tight and honest.
 */
function makeScreenBox(THREE, root) {
  const box = new THREE.Box3();
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  let meshes = null;
  return function screenBox(camera, renderer) {
    if (!camera || !renderer) return [0, 0, 0, 0];
    if (!meshes) { meshes = []; root.traverse((o) => { if (o.isMesh && o.geometry) meshes.push(o); }); }
    root.updateMatrixWorld(true);
    box.makeEmpty();
    for (const m of meshes) {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const bs = m.geometry.boundingSphere;
      if (!bs) continue;
      c.copy(bs.center).applyMatrix4(m.matrixWorld);
      // world radius: the largest axis scale on the mesh's own world matrix
      const e = m.matrixWorld.elements;
      const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
      const r = bs.radius * Math.max(sx, sy, sz);
      box.expandByPoint(v.set(c.x - r, c.y - r, c.z - r));
      box.expandByPoint(v.set(c.x + r, c.y + r, c.z + r));
    }
    if (box.isEmpty()) return [0, 0, 0, 0];
    const size = renderer.getSize(new THREE.Vector2());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, behind = 0;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      v.project(camera);
      if (v.z > 1) behind++;
      const px = (v.x * 0.5 + 0.5) * size.x;
      const py = (1 - (v.y * 0.5 + 0.5)) * size.y;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    if (behind === 8) return [0, 0, 0, 0];
    return [Math.round(minX), Math.round(minY), Math.round(maxX - minX), Math.round(maxY - minY)];
  };
}

// ---------------------------------------------------------------- the player
export async function createPlayer(THREE, scene, lane, opts = {}) {
  const P = {
    height: 1.75, baseSpeed: 9.0, startSpeed: 6.5, accel: 3.2, brakeOnHit: 0.45,
    strafe: 7.5, vaultHeight: 1.05, vaultTime: 0.55, slideTime: 0.7, slideHeight: 0.85,
    stumbleTime: 0.6, ...opts,
  };
  const lanes = (lane && lane.lanes) || LANE.lanes;
  const halfWalk = LANE.halfWalk;

  const fig = await loadArticulated(THREE, './assets/hero_runner.js', P.height);
  bakeArticulated(THREE, fig);
  retint(fig.object, HERO_HUE_FROM, HERO_HUE);
  const rig = makeRig(THREE, fig);
  const object = new THREE.Group();
  object.name = 'hero';
  object.rotation.order = 'YXZ';        // heading, then pitch, then bank. XYZ mixes them up.
  object.add(fig.object);
  scene.add(object);
  rig.idle();

  // --- the rim. Behind and above the runner, so the edge it draws is the silhouette the camera
  // sees. It rides in its own group that follows POSITION only: parented to the hero it would
  // swing with the bank and swim with the slide pitch, and the rim would slide off the shoulder
  // at exactly the moments the frame is busiest.
  // Spots, not point lights, and this is the whole reason: a point light behind and above the
  // runner is closer to the tarpaulin canopy at 3.6 m than it is to the shoulders it is meant to
  // light, so it paints a cyan blob that travels along the awnings with the player. A cone aimed
  // DOWN at the runner cannot reach the canopy at all, and what it does spill lands on the road
  // right behind him, which is wet asphalt and wanted the light anyway.
  const rimRig = new THREE.Group();
  rimRig.name = 'heroRim';
  const rimAim = new THREE.Object3D();
  rimAim.position.set(0, 1.12, 0);
  rimRig.add(rimAim);
  const rimKey = new THREE.SpotLight(SEP.rimColour, SEP.rimKey, SEP.rimRange, 0.62, 0.85, 2);
  rimKey.position.set(0.72, 2.30, 1.95);
  rimKey.target = rimAim;
  const rimFill = new THREE.SpotLight(SEP.rimColour, SEP.rimFill, SEP.rimRange, 0.70, 0.9, 2);
  rimFill.position.set(-0.86, 1.95, 1.55);
  rimFill.target = rimAim;
  rimRig.add(rimKey, rimFill);
  scene.add(rimRig);

  // --- ground contact. Not parented to the hero either: it stays flat on the road whatever the
  // body is doing, and a shadow that banks with the runner reads as a sticker.
  const contact = new THREE.Group();
  contact.name = 'heroContact';
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: radialTexture(THREE, 1.7), color: 0x000000, transparent: true,
      depthWrite: false, fog: true, toneMapped: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.012;
  shadowMesh.renderOrder = 2;
  const smearMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: smearTexture(THREE), color: HERO_HUE, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false,
    }),
  );
  smearMesh.rotation.x = -Math.PI / 2;
  smearMesh.position.y = 0.018;
  smearMesh.renderOrder = 3;
  contact.add(shadowMesh, smearMesh);
  scene.add(contact);

  const screenBox = makeScreenBox(THREE, fig.object);

  // radii used for contact. The figure is about 0.5 m across the shoulders.
  const HALF_W = 0.34, HALF_D = 0.36;
  // "already resolved" is stamped ON the obstacle keyed by its own z, not held in a WeakSet: the
  // lane streams and may pool these objects, and a pooled object carrying a stale flag would eat
  // the next real collision silently.
  const isSeen = (o) => o.__runSeen === o.z;
  const markSeen = (o) => { o.__runSeen = o.z; };
  const markNear = (o) => { o.__runNear = o.z; };
  const wasNear = (o) => o.__runNear === o.z;

  const api = {
    object,
    rig,
    pos: { x: 0, y: 0, z: 0 },
    speed: P.startSpeed,
    lane: 0,
    state: 'run',
    vx: 0,
    turn: 0,
    airborne: false,
    impact: 0,          // 0..1, decays. chase.js shakes the camera with this.
    lastHit: null,
    topples: [],        // {x, z} of every pile knocked over, consumed by chase.js
    screenBox,
    height: P.height,
    hit,
    caughtBy,
  };

  let stateT = 0, cool = 0, t = 0;
  let vaultY = 0, pitch = 0, drop = 0, bank = 0, headingY = 0;

  const C = () => (typeof window !== 'undefined' && window.__COUNT__) || null;
  const fire = (name) => { const c = C(); if (c && c[name]) c[name](); };

  function hit(kind) {
    if (api.state === 'caught') return;
    api.speed = Math.max(2.0, api.speed * P.brakeOnHit);
    api.state = 'stumble';
    stateT = 0;
    api.impact = 1;
    api.lastHit = kind;
  }

  function caughtBy() {
    api.state = 'caught';
    stateT = 0;
  }

  function startVault() {
    if (api.state !== 'run' || cool > 0) return;
    api.state = 'vault'; stateT = 0; cool = 0.12;
    api.speed = Math.min(P.baseSpeed * 1.06, api.speed + 0.5);
  }
  function startSlide() {
    if (api.state !== 'run' || cool > 0) return;
    api.state = 'slide'; stateT = 0; cool = 0.12;
    api.speed = Math.min(P.baseSpeed * 1.08, api.speed + 0.8);
  }

  /** The clearance height of the hero right now, for deciding what he passes over or under. */
  function chestHeight() {
    if (api.state === 'slide') return P.slideHeight * 0.55;
    return P.height;
  }

  function collide(dt) {
    const obs = lane && lane.obstacles;
    if (!obs || !obs.length) return;
    const z = api.pos.z, x = api.pos.x;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (!o || isSeen(o)) continue;
      const dz = o.z - z;
      if (dz > 3 || dz < -3) continue;                            // cheap reject
      const halfD = (o.halfD || 0.5) + HALF_D;
      const halfW = (o.halfW || 0.5) + HALF_W;
      const dx = Math.abs(o.x - x);
      const overlapZ = Math.abs(dz) < halfD;
      if (overlapZ && dx < halfW) {
        markSeen(o);
        const h = o.height || 0.9;
        if (o.kind === 'topple') {
          // A reward, not a punishment: barely any speed cost, and it slows the chase.
          api.speed *= 0.985;
          api.topples.push({ x: o.x, z: o.z, t });
          if (lane.topple) lane.topple(o);
          fire('topple');
          api.impact = Math.max(api.impact, 0.35);
        } else if (o.kind === 'vault') {
          if (api.state === 'vault' && api.pos.y > h * 0.55) { fire('vault'); }
          else { hit('vault'); }
        } else if (o.kind === 'duck') {
          if (api.state === 'slide' && chestHeight() < (o.height || 1.2)) { fire('slide'); }
          else { hit('duck'); }
        } else {
          hit('block');
        }
      } else if (overlapZ) {
        // no contact. Was it close?
        if (dx - halfW < 0.6) markNear(o);
      } else if (dz < -halfD) {
        markSeen(o);
        if (wasNear(o) && o.kind !== 'topple') { fire('dodge'); api.impact = Math.max(api.impact, 0.18); }
      }
    }
  }


  /**
   * Everything that makes the runner findable, per frame. Position only: none of it takes the
   * hero's rotation, because a rim that banks slides off the shoulder and a contact shadow that
   * banks reads as a sticker.
   */
  function separation() {
    const air = clamp(vaultY / Math.max(0.2, P.vaultHeight), 0, 1);
    const grounded = 1 - air;
    const sliding = api.state === 'slide' ? 1 : 0;

    rimRig.position.set(api.pos.x, Math.max(0, api.pos.y) * 0.7, api.pos.z);
    // a little lateral lead, so the lit edge stays on the shoulder that is turning into frame
    rimKey.position.x = 0.72 - api.turn * 0.38;
    rimFill.position.x = -0.86 - api.turn * 0.38;

    contact.position.set(api.pos.x, 0, api.pos.z + 0.06);
    shadowMesh.scale.set(
      SEP.shadowW * (1 + 0.40 * sliding) * (1 - 0.30 * air),
      SEP.shadowD * (1 + 0.80 * sliding) * (1 - 0.30 * air),
      1,
    );
    // it lifts off the ground with the vault rather than vanishing: a shadow that blinks out is
    // worse than one that stays, and this is the only cue that says how high he is.
    shadowMesh.material.opacity = SEP.shadowAlpha * (0.22 + 0.78 * grounded * grounded);

    const len = SEP.smearLen * (1 + 0.30 * sliding);
    smearMesh.scale.set(SEP.smearW * (1 + 0.25 * sliding), len, 1);
    smearMesh.position.z = -len / 2;
    smearMesh.material.opacity = SEP.smearAlpha * (0.25 + 0.75 * grounded);
  }

  function update(dt, input, laneRef) {
    if (laneRef) lane = laneRef;
    input = input || {};
    t += dt;
    stateT += dt;
    cool = Math.max(0, cool - dt);
    api.impact = Math.max(0, api.impact - dt * 2.4);

    if (api.state === 'caught') {
      rig.pose({ speed: 0, speedN: 0.2, turn: 0, state: 'stumble', u: 1, t, dt });
      api.speed = damp(api.speed, 0, 6, dt);
      object.position.set(api.pos.x, api.pos.y, api.pos.z);
      separation();
      return;
    }

    // ---- state timers
    if (api.state === 'vault' && stateT >= P.vaultTime) { api.state = 'run'; stateT = 0; }
    if (api.state === 'slide' && stateT >= P.slideTime) { api.state = 'run'; stateT = 0; }
    if (api.state === 'stumble' && stateT >= P.stumbleTime) { api.state = 'run'; stateT = 0; }

    if (input.jump) startVault();
    if (input.slide) startSlide();

    // ---- speed. Not running is what gets you caught, so the gap between jog and sprint is real.
    const want = api.state === 'stumble' ? P.baseSpeed * 0.34
      : input.run ? P.baseSpeed : P.baseSpeed * 0.62;
    // Getting back up is faster than being knocked down. A single clip costs a stumble plus the
    // whole climb back to pace, and against a pack surging at CHASE.surge that adds up to about
    // ten metres of gap per hit at the plain accel: two hits and the run is over wherever it
    // happened. The cost of the hit stays; the tail of it does not.
    const rate = api.speed < want
      ? P.accel * (api.speed < P.baseSpeed * 0.7 ? 1.9 : 1)
      : P.accel * 1.8;
    api.speed += clamp(want - api.speed, -rate * dt, rate * dt);

    // ---- lateral. Continuous x, not snapped: a player can hold a line between two lanes.
    const steer = clamp(input.steer || 0, -1, 1);
    const control = api.state === 'vault' ? 0.45 : api.state === 'slide' ? 0.5
      : api.state === 'stumble' ? 0.3 : 1;
    const wantVx = steer * P.strafe * control;
    api.vx = damp(api.vx, wantVx, 12, dt);
    const nx = clamp(api.pos.x + api.vx * dt, -halfWalk, halfWalk);
    if (nx !== api.pos.x + api.vx * dt) api.vx *= 0.3;    // scrubbing the edge kills the drift
    const moved = Math.hypot(nx - api.pos.x, api.speed * dt);
    api.pos.x = nx;
    api.pos.z += api.speed * dt;

    // nearest running line, for the HUD and the gate: -1 | 0 | 1
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < lanes.length; i++) { const d = Math.abs(lanes[i] - api.pos.x); if (d < bestD) { bestD = d; bestI = i; } }
    api.lane = clamp(Math.round(bestI - (lanes.length - 1) / 2), -1, 1);

    // ---- the cycle, driven by distance
    const speedN = clamp((api.speed - 3.5) / (P.baseSpeed - 3.5), 0, 1);
    const steps = rig.advance(moved, speedN);
    if (steps > 0 && (api.state === 'run' || api.state === 'stumble')) {
      for (let i = 0; i < steps; i++) fire('step');
    }

    // ---- vault arc
    if (api.state === 'vault') {
      const u = clamp(stateT / P.vaultTime, 0, 1);
      vaultY = P.vaultHeight * 4 * u * (1 - u) * 1.0;
      api.airborne = vaultY > 0.15;
    } else {
      vaultY = damp(vaultY, 0, 14, dt);
      api.airborne = false;
    }

    // ---- lean into the turn. The runner banks and aims slightly where he is going; a figure
    // that stays bolt upright while sliding sideways is the tell that nothing is simulated.
    api.turn = damp(api.turn, clamp(api.vx / P.strafe, -1, 1), 9, dt);
    bank = damp(bank, -api.turn * 0.26, 10, dt);
    headingY = damp(headingY, Math.atan2(api.vx, Math.max(2, api.speed)) * 0.55, 10, dt);

    const u = api.state === 'vault' ? clamp(stateT / P.vaultTime, 0, 1)
      : api.state === 'slide' ? clamp(stateT / P.slideTime, 0, 1)
        : api.state === 'stumble' ? 1 - clamp(stateT / P.stumbleTime, 0, 1) : 0;
    const out = rig.pose({ speed: api.speed, speedN, turn: api.turn, state: api.state, u, t, dt });

    pitch = damp(pitch, out.pitch || 0, 18, dt);
    drop = damp(drop, out.drop || 0, 18, dt);

    // A pitched figure has to rotate about its HIPS. The group's origin is at the feet, so pitching
    // it there swings the whole body backwards through the air and the slide never gets low: the
    // first version of this also clamped y at 0, which threw the chest drop away entirely and left
    // a figure that ran under a rack standing upright. Compensate the root so the hip stays put.
    const hipY = P.height * 0.52;
    const cy = hipY * (1 - Math.cos(pitch));
    const cz = -hipY * Math.sin(pitch);
    api.pos.y = Math.max(-0.03, Math.max(0, vaultY) + rig.bob + cy + drop);
    object.position.set(api.pos.x, api.pos.y, api.pos.z + cz);
    object.rotation.set(pitch, headingY, bank);

    separation();
    collide(dt);
  }

  api.update = update;
  object.position.set(0, 0, 0);
  return api;
}
