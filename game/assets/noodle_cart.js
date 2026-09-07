// noodle_cart — arm C: a second reading. Timber-clad body on two big cart wheels and
// two castors, a full-length glazed noodle cabinet on the deck, a sunk soup vat, and a
// canopy frame carrying the light. 1.55 long x 0.80 deep x 1.95 high.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    m.name = name; return m;
  };
  const STEEL  = mat(0x5a6169, 'metal',  { roughness: 0.55, metalness: 0.65 });
  const STEELD = mat(0x2a2f35, 'metal',  { roughness: 0.6,  metalness: 0.5 });
  const STAIN  = mat(0x8f9aa3, 'metal',  { roughness: 0.32, metalness: 0.9 });
  const STAIN2 = mat(0x8f9aa3, 'metal',  { roughness: 0.32, metalness: 0.9, side: THREE.DoubleSide });
  const GLASS  = mat(0x8f9aa3, 'tile',   { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.26, forceSinglePass: true });
  const TIMB   = mat(0xa9784f, 'timber', { roughness: 0.9 });
  const TIMBD  = mat(0x6d4a2f, 'timber', { roughness: 0.95 });
  const RED    = mat(0xc4442f, 'plaster',{ roughness: 0.7 });
  const REDF   = mat(0xc4442f, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const CROCK  = mat(0xe8dcc0, 'tile',   { roughness: 0.5, side: THREE.DoubleSide });
  const BONE   = mat(0xe8dcc0, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const JADE   = mat(0x2f7a6a, 'plaster',{ roughness: 0.8 });
  const TARP   = mat(0x1d5f8a, 'plaster',{ roughness: 0.85 });
  const BRASS  = mat(0xd8cf7a, 'metal',  { roughness: 0.45, metalness: 0.8 });
  const RUBBER = mat(0x1b1e22, 'ground', { roughness: 0.95 });
  const BULB   = mat(0xffb45a, 'tile',   { emissive: 0xffb45a, emissiveIntensity: 1.9, roughness: 0.4 });
  const NEON   = mat(0x63e0ff, 'tile',   { emissive: 0x63e0ff, emissiveIntensity: 1.9, roughness: 0.4 });

  const box = (w, h, d, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const cyl = (rt, rb, h, seg, m, x, y, z, rx, ry, rz, open) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const sph = (r, wS, hS, m, x, y, z, ps, pl) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, wS, hS, 0, Math.PI * 2, ps || 0, pl === undefined ? Math.PI : pl), m);
    o.position.set(x, y, z); g.add(o); return o;
  };
  const inst = (geo, m, list) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
          p = new THREE.Vector3(), sv = new THREE.Vector3();
    list.forEach((t, i) => {
      p.set(t[0], t[1], t[2]); e.set(t[3] || 0, t[4] || 0, t[5] || 0); q.setFromEuler(e);
      const sc = t[6] === undefined ? 1 : t[6]; sv.set(sc, sc, sc);
      M.compose(p, q, sv); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true; g.add(im); return im;
  };

  const DECK = 0.84;

  // ---- two big cart wheels, two castors -----------------------------------
  const BR = 0.26;
  for (const wz of [-0.34, 0.34]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.045, 6, 16), RUBBER);
    t.position.set(-0.46, BR, wz); g.add(t);
    cyl(BR - 0.04, BR - 0.04, 0.025, 16, STEEL, -0.46, BR, wz, Math.PI / 2, 0, 0);
    cyl(0.05, 0.05, 0.08, 8, STEELD, -0.46, BR, wz, Math.PI / 2, 0, 0);
    const sp = [];
    for (let s = 0; s < 8; s++) sp.push([-0.46, BR, wz, 0, 0, s * Math.PI / 8]);
    inst(new THREE.BoxGeometry(0.012, BR * 1.9, 0.012), STAIN, sp);
  }
  cyl(0.025, 0.025, 0.74, 8, STEELD, -0.46, BR, 0, Math.PI / 2);
  for (const wz of [-0.26, 0.26]) {
    cyl(0.03, 0.03, 0.14, 8, STEELD, 0.58, 0.30, wz);
    box(0.09, 0.10, 0.05, STEEL, 0.58, 0.19, wz);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 5, 10), RUBBER);
    t2.position.set(0.58, 0.085, wz); g.add(t2);
  }

  // ---- timber-clad body ---------------------------------------------------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.58, 0.05, STEEL, sx * 0.73, 0.55, sz * 0.32);
  for (const sz of [-1, 1]) { box(1.50, 0.05, 0.05, STEEL, 0, 0.36, sz * 0.32); box(1.50, 0.05, 0.05, STEEL, 0, 0.80, sz * 0.32); }
  for (const sx of [-1, 1]) { box(0.05, 0.05, 0.66, STEEL, sx * 0.73, 0.36, 0); box(0.05, 0.05, 0.66, STEEL, sx * 0.73, 0.80, 0); }
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1])
    box(1.44, 0.10, 0.025, TIMB, 0, 0.42 + i * 0.12, sz * 0.335);           // plank cladding
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1])
    box(0.025, 0.10, 0.60, TIMBD, sx * 0.745, 0.42 + i * 0.12, 0);
  box(1.48, 0.04, 0.64, STEELD, 0, 0.36, 0);                                // under tray
  box(1.56, 0.055, 0.76, TIMBD, 0, DECK - 0.02, 0);                         // deck
  box(1.56, 0.05, 0.05, STAIN, 0, DECK + 0.03, 0.375);
  // push handle at the right end
  for (const sz of [-1, 1]) box(0.04, 0.42, 0.04, STEELD, 0.80, 0.95, sz * 0.20, 0, 0, -0.22);
  cyl(0.024, 0.024, 0.46, 8, STEELD, 0.85, 1.15, 0, Math.PI / 2);

  // ---- glazed noodle cabinet across the deck ------------------------------
  const KY = DECK + 0.02, KH = 0.50;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, KH, 0.03, STEEL, sx * 0.66, KY + KH / 2, sz * 0.33);
  box(0.03, KH, 0.03, STEEL, 0.02, KY + KH / 2, 0.33);
  box(0.03, KH, 0.03, STEEL, 0.02, KY + KH / 2, -0.33);
  for (const sy of [0.01, KH]) {
    for (const sz of [-1, 1]) box(1.35, 0.03, 0.03, STEEL, -0.32, KY + sy, sz * 0.33);
    for (const sx of [-1, 1]) box(0.03, 0.03, 0.69, STEEL, sx * 0.66, KY + sy, 0);
  }
  for (const sz of [-1, 1]) box(1.32, KH - 0.05, 0.012, GLASS, -0.32, KY + KH / 2, sz * 0.33);
  for (const sx of [-1, 1]) box(0.012, KH - 0.05, 0.66, GLASS, sx * 0.66, KY + KH / 2, 0);
  box(1.32, 0.012, 0.66, STAIN, -0.32, KY + KH, 0);
  box(1.28, 0.02, 0.60, STAIN, -0.32, KY + 0.24, 0);                        // inner shelf
  box(1.24, 0.02, 0.16, BULB, -0.32, KY + 0.46, -0.02);                     // lit cabinet
  // trays and stacked goods inside the cabinet
  inst(new THREE.BoxGeometry(0.19, 0.06, 0.24), STAIN,
    [[-0.86, KY + 0.05, -0.10], [-0.62, KY + 0.05, -0.10], [-0.38, KY + 0.05, -0.10], [-0.14, KY + 0.05, -0.10],
     [-0.86, KY + 0.28, 0.12], [-0.62, KY + 0.28, 0.12], [-0.38, KY + 0.28, 0.12], [-0.14, KY + 0.28, 0.12]]);
  inst(new THREE.SphereGeometry(0.035, 6, 5), RED,
    [[-0.86, KY + 0.10, -0.12], [-0.80, KY + 0.10, -0.06], [-0.62, KY + 0.10, -0.10], [-0.38, KY + 0.10, -0.12],
     [-0.32, KY + 0.10, -0.06], [-0.14, KY + 0.10, -0.10]]);
  inst(new THREE.SphereGeometry(0.035, 6, 5), TIMB,
    [[-0.86, KY + 0.33, 0.12], [-0.62, KY + 0.33, 0.14], [-0.38, KY + 0.33, 0.10], [-0.14, KY + 0.33, 0.12]]);
  inst(new THREE.SphereGeometry(0.032, 6, 5), JADE,
    [[-0.70, KY + 0.33, 0.08], [-0.46, KY + 0.33, 0.14], [-0.22, KY + 0.33, 0.09]]);

  // ---- sunk soup vat, right end -------------------------------------------
  cyl(0.20, 0.19, 0.34, 14, STAIN, 0.44, DECK + 0.14, 0);
  cyl(0.205, 0.205, 0.03, 14, STEELD, 0.44, DECK + 0.30, 0);
  cyl(0.15, 0.19, 0.05, 14, STAIN, 0.44, DECK + 0.335, 0);                  // domed lid
  cyl(0.03, 0.03, 0.07, 8, BRASS, 0.44, DECK + 0.39, 0);
  cyl(0.215, 0.215, 0.04, 14, BULB, 0.44, DECK - 0.005, 0);                 // burner glow
  for (const sz of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 8, Math.PI), STAIN);
    h.rotation.y = Math.PI / 2; h.position.set(0.44, DECK + 0.24, sz * 0.20); g.add(h);
  }
  // a wok, a rack of ladles, a chopping board beside the vat
  sph(0.15, 12, 5, STAIN2, 0.68, DECK + 0.13, 0.02, Math.PI * 0.56, Math.PI * 0.44);
  cyl(0.11, 0.11, 0.03, 10, BULB, 0.68, DECK + 0.02, 0.02);
  box(0.28, 0.05, 0.24, TIMBD, 0.16, DECK + 0.05, 0.26, 0, 0.2);
  inst(new THREE.CylinderGeometry(0.028, 0.032, 0.18, 6), RED,
    [[0.20, DECK + 0.10, -0.24], [0.27, DECK + 0.10, -0.20], [0.13, DECK + 0.10, -0.20]]);

  // ---- canopy frame carrying the light ------------------------------------
  for (const sx of [-1, 1]) box(0.04, 1.10, 0.04, STEEL, sx * 0.70, 1.40, -0.30);
  box(1.44, 0.045, 0.045, STEEL, 0, 1.92, -0.30);
  box(1.44, 0.035, 0.035, STEEL, 0, 1.62, -0.30);
  for (const sx of [-1, 1]) box(0.035, 0.035, 0.44, STEEL, sx * 0.70, 1.90, -0.10);
  box(1.44, 0.03, 0.30, REDF, 0, 1.90, 0.02, -0.12);                        // small awning cloth
  box(1.44, 0.10, 0.02, BONE, 0, 1.82, 0.16);
  // hanging bowls in a rack, ladles, bags
  const bowlGeo = new THREE.LatheGeometry(
    [[0.012, 0], [0.055, 0.005], [0.078, 0.036], [0.086, 0.058]].map((p) => new THREE.Vector2(p[0], p[1])), 10);
  const hung = [];
  for (let i = 0; i < 6; i++) hung.push([-0.60 + i * 0.24, 1.53, -0.30, Math.PI, 0, 0, 1.0]);
  inst(bowlGeo, CROCK, hung);
  for (let i = 0; i < 4; i++) {
    const x = -0.50 + i * 0.28;
    box(0.011, 0.20, 0.011, STAIN, x, 1.72, -0.30);
    sph(0.04, 8, 5, STAIN, x, 1.62, -0.30, Math.PI * 0.5, Math.PI * 0.5);
  }
  for (let i = 0; i < 3; i++) box(0.16, 0.22, 0.10, i % 2 ? BONE : TARP, -0.30 + i * 0.34, 1.70, -0.24);
  // light: a bulb in a shade, and a neon strip along the canopy rail
  box(0.012, 0.22, 0.012, STEELD, -0.16, 1.80, -0.10);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.10, 10, 1, true), STAIN2);
  shade.position.set(-0.16, 1.66, -0.10); g.add(shade);
  sph(0.05, 8, 6, BULB, -0.16, 1.60, -0.10);
  box(1.10, 0.08, 0.04, NEON, 0, 1.84, -0.34);
  box(1.20, 0.13, 0.02, STEELD, 0, 1.84, -0.37);
  box(0.08, 0.34, 0.04, NEON, 0.70, 1.30, -0.33);
  // under-deck stowage: gas bottle, buckets, crate
  cyl(0.13, 0.13, 0.42, 12, RED, -0.06, 0.58, -0.05);
  cyl(0.05, 0.05, 0.06, 8, BRASS, -0.06, 0.81, -0.05);
  cyl(0.11, 0.085, 0.20, 10, TARP, 0.34, 0.47, 0.02, 0, 0, 0, true);
  cyl(0.11, 0.085, 0.20, 10, JADE, 0.56, 0.47, -0.06, 0, 0, 0, true);
  box(0.36, 0.02, 0.30, TIMB, -0.52, 0.46, 0);
  for (const sz of [-1, 1]) box(0.36, 0.18, 0.02, TIMB, -0.52, 0.54, sz * 0.15);
  for (const sx of [-1, 1]) box(0.02, 0.18, 0.30, TIMB, -0.52 + sx * 0.18, 0.54, 0);
  inst(new THREE.SphereGeometry(0.05, 6, 5), JADE,
    [[-0.58, 0.62, -0.04], [-0.48, 0.62, 0.04], [-0.54, 0.64, 0.06], [-0.44, 0.62, -0.06]]);

  // ---- contract -----------------------------------------------------------
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
