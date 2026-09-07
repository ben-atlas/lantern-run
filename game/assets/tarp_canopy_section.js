// tarp_canopy_section — arm C: the sheet is a hand-written BufferGeometry.
// Read from the reference: the tarpaulin is not dished, it is PEAKED. It runs over
// a ridge purlin propped above the cross rails and drains down to both sides, and
// it sags between every support on the way — across each half-span, along each bay
// between rails, and off the two open ends. A flat plane reads as cardboard, so all
// of that is in the vertices, with the wrinkles and the corner droop.
// 7.2 w x 3.9 h x 6.0 d. DoubleSide, because the player is under it all game.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, roughness, name, extra) =>
    Object.assign(
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {})),
      { name }
    );
  const tarpBlue = M(0x1d5f8a, 0.9, 'fabric', { side: THREE.DoubleSide });
  const tarpDark = M(0x2a2f35, 0.92, 'fabric', { side: THREE.DoubleSide });
  const tarpBone = M(0xe8dcc0, 0.9, 'fabric', { side: THREE.DoubleSide });
  const tube = M(0x5a6169, 0.55, 'metal', { metalness: 0.65 });
  const tubeLit = M(0x8f9aa3, 0.45, 'metal', { metalness: 0.7 });
  const rope = M(0xe8dcc0, 0.95, 'fabric');
  const brass = M(0xd8cf7a, 0.4, 'metal', { metalness: 0.8 });
  const red = M(0xc4442f, 0.85, 'fabric', { side: THREE.DoubleSide });
  const jade = M(0x2f7a6a, 0.85, 'fabric', { side: THREE.DoubleSide });
  const warm = M(0xffb45a, 0.5, 'plaster', { emissive: 0xffb45a, emissiveIntensity: 1.7 });
  const neon = M(0x63e0ff, 0.5, 'plaster', { emissive: 0x63e0ff, emissiveIntensity: 1.8 });

  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    me.position.set(x, y, z);
    if (rx) me.rotation.x = rx;
    if (ry) me.rotation.y = ry;
    if (rz) me.rotation.z = rz;
    g.add(me);
    return me;
  };
  const tubeAt = (r, len, mat, x, y, z, axis, seg) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), mat);
    me.position.set(x, y, z);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    if (axis === 'z') me.rotation.x = Math.PI / 2;
    g.add(me);
    return me;
  };

  const HX = 3.5, HZ = 2.9, RAIL = 3.66, TOP = 3.9;
  const HW = 3.58, HD = 3.0;      // sheet half-extents
  const RIDGE = 3.83, EAVE = 3.56; // sheet height over the ridge purlin, and at the hem

  // ------------------------------------------------- the shape of the tarpaulin
  const surf = (x, z) => {
    const u = Math.min(1, Math.abs(x) / HW);
    const pitch = RIDGE - (RIDGE - EAVE) * u;              // ridge down to the hem
    const halfSag = 0.15 * Math.sin(Math.PI * u);          // slack across each half
    const az = Math.abs(z);
    const bay = az <= HZ
      ? 0.13 * Math.sin(Math.PI * ((az % HZ) / HZ)) * (0.5 + 0.5 * (1 - u))
      : 0;
    const over = az > HZ ? 0.38 * Math.pow((az - HZ) / (HD - HZ), 1.6) : 0;
    const corner = 0.14 * Math.pow(u, 2.4) * Math.pow(Math.min(1, az / HD), 3);
    const wrinkle = 0.017 * Math.sin(x * 3.7 + z * 1.2) + 0.012 * Math.sin(x * 7.1 - z * 2.9)
      + 0.009 * Math.sin(z * 5.3 + 1.1);
    return pitch - halfSag - bay - over - corner + wrinkle * (1 - u * 0.5);
  };

  const sheet = (x0, x1, z0, z1, nu, nv, lift, mat) => {
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const x = x0 + ((x1 - x0) * i) / nu;
      for (let j = 0; j <= nv; j++) {
        const z = z0 + ((z1 - z0) * j) / nv;
        pos.push(x, surf(x, z) + lift, z);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j, b = a + nv + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const me = new THREE.Mesh(geo, mat);
    g.add(me);
    return me;
  };

  sheet(-HW, HW, -HD, HD, 32, 26, 0, tarpBlue);
  sheet(-HW + 0.3, -0.4, -2.3, 0.5, 8, 8, 0.05, tarpDark);   // patches lashed over the top
  sheet(1.0, HW - 0.25, 0.5, 2.6, 7, 7, 0.055, tarpBone);

  // ------------------------------------------------------------ rolled hem
  const hemZ = (z) => {
    for (let i = 0; i < 16; i++) {
      const t = i / 16, x = -HW + 2 * HW * t;
      const dx = (2 * HW) / 16;
      const y0 = surf(x, z), y1 = surf(x + dx, z);
      const c = tubeAt(0.028, Math.hypot(dx, y1 - y0) * 1.12, tarpBlue, x + dx / 2, (y0 + y1) / 2 - 0.014, z, 'x', 5);
      c.rotation.z = Math.PI / 2 + Math.atan2(y1 - y0, dx);
      if (i % 3 === 0) {
        const gr = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.01, 4, 8), brass);
        gr.position.set(x, y0 - 0.012, z);
        gr.rotation.x = Math.PI / 2;
        g.add(gr);
      }
    }
  };
  hemZ(HD - 0.03);
  hemZ(-HD + 0.03);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const z = -HD + ((i + 0.5) * 2 * HD) / 14;
      const y = surf(sx * (HW - 0.02), z);
      tubeAt(0.028, (2 * HD) / 14 + 0.04, tarpBlue, sx * (HW - 0.02), y - 0.014, z, 'z', 5);
      if (i % 3 === 0) {
        const gr = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.01, 4, 8), brass);
        gr.position.set(sx * (HW - 0.02), y - 0.012, z);
        gr.rotation.x = Math.PI / 2;
        g.add(gr);
      }
    }
  }

  // -------------------------------------------------------------- the frame
  for (const sx of [-1, 1]) {
    const x = sx * HX;
    for (const z of [-HZ, 0, HZ]) {
      box(0.24, 0.04, 0.24, tubeLit, x, 0.02, z);
      tubeAt(0.042, TOP - 0.04, tube, x, (TOP + 0.04) / 2, z, 'y', 8);
      box(0.12, 0.16, 0.12, tubeLit, x, RAIL, z);
      box(0.12, 0.14, 0.12, tubeLit, x, 2.0, z);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI * 1.4), tube);
      hook.position.set(x + sx * 0.09, TOP - 0.06, z);
      hook.rotation.y = Math.PI / 2;
      g.add(hook);
    }
    tubeAt(0.045, HZ * 2 + 0.16, tube, x, RAIL, 0, 'z', 8);
    tubeAt(0.04, HZ * 2 + 0.16, tube, x, 2.0, 0, 'z', 8);
    for (const zc of [-HZ / 2, HZ / 2]) {
      for (const d of [-1, 1]) {
        const br = tubeAt(0.03, 3.35, tube, x, 2.83, zc, 'z', 6);
        br.rotation.x = Math.PI / 2 + d * 0.55;
      }
    }
    // short raking feet, kept inside the footprint
    for (const sz of [-1, 1]) {
      const k = tubeAt(0.03, 1.0, tube, x + sx * 0.05, 0.5, sz * (HZ + 0.02), 'y', 6);
      k.rotation.x = -sz * 0.2;
    }
  }
  // cross rails, and the ridge purlin propped above them
  for (const z of [-HZ, 0, HZ]) {
    tubeAt(0.045, HX * 2 + 0.24, tube, 0, RAIL, z, 'x', 8);
    tubeAt(0.035, 0.14, tubeLit, 0, RAIL + 0.11, z, 'y', 6);
    box(0.13, 0.05, 0.13, tubeLit, 0, RAIL + 0.05, z);
  }
  tubeAt(0.048, HZ * 2 + 0.16, tubeLit, 0, RAIL + 0.13, 0, 'z', 8); // the ridge
  for (const z of [-HZ / 2, HZ / 2]) tubeAt(0.033, HX * 2 + 0.14, tube, 0, 3.42, z, 'x', 6);

  // ----------------------------------------------- lashings from hem to frame
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -HD + 0.14 + (i * (2 * HD - 0.28)) / 6;
      const y = surf(sx * (HW - 0.02), z);
      const r1 = tubeAt(0.012, 0.34, rope, sx * (HW - 0.06), y - 0.17, z, 'y', 5);
      r1.rotation.z = sx * 0.36;
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = -3.1 + i * 0.886;
    for (const sz of [-1, 1]) {
      const y = surf(x, sz * (HD - 0.05));
      const r1 = tubeAt(0.012, 0.32, rope, x, y - 0.19, sz * (HD - 0.09), 'y', 5);
      r1.rotation.x = -sz * 0.45;
    }
  }

  // ------------------------------------------------------ what hangs underneath
  for (const sx of [-1, 1]) {
    tubeAt(0.012, HZ * 2, tube, sx * 1.7, 3.3, 0, 'z', 4);
    for (let i = 0; i < 13; i++) {
      const z = -HZ + (i * HZ * 2) / 12;
      const y = 3.22 - 0.09 * Math.sin((i / 12) * Math.PI * 2);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), warm);
      b.position.set(sx * 1.7, y, z);
      g.add(b);
      box(0.014, 0.14, 0.014, tube, sx * 1.7, y + 0.11, z);
    }
  }
  box(3.4, 0.07, 0.07, neon, 0, 3.36, 0);
  for (const sx of [-1, 1]) box(0.1, 0.12, 0.1, tube, sx * 1.7, 3.4, 0);
  // bunting strung across the underside
  for (const zc of [-1.45, 1.45]) {
    for (let i = 0; i < 15; i++) {
      const t = i / 14, x = -3.15 + t * 6.3;
      const y = 3.18 - 0.2 * Math.sin(Math.PI * t);
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.0, 0.2, 3), [red, jade, tarpBone][i % 3]);
      pen.rotation.x = Math.PI;
      pen.position.set(x, y - 0.1, zc);
      g.add(pen);
    }
    for (let i = 0; i < 14; i++) {
      const t0 = i / 14, t1 = (i + 1) / 14;
      const x0 = -3.15 + t0 * 6.3, x1 = -3.15 + t1 * 6.3;
      const y0 = 3.18 - 0.2 * Math.sin(Math.PI * t0), y1 = 3.18 - 0.2 * Math.sin(Math.PI * t1);
      const w = box(0.012, Math.hypot(x1 - x0, y1 - y0), 0.012, rope, (x0 + x1) / 2, (y0 + y1) / 2, zc);
      w.rotation.z = Math.atan2(x0 - x1, y1 - y0);
    }
  }
  for (const [bx, bz] of [[-3.3, -1.4], [3.3, 1.9]]) {
    box(0.05, 1.1, 0.5, red, bx, 2.94, bz);
    box(0.05, 0.05, 0.56, brass, bx, 3.48, bz);
  }

  // ------------------------------------------------------------ centre and seat
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let c2 = 0; c2 < nd.count; c2++) { nd.getMatrixAt(c2, im); put(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
