// ice_fish_tray_trestle - ARM C: a second reading. Crushed ice is not a scatter
// of separate lumps sitting on a floor, it is one continuous drift that has been
// shovelled in and levelled off - piled at the middle, hollowed where each fish
// was pressed into it, and falling away at the rim. So the ice here is a single
// hand-built BufferGeometry heightfield with jittered vertices and flat shading:
// every facet catches the light differently and the fish sit IN it rather than
// on it. The trestle is read the other way round too: a deep pressed fish box
// with round-tube legs and a slatted under-shelf, rather than a tray on sticks.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.35, ...o });
    m.name = name; return m;
  };
  const STEEL = M(0x8f9aa3, 'metal', { roughness: 0.38, metalness: 0.72, side: THREE.DoubleSide });
  const STEEL2 = M(0x8f9aa3, 'metal', { roughness: 0.55, metalness: 0.60 });
  const FRAME = M(0x5a6169, 'metal', { roughness: 0.50, metalness: 0.62 });
  const BLACK = M(0x1b1e22, 'plaster', { roughness: 0.92, metalness: 0.04 });
  const ICE = M(0xe8dcc0, 'stone', { roughness: 0.28, metalness: 0.06, flatShading: true });
  const ICE2 = M(0x8f9aa3, 'stone', { roughness: 0.34, metalness: 0.10, flatShading: true });
  const FISH = M(0x8f9aa3, 'tile', { roughness: 0.24, metalness: 0.48 });
  const FISHB = M(0x2a2f35, 'tile', { roughness: 0.30, metalness: 0.40 });
  const GILL = M(0xc4442f, 'tile', { roughness: 0.42, metalness: 0.10 });
  const TIMB = M(0xa9784f, 'timber', { roughness: 0.93, metalness: 0.0 });
  const JADE = M(0x2f7a6a, 'plaster', { roughness: 0.72, metalness: 0.05 });

  let s = 990331;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

  const add = (p, geo, mat, pos, rot, scl) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    p.add(m); return m;
  };
  const tube = (p, a, b, r, mat, seg = 8) => {
    const A = new THREE.Vector3(a[0], a[1], a[2]);
    const B = new THREE.Vector3(b[0], b[1], b[2]);
    const d = new THREE.Vector3().subVectors(B, A);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
    m.position.copy(A).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    p.add(m); return m;
  };

  const TOP = 0.880, FLOOR = 0.700, HX = 0.775, HZ = 0.335;

  // ---- round-tube folding frame --------------------------------------------
  for (const sx of [-1, 1]) {
    const x = sx * 0.590;
    tube(g, [x, 0.010, -0.310], [x, 0.686, 0.262], 0.019, FRAME);
    tube(g, [x, 0.010, 0.310], [x, 0.686, -0.262], 0.019, FRAME);
    tube(g, [x, 0.010, -0.310], [x, 0.010, 0.310], 0.016, FRAME);      // foot rail
    add(g, new THREE.BoxGeometry(0.052, 0.100, 0.086), STEEL2, [x, 0.664, 0.252], [0.42, 0, 0]);
    add(g, new THREE.BoxGeometry(0.052, 0.100, 0.086), STEEL2, [x, 0.664, -0.252], [-0.42, 0, 0]);
    add(g, new THREE.CylinderGeometry(0.026, 0.026, 0.062, 10), STEEL2, [x, 0.348, -0.024], [0, 0, Math.PI / 2]);
    add(g, new THREE.BoxGeometry(0.050, 0.018, 0.062), BLACK, [x, 0.009, -0.312]);
    add(g, new THREE.BoxGeometry(0.050, 0.018, 0.062), BLACK, [x, 0.009, 0.312]);
  }
  tube(g, [-0.590, 0.348, -0.024], [0.590, 0.348, -0.024], 0.014, FRAME);
  tube(g, [-0.590, 0.150, -0.230], [0.590, 0.150, -0.230], 0.013, FRAME);
  tube(g, [-0.590, 0.150, 0.230], [0.590, 0.150, 0.230], 0.013, FRAME);
  // slatted under-shelf, where the spare boxes live
  for (const dz of [-0.200, -0.070, 0.060, 0.190])
    add(g, new THREE.BoxGeometry(1.120, 0.018, 0.088), TIMB, [0, 0.170, dz]);
  add(g, new THREE.BoxGeometry(0.300, 0.140, 0.230), JADE, [-0.330, 0.250, 0.020], [0, 0.22, 0]);
  add(g, new THREE.BoxGeometry(0.280, 0.130, 0.215), JADE, [0.330, 0.245, -0.030], [0, -0.15, 0]);

  // ---- the pressed fish box -------------------------------------------------
  add(g, new THREE.BoxGeometry(2 * HX, 0.020, 2 * HZ), STEEL2, [0, FLOOR - 0.010, 0]);
  const WH = TOP - FLOOR;
  add(g, new THREE.BoxGeometry(2 * HX, WH, 0.012), STEEL, [0, FLOOR + WH / 2, -HZ + 0.006]);
  add(g, new THREE.BoxGeometry(2 * HX, WH, 0.012), STEEL, [0, FLOOR + WH / 2, HZ - 0.006]);
  add(g, new THREE.BoxGeometry(0.012, WH, 2 * HZ), STEEL, [-HX + 0.006, FLOOR + WH / 2, 0]);
  add(g, new THREE.BoxGeometry(0.012, WH, 2 * HZ), STEEL, [HX - 0.006, FLOOR + WH / 2, 0]);
  // rolled rim: a torus-section bar round the top edge
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 2 * HX + 0.026, 8), STEEL2, [0, TOP - 0.008, -HZ], [0, 0, Math.PI / 2]);
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 2 * HX + 0.026, 8), STEEL2, [0, TOP - 0.008, HZ], [0, 0, Math.PI / 2]);
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 2 * HZ, 8), STEEL2, [-HX, TOP - 0.008, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.013, 0.013, 2 * HZ, 8), STEEL2, [HX, TOP - 0.008, 0], [Math.PI / 2, 0, 0]);
  // pressed swage lines down the outside, and the drain
  for (const dx of [-0.500, 0.000, 0.500])
    add(g, new THREE.BoxGeometry(0.020, WH - 0.030, 0.014), STEEL2, [dx, FLOOR + WH / 2 - 0.010, -HZ - 0.004]);
  // drain tucked UNDER the box, not out of its end: the end is what sets the
  // 1.6 m length and a spigot hanging off it quietly makes the object longer.
  add(g, new THREE.CylinderGeometry(0.020, 0.020, 0.056, 10), STEEL2, [-0.690, FLOOR - 0.034, 0.190]);
  add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.240, 8), BLACK, [-0.700, FLOOR - 0.170, 0.196], [0.22, 0, 0.12]);

  // ---- the ice drift: one faceted heightfield -------------------------------
  const NX = 34, NZ = 13, IX = HX - 0.020, IZ = HZ - 0.020, BASE = FLOOR + 0.012;
  const pos = [], idx = [];
  const h = (u, w) => {
    // domed across the tray, higher up the middle, falling away at the rim
    const dome = (1 - u * u * 0.55) * (1 - w * w * 0.75);
    const lump = 0.011 * Math.sin(u * 17.0) + 0.009 * Math.sin(w * 21.0 + 1.3)
               + 0.008 * Math.sin(u * 31.0 + w * 13.0) + 0.006 * Math.sin(u * 9.0 - w * 27.0);
    return BASE + 0.052 * Math.max(0.12, dome) + lump;
  };
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const u = -1 + 2 * i / NX, w = -1 + 2 * j / NZ;
    const edge = (i === 0 || i === NX || j === 0 || j === NZ);
    const jx = edge ? 0 : (rnd() - 0.5) * (2 * IX / NX) * 0.55;
    const jz = edge ? 0 : (rnd() - 0.5) * (2 * IZ / NZ) * 0.55;
    const y = edge ? BASE + 0.006 : h(u, w) + (rnd() - 0.5) * 0.011;
    pos.push(u * IX + jx, y, w * IZ + jz);
  }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + (NX + 1), d = c + 1;
    if ((i + j) % 2) { idx.push(a, c, b, b, c, d); } else { idx.push(a, c, d, a, d, b); }
  }
  const iceGeo = new THREE.BufferGeometry();
  iceGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  iceGeo.setIndex(idx);
  iceGeo.computeVertexNormals();
  add(g, iceGeo, ICE);
  // the shoulder of the drift where it meets the wall, so there is no gap
  add(g, new THREE.BoxGeometry(2 * IX + 0.030, 0.030, 2 * IZ + 0.030), ICE2, [0, BASE + 0.008, 0]);
  // loose chunks standing proud, so the surface has real broken edges
  const G1 = new THREE.OctahedronGeometry(1, 0), G2 = new THREE.TetrahedronGeometry(1, 0);
  for (let i = 0; i < 56; i++) {
    const u = (rnd() * 2 - 1) * 0.94, w = (rnd() * 2 - 1) * 0.88, sc = 0.017 + rnd() * 0.026;
    add(g, rnd() < 0.72 ? G1 : G2, rnd() < 0.75 ? ICE : ICE2,
        [u * IX, h(u, w) + sc * 0.35, w * IZ],
        [rnd() * 3, rnd() * 3, rnd() * 3], [sc, sc * (0.55 + rnd() * 0.5), sc * (0.7 + rnd() * 0.5)]);
  }

  // ---- fish pressed INTO the drift, overlapping ----------------------------
  const SPH = new THREE.SphereGeometry(1, 10, 7);
  const fish = (x, z, len, yaw, roll, sink, dark) => {
    const u = x / IX, w = z / IZ;
    const f = new THREE.Group();
    f.position.set(x, h(Math.max(-1, Math.min(1, u)), Math.max(-1, Math.min(1, w))) + len * 0.075 - sink, z);
    f.rotation.set(0, yaw, roll);
    const wd = len * 0.150, ht = len * 0.212;
    add(f, SPH, dark ? FISHB : FISH, [0, 0, 0], null, [len * 0.5, ht, wd]);
    add(f, SPH, FISHB, [0, ht * 0.44, 0], null, [len * 0.43, ht * 0.40, wd * 0.78]);
    add(f, new THREE.ConeGeometry(ht * 1.10, len * 0.24, 4), dark ? FISHB : FISH,
        [-len * 0.57, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.26]);
    add(f, new THREE.ConeGeometry(ht * 0.64, len * 0.16, 3), FISH,
        [len * 0.04, ht * 0.80, 0], [0, 0, -0.5], [1, 1, 0.22]);
    add(f, new THREE.ConeGeometry(ht * 0.44, len * 0.13, 3), FISH,
        [len * 0.20, -ht * 0.28, wd * 0.60], [Math.PI / 2, 0, 0], [1, 1, 0.30]);
    add(f, new THREE.SphereGeometry(len * 0.030, 6, 5), BLACK, [len * 0.40, ht * 0.32, wd * 0.60]);
    add(f, new THREE.BoxGeometry(len * 0.016, ht * 0.92, wd * 0.92), GILL, [len * 0.26, 0, 0]);
    g.add(f); return f;
  };
  // three overlapping ranks, the near one laid the other way, as in the photo
  const ranks = [[-0.205, 5, 0.300], [0.010, 5, 0.275], [0.205, 4, 0.255]];
  for (let r = 0; r < ranks.length; r++) {
    const z0 = ranks[r][0], n = ranks[r][1], base = ranks[r][2];
    for (let i = 0; i < n; i++)
      fish(-0.585 + i * (1.170 / (n - 1)) + (rnd() - 0.5) * 0.080,
           z0 + (rnd() - 0.5) * 0.060, base + rnd() * 0.075,
           (r === 2 ? Math.PI : 0) + (rnd() - 0.5) * 0.50, (rnd() - 0.5) * 0.55,
           0.012 + rnd() * 0.014, rnd() < 0.30);
  }
  // two small ones tucked in at the end, because a tray is never laid out evenly
  fish(0.630, -0.085, 0.195, 0.9, 0.3, 0.010, false);
  fish(0.665, 0.120, 0.180, -0.7, -0.2, 0.012, true);

  // ---- bucket underneath ----------------------------------------------------
  const BM = M(0x5a6169, 'plaster', { roughness: 0.72, metalness: 0.05, side: THREE.DoubleSide });
  const BP = [[0.000, 0.000], [0.100, 0.000], [0.106, 0.014], [0.120, 0.120],
              [0.136, 0.260], [0.142, 0.302], [0.148, 0.306], [0.144, 0.290],
              [0.132, 0.260], [0.116, 0.120], [0.102, 0.016]].map((q) => new THREE.Vector2(q[0], q[1]));
  add(g, new THREE.LatheGeometry(BP, 16), BM, [-0.440, 0.0, 0.255]);
  add(g, new THREE.TorusGeometry(0.147, 0.006, 4, 14, Math.PI), FRAME, [-0.440, 0.282, 0.255]);

  // --- contract: base at y = 0, centred on x and z --------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
