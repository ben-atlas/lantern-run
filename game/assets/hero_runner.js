// hero_runner — swept profiles (winning arm of three). Limbs and torso are LatheGeometry profiles,
// the sneaker is its side outline extruded across, the satchel strap is a shape
// swept along a CatmullRom path over the shoulder.
// Articulated. Rest pose: neutral standing, facing +Z, arms down.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, roughness, name, extra) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {}));
    m.name = name;
    return m;
  };
  const JACKET = M(0x1d5f8a, 0.86, 'fabric');
  const RIB    = M(0x2a2f35, 0.92, 'fabric');
  const TEE    = M(0xc4442f, 0.9,  'fabric');
  const PANT   = M(0x5a6169, 0.94, 'fabric');
  const SKIN   = M(0xa9784f, 0.72, 'plaster');
  const HAIR   = M(0x1b1e22, 0.95, 'fabric');
  const SOLE   = M(0xe8dcc0, 0.82, 'plaster');
  const SHOE   = M(0x5a6169, 0.86, 'fabric');
  const SHOEB  = M(0x1d5f8a, 0.86, 'fabric');
  const ACC    = M(0xc4442f, 0.86, 'fabric');
  const LEATH  = M(0x6d4a2f, 0.8,  'fabric');
  const BRASS  = M(0xd8cf7a, 0.42, 'metal', { metalness: 0.8 });

  const node = (parent, x, y, z) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o;
  };
  const add = (parent, geo, mat, opt) => {
    const m = new THREE.Mesh(geo, mat);
    if (opt) {
      if (opt.p) m.position.set(opt.p[0], opt.p[1], opt.p[2]);
      if (opt.r) m.rotation.set(opt.r[0], opt.r[1], opt.r[2]);
      if (opt.s) m.scale.set(opt.s[0], opt.s[1], opt.s[2]);
    }
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // a profile revolved about Y. pairs are [radius, height].
  // LatheGeometry winds its faces from the point order: a profile written from the
  // top down comes out with every normal pointing inward, so the mesh renders as a
  // hollow shell you can see straight through. Nothing warns. Sort ascending.
  const lathe = (pairs, seg) => {
    const pts = pairs.map((p) => new THREE.Vector2(Math.max(p[0], 0.0008), p[1]));
    if (pts.length > 1 && pts[pts.length - 1].y < pts[0].y) pts.reverse();
    return new THREE.LatheGeometry(pts, seg || 14);
  };
  // a closed outline, extruded. pts are [x, y] walked in order.
  const sweep = (pts, depth) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  };
  // rounded rectangle outline, for pouches and panels
  const roundRect = (w, h, r) => {
    const s = new THREE.Shape();
    const x = w / 2, y = h / 2;
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);  s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    return s;
  };

  // ---- skeleton ------------------------------------------------------------
  const hips = node(g, 0, 0.95, 0);
  const spine = node(hips, 0, 0.11, 0);
  const chest = node(spine, 0, 0.16, 0);
  const neck = node(chest, 0, 0.25, 0.005);
  const head = node(neck, 0, 0.045, 0);
  const rightShoulder = node(chest, -0.168, 0.195, 0);
  const rightElbow = node(rightShoulder, 0, -0.285, 0);
  const leftShoulder = node(chest, 0.168, 0.195, 0);
  const leftElbow = node(leftShoulder, 0, -0.285, 0);
  const rightHip = node(hips, -0.093, -0.025, 0);
  const rightKnee = node(rightHip, 0, -0.45, 0);
  const rightAnkle = node(rightKnee, 0, -0.39, -0.012);
  const leftHip = node(hips, 0.093, -0.025, 0);
  const leftKnee = node(leftHip, 0, -0.45, 0);
  const leftAnkle = node(leftKnee, 0, -0.39, -0.012);

  const FLAT = [0.98, 1, 0.66];   // torso cross-section is an ellipse, not a circle

  // ---- pelvis, waist, the tee showing under a cropped jacket ---------------
  add(hips, lathe([[0.005, 0.035], [0.132, 0.026], [0.152, -0.010], [0.150, -0.070],
                   [0.132, -0.120], [0.005, -0.140]], 16), PANT, { s: [1, 1, 0.72] });
  add(spine, lathe([[0.005, 0.060], [0.150, 0.048], [0.163, -0.010], [0.166, -0.055],
                    [0.150, -0.095], [0.005, -0.112]], 16), TEE, { s: [1, 1, 0.70] });

  // ---- jacket, swept as two profiles so the waist can bend -----------------
  add(spine, lathe([[0.005, 0.145], [0.176, 0.140], [0.186, 0.085], [0.184, 0.040],
                    [0.190, 0.022], [0.005, 0.014]], 18), JACKET, { s: FLAT });
  // hem rib, the line that reads from behind
  const hemRib = add(spine, lathe([[0.005, 0.048], [0.192, 0.044], [0.196, 0.012],
                                   [0.178, -0.012], [0.005, -0.018]], 18), RIB, { s: [1.01, 1, 0.68] });
  add(chest, lathe([[0.005, 0.255], [0.120, 0.250], [0.190, 0.215], [0.206, 0.150],
                    [0.206, 0.055], [0.196, -0.02], [0.186, -0.06], [0.005, -0.065]], 18), JACKET, { s: FLAT });
  // open front: the tee wedge between the jacket panels, and the zip tapes
  add(chest, sweep([[-0.055, -0.135], [0.055, -0.135], [0.062, 0.20], [-0.062, 0.20]], 0.05), TEE, { p: [0, 0, 0.095] });
  add(chest, sweep([[-0.020, -0.09], [0.020, -0.09], [0.024, 0.205], [-0.024, 0.205]], 0.04), RIB, { p: [-0.070, 0, 0.113] });
  add(chest, sweep([[-0.020, -0.09], [0.020, -0.09], [0.024, 0.205], [-0.024, 0.205]], 0.04), RIB, { p: [0.070, 0, 0.113] });
  // slash pockets
  const pocket = sweep([[-0.055, -0.012], [0.055, -0.012], [0.055, 0.012], [-0.055, 0.012]], 0.03);
  add(spine, pocket, RIB, { p: [-0.098, 0.085, 0.112] });
  add(spine, pocket, RIB, { p: [0.098, 0.085, 0.112] });
  // collar, a short open lathe: double-sided, you can see its inside
  const collar = add(chest, new THREE.LatheGeometry(
    [new THREE.Vector2(0.098, 0), new THREE.Vector2(0.112, 0.055), new THREE.Vector2(0.122, 0.105)], 16), RIB, { p: [0, 0.245, 0.004], s: [1, 1, 0.82] });
  collar.material = RIB.clone(); collar.material.side = THREE.DoubleSide; collar.material.name = 'fabric';

  // ---- neck, head, hair ----------------------------------------------------
  add(neck, lathe([[0.005, 0.045], [0.050, 0.04], [0.053, -0.02], [0.062, -0.055], [0.005, -0.062]], 12), SKIN);
  add(head, lathe([[0.005, -0.055], [0.055, -0.062], [0.079, -0.030], [0.087, 0.030],
                   [0.094, 0.085], [0.082, 0.140], [0.048, 0.168], [0.005, 0.172]], 16), SKIN, { s: [0.90, 1, 1.02] });
  add(head, sweep([[-0.030, -0.070], [0.030, -0.070], [0.036, 0.005], [-0.036, 0.005]], 0.04), SKIN, { p: [0, 0.005, 0.072] }); // chin/jaw front
  add(head, sweep([[-0.014, -0.012], [0.014, -0.012], [0.011, 0.014], [-0.011, 0.014]], 0.028), SKIN, { p: [0, 0.052, 0.086] }); // nose
  add(head, sweep([[-0.010, -0.024], [0.010, -0.024], [0.010, 0.024], [-0.010, 0.024]], 0.016), SKIN, { p: [-0.084, 0.058, -0.008] });
  add(head, sweep([[-0.010, -0.024], [0.010, -0.024], [0.010, 0.024], [-0.010, 0.024]], 0.016), SKIN, { p: [0.084, 0.058, -0.008] });
  // hair is one silhouette outline, swept through the head: fringe, spikes, nape
  // the lower edge of this outline is the fringe line: it must clear the brow,
  // because an extruded silhouette covers the front of the head as well as the back.
  const hairOutline = [
    [-0.106, 0.056], [-0.114, 0.112], [-0.094, 0.142], [-0.102, 0.198], [-0.062, 0.158],
    [-0.052, 0.214], [-0.020, 0.162], [0.004, 0.230], [0.030, 0.160], [0.062, 0.206],
    [0.070, 0.148], [0.106, 0.188], [0.100, 0.134], [0.118, 0.104], [0.110, 0.054],
    [0.092, 0.108], [0.038, 0.122], [-0.038, 0.122], [-0.090, 0.106],
  ];
  const hairFront = add(head, sweep(hairOutline, 0.196), HAIR, { p: [0, 0.006, -0.116] });
  // a skull cap under the silhouette: the extrusion alone leaves the crown bare
  // from the front, which reads as a bald patch above a dark band.
  add(head, lathe([[0.005, 0.086], [0.078, 0.080], [0.098, 0.124], [0.086, 0.156],
                   [0.046, 0.176], [0.005, 0.180]], 16), HAIR, { p: [0, 0, 0.004], s: [0.92, 1, 1.0] });
  hairFront.material = HAIR;
  // nape mass, so the back of the head is not a bald sphere
  add(head, lathe([[0.005, 0.135], [0.070, 0.120], [0.098, 0.060], [0.100, -0.010],
                   [0.070, -0.048], [0.005, -0.052]], 14), HAIR, { p: [0, 0, -0.028], s: [0.92, 1, 0.80] });

  // ---- arms ----------------------------------------------------------------
  const arm = (shoulder, elbow, side) => {
    add(shoulder, lathe([[0.005, 0.085], [0.055, 0.078], [0.078, 0.030], [0.077, -0.045],
                         [0.068, -0.145], [0.060, -0.245], [0.005, -0.262]], 14), JACKET);
    add(elbow, lathe([[0.005, 0.045], [0.058, 0.030], [0.056, -0.055], [0.050, -0.135],
                      [0.054, -0.165], [0.005, -0.178]], 14), JACKET);
    add(elbow, lathe([[0.005, -0.150], [0.054, -0.155], [0.052, -0.195], [0.005, -0.202]], 14), RIB);
    add(elbow, lathe([[0.005, -0.190], [0.036, -0.198], [0.034, -0.245], [0.005, -0.252]], 12), SKIN);
    const handShape = roundRect(0.064, 0.135, 0.026);
    const hand = add(elbow, new THREE.ExtrudeGeometry(handShape, { depth: 0.042, bevelEnabled: false, curveSegments: 3 }),
      SKIN, { p: [side * 0.004, -0.312, -0.021], r: [0, 0, side * 0.07] });
    add(elbow, new THREE.ExtrudeGeometry(roundRect(0.026, 0.062, 0.012), { depth: 0.032, bevelEnabled: false, curveSegments: 3 }),
      SKIN, { p: [-side * 0.034, -0.300, -0.006], r: [0, 0, side * 0.35] });
    return hand;
  };
  arm(rightShoulder, rightElbow, -1);
  arm(leftShoulder, leftElbow, 1);

  // ---- legs ----------------------------------------------------------------
  const shoeProfile = [
    [-0.108, 0.000], [0.150, 0.000], [0.163, 0.014], [0.166, 0.040], [0.152, 0.062],
    [0.118, 0.080], [0.074, 0.092], [0.040, 0.108], [0.018, 0.140], [0.006, 0.176],
    [-0.030, 0.182], [-0.058, 0.170], [-0.070, 0.128], [-0.086, 0.072], [-0.108, 0.038],
  ];
  const soleProfile = [
    [-0.112, -0.002], [0.156, -0.002], [0.170, 0.014], [0.168, 0.040], [0.150, 0.048],
    [0.020, 0.040], [-0.070, 0.044], [-0.112, 0.038],
  ];
  const leg = (hip, knee, ankle, side) => {
    add(hip, lathe([[0.005, 0.055], [0.088, 0.045], [0.100, -0.020], [0.102, -0.130],
                    [0.094, -0.270], [0.086, -0.400], [0.078, -0.455], [0.005, -0.470]], 14), PANT);
    add(knee, lathe([[0.005, 0.055], [0.082, 0.045], [0.085, -0.030], [0.076, -0.150],
                     [0.070, -0.250], [0.078, -0.300], [0.005, -0.320]], 14), PANT);
    // gathered cuff at the ankle
    add(knee, lathe([[0.005, -0.270], [0.080, -0.278], [0.082, -0.320], [0.066, -0.352], [0.005, -0.360]], 14), RIB);
    add(ankle, lathe([[0.005, 0.055], [0.054, 0.048], [0.056, -0.010], [0.005, -0.016]], 12), SOLE);

    const shoe = new THREE.Object3D();
    shoe.position.set(0, -0.085, 0.032);
    shoe.rotation.y = -Math.PI / 2;
    ankle.add(shoe);
    const W = 0.100;
    add(shoe, new THREE.ExtrudeGeometry(new THREE.Shape(soleProfile.map((p) => new THREE.Vector2(p[0], p[1]))),
      { depth: W + 0.010, bevelEnabled: false }), SOLE, { p: [0, 0, -(W + 0.010) / 2] });
    add(shoe, new THREE.ExtrudeGeometry(new THREE.Shape(shoeProfile.map((p) => new THREE.Vector2(p[0], p[1] + 0.030))),
      { depth: W, bevelEnabled: false }), SHOE, { p: [0, 0, -W / 2] });
    // toe panel and heel counter in a second colour, so the shoe is not one lump
    add(shoe, sweep([[0.030, 0.036], [0.150, 0.036], [0.156, 0.070], [0.075, 0.106], [0.030, 0.104]], W + 0.004), SHOEB, { p: [0, 0, -(W + 0.004) / 2] });
    add(shoe, sweep([[-0.104, 0.040], [-0.062, 0.048], [-0.050, 0.172], [-0.096, 0.166]], W + 0.004), SHOEB, { p: [0, 0, -(W + 0.004) / 2] });
    add(shoe, sweep([[-0.028, 0.108], [0.020, 0.128], [0.012, 0.196], [-0.030, 0.196]], 0.052), SOLE, { p: [0, 0, -0.026] }); // tongue
    add(shoe, sweep([[0.030, 0.050], [0.070, 0.046], [0.066, 0.076], [0.030, 0.078]], W + 0.010), ACC, { p: [0, 0, -(W + 0.010) / 2] }); // flash
    for (let i = 0; i < 4; i++) {
      add(shoe, sweep([[0, -0.006], [0.052, -0.006], [0.052, 0.006], [0, 0.006]], 0.010),
        SOLE, { p: [0.008 - i * 0.006, 0.126 + i * 0.017, -0.005], r: [0, 0, -0.32] });
    }
    return shoe;
  };
  const rightShoe = leg(rightHip, rightKnee, rightAnkle, -1);
  const leftShoe = leg(leftHip, leftKnee, leftAnkle, 1);

  // ---- satchel: the strap is a real sweep along a path over the shoulder ---
  const strapGrp = new THREE.Object3D();
  chest.add(strapGrp);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.130, -0.280, 0.100),
    new THREE.Vector3(-0.040, -0.090, 0.150),
    new THREE.Vector3(0.090, 0.130, 0.115),
    new THREE.Vector3(0.170, 0.220, 0.000),
    new THREE.Vector3(0.110, 0.135, -0.125),
    new THREE.Vector3(-0.030, -0.090, -0.150),
    new THREE.Vector3(-0.135, -0.285, -0.095),
  ]);
  const strapShape = roundRect(0.050, 0.014, 0.006);
  add(strapGrp, new THREE.ExtrudeGeometry(strapShape, { steps: 40, bevelEnabled: false, extrudePath: path }), LEATH);

  const satchel = new THREE.Object3D();
  satchel.position.set(-0.202, -0.02, 0.020);
  satchel.rotation.set(0.04, 0.18, 0.09);
  hips.add(satchel);
  add(satchel, new THREE.ExtrudeGeometry(roundRect(0.200, 0.170, 0.022), { depth: 0.092, bevelEnabled: false, curveSegments: 3 }), LEATH, { p: [0, 0, -0.046] });
  add(satchel, new THREE.ExtrudeGeometry(roundRect(0.208, 0.100, 0.020), { depth: 0.100, bevelEnabled: false, curveSegments: 3 }), LEATH, { p: [0, 0.056, -0.050] });
  add(satchel, sweep([[-0.016, -0.045], [0.016, -0.045], [0.016, 0.020], [-0.016, 0.020]], 0.018), LEATH, { p: [0, -0.020, 0.046] });
  add(satchel, sweep([[-0.013, -0.011], [0.013, -0.011], [0.013, 0.011], [-0.013, 0.011]], 0.012), BRASS, { p: [0, -0.044, 0.050] });

  // ---- normalise -----------------------------------------------------------
  const bbox = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const acc = (mat) => { for (let i = 0; i < p.count; i++) bbox.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); acc(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    acc(n.matrixWorld);
  });
  const c = bbox.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bbox.min.y; o.position.z -= c.z; });

  g.userData.joints = {
    hips, spine, chest, head,
    rightShoulder, rightElbow, leftShoulder, leftElbow,
    rightHip, rightKnee, rightAnkle, leftHip, leftKnee, leftAnkle,
  };
  g.userData.parts = { satchel, satchelStrap: strapGrp, neck, rightShoe, leftShoe, hemRib };
  return g;
}
