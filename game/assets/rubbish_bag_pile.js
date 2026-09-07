// rubbish_bag_pile - ARM C: a second reading of the shape. A sack is not a
// surface of revolution with wrinkles on it: it is a bag of hard lumps, so its
// cross-section is not round at any height, and the ones underneath are visibly
// crushed by the ones on top. Each sack here is a hand-written BufferGeometry
// lofted from stations whose radius varies with ANGLE as well as height, whose
// centres drift sideways as they rise (a sack flops), and whose lower half is
// flattened where something is standing on it. The pile is read as a slump
// against a broken crate rather than as a stack.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.04, ...o });
    m.name = name; return m;
  };
  const BAG1 = M(0x1b1e22, 'fabric', { roughness: 0.58, metalness: 0.08 });
  const BAG2 = M(0x2a2f35, 'fabric', { roughness: 0.68, metalness: 0.05 });
  const TIMB = M(0xa9784f, 'timber', { roughness: 0.93 });
  const TIMB2 = M(0x6d4a2f, 'timber', { roughness: 0.95 });
  const CARD = M(0xa9784f, 'fabric', { roughness: 0.97 });
  const SPILL = M(0x2f7a6a, 'foliage', { roughness: 0.88 });
  const SPILL2 = M(0xc4442f, 'plaster', { roughness: 0.82 });
  const BONE = M(0xe8dcc0, 'fabric', { roughness: 0.95 });

  const add = (p, geo, mat, pos, rot, scl) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    p.add(m); return m;
  };

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

  // radius against height, unit sack: sits down on itself, pinches to a neck
  const TAB = [[0.00, 0.30], [0.06, 0.72], [0.16, 0.90], [0.30, 1.00], [0.44, 1.00],
               [0.58, 0.95], [0.70, 0.85], [0.80, 0.70], [0.88, 0.50], [0.94, 0.28],
               [0.97, 0.15], [1.00, 0.09]];
  const R0 = (t) => {
    for (let i = 1; i < TAB.length; i++) {
      if (t <= TAB[i][0]) {
        const f = (t - TAB[i - 1][0]) / (TAB[i][0] - TAB[i - 1][0]);
        return TAB[i - 1][1] + f * (TAB[i][1] - TAB[i - 1][1]);
      }
    }
    return TAB[TAB.length - 1][1];
  };

  // ph: which sack. sag: how far the top flops. crush: how flat the bottom is
  // pressed, and from which side.
  const sackGeo = (ph, sagX, sagZ, crush, crushDir) => {
    const rings = [], H = 14, N = 12;
    for (let i = 0; i <= H; i++) {
      const t = i / H, base = R0(t), ring = [];
      for (let j = 0; j < N; j++) {
        const th = j / N * Math.PI * 2;
        const lump = 1
          + 0.115 * Math.sin(3 * th + ph + 2.1 * t)
          + 0.070 * Math.sin(5 * th - ph * 1.3 + 0.8)
          + 0.045 * Math.sin(7 * th + 4.0 * t + ph * 0.6);
        // the underside of a loaded sack squashes out against the ground
        const flat = 1 + crush * Math.max(0, 1 - t * 3.2) * Math.max(0, Math.cos(th - crushDir));
        const r = base * lump * flat;
        ring.push([r * Math.cos(th) + sagX * t * t,
                   t + 0.03 * Math.sin(3 * th + ph),
                   r * Math.sin(th) + sagZ * t * t]);
      }
      rings.push(ring);
    }
    return loft(rings, true, true);
  };

  const bag = (x, y, z, rx, ry, rz, tiltX, tiltZ, spin, ph, sag, crush, cd, dark) => {
    const b = new THREE.Group();
    b.position.set(x, y, z);
    b.rotation.set(tiltX, spin, tiltZ);
    b.scale.set(rx, ry, rz);
    const mat = dark ? BAG1 : BAG2;
    add(b, sackGeo(ph, sag[0], sag[1], crush, cd), mat);
    // gathered neck and knot, riding on the sag
    const nx = sag[0], nz = sag[1];
    add(b, new THREE.TorusGeometry(0.125, 0.052, 5, 9), mat, [nx, 0.995, nz], [1.35, ph, 0]);
    add(b, new THREE.ConeGeometry(0.078, 0.130, 6), mat, [nx + 0.10, 1.055, nz + 0.02], [0.2, 0, -0.8]);
    add(b, new THREE.ConeGeometry(0.064, 0.110, 6), mat, [nx - 0.05, 1.050, nz - 0.05], [-0.3, 0, 0.62]);
    g.add(b); return b;
  };

  // ---- the slump ------------------------------------------------------------
  // bottom course: crushed, different sizes, wedged into each other
  bag(-0.575, 0.000, 0.055, 0.262, 0.455, 0.245, 0.050, 0.115, 0.4, 0.0, [0.10, 0.03], 0.22, 3.4, true);
  bag(-0.205, 0.000, -0.090, 0.278, 0.505, 0.262, -0.035, 0.040, 1.9, 1.3, [-0.05, 0.13], 0.18, 1.1, false);
  bag(-0.275, 0.000, 0.245, 0.255, 0.440, 0.240, 0.080, -0.050, 3.1, 2.4, [0.07, -0.10], 0.24, 5.0, true);
  bag(0.125, 0.000, 0.140, 0.245, 0.425, 0.230, 0.020, -0.130, 5.0, 3.5, [-0.12, 0.05], 0.20, 2.2, true);
  bag(0.150, 0.000, -0.195, 0.220, 0.385, 0.210, -0.065, -0.035, 2.2, 4.6, [0.08, -0.08], 0.16, 0.4, false);
  // upper course: smaller, flopped across the gaps, uncrushed
  bag(-0.400, 0.335, 0.085, 0.238, 0.400, 0.222, 0.115, 0.185, 0.9, 5.7, [0.16, 0.08], 0.0, 0, false);
  bag(-0.045, 0.365, 0.090, 0.252, 0.420, 0.232, -0.085, -0.100, 4.2, 0.7, [-0.10, -0.14], 0.0, 0, true);
  bag(-0.235, 0.500, -0.020, 0.192, 0.320, 0.185, 0.040, 0.255, 2.7, 3.0, [0.14, 0.06], 0.0, 0, true);

  // ---- a split sack, spilling ----------------------------------------------
  add(g, new THREE.SphereGeometry(1, 9, 7), SPILL, [0.355, 0.062, 0.360], [0.4, 0.8, 0.2], [0.074, 0.062, 0.074]);
  add(g, new THREE.SphereGeometry(1, 9, 7), SPILL, [0.445, 0.050, 0.265], [0.9, 0.2, 0.5], [0.060, 0.052, 0.060]);
  add(g, new THREE.SphereGeometry(1, 8, 6), BONE, [0.300, 0.038, 0.430], [0.2, 1.1, 0.4], [0.048, 0.038, 0.055]);
  add(g, new THREE.BoxGeometry(0.135, 0.088, 0.100), SPILL2, [-0.715, 0.046, 0.300], [0.1, 0.6, 0.35]);
  add(g, new THREE.BoxGeometry(0.115, 0.070, 0.090), CARD, [-0.640, 0.038, 0.400], [0.2, 1.2, -0.25]);
  add(g, new THREE.CylinderGeometry(0.034, 0.030, 0.130, 8), SPILL2, [0.300, 0.035, -0.255], [1.5, 0.4, 0.3]);
  add(g, new THREE.CylinderGeometry(0.030, 0.030, 0.115, 8), BONE, [-0.505, 0.031, -0.230], [1.5, 1.1, 0.2]);

  // ---- broken crate the pile is slumped against ----------------------------
  const cr = new THREE.Group();
  cr.position.set(0.520, 0.010, -0.050);
  cr.rotation.set(0.04, 0.34, 0.30);
  for (const dz of [-0.190, -0.062, 0.062, 0.190])
    add(cr, new THREE.BoxGeometry(0.020, 0.560, 0.070), TIMB, [0.055, 0.290, dz]);
  for (const dy of [0.040, 0.290, 0.540])
    add(cr, new THREE.BoxGeometry(0.055, 0.070, 0.460), TIMB2, [0.010, dy, 0]);
  add(cr, new THREE.BoxGeometry(0.020, 0.300, 0.070), TIMB, [0.055, 0.400, 0.255], [0.35, 0, 0]);  // sprung slat
  for (const dz of [-0.215, 0.215])
    add(cr, new THREE.BoxGeometry(0.055, 0.560, 0.038), TIMB2, [0.010, 0.290, dz]);
  g.add(cr);

  // ---- flattened cardboard, folded and tipped up behind --------------------
  const card = new THREE.Group();
  card.position.set(-0.430, 0.025, -0.330);
  card.rotation.set(-0.22, 0.34, 0.04);
  add(card, new THREE.BoxGeometry(0.520, 0.470, 0.012), CARD, [0, 0.245, 0]);
  add(card, new THREE.BoxGeometry(0.230, 0.400, 0.012), CARD, [-0.325, 0.215, 0.068], [0, 0.55, 0]);
  add(card, new THREE.BoxGeometry(0.190, 0.330, 0.012), CARD, [0.298, 0.180, 0.052], [0, -0.42, 0.10]);
  for (const dx of [-0.130, 0.090])
    add(card, new THREE.BoxGeometry(0.014, 0.470, 0.020), CARD, [dx, 0.245, 0.010]);
  add(card, new THREE.BoxGeometry(0.520, 0.018, 0.028), CARD, [0, 0.462, 0.010]);
  g.add(card);

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
