// shophouse_facade — arm C: a different reading of the same building.
// Instead of a flat wall with windows punched into it, this is the five-foot-way
// shophouse: an open colonnaded walkway at street level, and above it three bays
// that PROJECT from the wall as boxed oriels with louvred cheeks, each under its
// own tiled hood, finished with an overhanging pitched roof on exposed rafters.
// Everything of interest stands proud of the wall, so the silhouette reads when
// the facade is passed edge-on in the dark.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back'; // facade: it abuts its neighbour on the back plane.

  const M = (color, roughness, name, extra) =>
    Object.assign(
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {})),
      { name }
    );
  const plaster = M(0xe8dcc0, 0.95, 'plaster');
  const plasterDeep = M(0x8f9aa3, 0.95, 'plaster');
  const shutter = M(0x2f7a6a, 0.8, 'timber');
  const timber = M(0x6d4a2f, 0.85, 'timber');
  const beam = M(0xa9784f, 0.85, 'timber');
  const steel = M(0x5a6169, 0.6, 'metal', { metalness: 0.55 });
  const stainless = M(0x8f9aa3, 0.45, 'metal', { metalness: 0.7 });
  const brass = M(0xd8cf7a, 0.4, 'metal', { metalness: 0.8 });
  const dark = M(0x1b1e22, 0.95, 'stone');
  const shade = M(0x2a2f35, 0.9, 'stone');
  const red = M(0xc4442f, 0.8, 'plaster');
  const bone = M(0xe8dcc0, 0.85, 'fabric');
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
  const cyl = (r1, r2, h, mat, x, y, z, seg) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), mat);
    me.position.set(x, y, z);
    g.add(me);
    return me;
  };

  const W = 6.5, HW = W / 2;
  const ZB = -0.6, ZW = -0.1; // back plane, wall face

  // ------------------------------------------------------------ the wall itself
  box(W, 10.3, 0.5, plaster, 0, 5.15, ZB + 0.25);
  // narrow shadow slots between the bays: dark, so the bays read as separate masses
  for (const x of [-1.05, 1.05]) box(0.72, 6.3, 0.1, shade, x, 6.9, ZW - 0.02);

  // ----------------------------------------------- ground: the five-foot way
  // the shop's own front is set back behind the colonnade
  box(W - 0.9, 3.2, 0.4, dark, 0, 1.6, ZB + 0.2);
  // concertina timber shop doors, half folded back
  for (let i = 0; i < 7; i++) {
    const x = -2.3 + i * 0.42;
    const leaf2 = box(0.4, 2.9, 0.07, timber, x, 1.5, ZB + 0.42 + (i % 2 ? 0.06 : 0));
    leaf2.rotation.y = (i % 2 ? 1 : -1) * 0.22;
    box(0.3, 0.05, 0.09, beam, x, 2.62, ZB + 0.48);
    box(0.3, 0.05, 0.09, beam, x, 0.42, ZB + 0.48);
  }
  // raised walkway slab and its kerb
  box(W, 0.18, 1.05, plasterDeep, 0, 0.09, 0.05);
  box(W, 0.1, 0.14, timber, 0, 0.13, 0.55);
  // four square piers standing at the front of the walkway
  for (const sx of [-2.72, -0.9, 0.9, 2.72]) {
    box(0.5, 0.24, 0.5, plasterDeep, sx, 0.3, 0.3);
    box(0.4, 2.6, 0.4, plaster, sx, 1.65, 0.3);
    for (let k = 0; k < 3; k++) box(0.46 - k * 0.02, 0.07, 0.46 - k * 0.02, plasterDeep, sx, 2.99 + k * 0.08, 0.3);
    box(0.36, 0.34, 0.36, beam, sx, 3.3, 0.3);
    // corner brackets under the beam
    for (const s of [-1, 1]) {
      const br = box(0.34, 0.1, 0.1, beam, sx + s * 0.26, 3.06, 0.3);
      br.rotation.z = s * 0.7;
    }
  }
  box(W, 0.26, 0.34, beam, 0, 3.35, 0.3); // the walkway beam
  box(W, 0.12, 0.5, timber, 0, 3.52, 0.24);

  // ------------------------------------------------------------ projecting bays
  const bay = (cx, yBase) => {
    const BW = 1.62, BH = 2.62, BD = 0.46;
    const zf = ZW + BD; // front face of the bay
    // the box itself
    box(BW, BH, BD, plaster, cx, yBase + BH / 2, ZW + BD / 2);
    // louvred cheeks: this is the relief that catches light from the side
    for (const s of [-1, 1]) {
      box(0.06, BH, BD + 0.04, timber, cx + s * (BW / 2 + 0.03), yBase + BH / 2, ZW + BD / 2);
      for (let i = 0; i < 13; i++) {
        const sl = box(0.07, 0.075, BD - 0.06, shutter, cx + s * (BW / 2 + 0.06), yBase + 0.32 + i * 0.17, ZW + BD / 2);
        sl.rotation.x = -0.4;
      }
    }
    // sill tray under the bay, on two brackets
    box(BW + 0.3, 0.14, BD + 0.16, plasterDeep, cx, yBase - 0.06, ZW + BD / 2);
    for (const s of [-1, 1]) {
      const br = box(0.5, 0.12, 0.12, beam, cx + s * 0.5, yBase - 0.28, ZW + BD - 0.12);
      br.rotation.z = s * 0.62;
    }
    // shuttered face: two leaves of angled slats in a deep frame
    box(BW - 0.08, BH - 0.24, 0.1, shade, cx, yBase + BH / 2 - 0.02, zf - 0.04);
    for (const s of [-1, 1]) {
      const lx = cx + s * 0.37;
      box(0.66, BH - 0.44, 0.07, shutter, lx, yBase + BH / 2 - 0.12, zf + 0.01);
      box(0.07, BH - 0.4, 0.11, shutter, lx - 0.3, yBase + BH / 2 - 0.12, zf + 0.03);
      box(0.07, BH - 0.4, 0.11, shutter, lx + 0.3, yBase + BH / 2 - 0.12, zf + 0.03);
      for (let i = 0; i < 11; i++) {
        const sl = box(0.56, 0.08, 0.1, shutter, lx, yBase + 0.44 + i * 0.17, zf + 0.035);
        sl.rotation.x = -0.42;
      }
      box(0.66, 0.1, 0.12, shutter, lx, yBase + 0.32, zf + 0.03);
      box(0.66, 0.1, 0.12, shutter, lx, yBase + 2.24, zf + 0.03);
      cyl(0.022, 0.022, 0.13, brass, lx + s * 0.22, yBase + 1.25, zf + 0.07, 6).rotation.x = Math.PI / 2;
    }
    // a small tiled hood over the bay
    for (let i = 0; i < 9; i++) {
      const t = cyl(0.055, 0.055, BD + 0.34, timber, cx - 0.72 + i * 0.18, yBase + BH + 0.13, ZW + BD / 2 + 0.1, 6);
      t.rotation.x = Math.PI / 2;
      t.rotation.z = 0;
    }
    box(BW + 0.36, 0.09, BD + 0.4, beam, cx, yBase + BH + 0.05, ZW + BD / 2 + 0.1);
    box(BW + 0.4, 0.1, 0.12, beam, cx, yBase + BH + 0.14, ZW + BD + 0.24);
  };

  const railRun = (y) => {
    box(W, 0.16, 0.62, plasterDeep, 0, y + 0.08, 0.18); // walkway ledge
    box(W - 0.1, 0.07, 0.09, steel, 0, y + 0.9, 0.45);
    box(W - 0.1, 0.06, 0.08, steel, 0, y + 0.32, 0.45);
    box(W - 0.1, 0.06, 0.12, brass, 0, y + 0.98, 0.45);
    for (let i = 0; i < 24; i++) {
      const x = -(W - 0.24) / 2 + (i * (W - 0.24)) / 23;
      box(0.035, 0.6, 0.035, steel, x, y + 0.61, 0.45);
    }
    for (const sx of [-(W - 0.12) / 2, (W - 0.12) / 2]) {
      box(0.08, 1.0, 0.08, steel, sx, y + 0.6, 0.45);
      box(0.06, 0.06, 0.5, steel, sx, y + 0.9, 0.26);
    }
  };

  railRun(3.5);
  bay(-2.06, 3.86); bay(0, 3.86); bay(2.06, 3.86);
  railRun(6.9);
  bay(-2.06, 7.26); bay(0, 7.26); bay(2.06, 7.26);

  // -------------------------------------------------- overhanging pitched roof
  // exposed rafter tails, then a corrugated deck, then a ridge board
  for (let i = 0; i < 15; i++) {
    const x = -3.1 + i * 0.443;
    const r = box(0.09, 0.14, 1.08, beam, x, 10.44, 0.02);
    r.rotation.x = -0.22;
  }
  box(W + 0.16, 0.12, 0.16, beam, 0, 10.3, 0.52);
  const deck = box(W + 0.14, 0.09, 1.2, steel, 0, 10.62, 0.04, -0.22);
  deck.material = steel;
  for (let i = 0; i < 21; i++) {
    const rib = box(0.06, 0.07, 1.18, plasterDeep, -3.2 + i * 0.32, 10.68, 0.04);
    rib.rotation.x = -0.22;
  }
  box(W + 0.14, 0.5, 0.36, plaster, 0, 10.75, ZW - 0.16); // upstand behind the roof
  box(W + 0.2, 0.14, 0.5, plasterDeep, 0, 11.0 - 0.07, ZW - 0.16);
  // a gutter along the eave
  const gut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, W + 0.14, 8, 1, true, 0, Math.PI), steel);
  gut.material = M(0x5a6169, 0.6, 'metal', { metalness: 0.55, side: THREE.DoubleSide });
  gut.rotation.z = Math.PI / 2;
  gut.position.set(0, 10.42, 0.56);
  g.add(gut);

  // ------------------------------------------------------------------ services
  for (let i = 0; i < 5; i++) cyl(0.055, 0.055, 2.05, steel, 3.06, 1.1 + i * 2.06, 0.06, 8);
  box(0.8, 0.5, 0.34, stainless, -2.9, 6.6, 0.14);
  box(0.8, 0.5, 0.34, stainless, 2.9, 9.9, 0.14);
  box(0.34, 0.46, 0.16, steel, 2.95, 4.4, 0.06);
  for (let i = 0; i < 4; i++) box(0.05, 0.05, 0.05, shade, 3.02, 2.2 + i * 0.5, 0.16);

  // ------------------------------------------- lit shapes only, never lettering
  // a banner board slung under the walkway beam, lit from within
  box(W - 1.4, 0.9, 0.1, red, 0, 2.78, 0.5);
  box(W - 1.9, 0.16, 0.05, neon, 0, 2.98, 0.56);
  box(W - 2.6, 0.13, 0.05, neon, 0, 2.62, 0.56);
  // paper lanterns hung from the beam
  for (const lx of [-2.3, -0.75, 0.75, 2.3]) {
    cyl(0.012, 0.012, 0.36, steel, lx, 3.02, 0.52, 5);
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), warm);
    lan.scale.set(1, 0.82, 1);
    lan.position.set(lx, 2.66, 0.52);
    g.add(lan);
    cyl(0.07, 0.07, 0.05, timber, lx, 2.86, 0.52, 8);
  }
  // bulb strings under each bay hood
  for (const yy of [6.5, 9.9]) {
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), warm);
      b.position.set(-2.7 + i * 0.9, yy - 0.05 - Math.sin((i / 6) * Math.PI) * 0.07, 0.5);
      g.add(b);
    }
  }

  // ------------------------------------------------------------ centre and seat
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c2 = 0; c2 < n.count; c2++) { n.getMatrixAt(c2, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
