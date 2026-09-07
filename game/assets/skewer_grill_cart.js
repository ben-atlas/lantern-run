// skewer_grill_cart — arm B: swept profiles. The trough, the shelves and the frame are
// all extruded sections swept along the cart, castors and trays are lathed.
// 1.8 long x 0.55 deep x 1.30 high.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    m.name = name; return m;
  };
  const STEEL  = mat(0x5a6169, 'metal',  { roughness: 0.55, metalness: 0.65 });
  const STEELD = mat(0x2a2f35, 'metal',  { roughness: 0.6,  metalness: 0.5 });
  const STAIN  = mat(0x8f9aa3, 'metal',  { roughness: 0.32, metalness: 0.9 });
  const TIMB   = mat(0xa9784f, 'timber', { roughness: 0.9 });
  const TIMBD  = mat(0x6d4a2f, 'timber', { roughness: 0.95 });
  const RED    = mat(0xc4442f, 'plaster',{ roughness: 0.7 });
  const BONE   = mat(0xe8dcc0, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const JADE   = mat(0x2f7a6a, 'plaster',{ roughness: 0.8 });
  const BRASS  = mat(0xd8cf7a, 'metal',  { roughness: 0.45, metalness: 0.8 });
  const RUBBER = mat(0x1b1e22, 'ground', { roughness: 0.95 });
  const COAL   = mat(0x1b1e22, 'stone',  { roughness: 0.95 });
  const EMBER  = mat(0xffb45a, 'stone',  { emissive: 0xffb45a, emissiveIntensity: 2.0, roughness: 0.7 });
  const NEON   = mat(0x63e0ff, 'tile',   { emissive: 0x63e0ff, emissiveIntensity: 1.9, roughness: 0.4 });

  const EX = { bevelEnabled: false, curveSegments: 3 };
  const box = (w, h, d, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const lathe = (pts, seg, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  // a profile drawn in (z, y) and swept along x; xr is the right-hand edge
  const sweepX = (shape, len, m, xr, rz) => {
    const geo = new THREE.ExtrudeGeometry(shape, Object.assign({ depth: len }, EX));
    const o = new THREE.Mesh(geo, m);
    o.rotation.y = -Math.PI / 2; o.position.x = xr; if (rz) o.position.z = rz;
    g.add(o); return o;
  };
  const angleShape = (a, t) => {
    const s = new THREE.Shape();
    s.moveTo(-a / 2, -a / 2); s.lineTo(a / 2, -a / 2); s.lineTo(a / 2, -a / 2 + t);
    s.lineTo(-a / 2 + t, -a / 2 + t); s.lineTo(-a / 2 + t, a / 2); s.lineTo(-a / 2, a / 2);
    s.closePath(); return s;
  };
  const SEC = angleShape(0.05, 0.011);
  const member = (len, m, x, y, z, rx, ry, rz) => {
    const geo = new THREE.ExtrudeGeometry(SEC, Object.assign({ depth: len }, EX));
    geo.translate(0, 0, -len / 2);
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
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
  const UP = -Math.PI / 2, ACROSS = Math.PI / 2;
  const HX = 0.66, HZ = 0.21, TOP = 0.90;

  // ---- frame from angle section, castors lathed ---------------------------
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    member(1.20, STEEL, sx * HX, 0.70, sz * HZ, UP);
    lathe([[0, 0], [0.035, 0], [0.035, 0.03], [0, 0.03]], 8, STAIN, sx * HX, 0.10, sz * HZ);
    box(0.05, 0.055, 0.05, STAIN, sx * HX, 0.082, sz * HZ);
    lathe([[0.018, -0.017], [0.035, -0.017], [0.035, 0.017], [0.018, 0.017]], 10, RUBBER, sx * HX, 0.042, sz * HZ, Math.PI / 2, 0, 0);
    lathe([[0, -0.02], [0.018, -0.02], [0.018, 0.02], [0, 0.02]], 8, STEELD, sx * HX, 0.042, sz * HZ, Math.PI / 2, 0, 0);
  }
  for (const sz of [-1, 1]) for (const y of [0.30, 0.60, 0.88]) member(1.36, STEEL, 0, y, sz * HZ, 0, ACROSS);
  for (const sx of [-1, 1]) for (const y of [0.30, 0.60]) member(0.44, STEEL, sx * HX, y, 0);

  // ---- pressed shelves: a tray profile swept along the cart ----------------
  const trayShape = (w, lip) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, lip); s.lineTo(-w / 2, 0); s.lineTo(-w / 2 + 0.02, 0); s.lineTo(-w / 2 + 0.02, 0.018);
    s.lineTo(w / 2 - 0.02, 0.018); s.lineTo(w / 2 - 0.02, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, lip);
    s.lineTo(w / 2 - 0.018, lip); s.lineTo(w / 2 - 0.018, 0.036); s.lineTo(-w / 2 + 0.018, 0.036);
    s.lineTo(-w / 2 + 0.018, lip); s.closePath(); return s;
  };
  const SHELF = trayShape(0.48, 0.055);
  for (const y of [0.31, 0.61]) {
    const geo = new THREE.ExtrudeGeometry(SHELF, Object.assign({ depth: 1.40 }, EX));
    const o = new THREE.Mesh(geo, STAIN);
    o.rotation.y = -Math.PI / 2; o.position.set(0.70, y, 0); g.add(o);
  }
  // fold-out side table, same profile, short
  const side = new THREE.ExtrudeGeometry(trayShape(0.44, 0.03), Object.assign({ depth: 0.34 }, EX));
  const st = new THREE.Mesh(side, STAIN); st.rotation.y = -Math.PI / 2; st.position.set(-0.70, 0.875, 0); g.add(st);
  member(0.28, STEELD, -0.78, 0.76, 0, 0, 0, -0.7);
  // handle rail
  lathe([[0, -0.31], [0.016, -0.31], [0.016, 0.31], [0, 0.31]], 8, STAIN, 0.10, 0.80, 0.32, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) box(0.028, 0.028, 0.13, STAIN, 0.10 + sx * 0.30, 0.80, 0.26);

  // ---- the trough: one swept U-channel with a rolled top flange -----------
  const TW = 0.30, TD = 0.24;
  const tr = new THREE.Shape();
  tr.moveTo(-TW / 2 - 0.03, TOP + TD + 0.03); tr.lineTo(-TW / 2, TOP + TD);
  tr.lineTo(-TW / 2, TOP); tr.lineTo(TW / 2, TOP); tr.lineTo(TW / 2, TOP + TD);
  tr.lineTo(TW / 2 + 0.03, TOP + TD + 0.03); tr.lineTo(TW / 2 + 0.03, TOP + TD - 0.01);
  tr.lineTo(TW / 2 - 0.02, TOP + TD - 0.02); tr.lineTo(TW / 2 - 0.02, TOP + 0.02);
  tr.lineTo(-TW / 2 + 0.02, TOP + 0.02); tr.lineTo(-TW / 2 + 0.02, TOP + TD - 0.02);
  tr.lineTo(-TW / 2 - 0.03, TOP + TD - 0.01); tr.closePath();
  sweepX(tr, 1.34, STEELD, 0.67);
  // end caps
  for (const sx of [-1, 1]) box(0.02, TD + 0.04, TW + 0.06, STEELD, sx * 0.67, TOP + TD / 2, 0);
  // notched skewer rests along both rims
  inst(new THREE.BoxGeometry(0.045, 0.07, 0.02), STEELD,
    Array.from({ length: 18 }, (_, i) => [-0.60 + (i % 9) * 0.15, TOP + TD + 0.05, i < 9 ? -TW / 2 : TW / 2]));
  // ash drawer below, a swept tray with a lathed handle
  const ash = new THREE.ExtrudeGeometry(trayShape(TW - 0.03, 0.05), Object.assign({ depth: 1.24 }, EX));
  const am = new THREE.Mesh(ash, STAIN); am.rotation.y = -Math.PI / 2; am.position.set(0.62, TOP - 0.10, 0); g.add(am);
  lathe([[0, -0.06], [0.016, -0.06], [0.016, 0.06], [0, 0.06]], 8, BRASS, 0.70, TOP - 0.05, 0, 0, 0, Math.PI / 2);
  // charcoal and embers
  const coals = [], embers = [];
  for (let i = 0; i < 26; i++) {
    const x = -0.60 + (i % 13) * 0.095 + (i > 12 ? 0.04 : 0);
    const z = (i > 12 ? 0.05 : -0.05) + (i % 3) * 0.02;
    (i % 3 === 1 ? embers : coals).push([x, TOP + 0.145, z, i, i * 0.7, 0, 0.8 + (i % 4) * 0.12]);
  }
  inst(new THREE.SphereGeometry(0.042, 5, 4), COAL, coals);
  inst(new THREE.SphereGeometry(0.038, 5, 4), EMBER, embers);
  box(1.22, 0.01, TW - 0.08, EMBER, 0, TOP + 0.115, 0);
  for (const sz of [-1, 1]) box(1.24, 0.045, 0.006, EMBER, 0, TOP + 0.175, sz * (TW / 2 - 0.022));
  inst(new THREE.BoxGeometry(1.30, 0.008, 0.008), STAIN,
    Array.from({ length: 7 }, (_, i) => [0, TOP + TD + 0.025, -0.11 + i * 0.037]));

  // ---- skewers ------------------------------------------------------------
  const sk = [], mR = [], mT = [], mJ = [];
  for (let i = 0; i < 16; i++) {
    const x = -0.60 + i * 0.081;
    sk.push([x, TOP + TD + 0.04, 0.02, Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) {
      const z = -0.10 + k * 0.062, p = [x, TOP + TD + 0.06, z, i * 0.4, k, 0, 0.9 + (k % 2) * 0.15];
      ((i + k) % 3 === 0 ? mR : (i + k) % 3 === 1 ? mT : mJ).push(p);
    }
  }
  inst(new THREE.CylinderGeometry(0.005, 0.005, 0.52, 5), STAIN, sk);
  inst(new THREE.BoxGeometry(0.05, 0.045, 0.05), RED, mR);
  inst(new THREE.BoxGeometry(0.05, 0.045, 0.05), TIMB, mT);
  inst(new THREE.SphereGeometry(0.028, 5, 4), JADE, mJ);
  inst(new THREE.TorusGeometry(0.016, 0.005, 4, 8), STAIN,
    Array.from({ length: 8 }, (_, i) => [-0.58 + i * 0.162, TOP + TD + 0.04, 0.30, 0, Math.PI / 2, 0]));

  // ---- loaded shelves -----------------------------------------------------
  const tray = new THREE.ExtrudeGeometry(trayShape(0.34, 0.05), Object.assign({ depth: 0.60 }, EX));
  const t1 = new THREE.Mesh(tray, STAIN); t1.rotation.y = -Math.PI / 2; t1.position.set(0.08, 0.645, 0.02); g.add(t1);
  const raw = [], rawMeat = [];
  for (let i = 0; i < 7; i++) {
    const x = -0.44 + i * 0.072;
    raw.push([x, 0.685, 0.02, Math.PI / 2, 0, 0]);
    for (let k = 0; k < 3; k++) rawMeat.push([x, 0.70, -0.06 + k * 0.07, i, k, 0, 0.85]);
  }
  inst(new THREE.CylinderGeometry(0.004, 0.004, 0.34, 5), STAIN, raw);
  inst(new THREE.BoxGeometry(0.045, 0.04, 0.045), RED, rawMeat);
  const tray2 = new THREE.ExtrudeGeometry(trayShape(0.34, 0.075), Object.assign({ depth: 0.62 }, EX));
  const t2 = new THREE.Mesh(tray2, STAIN); t2.rotation.y = -Math.PI / 2; t2.position.set(0.18, 0.345, -0.02); g.add(t2);
  const lump = [];
  for (let i = 0; i < 18; i++)
    lump.push([-0.40 + (i % 9) * 0.058, 0.40, -0.06 + (i > 8 ? 0.07 : 0), i, i * 0.5, 0, 0.75 + (i % 3) * 0.2]);
  inst(new THREE.SphereGeometry(0.042, 5, 4), COAL, lump);
  lathe([[0, 0], [0.075, 0.01], [0.08, 0.05], [0.07, 0.055]], 10, STAIN, 0.30, 0.40, 0.04);
  box(0.02, 0.02, 0.20, TIMBD, 0.40, 0.43, 0.06, 0, 0.4);
  for (const p of [[0.34, 0.72, 0.10], [0.41, 0.72, 0.05], [0.48, 0.72, 0.11]])
    lathe([[0, 0], [0.030, 0], [0.032, 0.14], [0.016, 0.17], [0.016, 0.19], [0, 0.19]], 8, RED, p[0], 0.635, p[2]);
  box(0.30, 0.02, 0.28, TIMB, 0.48, 0.335, -0.02);
  for (const sz of [-1, 1]) box(0.30, 0.16, 0.02, JADE, 0.48, 0.415, -0.02 + sz * 0.14);
  for (const sx of [-1, 1]) box(0.02, 0.16, 0.28, JADE, 0.48 + sx * 0.15, 0.415, -0.02);
  inst(new THREE.SphereGeometry(0.045, 6, 5), TIMB,
    [[0.42, 0.50, -0.06], [0.53, 0.50, 0.02], [0.47, 0.52, 0.02], [0.55, 0.50, -0.06]]);
  box(0.16, 0.02, 0.13, BONE, 0.18, 0.635, -0.12, 0, 0.3);
  box(0.44, 0.06, 0.03, NEON, -0.30, 0.79, 0.235);
  box(0.50, 0.10, 0.02, STEELD, -0.30, 0.79, 0.255);

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
