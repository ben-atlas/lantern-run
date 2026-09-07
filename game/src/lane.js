/**
 * LANTERN RUN — the market lane.
 *
 * 1100 m of packed night market along +Z, streamed in 22 m blocks.
 *
 * WHAT IS GENERATED AND WHY IT IS NOT A LIST OF COORDINATES
 * --------------------------------------------------------
 * Every prop position in this file comes out of a seeded generator, not out of a
 * table. `plan()` runs once at load and produces pure data for all 50 blocks:
 * the same seed gives the same lane on every machine and in every gate run,
 * whatever order the player visits the blocks in, because each block draws from
 * its own stream `mulberry32(hash32(seed, blockIndex))` and never from a shared
 * cursor.
 *
 * The repo's own warehouse example says flatly that placement rules do not
 * compose and that its layout is authored. That is true of a room you stand
 * still in. It is not true of a lane, because a lane composes along ONE axis: a
 * block is a sequence of bays, a bay is a recipe, and two recipes can never
 * overlap because each one owns a z slot. So the composition problem the example
 * hit — scattered crates landing inside racking — cannot arise here. What DOES
 * arise is fairness, and that is handled separately by a global obstacle
 * schedule (`planEvents`) which is the only part of the layout that has to reason
 * across block boundaries.
 *
 * THREE RANKS, because a lane with one rank reads as a corridor:
 *   rank 1  |x| 3.3 .. 4.0   the stall front you brush past: counters, stools,
 *                            crates, carts, prep tables
 *   rank 2  |x| 4.0 .. 6.9   the stall proper: awnings, grills, steam towers,
 *                            fish trestles, shutters
 *   rank 3  |x| 6.5 .. 9.5   facades and shopfronts, plus everything overhead:
 *                            canopy at 3.6, lantern strings, signs, cable poles
 *
 * COST
 * ----
 * Draw calls dominate, not triangles (docs/traps.md). Two things pay for this
 * lane: `bakeStatic()` PER BLOCK, never over the world, so frustum culling still
 * works; and `shareMaterial()` below, which snaps material colour back onto the
 * locked palette so the bake can collapse ACROSS asset types instead of only
 * within one. Without the second, a bake of ~110 props lands on ~90 meshes
 * because no two generated assets ever agree on a float.
 *
 * Anything that topples stays out of the bake, in `block.dyn`.
 */
import { ASSET, bakeStatic, assetSize } from '../assetlib.js?v=202609071741';
import { PALETTE } from './config.js?v=202609071741';

// ---------------------------------------------------------------- determinism
function hash32(a, b) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Deterministic value noise on the world plane. Used for wet patches and grime. */
function vnoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const h = (a, b) => (hash32(hash32(a, b), seed) >>> 8) / 16777216;
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
function fbm2(x, z, seed) {
  return vnoise(x, z, seed) * 0.6 + vnoise(x * 2.3, z * 2.3, seed + 7) * 0.27
    + vnoise(x * 5.1, z * 5.1, seed + 13) * 0.13;
}

// ---------------------------------------------------------------- asset roster
// hero_runner and pursuer_enforcer belong to the player agent, not here.
// tier: which bake a prop survives into.
//   0  structure and light: drawn at any distance. Facades, canopy, signs,
//      lanterns — the silhouette of the street and everything that glows, which
//      is what a lane 150 m long is MADE of when you are running down it.
//   1  the stall line: carts, tables, crates. Dropped past ~86 m.
//   2  the clutter on the counter: baskets, stools, bottles. Dropped past ~38 m,
//      where a 30 cm object is a handful of pixels through fog.
// This is docs/traps.md's "one view holds the whole level" answer. Seven blocks
// alive is 154 m of lane in frame at all times and no amount of trimming the
// assets fixes that; a second (here a third) bake per block does.
const ROSTER = {
  food_stall_awning:       { h: 2.90, tier: 0 },
  noodle_cart:             { h: 1.55, tier: 1 },
  skewer_grill_cart:       { h: 1.25, tier: 1 },
  fruit_stall_table:       { h: 1.00, tier: 1 },
  steam_basket_tower:      { h: 1.10, tier: 2 },
  shophouse_facade:        { h: 6.80, tier: 1 },
  rolled_shutter_shopfront:{ h: 3.20, tier: 1 },
  market_arch_gate:        { h: 5.40, tier: 0 },
  tarp_canopy_section:     { h: null, tier: 0 },   // native height; it is a sheet, not a tower
  cable_bundle_pole:       { h: 6.40, tier: 1 },
  paper_lantern_large:     { h: 0.78, tier: 0 },
  lantern_string_run:      { h: null, tier: 0 },
  neon_sign_box:           { h: 1.30, tier: 0 },
  clip_lamp_on_pole:       { h: 2.40, tier: 1 },
  hanging_duck_rack:       { h: 1.05, tier: 1 },
  produce_crate_stack:     { h: 1.10, tier: 2 },
  plastic_stool_stack:     { h: 0.95, tier: 2 },
  steel_prep_table:        { h: 0.92, tier: 1 },
  gas_cylinder_pair:       { h: 0.85, tier: 2 },
  wok_burner_stand:        { h: 0.85, tier: 2 },
  parked_scooter:          { h: 1.15, tier: 1 },
  rubbish_bag_pile:        { h: 0.82, tier: 2 },
  ice_fish_tray_trestle:   { h: 0.92, tier: 1 },
  water_barrel_blue:       { h: 0.88, tier: 2 },
};
// Measured, not chosen. See the report in stats(): with the real asset set a
// fully detailed block is ~470k triangles, a mid block ~270k and a far block
// ~110k, so what these three numbers are worth is the whole triangle budget.
// LANE.blocksAhead is 7, which is 154 m of lane; FogExp2 at NIGHT.fogDensity
// 0.0125 is 72% opaque at 90 m and 85% at 110 m, so everything past VIS_RANGE is
// drawn into fog and hidden outright.
const LOD = { near: 16, mid: 30, vis: 66 };
const ALWAYS_COARSE = new Set([
  'shophouse_facade', 'rolled_shutter_shopfront', 'cable_bundle_pole',
  'tarp_canopy_section', 'market_arch_gate',
]);
const NAMES = Object.keys(ROSTER);

/**
 * Assets that ought to glow. If one arrives with no declared `userData.lights`
 * we synthesise a point rather than shipping an emissive surface that lights
 * nothing, and say so in `report.synthesizedLights`.
 *
 * `at` is a FRACTION of the asset's native size, for props whose emitter sits
 * roughly at the middle of the thing. `abs` is the asset's OWN local space in
 * metres, for the two below, where the panel position was read out of the asset
 * source and guessing from a bounding box would have put the light in the wrong
 * place by a metre.
 *
 * shophouse_facade and rolled_shutter_shopfront were missing from this map
 * entirely, and they are the two assets that STAND ON THE APRON — the pavement
 * between the kerb and the stall fronts. Both carry the brightest surfaces in
 * most frames (emissive 0xffb45a at 1.7 and 0x63e0ff at 1.9) and neither cast a
 * single photon, which is why the apron was dark under lit shopfronts: the
 * frames showed the source and not its light, four rounds running.
 */
const EMITTERS = {
  paper_lantern_large: { warm: true, at: [0, 0.5, 0] },
  lantern_string_run:  { warm: true, at: [0, 0.45, 0] },
  neon_sign_box:       { warm: false, at: [0, 0.5, 0.6] },
  clip_lamp_on_pole:   { warm: true, at: [0, 0.9, 0] },
  skewer_grill_cart:   { warm: true, at: [0, 0.7, 0] },
  wok_burner_stand:    { warm: true, at: [0, 0.85, 0] },
  noodle_cart:         { warm: true, at: [0, 0.8, 0.2] },
  market_arch_gate:    { warm: true, at: [0, 0.8, 0] },
  food_stall_awning:   { warm: true, at: [0, 0.78, 0.1] },

  // The lit pocket behind the shutter: a 2.1 x 1.4 warm panel at local
  // (0, 2.0, -0.67), with the shop mouth at z = -0.05. The point sits just
  // inside the mouth so the light spills onto the pavement in front instead of
  // staying in the recess. The sign box beside it is the cold one.
  rolled_shutter_shopfront: { abs: [
    [0.00, 1.90, -0.10, true],
    [1.02, 2.70,  0.45, false],
  ] },
  // The facade's lantern row hangs at local y 2.66 across a 6.5 m front and its
  // neon strips sit at 2.62-2.98. Warm and cold are put on opposite sides of the
  // panel rather than on top of each other, so a tiled run of facades lays
  // alternating warm and cold pools along the apron instead of one colour.
  shophouse_facade: { abs: [
    [-1.40, 2.66, 0.55, true],
    [ 1.40, 2.80, 0.60, false],
  ] },
};

// ---------------------------------------------------------------- ground shape
// Camber, gutter, kerb. `groundY` is the single source of truth: the road mesh
// samples it, and every prop is dropped onto it so nothing floats or sinks.
const GUT = 3.34;      // gutter trough
const KERB = 3.62;     // kerb face
const KERB_TOP = 0.145;
function groundY(x) {
  const a = Math.abs(x);
  if (a <= 2.99) return 0.072 * (1 - (a / 2.99) ** 2);
  if (a <= GUT) return lerp(0, -0.055, (a - 2.99) / (GUT - 2.99));
  if (a <= KERB - 0.06) return lerp(-0.055, -0.018, (a - GUT) / (KERB - 0.06 - GUT));
  if (a <= KERB) return lerp(-0.018, KERB_TOP, (a - (KERB - 0.06)) / 0.06);
  return KERB_TOP + Math.min(0.06, (a - KERB) * 0.012);
}
// x sample line for the road strip: tight through the gutter and the kerb face,
// coarse everywhere it is flat. 47 columns, ~2k triangles for a 22 m block.
const ROAD_X = (() => {
  const half = [0, 0.5, 1.0, 1.5, 2.0, 2.45, 2.75, 2.99, 3.16, GUT, 3.46, KERB - 0.06, KERB,
    3.75, 4.1, 4.6, 5.2, 5.9, 6.7, 7.6, 8.6, 9.8];
  return [...half.slice(1).reverse().map((v) => -v), ...half];
})();

// ---------------------------------------------------------------- entry point
export async function buildLane(THREE, scene, opts = {}) {
  const L = {
    width: 7.0, halfWalk: 3.2, bayInner: 3.5, bayOuter: 5.7, blockLength: 22,
    blocksAhead: 7, blocksBehind: 2, length: 1100, canopyHeight: 3.6,
    lanes: [-2.1, 0, 2.1], seed: 20260907, ...opts,
  };
  const lane = new Lane(THREE, scene, L);
  await lane.load();
  lane.plan();
  await lane.prime();
  return lane;
}

class Lane {
  constructor(THREE, scene, L) {
    this.T = THREE; this.scene = scene; this.L = L;
    this.night = L.night || null;
    this.length = L.length;
    this.nBlocks = Math.ceil(L.length / L.blockLength) + 1;

    this.group = new THREE.Group();
    this.group.name = 'lane';
    // The contract says the caller adds this; src/main.js does not, so add it
    // here. scene.add on something already parented to the scene is a no-op.
    scene.add(this.group);

    this.protos = {}; this.coarse = {}; this.sizes = {}; this.lightDecl = {};
    this.matCache = new Map();
    this.blocks = new Map();          // index -> live block
    this.plans = [];                  // index -> plan data (all of them, always)
    this.obstacles = [];              // ALIVE obstacles, spliced on eviction
    this.emissives = [];
    this.lampPoints = [];
    this.registered = new Set();      // lamp keys already handed to night.js
    this.toppling = [];
    this.report = { missing: [], synthesizedLights: [], props: 0, blocks: 0 };
    this._sample = [];
    this._box = new THREE.Box3();   // reused by topple(), which measures a piece
                                    // in its final rotation to find where it rests
    this.lod = { ...LOD, ...(L.lod || {}) };
    this.assetBase = L.assetBase || new URL('../assets/', import.meta.url).href;
    this.texBase = L.texBase || new URL('../tex/', import.meta.url).href;
  }

  // ------------------------------------------------------------------- load
  async load() {
    const T = this.T;
    const url = (n) => new URL(n + '.js', this.assetBase).href;
    let done = 0;
    const onp = this.L.onProgress || (() => {});

    await Promise.all(NAMES.map(async (n) => {
      const o = await ASSET(url(n), { surfaces: true });
      // A prototype whose materials have been snapped onto the palette, so every
      // clone of it merges with clones of every other asset in the same block.
      this.shareMaterialsIn(o);
      this.protos[n] = o;
      this.sizes[n] = (await assetSize(url(n)).catch(() => null)) || new T.Vector3();

      // userData.lights is plain data, and the default merge throws plain data
      // away with the nodes it was attached to. A second load with
      // keepHierarchy: true is the only way to read it through ASSET, and it is
      // cheap: the module is already imported and the loader caches the tree.
      const tree = await ASSET(url(n), { keepHierarchy: true, surfaces: true });
      const pts = Array.isArray(tree.userData && tree.userData.lights) ? tree.userData.lights : null;
      // ASSET re-origins the built asset on an inner child. A point authored in
      // the asset's own space has to carry that offset or every lamp in the lane
      // sits somewhere slightly wrong and nothing warns.
      const off = tree.children[0] ? tree.children[0].position.clone() : new T.Vector3();

      // COARSE prototype: docs/traps.md, "when one view holds the whole level".
      // The same asset with every PART whose largest dimension is under ~25 cm
      // in world space removed, then merged. This is the part-level cut, not the
      // prop-level one — a facade keeps its wall and loses its brackets — and it
      // is what the trap says to reach for before touching an asset or
      // decimating anything. The tree only exists here because ASSET has to be
      // asked for it a second time to read userData.lights, so it is free.
      const hs = ROSTER[n].h && this.sizes[n].y > 1e-6 ? ROSTER[n].h / this.sizes[n].y : 1;
      const cut = [];
      tree.updateMatrixWorld(true);
      tree.traverse((m) => {
        if (!m.isMesh || !m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        const sc = m.getWorldScale(new T.Vector3());
        const d = Math.max((bb.max.x - bb.min.x) * Math.abs(sc.x),
                           (bb.max.y - bb.min.y) * Math.abs(sc.y),
                           (bb.max.z - bb.min.z) * Math.abs(sc.z)) * hs;
        if (d < 0.25) cut.push(m);
      });
      for (const m of cut) if (m.parent) m.parent.remove(m);
      tree.updateMatrixWorld(true);
      this.shareMaterialsIn(tree);
      const co = bakeStatic(tree);
      const wrap = new T.Group();
      wrap.add(co);
      this.coarse[n] = wrap;
      if (pts && pts.length) {
        this.lightDecl[n] = pts.map((p) => ({
          x: (p.x || 0) + off.x, y: (p.y || 0) + off.y, z: (p.z || 0) + off.z, warm: p.warm !== false,
        }));
      } else if (EMITTERS[n]) {
        const e = EMITTERS[n];
        const sz = this.sizes[n];
        this.lightDecl[n] = e.abs
          ? e.abs.map((a) => ({ x: a[0] + off.x, y: a[1] + off.y, z: a[2] + off.z, warm: a[3] }))
          : [{ x: e.at[0] * sz.x, y: e.at[1] * sz.y, z: e.at[2] * sz.z, warm: e.warm }];
        this.report.synthesizedLights.push(n);
      }
      done++; onp((done / NAMES.length) * 0.45);
    }));

    // HARD CHECK. docs/gates.md: a warning is not a gate, and a level that logs
    // "loaded empty" and carries on is how four rounds shipped broken. ASSET
    // returns an empty Group for a module that will not import, so measure what
    // actually arrived.
    for (const n of NAMES) {
      const o = this.protos[n];
      let tris = 0;
      o.traverse((m) => {
        if (m.isMesh && m.geometry && m.geometry.attributes.position) {
          tris += m.geometry.attributes.position.count / 3;
        }
      });
      const s = this.sizes[n];
      if (tris < 4 || !s || s.y < 1e-3) this.report.missing.push(n);
    }
    if (this.report.missing.length) {
      throw new Error('lane.js: assets missing or empty: ' + this.report.missing.join(', '));
    }

    this.makeGroundMaterials();
    onp(0.5);
  }

  /**
   * One shared material per QUANTISED appearance, snapped to the locked palette.
   *
   * Straight from the warehouse example's hard-won note: assets are asked to
   * vary parts of the same object by a few percent so the set does not look
   * injection-moulded, which means no two assets land on the same float and
   * nothing merges across modules. Snapping colour back onto the thirteen hexes
   * the variation was measured FROM is close to lossless — surfaces.js carries
   * the per-texel variation and is untouched — and it is what lets one block
   * bake to a dozen meshes instead of ninety.
   *
   * Emissive materials keep their exact colour: the style lock allows exactly
   * two emissive hexes and a snap must not move them.
   */
  shareMaterial(m) {
    if (!m || Array.isArray(m)) return m;
    const T = this.T;
    const q = (v, n) => Math.round(v * n) / n;
    const c = m.color ? m.color.clone().convertLinearToSRGB() : { r: 0, g: 0, b: 0 };
    let r = q(c.r, 8), g = q(c.g, 8), b = q(c.b, 8);
    let best = null, bd = 1e9;
    for (const hex of Object.values(PALETTE)) {
      const pr = ((hex >> 16) & 255) / 255, pg = ((hex >> 8) & 255) / 255, pb = (hex & 255) / 255;
      const d = (pr - c.r) ** 2 + (pg - c.g) ** 2 + (pb - c.b) ** 2;
      if (d < bd) { bd = d; best = [pr, pg, pb]; }
    }
    if (best && bd < 0.09) { r = best[0]; g = best[1]; b = best[2]; }
    // Roughness and metalness quantise HARD, onto 4 and 3 steps. Every extra
    // distinct float here is another mesh in every baked block, and surfaces.js
    // supplies a roughnessMap that multiplies this value, so the per-texel
    // variation that actually reads survives the rounding untouched. The
    // warehouse example went further still, to thirds.
    const rough = q(m.roughness ?? 1, 4), metal = q(m.metalness ?? 0, 3);
    const em = m.emissive ? m.emissive.getHexString() : '000000';
    const key = [m.type, r, g, b, rough, metal,
      m.transparent ? 1 : 0, q(m.opacity ?? 1, 10), m.side, m.flatShading ? 1 : 0,
      em, q(m.emissiveIntensity ?? 1, 2), m.vertexColors ? 1 : 0,
      m.map?.uuid ?? '-', m.roughnessMap?.uuid ?? '-', m.normalMap?.uuid ?? '-'].join('|');
    let out = this.matCache.get(key);
    if (!out) {
      out = m.clone();
      if (out.color) out.color.setRGB(r, g, b).convertSRGBToLinear();
      out.roughness = rough;
      out.metalness = metal;
      out.emissiveIntensity = q(m.emissiveIntensity ?? 1, 2);
      this.matCache.set(key, out);
    }
    return out;
  }

  shareMaterialsIn(root) {
    root.traverse((o) => { if (o.isMesh && o.material) o.material = this.shareMaterial(o.material); });
    return root;
  }

  /**
   * The same idea taken to its limit, for the topple piles only.
   *
   * A pile cannot go in the block bake because it moves, so every distinct
   * material inside one crate stack is a draw call for the whole time that block
   * is alive: measured, the piles were 168 meshes across the streamed window.
   * These props are half a metre across, they are in shadow, and they spend most
   * of their screen time tumbling, so snapping them onto the palette with no
   * distance threshold at all costs nothing anyone can see and lets the
   * per-piece bake actually merge them.
   */
  hardSnapIn(root) {
    const T = this.T;
    const q = (v, n) => Math.round(v * n) / n;
    root.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      const c = m.color ? m.color.clone().convertLinearToSRGB() : null;
      let best = null, bd = 1e9;
      if (c) for (const hex of Object.values(PALETTE)) {
        const pr = ((hex >> 16) & 255) / 255, pg = ((hex >> 8) & 255) / 255, pb = (hex & 255) / 255;
        const d = (pr - c.r) ** 2 + (pg - c.g) ** 2 + (pb - c.b) ** 2;
        if (d < bd) { bd = d; best = [pr, pg, pb]; }
      }
      const rough = q(m.roughness ?? 1, 2), metal = q(m.metalness ?? 0, 2);
      const key = ['dyn', m.type, best ? best.join(',') : '-', rough, metal,
        m.emissive ? m.emissive.getHexString() : '-', q(m.emissiveIntensity ?? 1, 1),
        m.transparent ? 1 : 0, m.map?.uuid ?? '-', m.normalMap?.uuid ?? '-'].join('|');
      let out = this.matCache.get(key);
      if (!out) {
        out = m.clone();
        if (best && out.color) out.color.setRGB(best[0], best[1], best[2]).convertSRGBToLinear();
        out.roughness = rough; out.metalness = metal;
        this.matCache.set(key, out);
      }
      o.material = out;
    });
    return root;
  }

  /**
   * The ground is most of the screen in a running game, so it gets the lead's
   * photographic asphalt set rather than a flat plane.
   *
   * Wetness is a per-vertex attribute driven into `roughnessFactor` by a small
   * shader patch, not a second transparent mesh. That keeps ONE material and ONE
   * draw call for the whole road, keeps the wet/dry boundary soft instead of a
   * cut edge, and avoids the transparent-drawn-twice trap entirely. Standing
   * water in the gutter is real geometry on top with aWet pinned to 1, because
   * standing water DOES have an edge — but it shares this material, so it merges
   * into the same mesh and the whole ground of a block is one draw.
   *
   * The puddles were a separate near-mirror material first (roughness 0.045,
   * metalness 0.30) and every one of them rendered as a black hole in the road.
   * There is no environment map in this game, so a metal with nothing to reflect
   * reflects nothing. Water is a dielectric: metalness 0, and roughness low but
   * not zero, so a warm bulb three metres up lands as a long streak.
   */
  makeGroundMaterials() {
    const T = this.T;
    const loader = new T.TextureLoader();
    const tex = (f, srgb) => {
      const t = loader.load(new URL(f, this.texBase).href);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = T.SRGBColorSpace;   // basecolor ONLY
      return t;
    };
    const map = tex('asphalt_basecolor.jpg', true);
    const roughnessMap = tex('asphalt_roughness.jpg', false);
    const normalMap = tex('asphalt_normal.jpg', false);

    // UVs are generated in metres/4 on the geometry, so one tile is 4 m and the
    // pattern runs continuously across block joins with repeat left at 1.
    this.roadMat = new T.MeshStandardMaterial({
      color: 0x3a3d42, map, roughnessMap, normalMap,
      normalScale: new T.Vector2(1.1, 1.1),
      roughness: 1.0, metalness: 0.0, vertexColors: true,
    });
    this.roadMat.customProgramCacheKey = () => 'lane_wet_asphalt';
    this.roadMat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aWet;\nvarying float vWet;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWet = aWet;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWet;')
        // Wet asphalt is darker and much smoother. Both, or it reads as a
        // painted grey patch instead of as water.
        .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= mix(1.0, 0.88, vWet);')
        .replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.06 + roughnessFactor * 0.10, vWet);')
        // A wet surface is also flatter: the water fills the grain in. Without
        // this the normal map keeps breaking the reflection into gravel and the
        // streak never forms.
        // `nonPerturbedNormal` is declared by <normal_fragment_begin>; blending
        // back towards it is the version-safe way to do this without touching
        // the tangent-frame internals.
        .replace('#include <normal_fragment_maps>',
          '#include <normal_fragment_maps>\n  normal = normalize(mix(normal, nonPerturbedNormal, vWet * 0.82));');
    };
  }

  // ------------------------------------------------------------------- plan
  plan() {
    this.events = this.planEvents();
    for (let i = 0; i < this.nBlocks; i++) this.plans.push(this.planBlock(i));
    for (const p of this.plans) this.report.props += p.props.length;
    this.report.blocks = this.plans.length;
    // lampPoints for the whole lane, up front, so the light agent can see the
    // shape of the market before a single block is realised.
    for (const p of this.plans) for (const lp of p.lights) this.lampPoints.push(lp);
  }

  /**
   * The obstacle schedule. The ONE part of the layout that reasons across block
   * boundaries, because fairness does: at 9 m/s a vault takes 5 m of lane and a
   * slide 6.3 m, so two actions 6 m apart is not a lane, it is a wall.
   *
   * Rules held here:
   *  - a clear run-up: nothing before z = 26, nothing in the last 12 m
   *  - 14..24 m between events, 19..28 m if both need an action
   *  - 'block' and 'topple' never occupy all three of LANE.lanes
   *  - consecutive events always share a free line, so a player who is already
   *    on the correct side never has to cross a blocked one
   *  - nothing within 5 m of an arch gate, which is a landmark, not an ambush
   */
  planEvents() {
    const L = this.L, lanes = L.lanes;
    const rng = mulberry32(hash32(L.seed, 90210));
    const arches = this.archZs();
    const nearArch = (z) => arches.some((a) => Math.abs(a - z) < 5.5);
    const out = [];

    // THE MIX IS THE DESIGN, and it took three passes to learn that.
    //
    // Pass one weighted the four kinds by probability: the lane looked right and
    // the gate got 1 dodge in 520 m, because nothing was ever placed where the
    // player's current line was. Pass two added a rule that forced a blocker
    // onto whichever line had been open longest: 20 dodges, and 1 vault and 0
    // slides, because the rule crowded every other kind out. A probability that
    // has to satisfy two competing targets satisfies neither.
    //
    // So the kinds come off a fixed cycle and only the LANES are chosen by rule.
    // Per eight events: four blockers, two topples, one vault, one duck. At
    // 12.5-19 m spacing that is, per 520 m of running, about 16 things to steer
    // round, 8 stacks worth aiming at, 4 vaults and 4 slides — which is the mix
    // the lead asked for, and it holds for every seed because it is not a dice
    // roll.
    // Order matters as much as the counts, and both directions were measured.
    // Two blockers in a row is 15 m to make two lateral moves: the player
    // stumbles on the second, loses speed and the chase closes — the gate was
    // caught at 384 m of a 520 m route with that ordering. Alternating a blocker
    // with something passable is what keeps a run survivable while still asking
    // for a decision every ~15 m.
    const CYCLE = ['block', 'topple', 'block', 'vault', 'block', 'topple', 'block', 'duck'];

    // `clear[k]` is how far a player could run in line k without meeting anything
    // that interrupts them. A 'vault' or a 'duck' does not reset it — you go over
    // or under those and carry straight on — but a blocker and a topple pile
    // both do. Blocking the two lines that have been open longest is what keeps
    // a straight line from ever being viable for long.
    const clear = [0, 0, 0];
    let z = 26, prevAction = false, id = 0, step = 0;

    while (z < L.length - 12) {
      const kind = CYCLE[step % CYCLE.length];
      const action = kind === 'vault' || kind === 'duck';

      if (!nearArch(z)) {
        if (action) {
          // Spans the lane: an action, not a choice, so no sidestep avoids it and
          // every line stays open. halfW 3.05 covers all three of LANE.lanes.
          out.push({
            id: id++, kind, z, lanes: [0, 1, 2], x: 0, halfW: 3.05,
            halfD: kind === 'vault' ? 0.45 : 0.35,
            // vault: the top of a steel_prep_table, under PLAYER.vaultHeight 1.05.
            // duck: the CLEARANCE under the rack, over PLAYER.slideHeight 0.85.
            height: kind === 'vault' ? 0.92 : 1.20,
            down: false,
          });
        } else {
          const stale = [0, 1, 2].sort((a, b) => clear[b] - clear[a]);
          // A blocker never takes all three lines: that is a wall. A TOPPLE row
          // may, and half of them do — it is passable by design, you go through
          // it and the pursuers lose CHASE.toppleCost on it. A topple that always
          // leaves a clean lane beside it is never toppled, it is sidestepped,
          // and the mechanic is decorative.
          //
          // Spanning it means spanning it CONTINUOUSLY. Piles on the three lane
          // centres leave 1.0 m gaps at x = +-1.05, and a runner steering away
          // from the nearest pile's x lands in one: measured, sixteen topple
          // events in 520 m produced two topples whether the row covered two
          // lanes or three, because the gaps were the way through. Four piles at
          // +-0.8 and +-2.4 with halfW 0.85 overlap instead.
          const span = kind === 'topple' && rng() < 0.55;
          const xs = span ? [-2.4, -0.8, 0.8, 2.4] : [lanes[stale[0]], lanes[stale[1]]];
          for (let q = 0; q < xs.length; q++) {
            out.push({
              id: id++, kind, z, lanes: span ? [0, 1, 2] : [stale[q]],
              x: xs[q] + (rng() - 0.5) * 0.2,
              halfW: span ? 0.85 : 0.55, halfD: 0.55,
              height: kind === 'topple' ? 1.05 : 1.1, down: false,
            });
          }
          // Only a BLOCKER resets the clear run. A topple does not stop a player
          // holding their line, it taxes them for it, so counting it here would
          // take the pressure off the rule that makes them steer at all.
          if (kind === 'block') for (const li of [stale[0], stale[1]]) clear[li] = 0;
        }
        step++;
      }

      // A vault straight after a duck needs room: at 9 m/s the vault takes 5.0 m
      // of lane and the slide 6.3 m, so two actions 6 m apart is not a lane, it
      // is a wall.
      const wide = action && prevAction;
      const gap = (wide ? 16 : 12.5) + rng() * (wide ? 7 : 6.5);
      z += gap;
      for (let k = 0; k < 3; k++) clear[k] += gap;
      prevAction = action;
    }
    return out;
  }

  archZs() {
    const out = [];
    for (let z = 150; z < this.L.length - 20; z += 150) out.push(z);
    out.push(this.L.length);          // the river gate
    return out;
  }

  /**
   * One block: 22 m of lane as a sequence of bays per side, a facade rank behind
   * them, an overhead layer, the ground, and whatever obstacle events fall in it.
   */
  planBlock(i) {
    const L = this.L, bl = L.blockLength;
    const z0 = i * bl, z1 = z0 + bl;
    const rng = mulberry32(hash32(L.seed, i * 7919 + 3));
    const props = [], lights = [], obstacles = [];
    const sizes = this.sizes;

    const push = (n, o) => {
      const s = sizes[n];
      const h = o.h !== undefined ? o.h : ROSTER[n].h;
      const sc = h && s.y > 1e-6 ? h / s.y : 1;
      const p = {
        n, x: o.x, y: o.y || 0, z: o.z, ry: o.ry || 0,
        sx: sc * (o.kx || 1), sy: sc * (o.ky || 1), sz: sc * (o.kz || 1),
        tier: o.tier !== undefined ? o.tier : ROSTER[n].tier,
        dyn: !!o.dyn,
      };
      props.push(p);
      // `lights: false` on a placement. night.js holds a FIXED number of real
      // light slots plus a fixed pool, and assigns them to the nearest lamps, so
      // lamp points are a rationed resource: adding 2,290 of them for the
      // shopfronts moved the apron by +1 median and -7 p95, because every one
      // displaced a lantern that was lighting the lane. Only the placements that
      // actually stand on the apron and face it get to spend a slot.
      const decl = o.lights === false ? null : this.lightDecl[n];
      if (decl) {
        for (const lp of decl) {
          const cs = Math.cos(p.ry), sn = Math.sin(p.ry);
          const lx = lp.x * p.sx, ly = lp.y * p.sy, lz = lp.z * p.sz;
          lights.push({
            x: p.x + lx * cs + lz * sn,
            y: p.y + ly + groundY(p.x),
            z: p.z - lx * sn + lz * cs,
            warm: lp.warm !== false,
          });
        }
      }
      return props.length - 1;
    };

    // ---- block character ------------------------------------------------
    const archHere = this.archZs().filter((z) => z >= z0 && z < z1);
    const r0 = rng();
    let mode = archHere.length ? 'open' : r0 < 0.56 ? 'normal' : r0 < 0.72 ? 'wide' : r0 < 0.88 ? 'squeeze' : 'shutters';
    const M = {
      normal:  { inner: 3.46, outer: 5.72, canopy: L.canopyHeight, over: 3.1 },
      open:    { inner: 3.62, outer: 5.90, canopy: L.canopyHeight + 0.35, over: 3.5 },
      wide:    { inner: 4.45, outer: 6.85, canopy: L.canopyHeight + 0.5, over: 3.9 },
      squeeze: { inner: 3.32, outer: 5.10, canopy: L.canopyHeight - 0.75, over: 2.35 },
      shutters:{ inner: 3.55, outer: 5.60, canopy: L.canopyHeight, over: 3.2 },
    }[mode];
    // The squeeze narrows the volume ABOVE head height, not the running width.
    // Pinching the floor would put a stall front inside LANE.halfWalk with no
    // collider on it; pinching the canopy and the overhang is what the camera
    // actually sees at 1.75 m and it stays fair.
    const junctionSide = mode === 'wide' ? (rng() < 0.5 ? -1 : 1) : 0;

    for (const s of [-1, 1]) {
      const face = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      const inner = M.inner + (rng() - 0.5) * 0.18;
      const outer = M.outer + (rng() - 0.5) * 0.2;
      const px = (a) => s * Math.max(a, 3.3);          // rank 1/2 never crosses halfWalk + 0.1
      const ov = (a) => s * a;                          // overhead may

      // ---- bays --------------------------------------------------------
      let z = z0 + rng() * 0.8;
      const gaps = [];
      let bayN = 0;
      while (z < z1 - 0.6) {
        const w = 2.4 * (0.86 + rng() * 0.3);
        const zc = z + w / 2;
        const t = rng();
        let type;
        if (junctionSide === s && bayN === Math.floor((z1 - z0) / 2.4 / 2)) type = 'alley';
        else if (mode === 'shutters' && t < 0.62) type = 'shut';
        else if (t < 0.17) type = 'food';
        else if (t < 0.33) type = 'noodle';
        else if (t < 0.47) type = 'grill';
        else if (t < 0.61) type = 'fruit';
        else if (t < 0.71) type = 'fish';
        else if (t < 0.92) type = 'shut';
        else type = 'alley';

        const ctx = { s, face, inner, outer, zc, w, rng, push, px, ov, M };
        if (type === 'alley') { this.bayAlley(ctx); gaps.push([z, z + w]); }
        else if (type === 'food') this.bayFood(ctx);
        else if (type === 'noodle') this.bayNoodle(ctx);
        else if (type === 'grill') this.bayGrill(ctx);
        else if (type === 'fruit') this.bayFruit(ctx);
        else if (type === 'fish') this.bayFish(ctx);
        else this.bayShut(ctx);

        z += w + rng() * 0.1;
        bayN++;
      }

      // ---- rank 3: the facade line behind the stalls --------------------
      const facadeX = s * (outer + 1.5);
      const fw = sizes.shophouse_facade.x * (6.8 / sizes.shophouse_facade.y);
      const swW = sizes.rolled_shutter_shopfront.x * (3.2 / sizes.rolled_shutter_shopfront.y);
      let fz = z0 - (i % 3) * 1.7;
      while (fz < z1) {
        const inGap = gaps.some(([a, b]) => fz + fw * 0.5 > a - 0.5 && fz + fw * 0.5 < b + 0.5);
        if (!inGap) {
          if (rng() < 0.55) {
            push('shophouse_facade', {
              x: facadeX + (rng() - 0.5) * 0.25, z: fz + fw / 2, ry: face,
              h: rng() < 0.62 ? 6.8 : 3.4, lights: rng() < 0.34,
            });
          } else {
            // a shuttered ground floor instead: 3,848 triangles against 9,996,
            // and at this range the two read the same
            const n = Math.max(1, Math.round(fw / Math.max(1, swW)));
            for (let j = 0; j < n; j++) {
              push('rolled_shutter_shopfront', {
                x: s * (outer + 1.15), z: fz + (j + 0.5) * (fw / n), ry: face,
                lights: false,
              });
            }
          }
        }
        fz += fw * (0.94 + rng() * 0.08);
      }
      // cable poles at the back of the footway, every ~10 m
      for (let cz = z0 + (i % 2) * 5 + 3; cz < z1; cz += 17 + rng() * 5) {
        push('cable_bundle_pole', { x: s * (outer + 0.55), z: cz, ry: face });
      }
      // signs, high on the facades, one temperature each
      for (let k = 0; k < 1 + (rng() < 0.5 ? 1 : 0); k++) {
        push('neon_sign_box', {
          x: ov(M.over + 0.55 + rng() * 1.2), y: 2.9 + rng() * 2.0,
          z: z0 + rng() * (z1 - z0), ry: face,
        });
      }
    }

    // ---- overhead: the lane is enclosed, the sky is mostly hidden -------
    this.planOverhead(i, z0, z1, M, rng, push, sizes);

    // ---- landmark -------------------------------------------------------
    for (const az of archHere) {
      push('market_arch_gate', { x: 0, y: 0, z: az, ry: 0 });
      push('paper_lantern_large', { x: -2.55, y: 3.55, z: az - 0.35, h: 1.05 });
      push('paper_lantern_large', { x: 2.55, y: 3.55, z: az - 0.35, h: 1.05 });
    }

    // ---- obstacle events falling in this block --------------------------
    for (const e of this.events) {
      if (e.z < z0 || e.z >= z1) continue;
      obstacles.push(this.planObstacle(e, push));
    }

    return { i, z0, z1, mode, props, lights, obstacles, ground: this.planGround(i, z0, z1, lights, obstacles) };
  }

  // ------------------------------------------------------------ bay recipes
  // Each one loads the counter and the volume above it. An empty tidy stall is
  // wrong even if it verifies clean (STYLE-LOCK).
  //
  // The counts here are the triangle budget. Measured on the delivered asset
  // set, a steam_basket_tower is 6,508 triangles for a 0.5 m prop and a
  // produce_crate_stack is 4,516; at the density this file first shipped
  // (21 towers and 25 crate stacks per 22 m block) those two assets alone were
  // 252k triangles a block and the lane peaked at 4.5M against a 1.2M budget.
  // So the clutter is placed by weighted chance rather than unconditionally,
  // and the heavy small props are the ones rationed. What is NOT rationed is the
  // silhouette: awnings, canopy, facades, lanterns and signs, because those are
  // what "the volume above the counter is full" is actually judged on and they
  // are two orders of magnitude cheaper per prop.
  bayFood({ s, face, inner, outer, zc, rng, push, px, M }) {
    push('food_stall_awning', { x: px((inner + outer) / 2 + 0.15), z: zc, ry: face });
    push('steel_prep_table', { x: px(inner + 0.55), z: zc - 0.55, ry: face });
    const nb = rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0;
    for (let k = 0; k < nb; k++) {
      push('steam_basket_tower', { x: px(inner + 0.5 + rng() * 0.3), y: 0.92,
        z: zc - 0.85 + k * 0.42, h: 0.75 + rng() * 0.45 });
    }
    if (rng() < 0.6) push('wok_burner_stand', { x: px(inner + 0.6), z: zc + 0.6, ry: face });
    if (rng() < 0.5) push('gas_cylinder_pair', { x: px(outer - 0.4), z: zc + 0.75, ry: face });
    if (rng() < 0.45) push('produce_crate_stack', { x: px(inner + 0.15), z: zc + 0.95, ry: face + rng() * 0.4 });
    if (rng() < 0.3) push('plastic_stool_stack', { x: px(inner - 0.12), z: zc - 0.9, ry: rng() * 3 });
    if (rng() < 0.75) push('hanging_duck_rack', { x: px(inner + 0.5), y: 1.72, z: zc + (rng() - 0.5) * 0.6, ry: face });
    if (rng() < 0.4) push('clip_lamp_on_pole', { x: px(inner + 0.22), z: zc + 0.95, ry: face });
    if (rng() < 0.7) push('paper_lantern_large', { x: px(inner + 0.1), y: 2.3, z: zc - 0.4, tier: 1 });
  }

  bayNoodle({ s, face, inner, outer, zc, rng, push, px }) {
    push('noodle_cart', { x: px(inner + 0.75), z: zc, ry: face });
    const nb = rng() < 0.5 ? 1 : 0;
    for (let k = 0; k < nb; k++) {
      push('steam_basket_tower', { x: px(inner + 0.62 + rng() * 0.25), y: 0.92,
        z: zc - 0.6 + k * 0.5, h: 0.65 + rng() * 0.5 });
    }
    if (rng() < 0.7) push('plastic_stool_stack', { x: px(inner - 0.1), z: zc - 0.75, ry: rng() * 3 });
    if (rng() < 0.4) push('plastic_stool_stack', { x: px(inner + 0.02), z: zc + 0.65, ry: rng() * 3 });
    if (rng() < 0.5) push('wok_burner_stand', { x: px(outer - 0.7), z: zc - 0.5, ry: face });
    if (rng() < 0.45) push('gas_cylinder_pair', { x: px(outer - 0.35), z: zc + 0.5, ry: face });
    if (rng() < 0.3) push('produce_crate_stack', { x: px(outer - 0.9), z: zc + 0.95, ry: face });
    if (rng() < 0.35) push('clip_lamp_on_pole', { x: px(inner + 0.25), z: zc - 0.9, ry: face });
    if (rng() < 0.7) push('paper_lantern_large', { x: px(inner + 0.05), y: 2.42, z: zc + 0.3, tier: 1 });
    if (rng() < 0.4) push('hanging_duck_rack', { x: px(inner + 0.55), y: 1.8, z: zc, ry: face });
  }

  bayGrill({ s, face, inner, outer, zc, rng, push, px }) {
    push('skewer_grill_cart', { x: px(inner + 0.6), z: zc, ry: face });
    push('steel_prep_table', { x: px(inner + 0.75), z: zc + 1.0, ry: face });
    if (rng() < 0.6) push('gas_cylinder_pair', { x: px(outer - 0.4), z: zc - 0.55, ry: face });
    if (rng() < 0.55) push('wok_burner_stand', { x: px(outer - 1.0), z: zc + 0.35, ry: face });
    if (rng() < 0.35) push('produce_crate_stack', { x: px(inner + 0.2), z: zc - 1.0, ry: face + rng() });
    if (rng() < 0.4) push('plastic_stool_stack', { x: px(inner - 0.14), z: zc + 0.85, ry: rng() * 3 });
    if (rng() < 0.35) push('steam_basket_tower', { x: px(inner + 0.7), y: 0.92, z: zc + 1.0, h: 0.8 });
    if (rng() < 0.35) push('clip_lamp_on_pole', { x: px(inner + 0.2), z: zc - 0.75, ry: face });
    if (rng() < 0.6) push('paper_lantern_large', { x: px(inner + 0.12), y: 2.25, z: zc + 0.5, h: 0.62, tier: 1 });
    if (rng() < 0.4) push('neon_sign_box', { x: px(inner + 0.35), y: 2.75, z: zc, ry: face, h: 0.95 });
  }

  bayFruit({ s, face, inner, outer, zc, rng, push, px }) {
    push('fruit_stall_table', { x: px(inner + 0.6), z: zc, ry: face });
    if (rng() < 0.3) push('fruit_stall_table', { x: px(outer - 0.75), z: zc + 0.05, ry: face });
    // stacked, not arranged
    push('produce_crate_stack', { x: px(inner + 0.18), z: zc - 0.95, ry: face + rng() * 0.5 });
    if (rng() < 0.3) push('produce_crate_stack', { x: px(inner + 0.25), z: zc + 0.95, ry: face - rng() * 0.5 });
    if (rng() < 0.5) {
      push('produce_crate_stack', { x: px(outer - 0.35), z: zc - 0.5, ry: face, h: 1.5 });
      push('produce_crate_stack', { x: px(outer - 0.4), y: 1.5, z: zc - 0.5, ry: face + 0.2, h: 0.75 });
    }
    if (rng() < 0.5) push('water_barrel_blue', { x: px(outer - 0.4), z: zc + 0.85 });
    if (rng() < 0.4) push('plastic_stool_stack', { x: px(inner - 0.1), z: zc + 0.2, ry: rng() * 3 });
    if (rng() < 0.35) push('clip_lamp_on_pole', { x: px(inner + 0.2), z: zc + 0.8, ry: face });
    if (rng() < 0.6) push('paper_lantern_large', { x: px(inner + 0.1), y: 2.35, z: zc - 0.25, tier: 1 });
  }

  bayFish({ s, face, inner, outer, zc, rng, push, px }) {
    push('ice_fish_tray_trestle', { x: px(inner + 0.65), z: zc, ry: face });
    if (rng() < 0.35) push('ice_fish_tray_trestle', { x: px(outer - 0.7), z: zc + 0.1, ry: face });
    push('water_barrel_blue', { x: px(inner + 0.2), z: zc - 1.0 });
    if (rng() < 0.4) push('water_barrel_blue', { x: px(inner + 0.25), z: zc + 1.0 });
    if (rng() < 0.3) push('produce_crate_stack', { x: px(outer - 0.4), z: zc - 0.8, ry: face });
    if (rng() < 0.4) push('steel_prep_table', { x: px(outer - 1.15), z: zc + 0.9, ry: face });
    if (rng() < 0.6) push('neon_sign_box', { x: px(inner + 0.4), y: 2.6, z: zc, ry: face, h: 1.1 });
    if (rng() < 0.35) push('clip_lamp_on_pole', { x: px(inner + 0.24), z: zc + 0.9, ry: face });
    if (rng() < 0.35) push('steam_basket_tower', { x: px(outer - 1.1), y: 0.92, z: zc + 0.9, h: 0.7 });
  }

  bayShut({ s, face, inner, outer, zc, rng, push, px }) {
    push('rolled_shutter_shopfront', { x: px(inner + 0.5), z: zc, ry: face });
    if (rng() < 0.6) push('rubbish_bag_pile', { x: px(inner + 0.3), z: zc - 0.85, ry: rng() * 3 });
    if (rng() < 0.45) push('parked_scooter', { x: px(inner + 0.15), z: zc + 0.7, ry: face + (rng() - 0.5) * 0.5 });
    if (rng() < 0.3) push('produce_crate_stack', { x: px(outer - 0.5), z: zc + 0.3, ry: face, h: 0.75 });
    if (rng() < 0.4) push('plastic_stool_stack', { x: px(inner - 0.05), z: zc + 1.0, ry: rng() * 3 });
    push('neon_sign_box', { x: px(inner + 0.45), y: 3.05, z: zc, ry: face });
    if (rng() < 0.35) push('clip_lamp_on_pole', { x: px(inner + 0.2), z: zc - 1.0, ry: face });
  }

  /** A side opening: the stall line stops, the eye gets somewhere else to go. */
  bayAlley({ s, face, inner, outer, zc, rng, push, px }) {
    push('cable_bundle_pole', { x: px(inner + 0.35), z: zc - 0.9, ry: face });
    push('rubbish_bag_pile', { x: px(inner + 0.45), z: zc + 0.5, ry: rng() * 3 });
    if (rng() < 0.5) push('rubbish_bag_pile', { x: px(inner + 1.1), z: zc + 0.95, ry: rng() * 3 });
    push('parked_scooter', { x: px(inner + 0.55), z: zc - 0.1, ry: face + 1.2 });
    if (rng() < 0.5) push('water_barrel_blue', { x: px(inner + 1.5), z: zc - 0.6 });
    push('shophouse_facade', { x: s * (outer + 4.6), z: zc, ry: face, h: 6.8, lights: false });
    push('neon_sign_box', { x: px(inner + 0.9), y: 3.4, z: zc + 0.2, ry: face });
    push('paper_lantern_large', { x: px(inner + 0.7), y: 2.5, z: zc - 0.5, tier: 1 });
  }

  /**
   * The overhead layer. This is what stops the lane reading as props at
   * intervals: canopy sheets at 3.6 m across the whole width, lantern strings
   * crossing it, and enough gaps that the light has somewhere to come from.
   */
  planOverhead(i, z0, z1, M, rng, push, sizes) {
    const cs = sizes.tarp_canopy_section;
    const stepZ = Math.max(2.1, cs.z * 1.2);
    // Three columns, not two. The canopy is what makes the lane a lane rather
    // than a street with stalls on it, and the filmstrip showed open sky over
    // most of the run when this was trimmed for triangles. It is affordable
    // again because the canopy uses the coarse build at every range: 4,902
    // triangles a sheet against 8,998.
    const cols = [-(M.over + 1.5) * 2 / 3, 0, (M.over + 1.5) * 2 / 3];
    const colW = (M.over + 2.6) * 2 / 3;
    for (let z = z0 + (i % 2) * 0.9; z < z1; z += stepZ) {
      if (rng() < 0.13) continue;   // a gap: sky, and a lantern seen against it                     // a gap: sky, and a lantern seen against it
      for (const cx of cols) {
        push('tarp_canopy_section', {
          x: cx, y: M.canopy + (rng() - 0.5) * 0.16, z: z + stepZ / 2,
          ry: 0, kx: colW / Math.max(0.4, cs.x),
        });
      }
    }
    // lantern strings across the lane
    const ls = sizes.lantern_string_run;
    const nStr = 2 + (rng() < 0.5 ? 1 : 0);
    for (let k = 0; k < nStr; k++) {
      const z = z0 + (k + 0.35 + rng() * 0.3) * ((z1 - z0) / nStr);
      const across = ls.x >= ls.z;                    // run along whichever axis is longer
      const span = 2 * (M.over + 1.2);
      const each = across ? ls.x : ls.z;
      const n = Math.max(1, Math.round(span / Math.max(0.6, each)));
      for (let j = 0; j < n; j++) {
        push('lantern_string_run', {
          x: -span / 2 + (j + 0.5) * (span / n), y: M.canopy - 0.5 - rng() * 0.25, z,
          ry: across ? 0 : Math.PI / 2, kx: (span / n) / Math.max(0.4, each),
        });
      }
    }
    // Lanterns hung OVER the running lines, not only along the stall fronts.
    // A lamp 3.4 m off to the side is 4 m from the middle of the road and its
    // falloff has eaten most of it by the time it gets there; the same lamp
    // straight up is what puts light on the ground the player runs over. Held at
    // 2.78 m or higher so the chase camera, which rides at 2.35, clears them.
    for (let k = 0; k < 4; k++) {
      push('paper_lantern_large', {
        x: (rng() - 0.5) * 5.4, y: Math.max(2.78, M.canopy - 0.7 - rng() * 0.5),
        z: z0 + (k + rng()) * ((z1 - z0) / 4), h: 0.62 + rng() * 0.5,
      });
    }
  }

  // --------------------------------------------------------------- obstacles
  /** Obstacle props are all tier 0: an obstacle you cannot see until it is
   *  inside the near LOD is not an obstacle, it is an ambush. */
  planObstacle(e, push) {
    const L = this.L;
    const rng = mulberry32(hash32(L.seed, e.id * 131 + 17));
    const o = {
      id: e.id, kind: e.kind, x: e.x, z: e.z, halfW: e.halfW, halfD: e.halfD,
      height: e.height, down: false, group: null, parts: [],
    };
    if (e.kind === 'vault') {
      const w = this.sizes.steel_prep_table.x * (0.92 / this.sizes.steel_prep_table.y);
      const n = Math.max(2, Math.round(6.1 / Math.max(0.6, w)));
      for (let j = 0; j < n; j++) {
        o.parts.push(push('steel_prep_table', {
          x: -3.05 + (j + 0.5) * (6.1 / n), z: e.z, ry: Math.PI / 2, tier: 0,
        }));
      }
    } else if (e.kind === 'duck') {
      const w = this.sizes.hanging_duck_rack.x * (0.86 / this.sizes.hanging_duck_rack.y);
      const n = Math.max(2, Math.round(6.4 / Math.max(0.6, w * 1.35)));
      for (let j = 0; j < n; j++) {
        o.parts.push(push('hanging_duck_rack', {
          // Clearance 1.28 under it, 0.86 of rack above: the top sits at 2.14 m,
          // clear of the chase camera at 2.35 m. The RUNNER agent's constraint is
          // that nothing solid spans the lane between 1.6 and 3.0 m; a rack BAR
          // is fine, a panel is not, so these are tiled with gaps between them
          // rather than butted into a continuous soffit.
          x: -3.2 + (j + 0.5) * (6.4 / n), y: e.height, z: e.z, ry: 0, h: 0.86, tier: 0,
        }));
      }
      o.halfD = 0.3;
    } else if (e.kind === 'block') {
      const which = rng();
      if (which < 0.45) {
        o.parts.push(push('parked_scooter', { x: e.x, z: e.z, ry: 0.35 + rng() * 0.5, tier: 0 }));
        o.halfW = 0.42; o.halfD = 0.85; o.height = 1.15;
      } else if (which < 0.75) {
        o.parts.push(push('cable_bundle_pole', { x: e.x, z: e.z, ry: 0, tier: 0 }));
        o.parts.push(push('gas_cylinder_pair', { x: e.x + 0.3, z: e.z + 0.3, ry: rng() * 3, tier: 0 }));
        o.halfW = 0.45; o.halfD = 0.5; o.height = 2.2;
      } else {
        o.parts.push(push('steel_prep_table', { x: e.x, z: e.z, ry: 0, tier: 0 }));
        o.parts.push(push('ice_fish_tray_trestle', { x: e.x, z: e.z + 0.75, ry: 0, tier: 0 }));
        o.halfW = 0.5; o.halfD = 0.9; o.height = 0.95;
      }
    } else {
      // topple: two or three stacks, all DYNAMIC so they stay out of the bake
      const kit = ['produce_crate_stack', 'plastic_stool_stack', 'water_barrel_blue', 'rubbish_bag_pile'];
      const n = 1 + (rng() < 0.5 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const nm = kit[Math.floor(rng() * kit.length) % kit.length];
        o.parts.push(push(nm, {
          x: e.x + (rng() - 0.5) * 0.66, z: e.z + (j - (n - 1) / 2) * 0.46 + (rng() - 0.5) * 0.2,
          ry: rng() * 6.28, h: nm === 'produce_crate_stack' ? 0.85 + rng() * 0.5 : undefined, tier: 0,
         dyn: true,
        }));
      }
      // NOT halfW = 0.58. The schedule works out how wide a topple row has to be
      // to have no gap in it, and this line used to throw that away and hand the
      // player a 1.0 m hole to steer through between the piles. Two topples in
      // 520 m, from sixteen topple events, and the mechanic looked decorative.
      o.halfD = 0.7;
    }
    return o;
  }

  // ------------------------------------------------------------------ ground
  planGround(i, z0, z1, lights, obstacles) {
    const rng = mulberry32(hash32(this.L.seed, i * 313 + 71));
    const puddles = [];

    /**
     * Add one patch, kept on ONE side of the kerb.
     *
     * The kerb is a 0.16 m step at |x| = 3.62 and a patch straddling it would
     * have vertices on both levels, so its quad would cut through the kerb face.
     * Clamping the radius to the near side is cheaper than splitting it.
     */
    const put = (x, z, rx, rz) => {
      const a = Math.abs(x), sgn = x < 0 ? -1 : 1;
      let r = rx;
      if (a < KERB) r = Math.min(r, Math.max(0.18, (KERB - 0.04) - a));
      else r = Math.min(r, Math.max(0.18, a - (KERB + 0.04)));
      puddles.push({ x, z, rx: r, rz, seed: (rng() * 1e6) | 0 });
      void sgn;
    };

    // Water in the gutters, because that is where it runs to.
    for (let k = 0; k < 4; k++) {
      put((rng() < 0.5 ? -1 : 1) * (GUT + (rng() - 0.5) * 0.3),
        z0 + rng() * (z1 - z0), 0.3 + rng() * 0.34, 0.6 + rng() * 1.9);
    }

    // And water UNDER THE LAMPS, wherever the lamps are.
    //
    // This used to clamp x to +-3.15, which is inside LANE.halfWalk — so every
    // reflective surface in the game lived in the running lane by construction,
    // and the apron between the kerb at 3.62 and the stall fronts had nothing on
    // it that could return a highlight. A dark apron under a lit shopfront was
    // not a lighting bug on its own; half of it was this line. The band is now
    // the lane AND the apron, and the lamps that pick the positions now include
    // the shopfronts standing on it.
    const src = lights.filter((l) => l.y > 1.5 && Math.abs(l.x) < 8.2);
    for (let k = 0; k < 7 && src.length; k++) {
      const l = src[Math.floor(rng() * src.length) % src.length];
      const onApron = Math.abs(l.x) > KERB;
      // Under an apron lamp the water sits on the apron; under a lane lamp it
      // pulls toward the centreline the way a cambered road drains.
      const x = onApron
        ? clamp(l.x + (rng() - 0.5) * 1.3, -6.1, 6.1)
        : clamp(l.x * (0.45 + rng() * 0.4) + (rng() - 0.5) * 1.1, -3.2, 3.2);
      // SMALLER than they were. At rx up to 2.2 m these read as hard-edged
      // scalloped patches — a painted brown blob rather than a falloff from a
      // source — and that alone lost two blind pairs. The light has to come from
      // the lamp; the water is only what lets it come back.
      put(x, l.z + (rng() - 0.5) * 1.5, 0.3 + rng() * 0.6, 0.35 + rng() * 0.75);
    }

    // A wet mark at the base of anything that will hurt you. The critic could not
    // tell an obstacle from set dressing — "a cream box 0.4 m away in the same
    // colour family as the crates, buckets and bollards that are pure scenery" —
    // and a damp ring under a hazard is the cheapest cue available here: it is
    // ground geometry that is already being merged into the shell bake, it costs
    // about sixteen triangles, and it reads as a highlight only where a lamp is
    // actually throwing light, so it cannot flatten into a decal.
    for (const ob of obstacles || []) {
      if (ob.kind !== 'block' && ob.kind !== 'topple') continue;
      put(ob.x, ob.z + 0.15, Math.min(0.85, ob.halfW + 0.3), ob.halfD + 0.4);
    }
    return { puddles };
  }

  buildGround(p) {
    const T = this.T;
    const g = new T.Group();
    const nx = ROAD_X.length;
    const dz = 0.55;
    const nz = Math.round((p.z1 - p.z0) / dz) + 1;
    const pos = new Float32Array(nx * nz * 3);
    const uv = new Float32Array(nx * nz * 2);
    const col = new Float32Array(nx * nz * 3);
    const wet = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) {
      const z = p.z0 + j * dz;
      for (let k = 0; k < nx; k++) {
        const x = ROAD_X[k];
        const o = j * nx + k;
        pos[o * 3] = x; pos[o * 3 + 1] = groundY(x); pos[o * 3 + 2] = z;
        uv[o * 2] = x / 4; uv[o * 2 + 1] = z / 4;      // one tile per 4 m, continuous across blocks
        // wetness: low-frequency patches, always wet in the gutter, drier under
        // the stalls where the awnings kept the rain off
        const a = Math.abs(x);
        let w = clamp((fbm2(x * 0.16, z * 0.16, 4711) - 0.34) * 3.0, 0, 1);
        if (a > GUT - 0.5 && a < KERB - 0.02) w = Math.max(w, 0.92);
        // The APRON, |x| from the kerb out to the stall fronts. Wetting it
        // broadly was tried and MEASURED WORSE: ground_worst_med fell 17 to 11.
        // night.js pools every lamp past its 14 real slots as a diffuse-only
        // irradiance term, so on most of the apron wetness spends diffuse (the
        // shader multiplies it by 0.88) and gets no specular back, because there
        // is no real light there to reflect. Wetness has to go where a real lamp
        // can answer it, which is the kerb band and the small patches sited on
        // lamps below — not across the whole strip.
        if (a > KERB) w = a < KERB + 0.45 ? Math.max(w, 0.55) : w * 0.2;
        w *= clamp(1.35 - a * 0.12, 0.25, 1);
        wet[o] = w;
        // grime: darker at the kerb line and in streaks, lighter on the crown
        const grime = 0.72 + fbm2(x * 0.55, z * 0.55, 99) * 0.5 - clamp((a - 2.2) * 0.08, 0, 0.16);
        col[o * 3] = grime; col[o * 3 + 1] = grime * 0.99; col[o * 3 + 2] = grime * 0.97;
      }
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) {
      for (let k = 0; k < nx - 1; k++) {
        const a = j * nx + k, b = a + 1, c = a + nx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('aWet', new T.BufferAttribute(wet, 1));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const road = new T.Mesh(geo, this.roadMat);
    road.receiveShadow = true;
    road.castShadow = false;
    g.add(road);

    // Standing water, with an edge. Same material as the road, aWet pinned at
    // the centre and feathered at the rim, so it merges into the road mesh in
    // the bake and the whole ground of a block costs one draw call.
    for (const q of p.ground.puddles) {
      const seg = 16;
      const pv = [], pi = [], pu = [], pc = [], pw = [];
      const r = mulberry32(q.seed);
      const add = (x, z, w) => {
        pv.push(x, groundY(x) + 0.006, z); pu.push(x / 4, z / 4);
        pc.push(0.82, 0.83, 0.86); pw.push(w);
      };
      // A LOW-FREQUENCY rim, not a per-vertex random one. Jittering each of the
      // sixteen rim vertices independently makes a star, and on a dark road that
      // reads as a hard-edged black shape stamped on the tarmac — it was clearly
      // visible in the gate filmstrip and it is not what a puddle looks like.
      const ph = r() * 6.28, ph2 = r() * 6.28;
      add(q.x, q.z, 1);            // wet at the centre, dry at the rim
      // TWO rings, not one. A single fan ramps the wetness linearly from the
      // centre all the way to the rim, which over a patch of any size is a
      // visible cone with an edge on it — the critic read those as painted blobs
      // rather than as light falling off a source. An inner ring at 0.55 of the
      // radius holding 0.72 puts the knee of the curve where the eye expects it
      // and lets the outer 45% fade out under whatever lamp is above it.
      for (const [f, w] of [[0.55, 0.72], [1, 0]]) {
        for (let k = 0; k < seg; k++) {
          const t = (k / seg) * Math.PI * 2;
          const wob = 0.9 + 0.16 * Math.sin(t * 2 + ph) + 0.09 * Math.sin(t * 3 + ph2);
          add(q.x + Math.cos(t) * q.rx * wob * f, q.z + Math.sin(t) * q.rz * wob * f, w);
        }
      }
      for (let k = 0; k < seg; k++) {
        const a0 = 1 + k, a1 = 1 + ((k + 1) % seg);                // inner ring
        const b0 = 1 + seg + k, b1 = 1 + seg + ((k + 1) % seg);    // outer ring
        pi.push(0, a1, a0);
        pi.push(a0, a1, b1, a0, b1, b0);
      }
      const pg = new T.BufferGeometry();
      pg.setAttribute('position', new T.Float32BufferAttribute(pv, 3));
      pg.setAttribute('uv', new T.Float32BufferAttribute(pu, 2));
      pg.setAttribute('color', new T.Float32BufferAttribute(pc, 3));
      pg.setAttribute('aWet', new T.Float32BufferAttribute(pw, 1));
      pg.setIndex(pi);
      pg.computeVertexNormals();
      const pm = new T.Mesh(pg, this.roadMat);
      pm.receiveShadow = true;
      g.add(pm);
    }
    return g;
  }

  // ------------------------------------------------------------- realisation
  //
  // Streaming is staged, and the three LOD levels are baked DISJOINTLY.
  //
  // The obvious shape is three cumulative bakes — near = everything, mid =
  // everything minus the clutter, far = structure only — and it costs 2.2x the
  // work, because every tier-0 prop is merged three times. Measured that way, a
  // block was ~80 ms in one frame and a full run dropped 95 frames.
  //
  // Disjoint instead: g0 is tier 0 and the ground, g1 is tier 1, g2 is tier 2.
  // Far shows g0, mid shows g0+g1, near shows g0+g1+g2. Every prop is merged
  // exactly once, each step is a third of the work, and the steps happen on the
  // frames the block crosses 78 m, 34 m and 20 m — seconds apart. It costs draw
  // calls, because a material shared between a facade and a cart can no longer
  // merge across the two tiers, and that is the right trade here: the lane sits
  // at ~330 draws against a 600 budget and had no triangle headroom at all.

  async prime() {
    const onp = this.L.onProgress || (() => {});
    const n = Math.min(this.plans.length, this.L.blocksAhead + 1);
    for (let i = 0; i < n; i++) {
      this.realise(i);
      onp(0.5 + (0.4 * (i + 1)) / n);
      if (i % 2 === 1) await new Promise((r) => setTimeout(r, 0));
    }
    // The loading screen is the one place where doing all the work at once is
    // free, so the opening blocks are fully built before the first frame.
    let done = 0;
    for (const blk of this.blocks.values()) {
      const want = this.wantTier(blk, 0);
      const steps = want === 'far' ? ['shellA', 'shellB'] : want === 'mid' ? ['shellA', 'shellB', 'mid']
        : ['shellA', 'shellB', 'mid', 'nearA', 'nearB', 'det'];
      for (const t of steps) this.ensureTier(blk, t);
      onp(0.9 + (0.1 * ++done) / this.blocks.size);
    }
    this.setLod(0);
  }

  /** Create a block: bookkeeping, obstacles and practicals only. No geometry. */
  realise(i) {
    if (this.blocks.has(i) || i < 0 || i >= this.plans.length) return null;
    const T = this.T, p = this.plans[i];
    const blk = {
      i, p, gShellA: null, gShellB: null, gMid: null, gNearA: null, gNearB: null, gDet: null, dyn: null,
      z0: p.z0, z1: p.z1, lod: 'none', buildMs: 0,
      rawMeshes: 0, nearMeshes: 0, midMeshes: 0, farMeshes: 0, obstacles: p.obstacles,
    };
    this.blocks.set(i, blk);

    for (const ob of p.obstacles) {
      ob.group = new T.Group();
      ob.group.position.set(ob.x, 0, ob.z);
      ob.live = [];
      this.group.add(ob.group);
      this.obstacles.push(ob);
    }

    if (this.night && typeof this.night.addPractical === 'function') {
      for (let k = 0; k < p.lights.length; k++) {
        const key = i * 4096 + k;
        if (this.registered.has(key)) continue;
        this.registered.add(key);
        const lp = p.lights[k];
        try {
          this.night.addPractical({
            x: lp.x, y: lp.y, z: lp.z, warm: lp.warm,
            intensity: lp.warm ? 4.2 : 3.0, range: lp.warm ? 11.5 : 8.5,
          });
        } catch (e) { /* night.js budgets these; never let it kill the lane */ }
      }
    }
    return blk;
  }

  _place(pr, k, coarse) {
    const useCoarse = coarse || ALWAYS_COARSE.has(pr.n);
    const src = useCoarse ? (this.coarse[pr.n] || this.protos[pr.n]) : this.protos[pr.n];
    const o = src.clone(true);
    o.scale.set(pr.sx, pr.sy, pr.sz);
    o.position.set(pr.x, pr.y + groundY(pr.x), pr.z);
    o.rotation.y = pr.ry;
    o.userData.pi = k;
    return o;
  }

  /**
   * Build one LOD group of one block. Returns true if it did work, so update()
   * can stop after a single piece.
   *
   *   shellA  coarse tier 0 + the ground      drawn at EVERY range
   *   shellB  coarse tier 0, second half of z  drawn at EVERY range
   *   mid     coarse tier 1                   the stall line, in silhouette
   *   nearA   full   tier 1, first half of z  the stall line you brush past
   *   nearB   full   tier 1, second half
   *   det     coarse tier 2                   the clutter on the counter
   *
   * Two things are going on here and both were measured rather than guessed.
   *
   * COARSE is docs/traps.md's answer to "when one view holds the whole level":
   * the same assets with every PART under 25 cm in world space removed, which is
   * 43% of the triangles in this set. The trap is explicit that this is what to
   * reach for before trimming any asset, and it was right — a census named
   * cable_bundle_pole (19,316 triangles) and shophouse_facade (9,996), and
   * cutting those two would not have helped, because the rest was legitimately
   * in frame. The enclosure never gets closer than about 4 m to the camera, so
   * it uses the coarse build at every range and there is nothing to swap.
   *
   * The SPLIT is about frame time, not triangles. Baking a whole block in one go
   * is 34 ms, and at 9 m/s a block is needed every 2.4 s, so a single-step build
   * drops a frame roughly every two seconds for the length of the run: measured,
   * 91 frames over 16 ms in a 7,334 frame run. Cut into five pieces the worst
   * step is ~15 ms and only the tier-1 halves ever come close.
   */
  ensureTier(blk, name) {
    const key = { shellA: 'gShellA', shellB: 'gShellB', mid: 'gMid', nearA: 'gNearA', nearB: 'gNearB', det: 'gDet' }[name];
    if (blk[key]) return false;
    const T = this.T, p = blk.p;
    const t0 = performance.now();
    const coarse = name !== 'nearA' && name !== 'nearB';
    const half = name === 'shellA' || name === 'nearA' ? 'A' : name === 'shellB' || name === 'nearB' ? 'B' : null;
    const tier = name.startsWith('shell') ? 0 : name === 'det' ? 2 : 1;
    const zMid = p.z0 + (p.z1 - p.z0) / 2;

    const src = new T.Group();
    let raw = 0;
    for (let k = 0; k < p.props.length; k++) {
      const pr = p.props[k];
      if (pr.dyn || pr.tier !== tier) continue;
      if (half === 'A' && pr.z >= zMid) continue;
      if (half === 'B' && pr.z < zMid) continue;
      src.add(this._place(pr, k, coarse));
    }
    if (name === 'shellA') src.add(this.buildGround(p));
    src.updateMatrixWorld(true);
    src.traverse((o) => { if (o.isMesh) raw++; });
    // opts.bake === false is a measurement seam, not a feature: it is the only
    // way to get the honest before/after for what bakeStatic() is worth here.
    const g = this.L.bake === false ? src : bakeStatic(src);
    g.name = 'blk' + blk.i + '_' + name;
    g.visible = false;
    let n = 0; g.traverse((o) => { if (o.isMesh) n++; });
    blk[key] = g;
    if (name.startsWith('shell')) { blk.farMeshes += n; blk.midMeshes += n; blk.nearMeshes += n; }
    else if (name === 'mid') blk.midMeshes += n;
    else blk.nearMeshes += n;
    blk.rawMeshes += raw;
    this.group.add(g);

    if (name === 'mid') {
      // The topple piles arrive with the mid group, the first range at which
      // they are drawn at all. Each pile is merged on its own — it cannot join a
      // block bake because it moves, but that is no reason for four crates to
      // cost six draw calls.
      const dyn = new T.Group();
      for (let k = 0; k < p.props.length; k++) {
        const pr = p.props[k];
        if (!pr.dyn) continue;
        const o = this.protos[pr.n].clone(true);
        o.scale.set(pr.sx, pr.sy, pr.sz);
        o.position.set(0, 0, 0); o.rotation.y = 0;
        o.updateMatrixWorld(true);
        const merged = bakeStatic(this.hardSnapIn(o));
        merged.position.set(pr.x, pr.y + groundY(pr.x), pr.z);
        merged.rotation.y = pr.ry;
        merged.userData.pi = k;
        dyn.add(merged);
      }
      dyn.updateMatrixWorld(true);
      dyn.visible = false;
      blk.dyn = dyn;
      this.group.add(dyn);
      for (const ob of p.obstacles) {
        ob.live = dyn.children.filter((c) => ob.parts.includes(c.userData.pi));
        if (ob.down) for (const c of ob.live) this.snapDown(ob, c);
      }
    }

    // Emissives: after a bake there are no individual props left, so the baked
    // meshes carrying an emissive material are the honest answer.
    for (const root of [g, blk.dyn].filter(Boolean)) {
      root.traverse((o) => {
        if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.emissive &&
            o.material.emissive.getHex() !== 0 && (o.material.emissiveIntensity ?? 1) > 0) {
          if (!this.emissives.includes(o)) this.emissives.push(o);
        }
      });
    }

    blk.buildMs = Math.max(blk.buildMs, performance.now() - t0);
    return true;
  }

  /** Which LOD this block SHOULD be showing, from its distance to the player. */
  wantTier(blk, playerZ) {
    if (blk.z1 < playerZ) {
      // Behind the player. The chase camera sits 5.2 m back and faces +Z, so the
      // block just passed is a sliver at the bottom of the frame and everything
      // before it is off screen.
      return blk.z1 < playerZ - 6 ? 'far' : 'mid';
    }
    const d = blk.z0 - playerZ;
    return d > this.lod.vis ? 'none' : d > this.lod.mid ? 'far' : d > this.lod.near ? 'mid' : 'near';
  }

  evict(i) {
    const blk = this.blocks.get(i);
    if (!blk) return;
    const dispose = (root) => {
      if (!root) return;
      root.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      this.group.remove(root);
    };
    const mine = [blk.gShellA, blk.gShellB, blk.gMid, blk.gNearA, blk.gNearB, blk.gDet, blk.dyn];
    for (let k = this.emissives.length - 1; k >= 0; k--) {
      let n = this.emissives[k];
      while (n) {
        if (mine.includes(n)) { this.emissives.splice(k, 1); break; }
        n = n.parent;
      }
    }
    // Everything disposed here is geometry this block made: the bakes clone, and
    // the dyn pieces are baked clones too. The PROTOTYPES are shared and are
    // never disposed.
    dispose(blk.gShellA); dispose(blk.gShellB); dispose(blk.gMid); dispose(blk.gNearA); dispose(blk.gNearB);
    dispose(blk.gDet); dispose(blk.dyn);
    for (const ob of blk.obstacles) {
      const at = this.obstacles.indexOf(ob);
      if (at >= 0) this.obstacles.splice(at, 1);
      if (ob.group) this.group.remove(ob.group);
      ob.group = null; ob.live = null;
    }
    this.toppling = this.toppling.filter((t) => t.blk !== i);
    this.blocks.delete(i);
  }

  setLod(playerZ) {
    for (const blk of this.blocks.values()) {
      let want = this.wantTier(blk, playerZ);
      // never ask for a group that has not been built yet; fall back outwards
      if (want === 'near' && !(blk.gNearA && blk.gNearB)) want = 'mid';
      if (want === 'mid' && !blk.gMid) want = 'far';
      if (want === 'far' && !(blk.gShellA && blk.gShellB)) want = 'none';
      if (want === blk.lod) continue;
      blk.lod = want;
      // the shell is the enclosure and the ground: it is drawn at every range
      if (blk.gShellA) blk.gShellA.visible = want !== 'none';
      if (blk.gShellB) blk.gShellB.visible = want !== 'none';
      if (blk.gMid) blk.gMid.visible = want === 'mid';
      if (blk.gNearA) blk.gNearA.visible = want === 'near';
      if (blk.gNearB) blk.gNearB.visible = want === 'near';
      if (blk.gDet) blk.gDet.visible = want === 'near';
      // The topple piles are the one thing that cannot be baked, so each is
      // several draws for as long as its block is alive. Past the mid band they
      // are simply absent; nothing else in the frame changes, because the block
      // bakes never contained them.
      if (blk.dyn) blk.dyn.visible = want === 'mid' || want === 'near';
    }
  }

  // ---------------------------------------------------------------- runtime
  update(playerZ, dt) {
    const L = this.L, bl = L.blockLength;
    const cur = Math.floor(playerZ / bl);
    const lo = cur - L.blocksBehind, hi = cur + L.blocksAhead;

    for (const i of this.blocks.keys()) if (i < lo || i > hi) this.evict(i);

    // ONE piece of work per call, nearest first: create a block, or build the
    // next group of one that is about to need it. Everything else waits a frame,
    // which is the whole point.
    let work = false;
    for (let i = Math.max(0, lo); i <= hi && !work; i++) {
      if (i >= this.plans.length) break;
      const blk = this.blocks.get(i);
      if (!blk) { this.realise(i); work = true; break; }
      const want = this.wantTier(blk, playerZ);
      if (want === 'none') continue;
      const steps = want === 'far' ? ['shellA', 'shellB'] : want === 'mid' ? ['shellA', 'shellB', 'mid']
        : ['shellA', 'shellB', 'mid', 'nearA', 'nearB', 'det'];
      for (const t of steps) if (this.ensureTier(blk, t)) { work = true; break; }
    }

    this.setLod(playerZ);
    if (this.toppling.length) this.stepTopple(dt);
  }

  /**
   * sampleAhead: obstacles between z and z+ahead, nearest first.
   *
   * Reads the PLAN rather than the live scene, so it is correct past the end of
   * the streamed window and costs nothing but a walk of the one or two blocks
   * the span touches. This is on the telemetry path and the gate steers by it,
   * so it allocates one array and reuses the obstacle records themselves.
   */
  sampleAhead(z, ahead) {
    const bl = this.L.blockLength;
    const out = this._sample;
    out.length = 0;
    const i0 = Math.max(0, Math.floor(z / bl));
    const i1 = Math.min(this.plans.length - 1, Math.floor((z + ahead) / bl));
    for (let i = i0; i <= i1; i++) {
      const p = this.plans[i];
      if (!p) continue;
      for (let k = 0; k < p.obstacles.length; k++) {
        const ob = p.obstacles[k];
        if (ob.down) continue;
        const front = ob.z - ob.halfD;
        if (front >= z - 0.4 && front <= z + ahead) out.push(ob);
      }
    }
    out.sort((a, b) => a.z - b.z);
    return out;
  }

  /**
   * Knock a stack over. The chase code slows the pursuers; this is the part the
   * player sees, so the pile does not simply sink — each piece tips onto its
   * side in its own direction, drops to the road and stays scattered.
   */
  topple(ob) {
    if (!ob || ob.kind !== 'topple' || ob.down || !ob.live || !ob.live.length) return false;
    ob.down = true;
    ob.height = 0.28;
    const T = this.T;
    const rng = mulberry32(hash32(this.L.seed, ob.id * 977 + 5));
    const blk = Math.floor(ob.z / this.L.blockLength);
    for (const o of ob.live) {
      const dir = rng() * Math.PI * 2;
      const axis = new T.Vector3(Math.cos(dir), 0, Math.sin(dir));
      const q = new T.Quaternion().setFromAxisAngle(axis, (1.25 + rng() * 0.5) * (rng() < 0.5 ? 1 : -1));
      const toQ = q.multiply(o.quaternion.clone());
      const px = o.position.x + Math.sin(dir) * (0.3 + rng() * 0.75);
      const pz = o.position.z + Math.cos(dir) * (0.25 + rng() * 0.6);
      // find the resting height by measuring the object in its final rotation,
      // rather than guessing and leaving half the crate under the road
      const keepQ = o.quaternion.clone(), keepP = o.position.clone();
      o.quaternion.copy(toQ); o.position.set(px, 0, pz); o.updateMatrixWorld(true);
      this._box.setFromObject(o);
      const rest = groundY(px) + 0.015 - (this._box.min.y - o.position.y);
      o.quaternion.copy(keepQ); o.position.copy(keepP); o.updateMatrixWorld(true);
      this.toppling.push({
        blk, o, t: 0, dur: 0.34 + rng() * 0.16,
        fromQ: keepQ.clone(), toQ,
        fromP: keepP.clone(), toP: new T.Vector3(px, rest, pz),
        spin: (rng() - 0.5) * 2.2,
      });
    }
    return true;
  }

  /** Place an already-toppled obstacle straight down, for a block rebuilt after
   *  the player knocked it over and came back into range. */
  snapDown(ob, o) {
    const rng = mulberry32(hash32(this.L.seed, ob.id * 977 + 5));
    const T = this.T;
    const dir = rng() * Math.PI * 2;
    const axis = new T.Vector3(Math.cos(dir), 0, Math.sin(dir));
    o.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis, 1.5));
    o.position.x += Math.sin(dir) * 0.5;
    o.position.z += Math.cos(dir) * 0.4;
    o.updateMatrixWorld(true);
    this._box.setFromObject(o);
    o.position.y += groundY(o.position.x) + 0.015 - this._box.min.y;
  }

  stepTopple(dt) {
    const keep = [];
    for (const t of this.toppling) {
      t.t += dt;
      const u = clamp(t.t / t.dur, 0, 1);
      const e = 1 - (1 - u) * (1 - u) * (1 - u);
      t.o.quaternion.slerpQuaternions(t.fromQ, t.toQ, e);
      t.o.position.lerpVectors(t.fromP, t.toP, e);
      // a small hop as it goes over, so it reads as knocked rather than deflated
      t.o.position.y += Math.sin(u * Math.PI) * 0.12;
      t.o.rotateY(t.spin * dt * (1 - u));
      if (u < 1) keep.push(t);
    }
    this.toppling = keep;
  }

  // ------------------------------------------------------------------ stats
  stats() {
    let visMeshes = 0, raw = 0, dynMeshes = 0, ms = 0, allBaked = 0;
    const lods = { near: 0, mid: 0, far: 0, none: 0 };
    for (const b of this.blocks.values()) {
      lods[b.lod] = (lods[b.lod] || 0) + 1;
      visMeshes += b.lod === 'far' ? b.farMeshes : b.lod === 'mid' ? b.midMeshes
        : b.lod === 'near' ? b.nearMeshes : 0;
      allBaked += b.nearMeshes;
      raw += b.rawMeshes; ms = Math.max(ms, b.buildMs);
      if (b.dyn) b.dyn.traverse((o) => { if (o.isMesh) dynMeshes++; });
    }
    return {
      alive: this.blocks.size, lods, rawMeshes: raw, visibleMeshes: visMeshes,
      bakedMeshesIfAllNear: allBaked, dynMeshes,
      materials: this.matCache.size, worstBlockMs: +ms.toFixed(1), lod: this.lod,
      propsTotal: this.report.props, propsPerBlock: +(this.report.props / this.report.blocks).toFixed(1),
      propsPer100m: +((this.report.props / this.report.blocks) * (100 / this.L.blockLength)).toFixed(0),
      obstaclesTotal: this.events.length, lampPoints: this.lampPoints.length,
      synthesizedLights: this.report.synthesizedLights,
    };
  }
}
