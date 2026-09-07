// market_arch_gate — arm C: a different part breakdown and a different reading.
// The roofs are hand-written BufferGeometry: a warped grid that dips along the
// slope AND lifts at the corners, with the tile corrugation folded into the same
// surface, so the eaves genuinely fly instead of being a tilted slab with a lip
// stuck on. The posts are read as braced twin uprights rather than single baulks,
// each carrying a rack of lanterns, and a scalloped valance hangs off the beam.
// 7.6 w x 5.5 h. Modelled all round; the player runs under it.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, roughness, name, extra) =>
    Object.assign(
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {})),
      { name }
    );
  const timber = M(0x6d4a2f, 0.88, 'timber');
  const timberL = M(0xa9784f, 0.85, 'timber');
  const tile = M(0x2a2f35, 0.7, 'tile', { side: THREE.DoubleSide });
  const tileEdge = M(0x5a6169, 0.65, 'tile');
  const stone = M(0x8f9aa3, 0.92, 'stone');
  const steel = M(0x5a6169, 0.55, 'metal', { metalness: 0.6 });
  const red = M(0xc4442f, 0.82, 'fabric', { side: THREE.DoubleSide });
  const bone = M(0xe8dcc0, 0.85, 'fabric', { side: THREE.DoubleSide });
  const jade = M(0x2f7a6a, 0.82, 'timber');
  const brass = M(0xd8cf7a, 0.4, 'metal', { metalness: 0.8 });
  const warm = M(0xffb45a, 0.5, 'plaster', { emissive: 0xffb45a, emissiveIntensity: 1.7 });
  const neon = M(0x63e0ff, 0.5, 'plaster', { emissive: 0x63e0ff, emissiveIntensity: 1.9 });

  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    me.position.set(x, y, z);
    if (rx) me.rotation.x = rx;
    if (ry) me.rotation.y = ry;
    if (rz) me.rotation.z = rz;
    g.add(me);
    return me;
  };
  const cyl = (r, h, mat, x, y, z, seg) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 8), mat);
    me.position.set(x, y, z);
    g.add(me);
    return me;
  };

  // ----------------------------------------- the winged roof, written by hand
  const wingRoof = (A, B, ridgeY, drop, lift, flare, ribAmp, ribPitch, nu, nv, mat) => {
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const u = -1 + (2 * i) / nu, au = Math.abs(u);
      for (let j = 0; j <= nv; j++) {
        const v = -1 + (2 * j) / nv, av = Math.abs(v);
        const x = u * A * (1 + flare * av * av);
        const z = v * B;
        let y = ridgeY - drop * av * av + lift * Math.pow(au, 3.0) * av * av + 0.09 * Math.pow(au, 6);
        y += ribAmp * Math.cos((x / ribPitch) * Math.PI * 2) * (0.25 + 0.75 * av);
        pos.push(x, y, z);
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

  const PX = 3.4, HALF = 0.26; // twin posts sit at PX +/- HALF

  // ---------------------------------------------------------- braced twin posts
  for (const s of [-1, 1]) {
    const x = s * PX;
    box(0.86, 0.18, 0.92, stone, x, 0.09, 0);
    box(0.72, 0.14, 0.78, stone, x, 0.25, 0);
    for (const sz of [-1, 1]) {
      box(0.26, 3.3, 0.26, timber, x, 1.97, sz * HALF);
      box(0.32, 0.09, 0.32, timberL, x, 3.66, sz * HALF);
      box(0.3, 0.09, 0.3, timberL, x, 0.36, sz * HALF);
    }
    // X-bracing between the two uprights, seen edge-on down the lane
    for (let k = 0; k < 4; k++) {
      const y0 = 0.55 + k * 0.75;
      for (const dsn of [-1, 1]) {
        const br = box(0.11, 0.11, 0.86, timberL, x, y0 + 0.36, 0);
        br.rotation.x = dsn * 0.72;
      }
      box(0.2, 0.1, 0.62, timberL, x, y0, 0);
    }
    box(0.2, 0.1, 0.62, timberL, x, 3.55, 0);
    // a lantern rack up the outer face of each post
    for (let k = 0; k < 4; k++) {
      const ly = 1.05 + k * 0.72;
      box(0.06, 0.06, 0.26, steel, x + s * 0.2, ly + 0.24, 0);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 10), warm);
      lan.position.set(x + s * 0.34, ly, 0);
      g.add(lan);
      cyl(0.05, 0.04, timber, x + s * 0.34, ly + 0.14, 0, 8);
      cyl(0.045, 0.03, timber, x + s * 0.34, ly - 0.14, 0, 8);
    }
  }

  // -------------------------------------------------------------- the head beams
  box(7.5, 0.3, 0.32, timberL, 0, 3.85, 0.26);
  box(7.5, 0.3, 0.32, timberL, 0, 3.85, -0.26);
  box(7.6, 0.09, 0.9, timber, 0, 4.04, 0);
  box(7.3, 0.24, 0.28, timber, 0, 3.36, 0);
  for (let i = 0; i < 13; i++) box(0.14, 0.2, 0.66, timberL, -3.3 + i * 0.55, 3.62, 0);
  // knee braces from each post into the beam
  for (const s of [-1, 1]) for (const sz of [-1, 1]) {
    const kb = box(0.13, 0.86, 0.13, timberL, s * (PX - 0.3), 3.34, sz * 0.26);
    kb.rotation.z = s * 0.62;
  }

  // -------------------------------------------------- the sign board and valance
  box(4.6, 0.62, 0.2, timber, 0, 3.36, 0.2);
  box(3.4, 0.36, 0.05, jade, 0, 3.36, 0.31);
  box(2.9, 0.09, 0.04, neon, 0, 3.46, 0.35);
  box(1.7, 0.08, 0.04, neon, 0, 3.25, 0.35);
  box(4.6, 0.62, 0.2, timber, 0, 3.36, -0.2);
  box(3.4, 0.36, 0.05, jade, 0, 3.36, -0.31);
  box(2.9, 0.09, 0.04, neon, 0, 3.46, -0.35);
  box(1.7, 0.08, 0.04, neon, 0, 3.25, -0.35);
  // scalloped cloth valance hung off the front and back beams
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const x = -3.23 + i * 0.34;
      const h = 0.3 + (i % 2) * 0.1;
      box(0.32, h, 0.03, i % 2 ? red : bone, x, 3.12 - h / 2, sz * 0.44);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.0, 0.16, 6), i % 2 ? red : bone);
      t.rotation.x = Math.PI;
      t.position.set(x, 3.12 - h - 0.08, sz * 0.44);
      g.add(t);
    }
    box(7.0, 0.07, 0.07, brass, 0, 3.14, sz * 0.44);
  }
  // a bulb string swagged across the span
  for (let i = 0; i < 21; i++) {
    const t = i / 20;
    const x = -3.2 + t * 6.4;
    const y = 2.95 - 0.34 * Math.sin(Math.PI * t);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 5), warm);
    b.position.set(x, y, 0);
    g.add(b);
    if (i < 20) {
      const t2 = (i + 1) / 20;
      const x2 = -3.2 + t2 * 6.4, y2 = 2.95 - 0.34 * Math.sin(Math.PI * t2);
      const w = box(0.02, Math.hypot(x2 - x, y2 - y), 0.02, steel, (x + x2) / 2, (y + y2) / 2 + 0.05, 0);
      w.rotation.z = Math.atan2(x - x2, y2 - y);
    }
  }

  // ---------------------------------------------------------------- lower roof
  // rafter tails first, so the underside has structure when you look back at it
  for (let i = 0; i < 19; i++) {
    const x = -3.42 + i * 0.38;
    for (const sz of [-1, 1]) {
      const r = box(0.09, 0.1, 0.62, timberL, x, 4.16, sz * 0.78);
      r.rotation.x = sz * 0.2;
    }
  }
  box(7.66, 0.1, 0.1, timber, 0, 4.14, 1.06);
  box(7.66, 0.1, 0.1, timber, 0, 4.14, -1.06);
  wingRoof(3.54, 1.1, 4.62, 0.44, 0.5, 0.05, 0.022, 0.3, 46, 10, tile);
  box(7.5, 0.13, 0.26, tileEdge, 0, 4.66, 0);
  box(7.5, 0.08, 0.13, timberL, 0, 4.75, 0);
  for (const s of [-1, 1]) for (const sz of [-1, 1]) {
    const fin = box(0.3, 0.34, 0.12, tileEdge, s * 3.7, 4.7, sz * 1.14);
    fin.rotation.z = -s * 0.5;
  }

  // -------------------------------------------------------- upper stage and roof
  box(4.3, 0.42, 0.62, timber, 0, 4.94, 0);
  for (const sz of [-1, 1]) {
    box(3.4, 0.2, 0.05, jade, 0, 4.96, sz * 0.32);
    box(2.8, 0.07, 0.04, neon, 0, 4.96, sz * 0.35);
  }
  for (let i = 0; i < 9; i++) box(0.12, 0.3, 0.72, timberL, -1.92 + i * 0.48, 5.24, 0);
  wingRoof(2.16, 0.82, 5.4, 0.34, 0.3, 0.06, 0.018, 0.27, 34, 8, tile);
  box(4.4, 0.11, 0.22, tileEdge, 0, 5.44, 0);
  box(4.4, 0.07, 0.11, timberL, 0, 5.5, 0);

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
