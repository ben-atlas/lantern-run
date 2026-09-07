// parked_scooter - ARM C: a second reading of the shape. A scooter's panels are
// not constant-width slabs, they are a monocoque that TAPERS - narrow at the
// throat under the seat, widest at the hip, pinched again at the tail - so this
// one is built as hand-written BufferGeometry lofts: a ring of points per
// station, stitched. The apron is lofted UP its own curve rather than along the
// bike, which is how a legshield is actually shaped, and the mudguard is a
// crowned shell lofted round the tyre with its width falling off at the tips.
// Underneath it, a visible tubular chassis, because in the reference the frame
// and the skin are separate things.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.12, ...o });
    m.name = name; return m;
  };
  const BODY  = M(0x1d5f8a, 'metal',   { roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
  const DARK  = M(0x1b1e22, 'plaster', { roughness: 0.92, metalness: 0.04 });
  const TRIM  = M(0x2a2f35, 'plaster', { roughness: 0.86, metalness: 0.08, side: THREE.DoubleSide });
  const STEEL = M(0x8f9aa3, 'metal',   { roughness: 0.42, metalness: 0.70 });
  const FRAME = M(0x5a6169, 'metal',   { roughness: 0.55, metalness: 0.55 });
  const SEATM = M(0x1b1e22, 'fabric',  { roughness: 0.70, metalness: 0.02, side: THREE.DoubleSide });
  const TIMB  = M(0xa9784f, 'timber',  { roughness: 0.92, metalness: 0.0 });
  const TIMB2 = M(0x6d4a2f, 'timber',  { roughness: 0.94, metalness: 0.0 });
  const TARP  = M(0xe8dcc0, 'fabric',  { roughness: 0.95, metalness: 0.0 });
  const BRASS = M(0xd8cf7a, 'metal',   { roughness: 0.45, metalness: 0.75 });
  const RED   = M(0xc4442f, 'plaster', { roughness: 0.62, metalness: 0.05 });
  const GLOW  = M(0xffb45a, 'metal',   { roughness: 0.30, metalness: 0.0,
                                         emissive: 0xffb45a, emissiveIntensity: 1.4 });

  const add = (p, geo, mat, pos, rot, scl) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    p.add(m); return m;
  };
  const strut = (p, a, b, r, mat, seg = 8) => {
    const A = new THREE.Vector3(a[0], a[1], a[2]);
    const B = new THREE.Vector3(b[0], b[1], b[2]);
    const d = new THREE.Vector3().subVectors(B, A);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
    m.position.copy(A).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    p.add(m); return m;
  };

  // --- the loft: rings of equal point count, stitched, optional end caps -----
  const loft = (rings, capA, capB) => {
    const n = rings[0].length, R = rings.length, pos = [], idx = [];
    for (const r of rings) for (const q of r) pos.push(q[0], q[1], q[2]);
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < n; j++) {
      const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + j, d = (i + 1) * n + (j + 1) % n;
      idx.push(a, c, b, b, c, d);
    }
    const cap = (ri, flip) => {
      const base = pos.length / 3;
      let cx = 0, cy = 0, cz = 0;
      for (const q of rings[ri]) { cx += q[0]; cy += q[1]; cz += q[2]; }
      pos.push(cx / n, cy / n, cz / n);
      for (let j = 0; j < n; j++) {
        const a = ri * n + j, b = ri * n + (j + 1) % n;
        if (flip) idx.push(base, b, a); else idx.push(base, a, b);
      }
    };
    if (capA) cap(0, true);
    if (capB) cap(R - 1, false);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  // a rounded-rect station in the XY plane at depth z
  const sectZ = (z, yc, hw, hh, n = 12, pw = 2.6) => {
    const r = [];
    for (let j = 0; j < n; j++) {
      const t = j / n * Math.PI * 2, cx = Math.cos(t), sy = Math.sin(t);
      r.push([hw * Math.sign(cx) * Math.pow(Math.abs(cx), 2 / pw),
              yc + hh * Math.sign(sy) * Math.pow(Math.abs(sy), 2 / pw), z]);
    }
    return r;
  };
  // a rounded-rect station lying in the XZ plane at height y
  const sectY = (y, zc, hw, hd, n = 12, pw = 2.4) => {
    const r = [];
    for (let j = 0; j < n; j++) {
      const t = j / n * Math.PI * 2, cx = Math.cos(t), sz = Math.sin(t);
      r.push([hw * Math.sign(cx) * Math.pow(Math.abs(cx), 2 / pw), y,
              zc + hd * Math.sign(sz) * Math.pow(Math.abs(sz), 2 / pw)]);
    }
    return r;
  };

  const LEAN = 0.180;
  const bike = new THREE.Group();
  bike.rotation.z = LEAN;
  g.add(bike);
  const W = (x, y, z) => [x * Math.cos(LEAN) - y * Math.sin(LEAN),
                          x * Math.sin(LEAN) + y * Math.cos(LEAN), z];

  // ---- wheels ---------------------------------------------------------------
  const wheel = (z, tR, tW, rimR) => {
    const w = new THREE.Group(); w.position.set(0, tR, z);
    add(w, new THREE.CylinderGeometry(tR, tR, tW, 20, 1, true), DARK, null, [0, 0, Math.PI / 2]);
    add(w, new THREE.TorusGeometry(tR - 0.030, 0.032, 5, 20), DARK, null, [0, Math.PI / 2, 0]);
    add(w, new THREE.CylinderGeometry(rimR, rimR, tW * 0.74, 16), STEEL, null, [0, 0, Math.PI / 2]);
    add(w, new THREE.CylinderGeometry(rimR * 0.32, rimR * 0.32, tW * 1.2, 10), TRIM, null, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 5; i++)
      add(w, new THREE.BoxGeometry(tW * 0.55, rimR * 1.72, 0.026), STEEL, null, [i * Math.PI / 5, 0, 0]);
    add(w, new THREE.CylinderGeometry(rimR * 0.60, rimR * 0.60, 0.008, 14), STEEL, [-tW * 0.63, 0, 0], [0, 0, Math.PI / 2]);
    bike.add(w); return w;
  };
  wheel(0.585, 0.235, 0.095, 0.130);
  wheel(-0.575, 0.235, 0.115, 0.125);

  // ---- mudguards: crowned shells lofted round the tyre, width tapering ------
  const guard = (cz, r0, a0, a1, steps, hwMax, thick) => {
    const rings = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps, a = a0 + (a1 - a0) * f;
      const hw = hwMax * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, Math.max(0.06, f))));
      const ca = Math.cos(a), sa = Math.sin(a), ring = [];
      const outer = [], inner = [];
      for (let k = 0; k <= 4; k++) {
        const u = (-1 + k / 2) * hw;                       // -hw .. +hw
        const crown = 0.014 * (1 - Math.pow(u / (hw || 1), 2));
        outer.push([u, 0.235 + sa * (r0 + crown), cz + ca * (r0 + crown)]);
        inner.push([u, 0.235 + sa * (r0 - thick), cz + ca * (r0 - thick)]);
      }
      for (const q of outer) ring.push(q);
      for (let k = inner.length - 1; k >= 0; k--) ring.push(inner[k]);
      rings.push(ring);
    }
    return loft(rings, true, true);
  };
  add(bike, guard(0.585, 0.300, 0.40, 2.98, 9, 0.078, 0.026), BODY);
  add(bike, guard(-0.575, 0.298, 2.30, 4.10, 6, 0.090, 0.024), TRIM);

  // ---- front apron: lofted UP its own curve --------------------------------
  const apron = [
    sectY(0.248, 0.348, 0.150, 0.098),
    sectY(0.330, 0.360, 0.166, 0.116),
    sectY(0.440, 0.372, 0.168, 0.130),
    sectY(0.560, 0.377, 0.162, 0.134),
    sectY(0.680, 0.375, 0.152, 0.130),
    sectY(0.790, 0.366, 0.138, 0.118),
    sectY(0.880, 0.356, 0.116, 0.098),
    sectY(0.935, 0.350, 0.082, 0.068),
  ];
  add(bike, loft(apron, true, true), BODY);
  // the dark inner face of the legshield, a second thinner loft just behind it
  add(bike, loft([
    sectY(0.300, 0.268, 0.128, 0.030),
    sectY(0.520, 0.258, 0.136, 0.028),
    sectY(0.720, 0.256, 0.128, 0.028),
    sectY(0.850, 0.262, 0.104, 0.026),
  ], true, true), TRIM);
  add(bike, new THREE.BoxGeometry(0.215, 0.130, 0.038), TRIM, [0, 0.700, 0.240]);
  add(bike, new THREE.CylinderGeometry(0.011, 0.011, 0.095, 8), BRASS, [0.058, 0.700, 0.224], [0, 0, Math.PI / 2]);
  add(bike, new THREE.TorusGeometry(0.026, 0.007, 4, 10), BRASS, [0, 0.540, 0.238], [0.4, 0, 0]);

  // ---- visible tubular chassis ---------------------------------------------
  strut(bike, [0, 0.700, 0.400], [0, 0.330, 0.300], 0.030, FRAME);       // down tube
  strut(bike, [0, 0.318, 0.290], [0, 0.276, 0.020], 0.026, FRAME);       // spine under the floor
  for (const sx of [-1, 1]) {
    strut(bike, [sx * 0.010, 0.278, 0.020], [sx * 0.152, 0.286, -0.080], 0.022, FRAME);
    strut(bike, [sx * 0.152, 0.286, -0.080], [sx * 0.160, 0.470, -0.300], 0.022, FRAME);
    strut(bike, [sx * 0.160, 0.470, -0.300], [sx * 0.150, 0.560, -0.640], 0.020, FRAME);
    strut(bike, [sx * 0.150, 0.560, -0.640], [sx * 0.120, 0.560, -0.830], 0.018, FRAME);
  }

  // ---- fork, stem, bars -----------------------------------------------------
  for (const sx of [-1, 1]) {
    strut(bike, [sx * 0.076, 0.235, 0.585], [sx * 0.070, 0.740, 0.392], 0.020, TRIM);
    strut(bike, [sx * 0.072, 0.510, 0.480], [sx * 0.066, 0.870, 0.343], 0.027, STEEL);
  }
  add(bike, new THREE.BoxGeometry(0.20, 0.045, 0.075), TRIM, [0, 0.745, 0.390], [-0.387, 0, 0]);
  add(bike, new THREE.BoxGeometry(0.19, 0.040, 0.070), TRIM, [0, 0.888, 0.334], [-0.387, 0, 0]);
  strut(bike, [0, 0.760, 0.372], [0, 1.052, 0.272], 0.028, FRAME);
  add(bike, new THREE.CylinderGeometry(0.016, 0.016, 0.44, 10), TRIM, [0, 1.100, 0.288], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) {
    strut(bike, [sx * 0.220, 1.100, 0.288], [sx * 0.318, 1.084, 0.300], 0.016, TRIM);
    add(bike, new THREE.CylinderGeometry(0.022, 0.022, 0.115, 10), DARK, [sx * 0.262, 1.092, 0.294], [0, 0, Math.PI / 2]);
    add(bike, new THREE.CylinderGeometry(0.026, 0.026, 0.014, 10), DARK, [sx * 0.322, 1.084, 0.300], [0, 0, Math.PI / 2]);
    add(bike, new THREE.BoxGeometry(0.120, 0.013, 0.028), STEEL, [sx * 0.180, 1.080, 0.336], [0, sx * 0.34, 0]);
    add(bike, new THREE.SphereGeometry(0.030, 10, 8), BRASS, [sx * 0.178, 0.928, 0.352], null, [1, 1, 0.72]);
    strut(bike, [sx * 0.150, 0.930, 0.322], [sx * 0.178, 0.928, 0.352], 0.010, TRIM);
  }
  // instrument pod as a small loft
  add(bike, loft([sectZ(0.262, 1.088, 0.098, 0.036, 10), sectZ(0.322, 1.092, 0.086, 0.030, 10),
                  sectZ(0.352, 1.080, 0.056, 0.018, 10)], true, true), TRIM);

  // ---- headlight ------------------------------------------------------------
  const HB = [[0.000, 0.000], [0.050, 0.004], [0.072, 0.020], [0.083, 0.052],
              [0.088, 0.086], [0.082, 0.098], [0.070, 0.100]].map((q) => new THREE.Vector2(q[0], q[1]));
  add(bike, new THREE.LatheGeometry(HB, 18), BODY, [0, 0.958, 0.372], [Math.PI / 2, 0, 0]);
  add(bike, new THREE.TorusGeometry(0.082, 0.010, 5, 18), STEEL, [0, 0.958, 0.468]);
  add(bike, new THREE.SphereGeometry(0.078, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), GLOW,
      [0, 0.958, 0.462], [Math.PI / 2, 0, 0]);

  // ---- floor pan ------------------------------------------------------------
  add(bike, loft([sectZ(0.268, 0.290, 0.186, 0.046, 10), sectZ(0.120, 0.288, 0.196, 0.048, 10),
                  sectZ(-0.010, 0.300, 0.184, 0.056, 10)], true, true), BODY);
  add(bike, new THREE.BoxGeometry(0.330, 0.018, 0.280), TRIM, [0, 0.326, 0.120]);
  for (let i = 0; i < 7; i++) add(bike, new THREE.BoxGeometry(0.300, 0.012, 0.016), DARK, [0, 0.337, 0.232 - i * 0.038]);

  // ---- rear monocoque, tapering ---------------------------------------------
  add(bike, loft([
    sectZ(0.060, 0.510, 0.148, 0.112),
    sectZ(-0.060, 0.516, 0.180, 0.150),
    sectZ(-0.230, 0.520, 0.201, 0.206),
    sectZ(-0.420, 0.518, 0.208, 0.226),
    sectZ(-0.610, 0.512, 0.201, 0.222),
    sectZ(-0.770, 0.505, 0.178, 0.198),
    sectZ(-0.865, 0.500, 0.132, 0.155),
    sectZ(-0.905, 0.498, 0.074, 0.098),
  ], true, true), BODY);
  // dark rubbing strip along the hip, where a scooter is always scuffed
  for (const sx of [-1, 1])
    add(bike, loft([sectZ(-0.100, 0.352, 0.184, 0.034, 8), sectZ(-0.420, 0.348, 0.212, 0.036, 8),
                    sectZ(-0.760, 0.346, 0.182, 0.032, 8)], true, true), TRIM, [sx * 0.006, 0, 0]);
  add(bike, new THREE.BoxGeometry(0.150, 0.072, 0.045), RED, [0, 0.560, -0.885]);
  add(bike, new THREE.BoxGeometry(0.165, 0.115, 0.014), TRIM, [0, 0.362, -0.850], [0.30, 0, 0]);

  // ---- seat, lofted so it narrows at the nose -------------------------------
  add(bike, loft([
    sectZ(0.014, 0.722, 0.086, 0.040, 10),
    sectZ(-0.060, 0.740, 0.122, 0.052, 10),
    sectZ(-0.200, 0.748, 0.148, 0.058, 10),
    sectZ(-0.360, 0.744, 0.150, 0.056, 10),
    sectZ(-0.470, 0.730, 0.128, 0.044, 10),
  ], true, true), SEATM);

  // ---- rear rack, lashed crate and a rolled tarp ----------------------------
  const rk = 0.845;
  strut(bike, [-0.175, rk, -0.470], [0.175, rk, -0.470], 0.014, FRAME);
  strut(bike, [-0.175, rk, -0.855], [0.175, rk, -0.855], 0.014, FRAME);
  strut(bike, [-0.175, rk, -0.470], [-0.175, rk, -0.855], 0.014, FRAME);
  strut(bike, [0.175, rk, -0.470], [0.175, rk, -0.855], 0.014, FRAME);
  strut(bike, [0.000, rk, -0.470], [0.000, rk, -0.855], 0.012, FRAME);
  for (const sx of [-1, 1]) {
    strut(bike, [sx * 0.170, rk, -0.515], [sx * 0.150, 0.640, -0.555], 0.014, FRAME);
    strut(bike, [sx * 0.170, rk, -0.828], [sx * 0.142, 0.628, -0.802], 0.014, FRAME);
  }
  const cy = rk + 0.128;
  add(bike, new THREE.BoxGeometry(0.350, 0.022, 0.330), TIMB2, [0, rk + 0.020, -0.665]);
  for (const sz of [-1, 1]) for (let i = 0; i < 3; i++)
    add(bike, new THREE.BoxGeometry(0.350, 0.056, 0.018), TIMB, [0, rk + 0.050 + i * 0.076, -0.665 + sz * 0.158]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++)
    add(bike, new THREE.BoxGeometry(0.018, 0.056, 0.320), TIMB, [sx * 0.167, rk + 0.050 + i * 0.076, -0.665]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    add(bike, new THREE.BoxGeometry(0.028, 0.256, 0.028), TIMB2, [sx * 0.163, cy, -0.665 + sz * 0.153]);
  add(bike, new THREE.CylinderGeometry(0.052, 0.052, 0.330, 12), TARP, [0, rk + 0.052, -0.480], [0, 0, Math.PI / 2]);
  for (const sz of [-1, 1]) add(bike, new THREE.BoxGeometry(0.362, 0.022, 0.018), DARK, [0, cy + 0.045, -0.665 + sz * 0.164]);
  add(bike, new THREE.BoxGeometry(0.022, 0.280, 0.350), DARK, [0.074, cy, -0.665]);

  // ---- engine, exhaust, shock ----------------------------------------------
  add(bike, loft([sectZ(-0.350, 0.290, 0.070, 0.078, 10), sectZ(-0.480, 0.300, 0.098, 0.098, 10),
                  sectZ(-0.640, 0.298, 0.086, 0.086, 10)], true, true), TRIM, [0.135, 0, 0]);
  add(bike, new THREE.CylinderGeometry(0.086, 0.086, 0.095, 14), TRIM, [0.118, 0.318, -0.612], [0, 0, Math.PI / 2]);
  add(bike, new THREE.CylinderGeometry(0.048, 0.042, 0.340, 12), TRIM, [0.152, 0.212, -0.652], [Math.PI / 2, 0, 0]);
  add(bike, new THREE.CylinderGeometry(0.030, 0.030, 0.115, 10), STEEL, [0.152, 0.212, -0.850], [Math.PI / 2, 0, 0]);
  strut(bike, [0.132, 0.290, -0.588], [0.116, 0.586, -0.498], 0.017, STEEL);
  for (let i = 0; i < 6; i++)
    add(bike, new THREE.TorusGeometry(0.030, 0.008, 4, 10), STEEL,
        [0.130 - i * 0.003, 0.330 + i * 0.040, -0.576 + i * 0.012], [1.28, 0, 0]);
  strut(bike, [-0.090, 0.250, -0.360], [-0.090, 0.245, -0.575], 0.028, FRAME);

  // ---- side stand, in WORLD space, foot on y = 0 ----------------------------
  const top = W(-0.150, 0.276, -0.115);
  strut(g, top, [-0.452, 0.022, -0.185], 0.019, TRIM);
  add(g, new THREE.BoxGeometry(0.085, 0.022, 0.055), TRIM, [-0.452, 0.011, -0.185], [0, 0.25, 0]);
  const pv = W(-0.130, 0.298, -0.115);
  add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.060, 10), FRAME, [pv[0], pv[1], pv[2]], [0, 0, Math.PI / 2]);

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
