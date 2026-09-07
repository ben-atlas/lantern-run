// pursuer_enforcer — swept profiles (winning arm of three). Torso, limbs, scarf and collar are
// LatheGeometry profiles revolved and squashed into an ellipse; the boot is its
// side outline extruded across; vest, pouches and jacket panels are extruded
// rounded rectangles.
// Articulated. Rest pose: neutral standing, facing +Z, arms down.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, roughness, name, extra) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {}));
    m.name = name;
    return m;
  };
  const LEATH = M(0x6d4a2f, 0.72, 'fabric');
  const RIB   = M(0x2a2f35, 0.92, 'fabric');
  const VEST  = M(0x8f9aa3, 0.88, 'fabric');
  const POUCH = M(0x2a2f35, 0.9,  'fabric');
  const OLIVE = M(0x5a6169, 0.92, 'fabric');
  const SCARF = M(0x2f7a6a, 0.92, 'fabric');
  const BOOT  = M(0x1b1e22, 0.78, 'fabric');
  const SKIN  = M(0xa9784f, 0.72, 'plaster');
  const GREY  = M(0x5a6169, 0.9,  'fabric');
  const LACE  = M(0x8f9aa3, 0.9,  'fabric');
  const STEEL = M(0x8f9aa3, 0.45, 'metal', { metalness: 0.75 });
  const BRASS = M(0xd8cf7a, 0.42, 'metal', { metalness: 0.8 });

  const node = (parent, x, y, z) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o;
  };
  const add = (parent, geo, mat, o) => {
    const m = new THREE.Mesh(geo, mat);
    if (o) {
      if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
      if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
      if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    }
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  // LatheGeometry takes its winding from the point order. A profile written top
  // down comes out inside-out and renders as a see-through shell with no warning.
  const lathe = (pairs, seg) => {
    const pts = pairs.map((p) => new THREE.Vector2(Math.max(p[0], 0.0008), p[1]));
    if (pts.length > 1 && pts[pts.length - 1].y < pts[0].y) pts.reverse();
    return new THREE.LatheGeometry(pts, seg || 14);
  };
  const outline = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  };
  // bevelEnabled stays off: a bevel grows the profile outward by bevelSize on
  // every side and drops it below its own base, so the finished part is bigger
  // than the outline that was drawn.
  const sweep = (pts, depth) => new THREE.ExtrudeGeometry(outline(pts), { depth, bevelEnabled: false, curveSegments: 4 });
  const rr = (w, h, r) => {
    const s = new THREE.Shape(); const x = w / 2, y = h / 2;
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);  s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
    return s;
  };
  const slab = (w, h, d, r) => new THREE.ExtrudeGeometry(rr(w, h, r || 0.016), { depth: d, bevelEnabled: false, curveSegments: 3 });

  // ---- skeleton ------------------------------------------------------------
  const hips = node(g, 0, 0.98, 0);
  const spine = node(hips, 0, 0.11, 0);
  const chest = node(spine, 0, 0.20, 0);
  const neck = node(chest, 0, 0.297, 0.004);
  const head = node(neck, 0, 0.055, 0);
  const rightShoulder = node(chest, -0.202, 0.212, 0);
  const rightElbow = node(rightShoulder, 0, -0.305, 0);
  const leftShoulder = node(chest, 0.202, 0.212, 0);
  const leftElbow = node(leftShoulder, 0, -0.305, 0);
  const rightHip = node(hips, -0.104, -0.030, 0);
  const rightKnee = node(rightHip, 0, -0.47, 0);
  const rightAnkle = node(rightKnee, 0, -0.39, -0.014);
  const leftHip = node(hips, 0.104, -0.030, 0);
  const leftKnee = node(leftHip, 0, -0.47, 0);
  const leftAnkle = node(leftKnee, 0, -0.39, -0.014);

  const FLAT = [1, 1, 0.76];

  // ---- hips and belt rig ---------------------------------------------------
  add(hips, lathe([[0.005, 0.090], [0.160, 0.082], [0.184, 0.020], [0.180, -0.060],
                   [0.152, -0.125], [0.005, -0.140]], 16), OLIVE, { s: FLAT });
  const belt = add(hips, lathe([[0.005, 0.082], [0.188, 0.076], [0.190, 0.026], [0.170, 0.014], [0.005, 0.010]], 18), LEATH, { s: [1.01, 1, 0.78] });
  add(hips, slab(0.066, 0.052, 0.026, 0.008), BRASS, { p: [0, 0.048, 0.140] });
  add(hips, slab(0.108, 0.120, 0.072, 0.014), POUCH, { p: [0.150, -0.020, 0.040], r: [0, -0.45, 0] });
  add(hips, slab(0.112, 0.026, 0.078, 0.008), LEATH, { p: [0.150, 0.038, 0.038], r: [0, -0.45, 0] });
  add(hips, slab(0.118, 0.108, 0.072, 0.014), POUCH, { p: [-0.152, -0.014, -0.104], r: [0, 0.40, 0] });
  const radio = new THREE.Object3D();
  radio.position.set(-0.172, -0.020, 0.028);
  radio.rotation.y = 0.42;
  hips.add(radio);
  add(radio, slab(0.100, 0.145, 0.070, 0.012), POUCH, { p: [0, 0, -0.035] });
  add(radio, slab(0.054, 0.118, 0.044, 0.010), RIB, { p: [0.005, 0.056, 0.008] });
  add(radio, new THREE.CylinderGeometry(0.008, 0.008, 0.140, 6), RIB, { p: [0.005, 0.174, 0.020] });
  add(radio, slab(0.104, 0.022, 0.078, 0.008), LEATH, { p: [0, 0.064, -0.039] });

  // ---- torso ---------------------------------------------------------------
  add(spine, lathe([[0.005, 0.160], [0.176, 0.155], [0.186, 0.080], [0.184, 0.000],
                    [0.176, -0.055], [0.005, -0.062]], 18), RIB, { s: FLAT });
  // plate vest: a swept slab with its own pouches, not a painted-on rectangle
  const vest = new THREE.Object3D();
  chest.add(vest);
  add(vest, lathe([[0.005, 0.215], [0.120, 0.208], [0.172, 0.170], [0.184, 0.080],
                   [0.182, -0.060], [0.166, -0.175], [0.005, -0.185]], 18), VEST, { s: [1, 1, 0.78] });
  add(vest, slab(0.300, 0.058, 0.046, 0.014), POUCH, { p: [0, -0.140, 0.108] });
  add(vest, slab(0.066, 0.050, 0.030, 0.008), STEEL, { p: [0, -0.140, 0.150] });
  add(vest, slab(0.132, 0.104, 0.048, 0.014), POUCH, { p: [-0.082, -0.040, 0.100] });
  add(vest, slab(0.132, 0.104, 0.048, 0.014), POUCH, { p: [0.082, -0.040, 0.100] });
  add(vest, slab(0.132, 0.026, 0.054, 0.008), VEST, { p: [-0.082, 0.018, 0.100] });
  add(vest, slab(0.132, 0.026, 0.054, 0.008), VEST, { p: [0.082, 0.018, 0.100] });
  add(vest, slab(0.062, 0.155, 0.044, 0.012), POUCH, { p: [0.136, 0.070, 0.096] });
  add(vest, slab(0.196, 0.050, 0.042, 0.012), POUCH, { p: [0, 0.104, 0.100] });
  add(vest, slab(0.054, 0.235, 0.042, 0.012), POUCH, { p: [-0.110, 0.092, 0.094], r: [0, 0, 0.10] });
  add(vest, slab(0.054, 0.235, 0.042, 0.012), POUCH, { p: [0.110, 0.092, 0.094], r: [0, 0, -0.10] });

  // leather bomber: a lathe with a wedge of the front cut away, plus two panels
  const jacketBody = add(chest, new THREE.LatheGeometry(
    [new THREE.Vector2(0.196, -0.230), new THREE.Vector2(0.216, -0.170), new THREE.Vector2(0.222, -0.040),
     new THREE.Vector2(0.224, 0.090), new THREE.Vector2(0.208, 0.190), new THREE.Vector2(0.150, 0.238)],
    22, 0.62, Math.PI * 2 - 1.24), LEATH, { p: [0, 0.010, 0], s: [1, 1, 0.78] });
  jacketBody.material = LEATH.clone();
  jacketBody.material.side = THREE.DoubleSide;
  jacketBody.material.name = 'fabric';
  const panelGeo = slab(0.170, 0.480, 0.080, 0.020);
  const panelL = add(chest, panelGeo, LEATH, { p: [-0.152, 0.010, 0.108], r: [0, 0.36, 0] });
  const panelR = add(chest, panelGeo, LEATH, { p: [0.152, 0.010, 0.108], r: [0, -0.36, 0] });
  add(chest, slab(0.036, 0.480, 0.040, 0.010), RIB, { p: [-0.078, 0.010, 0.150], r: [0, 0.36, 0] });
  add(chest, slab(0.036, 0.480, 0.040, 0.010), RIB, { p: [0.078, 0.010, 0.150], r: [0, -0.36, 0] });
  // knit hem
  add(spine, lathe([[0.005, 0.010], [0.212, 0.004], [0.216, -0.042], [0.198, -0.070], [0.005, -0.078]], 20), RIB, { s: [1, 1, 0.79] });
  // collar, an open lathe you can see the inside of
  const collar = add(chest, new THREE.LatheGeometry(
    [new THREE.Vector2(0.126, 0), new THREE.Vector2(0.142, 0.070), new THREE.Vector2(0.158, 0.132)], 18), LEATH, { p: [0, 0.272, 0.004], s: [1, 1, 0.86] });
  collar.material = jacketBody.material;

  // ---- scarf: a squat lathe with a hanging tail ----------------------------
  const scarf = new THREE.Object3D();
  neck.add(scarf);
  add(scarf, lathe([[0.005, 0.070], [0.112, 0.058], [0.134, 0.000], [0.124, -0.058], [0.005, -0.070]], 16), SCARF, { s: [1, 1, 0.94] });
  add(scarf, sweep([[-0.088, 0.016], [0.088, 0.016], [0.066, -0.160], [-0.056, -0.176]], 0.060), SCARF, { p: [0, -0.034, 0.066], r: [0.22, 0, 0] });

  // ---- neck, head ----------------------------------------------------------
  add(neck, lathe([[0.005, -0.070], [0.070, -0.062], [0.062, 0.030], [0.005, 0.040]], 12), SKIN);
  add(head, lathe([[0.005, -0.062], [0.062, -0.070], [0.086, -0.030], [0.094, 0.030],
                   [0.100, 0.086], [0.086, 0.142], [0.048, 0.170], [0.005, 0.174]], 16), SKIN, { s: [0.94, 1, 1.02] });
  add(head, sweep([[-0.038, -0.078], [0.038, -0.078], [0.044, 0.006], [-0.044, 0.006]], 0.05), SKIN, { p: [0, 0.004, 0.062] });
  add(head, sweep([[-0.016, -0.014], [0.016, -0.014], [0.013, 0.016], [-0.013, 0.016]], 0.034), SKIN, { p: [0, 0.056, 0.090] });
  add(head, sweep([[-0.064, -0.009], [0.064, -0.009], [0.064, 0.009], [-0.064, 0.009]], 0.020), SKIN, { p: [0, 0.076, 0.076] });
  add(head, sweep([[-0.011, -0.026], [0.011, -0.026], [0.011, 0.026], [-0.011, 0.026]], 0.018), SKIN, { p: [-0.090, 0.050, -0.014] });
  add(head, sweep([[-0.011, -0.026], [0.011, -0.026], [0.011, 0.026], [-0.011, 0.026]], 0.018), SKIN, { p: [0.090, 0.050, -0.014] });
  // cropped grey hair, swept as a low cap
  add(head, lathe([[0.005, 0.086], [0.090, 0.080], [0.106, 0.114], [0.090, 0.152],
                   [0.046, 0.176], [0.005, 0.180]], 16), GREY, { s: [0.96, 1, 1.02] });
  add(head, sweep([[-0.092, -0.030], [0.092, -0.030], [0.092, 0.052], [-0.092, 0.052]], 0.036), GREY, { p: [0, 0.080, -0.114] });
  // beard: the outline of a full beard, swept through the jaw
  const beard = new THREE.Object3D();
  head.add(beard);
  add(beard, lathe([[0.005, -0.092], [0.062, -0.098], [0.092, -0.036], [0.094, 0.006],
                    [0.086, 0.028], [0.005, 0.032]], 16), GREY, { p: [0, 0.004, 0.008], s: [0.96, 1, 0.98] });
  add(beard, sweep([[-0.058, 0.028], [0.058, 0.028], [0.048, -0.036], [0.026, -0.100], [-0.030, -0.104], [-0.052, -0.034]], 0.072), GREY, { p: [0, -0.016, 0.050] });
  add(beard, sweep([[-0.072, -0.011], [0.072, -0.011], [0.066, 0.011], [-0.066, 0.011]], 0.038), GREY, { p: [0, 0.034, 0.074] });

  // ---- arms ----------------------------------------------------------------
  const arm = (shoulder, elbow, side) => {
    add(shoulder, lathe([[0.005, 0.098], [0.062, 0.090], [0.094, 0.032], [0.092, -0.060],
                         [0.084, -0.160], [0.076, -0.262], [0.005, -0.278]], 14), LEATH);
    add(shoulder, slab(0.072, 0.072, 0.026, 0.012), LEATH, { p: [side * 0.062, -0.055, 0.048] });
    add(elbow, lathe([[0.005, 0.045], [0.074, 0.030], [0.070, -0.060], [0.062, -0.140],
                      [0.068, -0.170], [0.005, -0.182]], 14), LEATH);
    add(elbow, lathe([[0.005, -0.150], [0.068, -0.158], [0.064, -0.202], [0.005, -0.210]], 14), RIB);
    add(elbow, lathe([[0.005, -0.196], [0.046, -0.206], [0.044, -0.250], [0.005, -0.258]], 12), SKIN);
    const hand = add(elbow, slab(0.078, 0.140, 0.052, 0.024), SKIN, { p: [side * 0.006, -0.322, -0.026], r: [0, 0, side * 0.05] });
    add(elbow, slab(0.032, 0.068, 0.038, 0.014), SKIN, { p: [-side * 0.040, -0.312, -0.019], r: [0, 0, side * 0.32] });
    return hand;
  };
  arm(rightShoulder, rightElbow, -1);
  arm(leftShoulder, leftElbow, 1);

  // ---- legs: boot from its side outline ------------------------------------
  const bootUpper = [
    [-0.120, 0.030], [0.156, 0.030], [0.170, 0.048], [0.166, 0.078], [0.140, 0.100],
    [0.086, 0.120], [0.046, 0.142], [0.028, 0.186], [0.022, 0.284], [-0.062, 0.292],
    [-0.080, 0.230], [-0.096, 0.140], [-0.120, 0.078],
  ];
  const bootSole = [
    [-0.126, -0.002], [0.162, -0.002], [0.176, 0.018], [0.174, 0.050], [0.150, 0.058],
    [0.020, 0.048], [-0.080, 0.052], [-0.126, 0.046],
  ];
  const leg = (hip, knee, ankle, side, pad) => {
    add(hip, lathe([[0.005, 0.070], [0.098, 0.058], [0.114, -0.020], [0.116, -0.130],
                    [0.106, -0.280], [0.096, -0.420], [0.086, -0.468], [0.005, -0.480]], 14), OLIVE);
    add(hip, slab(0.118, 0.135, 0.056, 0.016), SCARF, { p: [side * 0.090, -0.230, 0.040], r: [0, side * 0.25, 0] });
    add(hip, slab(0.118, 0.026, 0.060, 0.008), POUCH, { p: [side * 0.090, -0.172, 0.038], r: [0, side * 0.25, 0] });
    add(hip, lathe([[0.005, -0.310], [0.108, -0.316], [0.108, -0.352], [0.005, -0.358]], 14), POUCH);
    add(knee, lathe([[0.005, 0.060], [0.096, 0.048], [0.098, -0.040], [0.088, -0.170],
                     [0.082, -0.250], [0.100, -0.300], [0.005, -0.320]], 14), OLIVE);
    if (pad) {
      add(knee, sweep([[-0.066, -0.098], [0.066, -0.098], [0.072, 0.038], [0.038, 0.086], [-0.038, 0.086], [-0.072, 0.038]], 0.062), POUCH, { p: [0, -0.020, 0.052] });
    }
    add(knee, slab(0.138, 0.040, 0.150, 0.014), POUCH, { p: [0, -0.135, -0.056] });
    add(knee, lathe([[0.005, -0.270], [0.104, -0.280], [0.108, -0.340], [0.005, -0.352]], 14), OLIVE);

    const boot = new THREE.Object3D();
    boot.position.set(0, -0.090, 0.030);
    boot.rotation.y = -Math.PI / 2;
    ankle.add(boot);
    const W = 0.114;
    add(boot, new THREE.ExtrudeGeometry(outline(bootSole), { depth: W + 0.012, bevelEnabled: false }), BOOT, { p: [0, 0, -(W + 0.012) / 2] });
    add(boot, new THREE.ExtrudeGeometry(outline(bootUpper), { depth: W, bevelEnabled: false }), BOOT, { p: [0, 0, -W / 2] });
    add(boot, sweep([[-0.058, 0.276], [0.024, 0.268], [0.020, 0.300], [-0.062, 0.306]], W + 0.008), BOOT, { p: [0, 0, -(W + 0.008) / 2] });
    add(boot, sweep([[0.052, 0.116], [0.150, 0.098], [0.164, 0.058], [0.052, 0.062]], W + 0.006), BOOT, { p: [0, 0, -(W + 0.006) / 2] });
    for (let i = 0; i < 5; i++) {
      add(boot, sweep([[0, -0.006], [0.062, -0.006], [0.062, 0.006], [0, 0.006]], 0.012),
        LACE, { p: [0.016 - i * 0.006, 0.146 + i * 0.028, -0.006], r: [0, 0, -0.26] });
    }
    return boot;
  };
  const rightBoot = leg(rightHip, rightKnee, rightAnkle, -1, true);
  const leftBoot = leg(leftHip, leftKnee, leftAnkle, 1, false);

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
  g.userData.parts = { vest, scarf, beard, radio, belt, neck, rightBoot, leftBoot, jacketPanelLeft: panelL, jacketPanelRight: panelR };
  return g;
}
