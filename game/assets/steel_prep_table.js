// steel_prep_table — 1.4 m stainless bench, shelf loaded with tubs. The worktop is ONE
// ExtrudeGeometry of the pressing section, so the vault edge is a single crisp line.
export default function (THREE) {
  const g = new THREE.Group();
  let s = 0x165667b1;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const mat = (color, roughness, name, metalness) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: metalness ?? 0 }); m.name = name; return m; };

  const L = 1.40, D = 0.70, hl = L / 2, hd = D / 2, TOP = 0.870;
  const steel = mat(0x8f9aa3, 0.42, 'metal', 0.3);
  const frame = mat(0x5a6169, 0.55, 'metal', 0.3);
  const dark = mat(0x2a2f35, 0.75, 'metal', 0.2);
  const box = new THREE.BoxGeometry(1, 1, 1);

  // worktop section. local +x is the FRONT of the bench, local y is up.
  const sec = [[0.350, 0.870], [0.350, 0.844], [0.332, 0.828], [0.320, 0.846], [0.320, 0.856],
               [-0.336, 0.856], [-0.336, 0.828], [-0.350, 0.828], [-0.350, 0.920],
               [-0.316, 0.920], [-0.316, 0.878], [-0.300, 0.870]];
  const shape = new THREE.Shape();
  shape.moveTo(sec[0][0], sec[0][1]);
  for (let i = 1; i < sec.length; i++) shape.lineTo(sec[i][0], sec[i][1]);
  shape.closePath();
  const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, steps: 1, curveSegments: 1 });
  deckGeo.translate(0, 0, -L / 2);
  const deck = new THREE.Mesh(deckGeo, steel);
  deck.rotation.y = -Math.PI / 2;   // local +x -> world +z, so the sweep runs along x
  g.add(deck);

  // legs: one lathe each, tube with a swaged foot and a levelling pad
  const legProf = [[0.000, 0.856], [0.021, 0.856], [0.021, 0.072], [0.026, 0.056],
                   [0.026, 0.040], [0.033, 0.032], [0.033, 0.012], [0.030, 0.006], [0.000, 0.006]];
  const legGeo = new THREE.LatheGeometry(legProf.map((p) => new THREE.Vector2(p[0], p[1])), 10);
  const padGeo = new THREE.CylinderGeometry(0.030, 0.032, 0.014, 10);
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const x = sx * (hl - 0.085), z = sz * (hd - 0.075);
    const l = new THREE.Mesh(legGeo, steel); l.position.set(x, 0, z); g.add(l);
    const p = new THREE.Mesh(padGeo, dark); p.position.set(x, 0.007, z); g.add(p);
  }

  // lower shelf, also a swept section: a channel rail round the perimeter
  const shelfY = 0.235;
  const rp = [[0.000, 0.000], [0.030, 0.000], [0.030, 0.010], [0.020, 0.010], [0.020, 0.026], [0.000, 0.026]];
  const rShape = new THREE.Shape();
  rShape.moveTo(rp[0][0], rp[0][1]); for (let i = 1; i < rp.length; i++) rShape.lineTo(rp[i][0], rp[i][1]); rShape.closePath();
  const mkRail = (len) => { const gm = new THREE.ExtrudeGeometry(rShape, { depth: len, bevelEnabled: false, steps: 1, curveSegments: 1 }); gm.translate(0, 0, -len / 2); return gm; };
  const railL = mkRail(L - 0.13), railS = mkRail(D - 0.14);
  for (const sz of [1, -1]) {
    const r = new THREE.Mesh(railL, frame);
    r.rotation.y = sz > 0 ? -Math.PI / 2 : Math.PI / 2;
    r.position.set(0, shelfY, sz * (hd - 0.075)); g.add(r);
  }
  for (const sx of [1, -1]) {
    const r = new THREE.Mesh(railS, frame);
    r.rotation.y = sx > 0 ? 0 : Math.PI;
    r.position.set(sx * (hl - 0.085), shelfY, 0); g.add(r);
  }
  const slatGeo = new THREE.CylinderGeometry(0.010, 0.010, D - 0.16, 7);
  const nSlat = 11;
  const slats = new THREE.InstancedMesh(slatGeo, steel, nSlat);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < nSlat; i++) { p.set(-(L - 0.22) / 2 + (i / (nSlat - 1)) * (L - 0.22), shelfY + 0.016, 0); mm.compose(p, q, sc); slats.setMatrixAt(i, mm); }
    slats.instanceMatrix.needsUpdate = true; g.add(slats);
  }

  // tubs, lathed as a soft-cornered gastronorm pan and repeated. DoubleSide: you see in.
  const tubProf = [[0.000, 0.000], [0.070, 0.000], [0.082, 0.020], [0.094, 0.110], [0.100, 0.118], [0.093, 0.118], [0.088, 0.110]];
  const tubGeo = new THREE.LatheGeometry(tubProf.map((p) => new THREE.Vector2(p[0], p[1])), 10);
  const addTub = (col, sx, sy, sz, x, y, z, ry) => {
    const m = mat(col, 0.52, 'plaster'); m.side = THREE.DoubleSide;
    const t = new THREE.Mesh(tubGeo, m);
    t.scale.set(sx, sy, sz); t.position.set(x, y, z); t.rotation.y = ry; g.add(t); return t;
  };
  addTub(0xe8dcc0, 1.15, 1.25, 0.95, -0.46, shelfY + 0.028, 0.00, 0.10);
  addTub(0xe8dcc0, 1.15, 1.25, 0.95, -0.44, shelfY + 0.178, -0.03, -0.32);
  addTub(0x2f7a6a, 0.95, 1.05, 0.85, -0.06, shelfY + 0.028, -0.05, 0.44);
  addTub(0x1d5f8a, 1.30, 1.35, 1.05, 0.40, shelfY + 0.028, 0.02, -0.18);
  addTub(0xc4442f, 0.85, 0.95, 0.80, 0.25, shelfY + 0.028, 0.14, 0.62);
  addTub(0xe8dcc0, 0.95, 0.90, 0.85, 0.62, shelfY + 0.028, -0.09, 0.21);

  // deck load kept behind the front 0.28 m so the vault line stays clean
  const brdMat = mat(0xa9784f, 0.78, 'timber');
  const brd = new THREE.Mesh(box, brdMat); brd.scale.set(0.48, 0.040, 0.31); brd.position.set(-0.20, TOP + 0.020, -0.09); brd.rotation.y = 0.06; g.add(brd);
  addTub(0xe8dcc0, 0.90, 0.85, 0.80, 0.18, TOP + 0.002, -0.20, 0.08);
  addTub(0xe8dcc0, 0.90, 0.85, 0.80, 0.38, TOP + 0.002, -0.19, -0.26);
  const bowlProf = [[0.000, 0.000], [0.046, 0.004], [0.086, 0.030], [0.106, 0.072], [0.112, 0.094], [0.104, 0.094]];
  const bowlGeo = new THREE.LatheGeometry(bowlProf.map((p) => new THREE.Vector2(p[0], p[1])), 14);
  const bowlMat = mat(0x8f9aa3, 0.32, 'metal', 0.5); bowlMat.side = THREE.DoubleSide;
  const b1 = new THREE.Mesh(bowlGeo, bowlMat); b1.position.set(0.60, TOP + 0.004, -0.13); g.add(b1);
  const b2 = new THREE.Mesh(bowlGeo, bowlMat); b2.scale.setScalar(0.66); b2.position.set(0.58, TOP + 0.030, -0.11); b2.rotation.z = 0.13; g.add(b2);
  // tongs and a ladle laid in the big bowl, angled down so nothing stands up like an aerial
  const stick = new THREE.CylinderGeometry(0.006, 0.006, 0.22, 5);
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(stick, mat(0x8f9aa3, 0.3, 'metal', 0.55));
    t.position.set(0.60 + i * 0.012, TOP + 0.052, -0.03 - i * 0.02);
    t.rotation.set(-1.15 + i * 0.05, 0.2 * i, 0.10 * i);
    g.add(t);
  }
  // a stack of trays wedged in at the back of the deck, well behind the vault edge
  const trays = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.013, 0.20), mat(0x8f9aa3, 0.4, 'metal', 0.35), 4);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      p.set(-0.54, TOP + 0.008 + i * 0.018, -0.19 + rr(-0.012, 0.012));
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr(-0.16, 0.16));
      mm.compose(p, q, sc); trays.setMatrixAt(i, mm);
    }
    trays.instanceMatrix.needsUpdate = true; g.add(trays);
  }
  // chopped prep on the board
  const chop = new THREE.InstancedMesh(new THREE.BoxGeometry(0.030, 0.014, 0.026), mat(0x2f7a6a, 0.6, 'foliage'), 11);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < 11; i++) {
      p.set(-0.20 + rr(-0.16, 0.16), TOP + 0.048 + rr(0, 0.014), -0.09 + rr(-0.09, 0.09));
      q.setFromAxisAngle(new THREE.Vector3(rnd(), rnd(), rnd()).normalize(), rnd() * 3.1);
      mm.compose(p, q, sc); chop.setMatrixAt(i, mm);
    }
    chop.instanceMatrix.needsUpdate = true; g.add(chop);
  }

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
