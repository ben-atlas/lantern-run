// gas_cylinder_pair — two LPG bottles strapped together, hose coiled in the notch.
// A pressure vessel is a solid of revolution, so the whole bottle is one LatheGeometry.
export default function (THREE) {
  const g = new THREE.Group();
  let s = 0x7fb5d329;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const mat = (color, roughness, name, metalness) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: metalness ?? 0 }); m.name = name; return m; };

  const CX = 0.165;
  const shell = mat(0x8f9aa3, 0.52, 'metal', 0.35);
  const collar = mat(0x5a6169, 0.6, 'metal', 0.3);
  const collarD = mat(0x5a6169, 0.6, 'metal', 0.3); collarD.side = THREE.DoubleSide;
  const brass = mat(0xd8cf7a, 0.4, 'metal', 0.55);
  const grey = mat(0x2a2f35, 0.75, 'metal', 0.2);
  const rubber = mat(0x2a2f35, 0.88, 'plaster');
  const box = new THREE.BoxGeometry(1, 1, 1);

  // the two things that make a bottle read as a bottle at speed are the base ring
  // standing proud and the girth weld: the lower half is a hair fatter than the upper.
  const prof = [[0.000, 0.000], [0.120, 0.000], [0.138, 0.011], [0.143, 0.030], [0.143, 0.086],
                [0.151, 0.104], [0.153, 0.130], [0.153, 0.286], [0.162, 0.298], [0.148, 0.314],
                [0.148, 0.434], [0.144, 0.474], [0.132, 0.524], [0.110, 0.568], [0.080, 0.601],
                [0.050, 0.621], [0.036, 0.633], [0.034, 0.652], [0.000, 0.652]];
  const bodyGeo = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 16);

  const topRing = new THREE.CylinderGeometry(0.097, 0.097, 0.030, 14, 1, true);
  const arcGeo = new THREE.CylinderGeometry(0.097, 0.101, 0.212, 5, 1, true, 0, 0.82);
  const valveGeo = new THREE.LatheGeometry([[0.000, 0.652], [0.026, 0.652], [0.026, 0.666], [0.020, 0.672],
    [0.020, 0.694], [0.024, 0.700], [0.024, 0.708], [0.000, 0.708]].map((p) => new THREE.Vector2(p[0], p[1])), 8);
  const outletGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.056, 8);
  const wheelGeo = new THREE.LatheGeometry([[0.000, 0.000], [0.012, 0.000], [0.026, 0.004], [0.030, 0.011],
    [0.026, 0.016], [0.010, 0.016], [0.000, 0.014]].map((p) => new THREE.Vector2(p[0], p[1])), 10);

  const bottle = () => {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(bodyGeo, shell));

    const ring = new THREE.Mesh(topRing, collarD); ring.position.y = 0.765; b.add(ring);
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(arcGeo, collarD);
      arc.rotation.y = i * (Math.PI * 2 / 3) + 0.4;
      arc.position.y = 0.646; b.add(arc);
      // the weld pad where the guard meets the shoulder
      const a = i * (Math.PI * 2 / 3) + 0.4 + 0.41;
      const pad = new THREE.Mesh(box, collar);
      pad.scale.set(0.062, 0.018, 0.026);
      pad.position.set(Math.sin(a) * 0.100, 0.545, Math.cos(a) * 0.100);
      pad.rotation.y = a; b.add(pad);
    }

    b.add(new THREE.Mesh(valveGeo, brass));
    const out = new THREE.Mesh(outletGeo, brass);
    out.rotation.z = -Math.PI / 2; out.position.set(0.040, 0.676, 0); b.add(out);
    const spig = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.030, 6), brass);
    spig.rotation.z = -Math.PI / 2; spig.position.set(0.078, 0.676, 0); b.add(spig);
    const wh = new THREE.Mesh(wheelGeo, grey); wh.position.y = 0.708; b.add(wh);
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5);
      const lb = new THREE.Mesh(box, grey);
      lb.scale.set(0.013, 0.015, 0.019);
      lb.position.set(Math.cos(a) * 0.031, 0.716, Math.sin(a) * 0.031);
      lb.rotation.y = -a; b.add(lb);
    }
    return b;
  };

  // the pair is not squared up: one turned, one nudged forward, one leaning a touch
  const left = bottle(); left.position.set(-CX, 0, 0.012); left.rotation.y = 0.55; left.rotation.z = 0.012; g.add(left);
  const right = bottle(); right.position.set(CX, 0, -0.014); right.rotation.y = -1.32; right.rotation.z = -0.008; g.add(right);

  const bandGeo = new THREE.CylinderGeometry(0.156, 0.156, 0.017, 18, 1, true);
  const band = mat(0x2a2f35, 0.92, 'fabric'); band.side = THREE.DoubleSide;
  for (const sx of [1, -1]) { const bn = new THREE.Mesh(bandGeo, band); bn.position.set(sx * CX, 0.282, 0); g.add(bn); }
  for (const sz of [1, -1]) { const br = new THREE.Mesh(box, band); br.scale.set(0.10, 0.017, 0.006); br.position.set(0, 0.282, sz * 0.032); g.add(br); }
  const buckle = new THREE.Mesh(box, grey); buckle.scale.set(0.034, 0.024, 0.012); buckle.position.set(0.02, 0.282, 0.036); g.add(buckle);

  // hose: five turns hung in the notch, plus a tail running up to the near valve
  const coilGeo = new THREE.TorusGeometry(0.077, 0.011, 4, 14);
  const coil = new THREE.InstancedMesh(coilGeo, rubber, 5);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < 5; i++) {
      p.set(rr(-0.009, 0.009), 0.398 + rr(-0.007, 0.007), 0.120 + i * 0.023);
      q.setFromAxisAngle(new THREE.Vector3(1, 0.15, 0).normalize(), rr(-0.10, 0.10));
      mm.compose(p, q, sc); coil.setMatrixAt(i, mm);
    }
    coil.instanceMatrix.needsUpdate = true; g.add(coil);
  }
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.000, 0.474, 0.150), new THREE.Vector3(0.045, 0.560, 0.130),
    new THREE.Vector3(0.090, 0.640, 0.075), new THREE.Vector3(0.098, 0.676, 0.010),
  ]);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tail, 6, 0.011, 5, false), rubber);
  tailMesh.material = rubber; g.add(tailMesh);

  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pa = n.isMesh && n.geometry.attributes.position; if (!pa) return;
    const putv = (mt) => { for (let i = 0; i < pa.count; i++) bx.expandByPoint(v.fromBufferAttribute(pa, i).applyMatrix4(mt)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); putv(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    putv(n.matrixWorld);
  });
  const ctr = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bx.min.y; o.position.z -= ctr.z; });
  return g;
}
