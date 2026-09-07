// cable_bundle_pole — arm C: a different reading. On the reference the pole is
// tidy and the CABLES are the subject, so this candidate builds the tangle first
// and hangs a pole off it: one welded steel post leaning out of true, a single
// crossarm plus a stubby angled second arm, and between 4 and 6 m a genuine nest
// of thirty swept loops, two coils, three boxes, a caged lamp and a horn speaker.
// 7.5 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const p = new THREE.Group();
  p.rotation.z = 0.045; // it leans, because every one of them does
  g.add(p);

  const M = (color, roughness, name, extra) =>
    Object.assign(
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {})),
      { name }
    );
  const steel = M(0x5a6169, 0.6, 'metal', { metalness: 0.65 });
  const steelL = M(0x8f9aa3, 0.45, 'metal', { metalness: 0.7 });
  const steelD = M(0x2a2f35, 0.7, 'metal', { metalness: 0.5 });
  const cable = M(0x1b1e22, 0.85, 'metal', { metalness: 0.2 });
  const cable2 = M(0x2a2f35, 0.8, 'metal', { metalness: 0.2 });
  const porcelain = M(0xe8dcc0, 0.35, 'tile');
  const porcelainD = M(0x6d4a2f, 0.35, 'tile');
  const timber = M(0x6d4a2f, 0.9, 'timber');
  const brass = M(0xd8cf7a, 0.4, 'metal', { metalness: 0.8 });
  const red = M(0xc4442f, 0.8, 'plaster');
  const jade = M(0x2f7a6a, 0.8, 'plaster');
  const warm = M(0xffb45a, 0.5, 'plaster', { emissive: 0xffb45a, emissiveIntensity: 2.0 });
  const neon = M(0x63e0ff, 0.5, 'plaster', { emissive: 0x63e0ff, emissiveIntensity: 1.9 });

  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    me.position.set(x, y, z);
    if (rx) me.rotation.x = rx;
    if (ry) me.rotation.y = ry;
    if (rz) me.rotation.z = rz;
    p.add(me);
    return me;
  };
  const cyl = (r1, r2, h, mat, x, y, z, seg, axis) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), mat);
    me.position.set(x, y, z);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    if (axis === 'z') me.rotation.x = Math.PI / 2;
    p.add(me);
    return me;
  };
  const disc = (r) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
  const sweep = (r, pts, mat, steps, seg) => {
    const path = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
    const geo = new THREE.ExtrudeGeometry(disc(r),
      { steps: steps || 12, extrudePath: path, bevelEnabled: false, curveSegments: seg || 4 });
    const me = new THREE.Mesh(geo, mat);
    p.add(me);
    return me;
  };
  const span = (r, a, b, sag, mat, n) => {
    const pts = [], N = n || 8;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t - sag * Math.sin(Math.PI * t),
        a[2] + (b[2] - a[2]) * t]);
    }
    return sweep(r, pts, mat, N * 2, 4);
  };

  const ZE = 1.7;

  // ------------------------------------------------------- welded steel post
  box(0.56, 0.06, 0.56, steelL, 0, 0.03, 0);
  for (const s of [-1, 1]) for (const sz of [-1, 1]) cyl(0.018, 0.018, 0.1, steel, s * 0.2, 0.08, sz * 0.2, 5);
  cyl(0.13, 0.16, 0.55, steelD, 0, 0.33, 0, 10);
  cyl(0.095, 0.13, 6.7, steel, 0, 3.95, 0, 10);
  cyl(0.1, 0.1, 0.1, steelD, 0, 7.35, 0, 10);
  cyl(0.03, 0.03, 0.24, steelL, 0, 7.37, 0, 6);
  for (const y of [1.5, 3.1, 4.7, 6.1]) cyl(0.15, 0.15, 0.06, steelD, 0, y, 0, 10);
  // welded stirrup rungs
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? 1 : -1;
    cyl(0.014, 0.014, 0.3, steelL, s * 0.15, 1.0 + i * 0.55, 0, 5, 'x');
  }

  // --------------------------------------- one crossarm, and a stubby second
  const insulator = (x, y, z, dark, sc) => {
    const s = sc || 1;
    cyl(0.019, 0.019, 0.15 * s, steel, x, y - 0.04 * s, z, 5);
    cyl(0.062 * s, 0.08 * s, 0.11 * s, dark ? porcelainD : porcelain, x, y + 0.06 * s, z, 8);
    cyl(0.05 * s, 0.066 * s, 0.09 * s, dark ? porcelainD : porcelain, x, y + 0.16 * s, z, 8);
    cyl(0.032 * s, 0.032 * s, 0.05 * s, dark ? porcelainD : porcelain, x, y + 0.23 * s, z, 6);
  };
  box(2.5, 0.13, 0.17, timber, 0, 6.44, 0);
  box(2.56, 0.04, 0.2, steel, 0, 6.52, 0);
  for (const s of [-1, 1]) {
    const br = box(0.08, 0.72, 0.09, timber, s * 0.32, 6.1, 0);
    br.rotation.z = s * 0.62;
    box(0.1, 0.1, 0.26, steelL, s * 0.44, 6.38, 0);
  }
  for (let i = 0; i < 7; i++) insulator(-1.05 + (i * 2.1) / 6, 6.6, 0, i % 3 === 1);
  // the stubby arm, hung at an angle, half its bolts missing
  const sub = box(1.3, 0.11, 0.14, timber, 0.28, 5.72, 0.1, 0, 0, -0.13);
  for (let i = 0; i < 4; i++) insulator(-0.16 + i * 0.4, 5.88 - i * 0.05, 0.1, i === 2, 0.85);
  box(0.1, 0.34, 0.12, steelL, -0.06, 5.66, 0.1);

  // --------------------------------------------------------- the through wires
  for (let i = 0; i < 7; i++) {
    const x = -1.05 + (i * 2.1) / 6;
    span(0.014, [x, 6.82, -ZE - 0.15], [x, 6.82, ZE + 0.15], 0.28, cable, 6);
    span(0.012, [x - 0.09, 6.8, -0.08], [x + 0.09, 6.8, 0.08], -0.09, cable, 4);
  }
  for (let i = 0; i < 4; i++) {
    const x = -0.16 + i * 0.4;
    span(0.013, [x, 6.06 - i * 0.05, -ZE - 0.1], [x, 6.06 - i * 0.05, ZE + 0.1], 0.24, cable2, 6);
  }

  // ------------------------------------------------------------- THE TANGLE
  // thirty slack loops between 4.0 and 5.9 m, deterministic but never regular.
  for (let i = 0; i < 30; i++) {
    const a = i * 1.7, b = i * 0.93, c = i * 2.41;
    const y0 = 5.86 - (i % 7) * 0.13;
    const r = 0.017 + (i % 4) * 0.004;
    const mat = i % 3 === 0 ? cable2 : cable;
    sweep(r, [
      [0.02 + Math.sin(a) * 0.1, y0, 0.02 + Math.cos(a) * 0.08],
      [0.16 + Math.sin(b) * 0.3, y0 - 0.24 - (i % 5) * 0.06, 0.2 + Math.cos(b) * 0.26],
      [0.05 + Math.sin(c) * 0.36, y0 - 0.62 - (i % 3) * 0.13, 0.1 + Math.sin(b * 1.3) * 0.3],
      [-0.1 + Math.cos(a * 0.7) * 0.26, y0 - 0.86 - (i % 4) * 0.09, -0.06 + Math.cos(c) * 0.22],
      [0.02 + Math.sin(c * 0.5) * 0.12, y0 - 1.08 - (i % 6) * 0.05, 0.04 + Math.sin(a) * 0.1],
    ], mat, 9, 4);
  }
  // the heavy bundle that leaves the pole along the lane
  for (let i = 0; i < 9; i++) {
    const dx = (-0.36 + i * 0.09) * 1.1, dy = 4.78 + (i % 4) * 0.08;
    span(0.022, [dx, dy, -ZE - 0.2], [dx * 0.9, dy - 0.06, ZE + 0.2], 0.3 + (i % 3) * 0.06, i % 2 ? cable : cable2, 9);
  }
  for (let i = 0; i < 5; i++) {
    span(0.016, [-0.22, 5.24 + i * 0.09, -ZE - 0.2], [0.24, 5.2 + i * 0.09, ZE + 0.2], 0.26 + i * 0.03, cable2, 9);
  }
  // lashings holding the nest to the post
  for (let i = 0; i < 8; i++) box(0.4 - (i % 3) * 0.06, 0.05, 0.34, steelD, 0.02, 4.42 + i * 0.19, 0.04);
  for (let i = 0; i < 6; i++) box(0.06, 0.05, 0.05, red, 0.2 - (i % 3) * 0.14, 4.5 + i * 0.24, 0.2);

  // -------------------------------------------------------------- two coils
  const coilAt = (cx, cy, cz, R, turns, r, mat) => {
    const pts = [];
    const N = 12 * turns;
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = t * Math.PI * 2 * turns, rr = R - t * R * 0.14;
      pts.push([cx + Math.cos(ang) * rr * 0.5, cy + Math.sin(ang) * rr, cz + t * 0.12 - 0.06]);
    }
    sweep(r, pts, mat, N + 4, 4);
  };
  coilAt(-0.44, 4.16, 0.24, 0.36, 4, 0.022, cable);
  coilAt(0.46, 3.42, -0.2, 0.24, 3, 0.018, cable2);
  for (let i = 0; i < 3; i++) {
    box(0.05, 0.13, 0.14, steelL, -0.44 + Math.cos(i * 2.1) * 0.16, 4.16 + Math.sin(i * 2.1) * 0.36, 0.22);
  }
  sweep(0.014, [[-0.44, 4.5, 0.22], [-0.22, 4.7, 0.14], [0.0, 4.9, 0.04]], cable, 6, 4);
  sweep(0.014, [[0.46, 3.64, -0.2], [0.36, 4.0, -0.12], [0.18, 4.3, -0.02]], cable2, 6, 4);

  // --------------------------------------------------- three boxes and conduit
  box(0.42, 0.6, 0.26, steelL, 0.18, 2.62, 0.16);
  box(0.44, 0.06, 0.28, steel, 0.18, 2.95, 0.16);
  box(0.28, 0.15, 0.04, cable2, 0.18, 2.7, 0.3);
  box(0.3, 0.44, 0.2, steelD, -0.2, 3.24, 0.12);
  box(0.24, 0.3, 0.16, steel, 0.2, 3.62, 0.2);
  for (const s of [-1, 1]) {
    sweep(0.03, [[0.18 + s * 0.13, 2.3, 0.16], [0.18 + s * 0.16, 2.1, 0.2],
      [0.18 + s * 0.1, 1.94, 0.1], [0.18 + s * 0.04, 1.9, 0.0]], steel, 8, 5);
  }
  cyl(0.034, 0.034, 1.8, steel, 0.02, 1.05, 0.15, 6);
  for (const y of [0.6, 1.5]) {
    const cl = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 9), steel);
    cl.position.set(0.02, y, 0.15);
    cl.rotation.y = Math.PI / 2;
    p.add(cl);
  }
  sweep(0.026, [[-0.2, 3.02, 0.12], [-0.16, 2.7, 0.18], [-0.02, 2.5, 0.2], [0.02, 2.1, 0.16]], steel, 8, 5);

  // ------------------------------------------------ lamp, horn and a lit sign
  sweep(0.026, [[-0.13, 4.6, -0.06], [-0.32, 4.8, -0.32], [-0.52, 4.86, -0.66],
    [-0.54, 4.74, -0.9], [-0.54, 4.56, -0.98]], steel, 12, 5);
  const br2 = box(0.05, 0.62, 0.05, steel, -0.32, 4.36, -0.44);
  br2.rotation.x = -0.7; br2.rotation.z = 0.35;
  cyl(0.06, 0.21, 0.14, steelL, -0.54, 4.5, -0.98, 10);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7), warm);
  bulb.position.set(-0.54, 4.34, -0.98);
  p.add(bulb);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const barr = box(0.014, 0.32, 0.014, steel, -0.54 + Math.cos(a) * 0.12, 4.32, -0.98 + Math.sin(a) * 0.12);
    barr.rotation.x = Math.sin(a) * 0.24;
    barr.rotation.z = -Math.cos(a) * 0.24;
  }
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 4, 10), steel);
  hoop.position.set(-0.54, 4.16, -0.98);
  hoop.rotation.x = Math.PI / 2;
  p.add(hoop);
  // a horn speaker strapped to the shaft, the other thing on every market pole
  const horn = cyl(0.2, 0.06, 0.34, steelL, 0.3, 5.9, 0.42, 10);
  horn.rotation.x = -1.3;
  horn.rotation.z = -0.3;
  box(0.09, 0.22, 0.09, steel, 0.2, 5.86, 0.24);
  cyl(0.05, 0.05, 0.1, steelD, 0.26, 5.79, 0.3, 8);
  // a lit shape-only sign panel bracketed off the post
  box(0.07, 0.07, 0.42, steel, -0.24, 3.0, 0.32);
  box(0.1, 0.86, 0.5, jade, -0.34, 2.68, 0.52);
  box(0.05, 0.62, 0.1, neon, -0.4, 2.68, 0.52);
  box(0.05, 0.16, 0.3, neon, -0.4, 2.9, 0.52);
  // a lantern hung off the crossarm end
  cyl(0.012, 0.012, 0.4, steel, 1.2, 6.2, 0, 5);
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), warm);
  lan.scale.set(1, 0.85, 1);
  lan.position.set(1.2, 5.9, 0);
  p.add(lan);
  cyl(0.06, 0.06, 0.05, timber, 1.2, 6.04, 0, 8);

  // ------------------------------------------------------------ centre and seat
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const q = nd.isMesh && nd.geometry.attributes.position;
    if (!q) return;
    const put = (mat) => { for (let i = 0; i < q.count; i++) bb.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let c2 = 0; c2 < nd.count; c2++) { nd.getMatrixAt(c2, im); put(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
