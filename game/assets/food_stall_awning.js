// food_stall_awning — arm A: primitives. Welded steel frame, gabled striped awning,
// timber counter, loaded lower shelf, hanging bulbs. 2.4 w x 2.2 d x 3.2 h.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    m.name = name; return m;
  };
  const STEEL  = mat(0x5a6169, 'metal',  { roughness: 0.55, metalness: 0.65 });
  const STEELD = mat(0x2a2f35, 'metal',  { roughness: 0.6,  metalness: 0.5 });
  const STAIN  = mat(0x8f9aa3, 'metal',  { roughness: 0.35, metalness: 0.85 });
  const TIMB   = mat(0xa9784f, 'timber', { roughness: 0.9 });
  const TIMBD  = mat(0x6d4a2f, 'timber', { roughness: 0.95 });
  const RED    = mat(0xc4442f, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const BONE   = mat(0xe8dcc0, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const CROCK  = mat(0xe8dcc0, 'tile',   { roughness: 0.5, side: THREE.DoubleSide });
  const JADE   = mat(0x2f7a6a, 'plaster',{ roughness: 0.8 });
  const TARP   = mat(0x1d5f8a, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const BRASS  = mat(0xd8cf7a, 'metal',  { roughness: 0.45, metalness: 0.8 });
  const BULB   = mat(0xffb45a, 'tile',   { emissive: 0xffb45a, emissiveIntensity: 1.8, roughness: 0.4 });
  const NEON   = mat(0x63e0ff, 'tile',   { emissive: 0x63e0ff, emissiveIntensity: 1.9, roughness: 0.4 });

  const box = (w, h, d, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const cyl = (rt, rb, h, seg, m, x, y, z, rx, ry, rz, open) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const inst = (geo, m, list) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
          p = new THREE.Vector3(), s = new THREE.Vector3();
    list.forEach((t, i) => {
      p.set(t[0], t[1], t[2]);
      e.set(t[3] || 0, t[4] || 0, t[5] || 0); q.setFromEuler(e);
      const sc = t[6] === undefined ? 1 : t[6]; s.set(sc, sc, sc);
      M.compose(p, q, s); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true;
    g.add(im); return im;
  };

  // ---- frame -------------------------------------------------------------
  const PX = 1.02, PZ = 0.40;          // post positions
  const EY = 2.40, EZ = 1.08;          // eave beam
  const RY = 3.16;                     // ridge
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.06, 2.88, 0.06, STEEL, sx * PX, 1.44, sz * PZ);      // corner post
    box(0.10, 0.03, 0.10, STEELD, sx * PX, 0.015, sz * PZ);    // foot plate
  }
  // king posts + ridge beam
  for (const sx of [-1, 1]) box(0.05, 0.60, 0.05, STEEL, sx * PX, 2.86, 0);
  box(2.22, 0.07, 0.07, STEEL, 0, RY, 0);
  // eave beams and outriggers
  for (const sz of [-1, 1]) {
    box(2.34, 0.06, 0.06, STEEL, 0, EY, sz * EZ);
    box(2.20, 0.05, 0.05, STEEL, 0, 2.62, sz * PZ);            // top rail over posts
  }
  box(2.12, 0.04, 0.04, STEEL, 0, 2.26, 0.36);                 // hanging rail (front)
  box(2.12, 0.04, 0.04, STEEL, 0, 2.26, -0.36);                // hanging rail (back)

  // rafters: ridge -> eave, both slopes, three ribs each
  const RA = Math.atan2(RY - EY, EZ);          // 0.612 rad
  const RL = Math.hypot(RY - EY, EZ);
  for (const rx of [-1.08, 0, 1.08]) for (const sz of [-1, 1]) {
    box(0.05, 0.05, RL + 0.06, STEEL, rx, (RY + EY) / 2, sz * EZ / 2, sz * RA);
  }
  // strut from post head to eave
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const len = Math.hypot(EZ - PZ, 0.30);
    box(0.04, 0.04, len, STEELD, sx * PX, 2.52, sz * (PZ + EZ) / 2, sz * Math.atan2(0.30, EZ - PZ));
  }

  // ---- awning sheet: down-slope stripes ----------------------------------
  const SW = 0.20;
  for (let i = 0; i < 12; i++) {
    const x = -1.2 + SW * i + SW / 2;
    const m = i % 2 ? BONE : RED;
    for (const sz of [-1, 1]) {
      box(SW - 0.004, 0.025, RL, m, x, (RY + EY) / 2 + 0.03, sz * EZ / 2, sz * RA);
      // valance fringe at the eave
      box(SW - 0.004, 0.15, 0.02, m, x, EY - 0.10, sz * (EZ + 0.03));
    }
  }
  // ridge cap
  box(2.4, 0.03, 0.10, BONE, 0, RY + 0.055, 0);

  // ---- counter and shelves ------------------------------------------------
  box(2.16, 0.06, 0.90, TIMB, 0, 0.89, 0);                     // counter top 0.92
  box(2.16, 0.20, 0.035, TIMBD, 0, 0.76, 0.45);                // front apron
  box(2.10, 0.05, 0.84, TIMB, 0, 0.36, 0);                     // lower shelf
  for (const sz of [-1, 1]) box(2.10, 0.05, 0.05, STEEL, 0, 0.60, sz * PZ);  // mid rail
  // X-braces on both ends
  for (const sx of [-1, 1]) for (const s of [-1, 1]) {
    box(0.035, 1.06, 0.035, STEELD, sx * PX, 0.44, 0, s * 0.785);
  }
  // slatted back
  for (let i = 0; i < 7; i++) box(2.10, 0.13, 0.028, TIMBD, 0, 1.06 + 0.19 * i, -0.44);
  for (const sx of [-0.6, 0.6]) box(0.05, 1.35, 0.04, STEEL, sx, 1.62, -0.47);
  // tarp panel tucked on the left end
  box(0.02, 1.30, 0.78, TARP, -1.05, 1.62, 0);

  // ---- clutter: the point of the object ----------------------------------
  // stacks of bowls on the lower shelf
  const bowlPts = [];
  for (const p of [[0.010, 0.000], [0.062, 0.004], [0.083, 0.038], [0.092, 0.062]])
    bowlPts.push(new THREE.Vector2(p[0], p[1]));
  const bowlGeo = new THREE.LatheGeometry(bowlPts, 10);
  const bowls = [];
  for (let s = 0; s < 5; s++) {
    const bx = -0.86 + s * 0.30, n = 4 + (s % 3);
    for (let k = 0; k < n; k++) bowls.push([bx, 0.39 + k * 0.045, -0.16, 0, s * 0.4, 0, 0.95 + 0.05 * (k % 2)]);
  }
  inst(bowlGeo, CROCK, bowls);
  // plate stacks
  inst(new THREE.CylinderGeometry(0.095, 0.09, 0.012, 10), CROCK,
    [[0.62, 0.395, 0.12], [0.62, 0.408, 0.12], [0.62, 0.421, 0.12], [0.62, 0.434, 0.12],
     [0.86, 0.395, 0.10], [0.86, 0.408, 0.10], [0.86, 0.421, 0.10]]);
  // storage jars with brass lids
  const jarXs = [-0.30, -0.13, 0.04, 0.21, 0.38];
  inst(new THREE.CylinderGeometry(0.058, 0.058, 0.17, 8), CROCK, jarXs.map((x) => [x, 0.47, 0.16]));
  inst(new THREE.CylinderGeometry(0.062, 0.062, 0.022, 8), BRASS, jarXs.map((x) => [x, 0.567, 0.16]));
  // sauce bottles crowded on the counter
  inst(new THREE.CylinderGeometry(0.033, 0.038, 0.21, 6), RED,
    [[-0.20, 1.025, -0.28], [-0.13, 1.025, -0.32], [-0.06, 1.025, -0.27],
     [0.01, 1.025, -0.31], [0.08, 1.025, -0.26], [0.15, 1.025, -0.30], [0.22, 1.025, -0.28]]);
  inst(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 6), STEELD,
    [[-0.20, 1.16, -0.28], [-0.13, 1.16, -0.32], [-0.06, 1.16, -0.27],
     [0.01, 1.16, -0.31], [0.08, 1.16, -0.26], [0.15, 1.16, -0.30], [0.22, 1.16, -0.28]]);

  // chopping block, wok on a ring burner, steamer stack
  box(0.52, 0.09, 0.34, TIMBD, -0.72, 0.965, 0.04);
  cyl(0.16, 0.15, 0.06, 10, STEELD, 0.66, 0.95, 0.02);                 // wok ring
  const wok = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 5, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44), STAIN);
  wok.position.set(0.66, 1.10, 0.02); g.add(wok);
  cyl(0.11, 0.11, 0.02, 10, BULB, 0.66, 0.945, 0.02);                  // flame under the wok
  for (let i = 0; i < 3; i++) {
    cyl(0.155, 0.155, 0.075, 12, TIMB, 0.16, 0.955 + i * 0.078, 0.24, 0, 0, 0, true);
    cyl(0.163, 0.163, 0.012, 12, TIMBD, 0.16, 0.995 + i * 0.078, 0.24);
  }
  cyl(0.16, 0.13, 0.05, 12, TIMB, 0.16, 1.215, 0.24);                  // steamer lid
  // stacked produce crates on the ground under the counter
  for (let c = 0; c < 3; c++) {
    const cx = -0.72 + c * 0.52, cy = 0.11 + (c === 1 ? 0.22 : 0);
    box(0.44, 0.02, 0.32, TIMB, cx, cy - 0.10, -0.05);
    for (const sz of [-1, 1]) box(0.44, 0.20, 0.02, c === 1 ? JADE : TIMB, cx, cy, -0.05 + sz * 0.16);
    for (const sx of [-1, 1]) box(0.02, 0.20, 0.32, c === 1 ? JADE : TIMB, cx + sx * 0.22, cy, -0.05);
    if (c === 1) box(0.44, 0.02, 0.32, TIMB, cx, cy + 0.34, -0.05);
  }
  // overhead shelf, the volume above the counter is not allowed to be empty
  box(2.02, 0.04, 0.32, TIMB, 0, 1.70, -0.26);
  for (const sx of [-0.86, 0, 0.86]) {
    box(0.03, 0.28, 0.03, STEELD, sx, 1.56, -0.26, 0.6);
    box(0.03, 0.26, 0.03, STEELD, sx, 1.84, -0.30);
  }
  box(1.98, 0.03, 0.30, TIMB, 0, 1.98, -0.28);
  inst(new THREE.CylinderGeometry(0.055, 0.055, 0.15, 8), CROCK,
    [[-0.82, 1.795, -0.30], [-0.67, 1.795, -0.24], [-0.52, 1.795, -0.30], [-0.37, 1.795, -0.24],
     [-0.22, 1.795, -0.30], [-0.07, 1.795, -0.26]]);
  inst(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 8), BRASS,
    [[-0.82, 1.882, -0.30], [-0.67, 1.882, -0.24], [-0.52, 1.882, -0.30], [-0.37, 1.882, -0.24],
     [-0.22, 1.882, -0.30], [-0.07, 1.882, -0.26]]);
  const shelfBowls = [];
  for (let s = 0; s < 3; s++) {
    const bx = 0.24 + s * 0.28;
    for (let k = 0; k < 3; k++) shelfBowls.push([bx, 1.745 + k * 0.045, -0.28, 0, s, 0, 0.95]);
  }
  inst(bowlGeo, CROCK, shelfBowls);
  for (const cx of [-0.62, -0.10, 0.42, 0.86]) {
    box(0.40, 0.02, 0.28, TIMB, cx, 2.03, -0.28);
    for (const sz of [-1, 1]) box(0.40, 0.16, 0.02, cx === -0.10 ? JADE : TIMB, cx, 2.10, -0.28 + sz * 0.14);
    for (const sx of [-1, 1]) box(0.02, 0.16, 0.28, cx === -0.10 ? JADE : TIMB, cx + sx * 0.20, 2.10, -0.28);
  }
  inst(new THREE.SphereGeometry(0.05, 6, 5), RED,
    [[-0.68, 2.16, -0.30], [-0.58, 2.16, -0.24], [-0.62, 2.17, -0.34], [-0.52, 2.16, -0.28],
     [0.36, 2.16, -0.30], [0.46, 2.16, -0.24], [0.42, 2.17, -0.34]]);
  inst(new THREE.SphereGeometry(0.05, 6, 5), JADE,
    [[0.80, 2.16, -0.30], [0.90, 2.16, -0.24], [0.86, 2.17, -0.34], [0.94, 2.16, -0.31]]);
  // a lit warming box on the counter, stainless frame around a warm glow
  box(0.46, 0.30, 0.30, STAIN, 0.90, 1.07, -0.20);
  box(0.40, 0.22, 0.02, BULB, 0.90, 1.07, -0.055);
  box(0.44, 0.03, 0.32, STAIN, 0.90, 1.235, -0.20);
  // goods hung off the front rail: skewer bundles and dried strips
  for (let i = 0; i < 8; i++) {
    const x = -0.98 + i * 0.28;
    box(0.05, 0.30, 0.05, i % 2 ? TIMBD : RED, x, 2.08, 0.30);
    box(0.014, 0.10, 0.014, STAIN, x, 2.28, 0.30);
  }
  // greens crate right on the counter, overloaded
  box(0.36, 0.02, 0.26, TIMB, -0.28, 0.94, 0.26);
  for (const sz of [-1, 1]) box(0.36, 0.14, 0.02, JADE, -0.28, 1.01, 0.26 + sz * 0.13);
  for (const sx of [-1, 1]) box(0.02, 0.14, 0.26, JADE, -0.28 + sx * 0.18, 1.01, 0.26);
  inst(new THREE.SphereGeometry(0.055, 6, 5), JADE,
    [[-0.36, 1.07, 0.24], [-0.24, 1.07, 0.30], [-0.30, 1.09, 0.20], [-0.18, 1.07, 0.24],
     [-0.28, 1.10, 0.28], [-0.38, 1.08, 0.31]]);
  // hanging bulbs on the front rail
  for (let i = 0; i < 5; i++) {
    const x = -0.88 + i * 0.44;
    box(0.012, 0.16, 0.012, STEELD, x, 2.17, 0.36);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), BULB);
    b.position.set(x, 2.07, 0.36); g.add(b);
    cyl(0.022, 0.022, 0.035, 8, BRASS, x, 2.11, 0.36);
  }
  // neon bar and a lit disc on the front eave — a sign that is a shape
  box(0.96, 0.09, 0.05, NEON, 0, 2.54, 1.05);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 12), NEON);
  ring.position.set(0.80, 2.60, 1.05); g.add(ring);
  box(1.06, 0.14, 0.03, STEELD, 0, 2.54, 1.09);                        // sign backing
  // hanging bags and ladles from the back rail
  for (let i = 0; i < 4; i++) {
    const x = -0.72 + i * 0.48;
    box(0.20, 0.26, 0.13, i % 2 ? BONE : TARP, x, 2.10, -0.36);
    box(0.012, 0.12, 0.012, STEELD, x, 2.28, -0.36);
  }
  for (let i = 0; i < 3; i++) {
    const x = 0.30 + i * 0.16;
    box(0.014, 0.30, 0.014, STAIN, x, 2.06, 0.30);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 5, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), STAIN);
    l.position.set(x, 1.92, 0.30); g.add(l);
  }
  // paper lantern hung off the left eave
  cyl(0.09, 0.09, 0.24, 10, RED, -0.92, 2.14, 0.72, 0, 0, 0, true);
  cyl(0.05, 0.05, 0.02, 10, BRASS, -0.92, 2.26, 0.72);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), BULB);
  glow.position.set(-0.92, 2.14, 0.72); g.add(glow);
  box(0.01, 0.14, 0.01, STEELD, -0.92, 2.33, 0.72);

  // ---- contract: measure vertices, base at y=0, centred on x/z ------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); put(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });
  return g;
}
