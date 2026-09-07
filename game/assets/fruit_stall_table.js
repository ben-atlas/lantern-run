// fruit_stall_table — arm A: primitives. Steel trestle with a slatted timber skirt and
// a raked bed carrying two ranks of overfilled produce crates. 1.9 x 1.0 x 1.15.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    m.name = name; return m;
  };
  const STEEL  = mat(0x5a6169, 'metal',  { roughness: 0.55, metalness: 0.65 });
  const STEELD = mat(0x2a2f35, 'metal',  { roughness: 0.6,  metalness: 0.5 });
  const TIMB   = mat(0xa9784f, 'timber', { roughness: 0.9 });
  const TIMBD  = mat(0x6d4a2f, 'timber', { roughness: 0.95 });
  const RED    = mat(0xc4442f, 'plaster',{ roughness: 0.7 });
  const BONE   = mat(0xe8dcc0, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const JADE   = mat(0x2f7a6a, 'plaster',{ roughness: 0.75 });
  const TARP   = mat(0x1d5f8a, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const BRASS  = mat(0xd8cf7a, 'plaster',{ roughness: 0.6 });
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

  const A = 0.33, BY = 0.86;                   // bed rake and centre height
  const ca = Math.cos(A), sa = Math.sin(A);
  // a point on the raked bed: x across, h above the bed, v forward along it
  const P = (x, h, v) => [x, BY + h * ca - v * sa, h * sa + v * ca];

  // ---- trestle -------------------------------------------------------------
  for (const sx of [-1, 1]) {
    box(0.045, 0.72, 0.045, STEEL, sx * 0.86, 0.36, 0.40);
    box(0.045, 0.98, 0.045, STEEL, sx * 0.86, 0.49, -0.40);
    box(0.10, 0.02, 0.10, STEELD, sx * 0.86, 0.01, 0.40);
    box(0.10, 0.02, 0.10, STEELD, sx * 0.86, 0.01, -0.40);
    box(0.04, 0.04, 0.84, STEEL, sx * 0.86, 0.18, 0);
    box(0.035, 0.92, 0.035, STEELD, sx * 0.86, 0.44, 0, 0.72);
    box(0.035, 0.92, 0.035, STEELD, sx * 0.86, 0.44, 0, -0.72);
  }
  for (const sx of [-0.30, 0.30]) {
    box(0.04, 0.70, 0.04, STEEL, sx, 0.35, 0.40);
    box(0.04, 0.96, 0.04, STEEL, sx, 0.48, -0.40);
  }
  box(1.78, 0.045, 0.045, STEEL, 0, 0.70, 0.40);
  box(1.78, 0.045, 0.045, STEEL, 0, 0.96, -0.40);
  box(1.78, 0.04, 0.04, STEEL, 0, 0.20, 0.34);
  box(1.78, 0.04, 0.04, STEEL, 0, 0.20, -0.34);
  for (const s of [-1, 1]) box(0.03, 1.60, 0.03, STEELD, 0, 0.45, -0.40, 0, 0, s * 1.31);
  // slatted timber skirt on the left end and along the back
  for (let i = 0; i < 7; i++) box(0.025, 0.10, 0.76, TIMBD, -0.90, 0.10 + i * 0.13, 0);
  for (let i = 0; i < 4; i++) box(1.80, 0.09, 0.022, TIMBD, 0, 0.30 + i * 0.16, -0.42);

  // ---- raked bed ----------------------------------------------------------
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.045, 0.94), TIMB);
  bed.position.set(0, BY, 0); bed.rotation.x = A; g.add(bed);
  for (const v of [-0.44, 0.44]) {
    const p = P(0, 0.05, v);
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.07, 0.05), TIMBD);
    r.position.set(p[0], p[1], p[2]); r.rotation.x = A; g.add(r);
  }
  for (const x of [-0.62, 0.0, 0.62]) {
    const p = P(x, 0.045, 0);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.92), TIMBD);
    r.position.set(p[0], p[1], p[2]); r.rotation.x = A; g.add(r);
  }

  // ---- crates, two ranks, overfilled --------------------------------------
  const fruitR = [], fruitJ = [], fruitB = [], fruitT = [], fruitD = [];
  const crate = (x, v, m, kind) => {
    const put = (w, h, d, mm, hh, vv, ox) => {
      const p = P(x + (ox || 0), hh, v + vv);
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm);
      o.position.set(p[0], p[1], p[2]); o.rotation.x = A; g.add(o);
    };
    put(0.34, 0.02, 0.40, TIMB, 0.035, 0);
    put(0.34, 0.13, 0.02, m, 0.10, -0.19);
    put(0.34, 0.13, 0.02, m, 0.10, 0.19);
    put(0.02, 0.13, 0.40, m, 0.10, 0, -0.16);
    put(0.02, 0.13, 0.40, m, 0.10, 0, 0.16);
    put(0.36, 0.02, 0.03, TIMBD, 0.175, -0.19);
    put(0.36, 0.02, 0.03, TIMBD, 0.175, 0.19);
    const bucket = kind === 0 ? fruitR : kind === 1 ? fruitB : kind === 2 ? fruitJ : kind === 3 ? fruitT : fruitD;
    for (let i = 0; i < 12; i++) {
      const ox = -0.11 + (i % 4) * 0.073;
      const vv = -0.14 + Math.floor(i / 4) * 0.14;
      const p = P(x + ox, 0.115 + (i % 2) * 0.02, v + vv);
      bucket.push([p[0], p[1], p[2], i, i * 0.7, 0, 0.9 + (i % 3) * 0.08]);
    }
  };
  const kinds = [0, 1, 2, 3, 4];
  for (let i = 0; i < 5; i++) crate(-0.72 + i * 0.36, 0.24, i % 2 ? TIMB : TIMBD, kinds[i]);
  for (let i = 0; i < 5; i++) crate(-0.72 + i * 0.36, -0.22, i % 2 ? TIMBD : TIMB, kinds[(i + 2) % 5]);
  inst(new THREE.SphereGeometry(0.043, 6, 5), RED, fruitR);
  inst(new THREE.SphereGeometry(0.043, 6, 5), BRASS, fruitB);
  inst(new THREE.SphereGeometry(0.043, 6, 5), JADE, fruitJ);
  inst(new THREE.SphereGeometry(0.043, 6, 5), TIMB, fruitT);
  inst(new THREE.SphereGeometry(0.043, 6, 5), TIMBD, fruitD);

  // ---- back rail with hanging bags, and the light -------------------------
  for (const sx of [-1, 1]) box(0.03, 0.22, 0.03, STEEL, sx * 0.86, 1.06, -0.42);
  box(1.78, 0.035, 0.035, STEEL, 0, 1.14, -0.42);
  for (let i = 0; i < 6; i++) {
    const x = -0.70 + i * 0.28;
    box(0.14, 0.16, 0.07, i % 2 ? BONE : TARP, x, 1.03, -0.42);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 4, 8, Math.PI), STEELD);
    h.position.set(x, 1.13, -0.42); h.rotation.z = Math.PI; g.add(h);
  }
  // a bulb strung along the rail and a lit price box, no lettering
  for (const x of [-0.52, 0.08, 0.62]) {
    box(0.01, 0.08, 0.01, STEELD, x, 1.09, -0.44);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), BULB);
    b.position.set(x, 1.02, -0.44); g.add(b);
  }
  box(0.26, 0.09, 0.03, NEON, -0.86, 0.62, 0.42);
  box(0.32, 0.14, 0.02, STEELD, -0.86, 0.62, 0.44);
  // crates stacked under the table and a sack
  for (let i = 0; i < 2; i++) {
    const cy = 0.10 + i * 0.20, cx = 0.50;
    box(0.40, 0.02, 0.32, TIMB, cx, cy - 0.08, 0.02);
    for (const sz of [-1, 1]) box(0.40, 0.17, 0.02, i ? JADE : TIMB, cx, cy, 0.02 + sz * 0.15);
    for (const sx of [-1, 1]) box(0.02, 0.17, 0.32, i ? JADE : TIMB, cx + sx * 0.20, cy, 0.02);
  }
  inst(new THREE.SphereGeometry(0.048, 6, 5), BRASS,
    [[0.42, 0.36, -0.04], [0.54, 0.36, 0.06], [0.48, 0.38, 0.04], [0.58, 0.36, -0.04]]);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), BONE);
  sack.scale.set(1, 1.1, 0.85); sack.position.set(-0.30, 0.19, 0.06); g.add(sack);
  cyl(0.14, 0.11, 0.24, 10, TARP, -0.02, 0.12, 0.02, 0, 0, 0, true);
  inst(new THREE.SphereGeometry(0.05, 6, 5), JADE,
    [[-0.06, 0.22, 0.0], [0.02, 0.22, 0.06], [-0.02, 0.24, 0.02]]);

  // ---- contract -----------------------------------------------------------
  const bb = new THREE.Box3(), v2 = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v2.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); put(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });
  return g;
}
