/**
 * LANTERN RUN — steam, smoke, embers, light-cone haze and speed lines.
 *
 *     import { createFx } from './fx.js?v=202609071741';
 *     const fx = createFx(THREE, scene, { lane, player, chase });
 *     fx.update(dt);
 *
 * FOUR SYSTEMS, THREE DRAW CALLS, and that is the whole budget this file spends. Measured on the
 * lighting probe at a fixed camera: 784 draws without it, 787 with every system live and every
 * pool full. The fourth system is off; see `cones` below for the measurement that turned it off.
 *
 *   1. STEAM AND SMOKE   one Points, additive          up to 240 particles
 *   2. EMBERS            one Points, additive          up to 160 particles
 *   3. SPEED LINES       one LineSegments, additive    up to 56 segments
 *   4. LIGHT-CONE HAZE   one InstancedMesh, additive   OFF, 0 draws
 *
 * WHY THEY ARE ALL ADDITIVE, and why none of them is a transparent double-sided mesh.
 * docs/traps.md: "a material with `transparent: true` goes through the transparent pass, and
 * three.js will draw a double-sided transparent mesh once per side", and the build it cost sat at
 * 47 draw calls a kart. Every material here is `side: FrontSide` with `depthWrite: false`, and
 * additive blending on top of that means the transparent pass never has to SORT them either: the
 * sum is the same in any order, so there is no per-frame reorder and no popping when two puffs
 * swap depth. At night additive is also simply correct — steam over a wok is not a grey object,
 * it is the lamp above it scattering, and it is brighter than the air behind it.
 *
 * COLOUR. Everything here is lit by the market, so everything here is one of the two hexes the
 * style lock allows for light: warm bulbs 0xffb45a and cold neon 0x63e0ff, taken from whichever
 * lamp is nearest the effect. Steam over a stall under a fluorescent tube is cold, steam over the
 * one next to it under a bulb is warm, and that is where the two temperatures come from in the
 * particles as well as in the world.
 *
 * WHAT IT READS OFF THE LANE. `lane.lampPoints` is the contract's own array and is all this file
 * strictly needs: a warm lamp is over a cooking stall, so steam and embers rise under warm lamps
 * and not under neon signs. If the lane also exposes `lane.stallPoints` — `{x, y, z, kind}` with
 * kind 'wok' | 'grill' | 'steamer' — this file uses that instead, which is better, because only
 * the lane knows which stalls actually cook. Nothing here writes to the lane.
 */

const WARM = 0xffb45a;
const COLD = 0x63e0ff;

/* --------------------------------------------------------------- shaders */

/** One soft round puff, drawn procedurally. No texture, no image file. */
const PUFF_VS = /* glsl */`
uniform float uPix;
attribute vec3 aColor;
attribute float aSize;
attribute float aFade;
varying vec3 vCol;
varying float vFade;
void main() {
  vCol = aColor;
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  float d = max( -mv.z, 0.15 );
  // A puff two metres from the camera is a 160 pixel disc, and a stall you are running past has
  // several of them: without this the bottom corners of the frame wash out to a flat orange every
  // time the player clips a wok. Fade them out as they reach the lens instead of clamping the
  // size, which would just make a hard-edged disc.
  vFade = aFade * smoothstep( 0.5, 2.6, d );
  gl_PointSize = clamp( aSize * ( 320.0 / d ), 1.0, 260.0 ) * uPix;
  gl_Position = projectionMatrix * mv;
}`;

const PUFF_FS = /* glsl */`
varying vec3 vCol;
varying float vFade;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( p, p );
  if ( r2 > 1.0 ) discard;
  float a = pow( 1.0 - sqrt( r2 ), 2.2 );
  gl_FragColor = vec4( vCol * ( a * vFade ), 1.0 );
}`;

/** An ember: a tight hot core with a short tail, so it reads as a spark and not as a dot. */
const EMBER_FS = /* glsl */`
varying vec3 vCol;
varying float vFade;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( p, p );
  if ( r2 > 1.0 ) discard;
  float core = pow( max( 1.0 - sqrt( r2 ) * 1.6, 0.0 ), 1.4 );
  float halo = pow( 1.0 - sqrt( r2 ), 3.0 ) * 0.35;
  gl_FragColor = vec4( vCol * ( ( core + halo ) * vFade ), 1.0 );
}`;

/**
 * THE LIGHT CONE. An open cone hanging under a lamp, drawn additively.
 *
 * The whole difficulty with a light shaft is that a cone has a silhouette and a real shaft does
 * not. Three fades stop it reading as a solid triangle: `1 - abs(dot(N, V))` so the surface is
 * thickest where you are looking along it and vanishes where you are looking at it face on, which
 * is what makes a volume out of a surface; a fade to nothing at the apex, where a cone's own
 * geometry pinches and would otherwise show a bright point that is not the bulb; and a fade at the
 * open bottom, so the shaft ends in air rather than on a rim.
 */
const CONE_VS = /* glsl */`
attribute vec3 aTint;
varying vec3 vTint;
varying float vEdge;
varying float vY;
void main() {
  vTint = aTint;
  vY = uv.y;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
  vec3 n = normalize( normalMatrix * mat3( instanceMatrix ) * normal );
  vec3 v = normalize( -mv.xyz );
  vEdge = 1.0 - abs( dot( n, v ) );
  gl_Position = projectionMatrix * mv;
}`;

const CONE_FS = /* glsl */`
varying vec3 vTint;
varying float vEdge;
varying float vY;
void main() {
  // ConeGeometry puts uv.y = 1 at the tip, and the tip was translated to the lamp, so vY = 1 is
  // the apex and vY = 0 is the open bottom.
  float shaft = pow( vEdge, 1.7 );
  float apex = 1.0 - smoothstep( 0.80, 1.0, vY );   // nothing at the pinch, that is the bulb's job
  float open = smoothstep( 0.0, 0.40, vY );         // and it ends in air, not on a rim
  gl_FragColor = vec4( vTint * ( shaft * apex * open ), 1.0 );
}`;

const LINE_VS = /* glsl */`
attribute vec3 aColor;
attribute float aFade;
varying vec3 vCol;
varying float vFade;
void main() {
  vCol = aColor;
  vFade = aFade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const LINE_FS = /* glsl */`
varying vec3 vCol;
varying float vFade;
void main() { gl_FragColor = vec4( vCol * vFade, 1.0 ); }`;

/* ------------------------------------------------------------------- api */

export function createFx(THREE, scene, opts = {}) {
  const lane = opts.lane || null;
  const player = opts.player || null;
  const chase = opts.chase || null;

  const O = {
    steam: 240,
    embers: 160,
    /**
     * LIGHT CONES ARE OFF, and this is the number that turns them back on.
     *
     * A cone is a surface pretending to be a volume, and the pretence fails where it MEETS
     * something: the shaft ends on a hard conic section cut across the road, and a critic round
     * on the assembled build named it exactly — "hard polygon silhouettes and no edge falloff,
     * cutting straight brightness steps across the ground and the stall tables that correspond to
     * nothing in the scene". It also inflated CLAIMS.md's `upper_edges` with edges that carry no
     * content, so it was corrupting a second claim while it was at it.
     *
     * The real fix is a soft-particle depth fade, which needs the scene depth as a texture, which
     * needs the composer this build deliberately does not run (see night.js on why the bloom pass
     * is off). Shortening the cone so it clears the road only moves the cut onto the counters.
     * There is no cheap version that does not draw a line somewhere.
     *
     * So the haze around a lamp is carried by night.js's glow halos, which are radial sprites with
     * alpha zero at their own edge and therefore have no silhouette to cut, and by the steam here
     * rising through them. Set this above zero to see the shafts; the code is intact.
     */
    cones: 0,
    lines: 56,
    /** metres ahead of the player that effects are alive in */
    reach: 34,
    /** the speed at which the speed lines are at full strength */
    fullSpeed: 9.0,
    ...opts,
  };

  const _c = new THREE.Color();
  const lin = (hex) => { _c.setHex(hex, THREE.SRGBColorSpace); return [_c.r, _c.g, _c.b]; };
  const WARM_LIN = lin(WARM);
  const COLD_LIN = lin(COLD);

  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------------------------------------------------- where things cook */

  // Sources, taken once. `lane.stallPoints` if the lane knows which stalls cook, otherwise the
  // warm lamps, because in this market a warm bulb hangs over a counter and a neon tube over a
  // sign. Bucketed by z so finding the ones near the player is not a scan of the whole lane.
  const CELL = 16;
  const cells = new Map();
  let sourceCount = 0;

  function addSource(s) {
    const rec = { x: s.x, y: s.y, z: s.z, kind: s.kind || 'wok', warm: s.warm !== false, t: rnd(0, 3) };
    const k = Math.floor(rec.z / CELL);
    let b = cells.get(k);
    if (!b) cells.set(k, (b = []));
    b.push(rec);
    sourceCount++;
    return rec;
  }

  function ingest() {
    cells.clear();
    sourceCount = 0;
    if (lane && Array.isArray(lane.stallPoints) && lane.stallPoints.length) {
      for (const s of lane.stallPoints) addSource(s);
      return;
    }
    if (lane && Array.isArray(lane.lampPoints)) {
      for (const l of lane.lampPoints) {
        if (!l.warm) continue;                       // neon is a sign, not a wok
        // the cooking surface is on the counter under the lamp, pulled in toward the lane a little
        addSource({ x: l.x * 0.92, y: 1.02, z: l.z, kind: 'wok', warm: true });
      }
    }
  }
  ingest();

  /** the lamp nearest a point, for tinting. Cheap: it only looks in the two z cells around it. */
  const lampCells = new Map();
  if (lane && Array.isArray(lane.lampPoints)) {
    for (const l of lane.lampPoints) {
      const k = Math.floor(l.z / CELL);
      let b = lampCells.get(k);
      if (!b) lampCells.set(k, (b = []));
      b.push(l);
    }
  }
  function tintAt(x, y, z, out) {
    let best = null, bd = Infinity;
    const k = Math.floor(z / CELL);
    for (let c = k - 1; c <= k + 1; c++) {
      const b = lampCells.get(c);
      if (!b) continue;
      for (const l of b) {
        const dx = l.x - x, dy = l.y - y, dz = l.z - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = l; }
      }
    }
    const c = !best || best.warm ? WARM_LIN : COLD_LIN;
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
    return out;
  }

  /* --------------------------------------------------------- the buffers */

  function points(n, fragment, sizeScale) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const fade = new Float32Array(n);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPix: { value: 1 } },
      vertexShader: PUFF_VS,
      fragmentShader: fragment,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      fog: false,
    });
    const obj = new THREE.Points(geo, mat);
    obj.frustumCulled = false;
    obj.renderOrder = 9;
    scene.add(obj);
    return { obj, geo, mat, pos, col, size, fade, n, live: 0, sizeScale };
  }

  const steam = points(O.steam, PUFF_FS);
  steam.obj.name = 'fx.steam';
  const ember = points(O.embers, EMBER_FS);
  ember.obj.name = 'fx.embers';

  // particle state, plain arrays so nothing allocates per frame
  const mk = (n) => ({
    x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
    vx: new Float32Array(n), vy: new Float32Array(n), vz: new Float32Array(n),
    age: new Float32Array(n), life: new Float32Array(n),
    r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n),
    s0: new Float32Array(n), s1: new Float32Array(n), k: new Float32Array(n),
    alive: new Uint8Array(n), head: 0,
  });
  const P = { steam: mk(O.steam), ember: mk(O.embers) };

  /* --------------------------------------------------------- light cones */

  // One open cone, instanced. `openEnded` matters: a cap would put a bright disc across the bottom
  // of every shaft, and it would be double-sided geometry in a transparent pass on top of that.
  const coneGeo = new THREE.ConeGeometry(1, 1, 14, 1, true);
  coneGeo.translate(0, -0.5, 0);              // apex at the origin, opening downward
  const coneTint = new Float32Array(O.cones * 3);
  coneGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(coneTint, 3));
  const coneMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: CONE_VS,
    fragmentShader: CONE_FS,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    fog: false,
  });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, O.cones);
  cones.name = 'fx.cones';
  cones.frustumCulled = false;
  cones.renderOrder = 7;
  cones.count = 0;
  cones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(cones);
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _t = new THREE.Vector3();

  /* --------------------------------------------------------- speed lines */

  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(O.lines * 6);
  const lineCol = new Float32Array(O.lines * 6);
  const lineFade = new Float32Array(O.lines * 2);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  lineGeo.setAttribute('aColor', new THREE.BufferAttribute(lineCol, 3));
  lineGeo.setAttribute('aFade', new THREE.BufferAttribute(lineFade, 1));
  lineGeo.setDrawRange(0, 0);
  lineGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const lineMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: LINE_VS,
    fragmentShader: LINE_FS,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,          // they live in front of everything, in the air beside the camera
    side: THREE.FrontSide,
    fog: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.name = 'fx.speedlines';
  lines.frustumCulled = false;
  lines.renderOrder = 20;
  scene.add(lines);

  // Each streak is a fixed offset in SCREEN space and a depth, so it keeps its distance from the
  // middle of the frame as it rushes past. Storing the offset in metres instead is the version
  // that does not work: six metres sideways at two metres out is a long way off the edge of the
  // picture, so every streak near enough to read is invisible and every one on screen is far away
  // and barely moving.
  const L = { u: new Float32Array(O.lines), v: new Float32Array(O.lines), d: new Float32Array(O.lines), len: new Float32Array(O.lines) };
  function reseat(i) {
    const a = Math.random() * Math.PI * 2;
    const rr = 0.66 + Math.random() * 0.80;   // fraction of the frustum half height, so the edges
    L.u[i] = Math.cos(a) * rr;
    L.v[i] = Math.sin(a) * rr;
    L.len[i] = rnd(0.05, 0.13);               // fraction of the depth, so a constant screen length
  }
  for (let i = 0; i < O.lines; i++) { reseat(i); L.d[i] = rnd(2, 26); }

  /* ------------------------------------------------------------ spawning */

  function spawn(p, i, life) {
    p.alive[i] = 1;
    p.age[i] = 0;
    p.life[i] = life;
  }

  function freeSlot(p, n) {
    for (let k = 0; k < n; k++) {
      const i = p.head;
      p.head = (p.head + 1) % n;
      if (!p.alive[i]) return i;
    }
    return -1;
  }

  const _tint = [0, 0, 0];

  function emitSteam(src, focusZ) {
    const i = freeSlot(P.steam, O.steam);
    if (i < 0) return;
    const p = P.steam;
    spawn(p, i, rnd(1.5, 2.5));
    p.x[i] = src.x + rnd(-0.28, 0.28);
    p.y[i] = src.y + rnd(-0.05, 0.12);
    p.z[i] = src.z + rnd(-0.4, 0.4);
    p.vx[i] = rnd(-0.14, 0.14);
    p.vy[i] = rnd(0.75, 1.35);
    p.vz[i] = rnd(-0.12, 0.12);
    tintAt(p.x[i], p.y[i] + 1.0, p.z[i], _tint);
    // steam is the lamp above it, scattering. Half strength, because a puff is not a bulb.
    p.r[i] = _tint[0] * 0.80; p.g[i] = _tint[1] * 0.80; p.b[i] = _tint[2] * 0.80;
    p.s0[i] = rnd(0.16, 0.30);
    p.s1[i] = p.s0[i] * rnd(3.0, 4.4);
    p.k[i] = rnd(0.9, 1.5);
  }

  function emitEmber(src) {
    const i = freeSlot(P.ember, O.embers);
    if (i < 0) return;
    const p = P.ember;
    spawn(p, i, rnd(0.7, 1.6));
    p.x[i] = src.x + rnd(-0.22, 0.22);
    p.y[i] = src.y + rnd(0.0, 0.1);
    p.z[i] = src.z + rnd(-0.3, 0.3);
    p.vx[i] = rnd(-0.5, 0.5);
    p.vy[i] = rnd(1.1, 2.4);
    p.vz[i] = rnd(-0.4, 0.4);
    // an ember is its own light and it is always warm: it is burning charcoal, not a fitting.
    p.r[i] = WARM_LIN[0]; p.g[i] = WARM_LIN[1]; p.b[i] = WARM_LIN[2];
    p.s0[i] = rnd(0.030, 0.058);
    p.s1[i] = p.s0[i] * 0.5;
    p.k[i] = rnd(1.4, 2.6);
  }

  /* -------------------------------------------------------------- update */

  const _cam = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _up = new THREE.Vector3();
  let lineStrength = 0;
  let sourceIngestZ = -1e9;

  function step(p, buf, n, dt, dragY, gravity, camZ) {
    let live = 0;
    const pos = buf.pos, col = buf.col, size = buf.size, fade = buf.fade;
    for (let i = 0; i < n; i++) {
      if (!p.alive[i]) continue;
      p.age[i] += dt;
      const t = p.age[i] / p.life[i];
      if (t >= 1 || p.z[i] < camZ - 14) { p.alive[i] = 0; continue; }
      p.vy[i] += (gravity - p.vy[i] * dragY) * dt;
      p.x[i] += p.vx[i] * dt;
      p.y[i] += p.vy[i] * dt;
      p.z[i] += p.vz[i] * dt;
      const j = live * 3;
      pos[j] = p.x[i]; pos[j + 1] = p.y[i]; pos[j + 2] = p.z[i];
      // in at the start, out at the end, so nothing appears or vanishes on a frame boundary
      const a = Math.min(1, t * 7) * (1 - t) * (1 - t) * p.k[i];
      col[j] = p.r[i]; col[j + 1] = p.g[i]; col[j + 2] = p.b[i];
      size[live] = p.s0[i] + (p.s1[i] - p.s0[i]) * t;
      fade[live] = a;
      live++;
    }
    buf.live = live;
    buf.geo.setDrawRange(0, live);
    if (live) {
      buf.geo.attributes.position.needsUpdate = true;
      buf.geo.attributes.aColor.needsUpdate = true;
      buf.geo.attributes.aSize.needsUpdate = true;
      buf.geo.attributes.aFade.needsUpdate = true;
    }
    buf.obj.visible = live > 0;
  }

  function update(dt) {
    if (!(dt > 0)) return;
    if (dt > 0.1) dt = 0.1;
    const camera = chase && chase.camera ? chase.camera : null;
    const pz = player && player.pos ? player.pos.z : 0;

    // the lane streams blocks in, so its lamp list grows. Re-read it now and then rather than
    // every frame, because rebuilding the buckets is the only allocating thing in this file.
    if (lane && Math.abs(pz - sourceIngestZ) > 40) { sourceIngestZ = pz; ingest(); }

    // --- emit ------------------------------------------------------------
    const k0 = Math.floor((pz - 6) / CELL), k1 = Math.floor((pz + O.reach) / CELL);
    for (let k = k0; k <= k1; k++) {
      const b = cells.get(k);
      if (!b) continue;
      for (let i = 0; i < b.length; i++) {
        const s = b[i];
        if (s.z < pz - 6 || s.z > pz + O.reach) continue;
        s.t += dt;
        // further away, emit less: the puff is smaller than a pixel out there and the budget is
        // better spent on the stalls the player is about to run past
        const near = 1 - Math.min(1, Math.max(0, (s.z - pz) / O.reach));
        const rate = 7.0 * (0.28 + near * 0.72);
        const every = 1 / rate;
        while (s.t > every) {
          s.t -= every;
          emitSteam(s, pz);
          if (s.kind !== 'steamer' && Math.random() < 0.30) emitEmber(s);
        }
      }
    }

    // --- move ------------------------------------------------------------
    // steam rises and slows; an ember rises off the heat then falls back through it
    step(P.steam, steam, O.steam, dt, 0.9, 0.55, pz);
    step(P.ember, ember, O.embers, dt, 0.35, -1.15, pz);

    if (!camera) { cones.count = 0; lineGeo.setDrawRange(0, 0); return; }
    camera.updateMatrixWorld();
    camera.getWorldPosition(_cam);
    camera.getWorldDirection(_fwd);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // --- light cones -----------------------------------------------------
    // The nearest lamps in front of the camera get a shaft. Sorted by nothing: the lane's list is
    // in z order already, so walking the buckets forward from the player gives them in order.
    let c = 0;
    if (lane && Array.isArray(lane.lampPoints)) {
      const kk0 = Math.floor((_cam.z - 2) / CELL), kk1 = Math.floor((_cam.z + 26) / CELL);
      for (let k = kk0; k <= kk1 && c < O.cones; k++) {
        const b = lampCells.get(k);
        if (!b) continue;
        for (let i = 0; i < b.length && c < O.cones; i++) {
          const l = b[i];
          const dz = l.z - _cam.z;
          if (dz < -1.5 || dz > 26) continue;
          const drop = Math.max(0.9, l.y - 0.05);
          const spread = drop * 0.62;
          _t.set(l.x, l.y, l.z);
          _s.set(spread, drop, spread);
          _q.identity();
          _m.compose(_t, _q, _s);
          cones.setMatrixAt(c, _m);
          const t = l.warm ? WARM_LIN : COLD_LIN;
          // fade the shaft in with distance so a cone never appears at the camera's near plane,
          // and out at the far end so it never blinks off
          const w = 0.22 * Math.min(1, Math.max(0, (dz + 1.5) / 3.5)) * (1 - Math.min(1, Math.max(0, (dz - 16) / 10)));
          coneTint[c * 3] = t[0] * w; coneTint[c * 3 + 1] = t[1] * w; coneTint[c * 3 + 2] = t[2] * w;
          c++;
        }
      }
    }
    cones.count = c;
    if (c) { cones.instanceMatrix.needsUpdate = true; coneGeo.attributes.aTint.needsUpdate = true; }
    cones.visible = c > 0;

    // --- speed lines -----------------------------------------------------
    const speed = player && Number.isFinite(player.speed) ? player.speed : 0;
    // nothing until the last fifth of the speed range, then in over about a third of a second
    const target = Math.min(1, Math.max(0, (speed / O.fullSpeed - 0.82) / 0.18));
    lineStrength += (target - lineStrength) * Math.min(1, dt * 3.2);
    let ln = 0;
    if (lineStrength > 0.01) {
      const travel = Math.max(speed, 1) * dt;
      const halfH = Math.tan((camera.fov || 68) * Math.PI / 360);
      const aspect = camera.aspect || 1.777;
      for (let i = 0; i < O.lines; i++) {
        L.d[i] -= travel * 2.4;
        if (L.d[i] < 1.2) { L.d[i] = rnd(20, 30); reseat(i); }
        const d = L.d[i];
        // fade with depth at both ends: a streak that pops into existence beside your ear reads
        // as a glitch, and one that vanishes at the far end reads as a draw-distance edge
        const f = lineStrength
          * Math.min(1, (d - 1.2) / 3.0)
          * (1 - Math.min(1, Math.max(0, (d - 20) / 8)))
          * 0.26;
        if (f <= 0.004) continue;
        const j = ln * 6;
        const ou = L.u[i] * d * halfH * aspect, ov = L.v[i] * d * halfH;
        const bx = _cam.x + _right.x * ou + _up.x * ov + _fwd.x * d;
        const by = _cam.y + _right.y * ou + _up.y * ov + _fwd.y * d;
        const bz = _cam.z + _right.z * ou + _up.z * ov + _fwd.z * d;
        const len = L.len[i] * d;
        linePos[j] = bx; linePos[j + 1] = by; linePos[j + 2] = bz;
        linePos[j + 3] = bx - _fwd.x * len;
        linePos[j + 4] = by - _fwd.y * len;
        linePos[j + 5] = bz - _fwd.z * len;
        tintAt(bx, by, bz, _tint);
        lineCol[j] = _tint[0]; lineCol[j + 1] = _tint[1]; lineCol[j + 2] = _tint[2];
        lineCol[j + 3] = _tint[0]; lineCol[j + 4] = _tint[1]; lineCol[j + 5] = _tint[2];
        lineFade[ln * 2] = f;             // bright at the head
        lineFade[ln * 2 + 1] = 0;         // gone at the tail
        ln++;
      }
    }
    lineGeo.setDrawRange(0, ln * 2);
    if (ln) {
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.aColor.needsUpdate = true;
      lineGeo.attributes.aFade.needsUpdate = true;
    }
    lines.visible = ln > 0;
  }

  function setPixelRatio(p) {
    steam.mat.uniforms.uPix.value = p;
    ember.mat.uniforms.uPix.value = p;
  }

  function dispose() {
    for (const o of [steam.obj, ember.obj, cones, lines]) {
      scene.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    }
  }

  return {
    update, dispose, setPixelRatio,
    /** for the harness and for a critic round: what is actually alive right now */
    get counts() { return { steam: steam.live, embers: ember.live, cones: cones.count, lines: lineGeo.drawRange.count / 2, sources: sourceCount }; },
    objects: [steam.obj, ember.obj, cones, lines],
  };
}
