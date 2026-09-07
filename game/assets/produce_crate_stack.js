// produce_crate_stack — five vented plastic crates, heaped and slightly askew, the top
// one loaded with produce. Rim and skirt are one ExtrudeGeometry of the moulding section
// run along each wall; the vents between the pickets are real gaps.
export default function (THREE) {
  const g = new THREE.Group();

  let s = 0x51ed270b;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  const mat = (color, roughness, name) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }); m.name = name; return m; };

  const H = 0.19, t = 0.011;
  const COLS = [0x1d5f8a, 0xc4442f, 0xa9784f, 0x2f7a6a, 0x1d5f8a];
  const SIZES = [[0.51, 0.37], [0.49, 0.35], [0.51, 0.37], [0.47, 0.35], [0.50, 0.36]];

  // the rim moulding, drawn once, in the wall's own section plane:
  // +x is outboard, y is up. A lip proud on the outside, a flange returning in.
  const railPts = [[0, 0.133], [0, 0.168], [0.016, 0.175], [0.016, 0.190],
                   [-0.032, 0.190], [-0.032, 0.171], [-0.011, 0.161], [-0.011, 0.133]];
  const skirtPts = [[0, 0.057], [0, 0.030], [0.010, 0.022], [0.010, 0.0],
                    [-0.030, 0.0], [-0.030, 0.014], [-0.011, 0.030], [-0.011, 0.057]];
  const shapeOf = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath(); return sh; };
  const railShape = shapeOf(railPts), skirtShape = shapeOf(skirtPts);
  const sweep = (shape, len) => {
    const gm = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, steps: 1, curveSegments: 1 });
    gm.translate(0, 0, -len / 2);
    return gm;
  };

  const box = new THREE.BoxGeometry(1, 1, 1);
  const picket = new THREE.BoxGeometry(0.014, 0.078, 0.012);

  for (let k = 0; k < 5; k++) {
    const crate = new THREE.Group();
    const plastic = mat(COLS[k], 0.62, 'plaster');
    const W = SIZES[k][0], D = SIZES[k][1], hw = W / 2, hd = D / 2;

    // four wall sweeps, twice: rim moulding and foot skirt.
    // rotation.y = -PI/2 maps local +x (outboard) onto world +z.
    const walls = [
      { rot: -Math.PI / 2, px: 0, pz: hd, len: W },
      { rot: Math.PI / 2, px: 0, pz: -hd, len: W },
      { rot: 0, px: hw, pz: 0, len: D - 0.026 },
      { rot: Math.PI, px: -hw, pz: 0, len: D - 0.026 },
    ];
    for (const w of walls) {
      for (const sh of [railShape, skirtShape]) {
        const me = new THREE.Mesh(sweep(sh, w.len), plastic);
        me.rotation.y = w.rot; me.position.set(w.px, 0, w.pz);
        crate.add(me);
      }
    }

    // floor pan, seen through the vents and from below
    const pan = new THREE.Mesh(box, plastic);
    pan.scale.set(W - 0.03, 0.013, D - 0.03); pan.position.y = 0.0635; crate.add(pan);

    // corner columns tie rim to skirt
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const c = new THREE.Mesh(box, plastic);
      c.scale.set(0.032, H, 0.032); c.position.set(sx * (hw - 0.015), H / 2, sz * (hd - 0.015));
      crate.add(c);
    }

    // pickets between skirt and rim: the gaps between them are the vents
    const nL = 8, nS = 5, count = nL * 2 + nS * 2;
    const im = new THREE.InstancedMesh(picket, plastic, count);
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let i = 0;
    for (const sz of [1, -1]) for (let n = 0; n < nL; n++) {
      p.set(-W * 0.38 + (n / (nL - 1)) * W * 0.76, 0.096, sz * (hd - 0.006));
      mm.compose(p, q, sc); im.setMatrixAt(i++, mm);
    }
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    for (const sx of [1, -1]) for (let n = 0; n < nS; n++) {
      p.set(sx * (hw - 0.006), 0.096, -D * 0.32 + (n / (nS - 1)) * D * 0.64);
      mm.compose(p, qy, sc); im.setMatrixAt(i++, mm);
    }
    im.instanceMatrix.needsUpdate = true;
    crate.add(im);

    crate.position.set(rr(-0.026, 0.026), k * (H - 0.005), rr(-0.024, 0.024));
    crate.rotation.y = rr(-0.09, 0.09);
    crate.rotation.x = rr(-0.010, 0.010);
    g.add(crate);
  }

  // produce heaped over the rim of the top crate
  const topY = 4 * (H - 0.005) + H - 0.03;
  const fruitGeo = new THREE.SphereGeometry(1, 8, 5);
  const kinds = [{ c: 0xc4442f, r: 0.038, n: 10 }, { c: 0xa9784f, r: 0.044, n: 8 }, { c: 0xe8dcc0, r: 0.034, n: 6 }];
  const mm2 = new THREE.Matrix4(), q2 = new THREE.Quaternion(), p2 = new THREE.Vector3(), sc2 = new THREE.Vector3();
  for (const kd of kinds) {
    const im = new THREE.InstancedMesh(fruitGeo, mat(kd.c, 0.55, 'foliage'), kd.n);
    for (let n = 0; n < kd.n; n++) {
      const a = rnd() * Math.PI * 2, rad = Math.sqrt(rnd());
      const x = Math.cos(a) * rad * 0.20, z = Math.sin(a) * rad * 0.145;
      p2.set(x, topY + kd.r * 0.6 + (1 - rad * rad) * 0.062, z);
      const sq = kd.r * rr(0.85, 1.15);
      sc2.set(sq, sq * rr(0.8, 1.0), sq * rr(0.9, 1.1));
      q2.setFromAxisAngle(new THREE.Vector3(rnd(), rnd(), rnd()).normalize(), rnd() * 3.1);
      mm2.compose(p2, q2, sc2); im.setMatrixAt(n, mm2);
    }
    im.instanceMatrix.needsUpdate = true;
    g.add(im);
  }

  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pa = n.isMesh && n.geometry.attributes.position; if (!pa) return;
    const put = (mt) => { for (let i2 = 0; i2 < pa.count; i2++) bx.expandByPoint(v.fromBufferAttribute(pa, i2).applyMatrix4(mt)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); put(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bx.min.y; o.position.z -= ctr.z; });
  return g;
}
