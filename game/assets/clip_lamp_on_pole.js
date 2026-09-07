// clip_lamp_on_pole - arm C: a different reading. The market version of this
// lamp: a bench clamp biting a mast, a bell shade built as stacked flares
// rather than one cone, a wire guard over the bare bulb, a cross foot, and the
// flex coiled round the pole because nobody ever cut it to length.
export default function (THREE) {
  const g = new THREE.Group();
  const LIGHTS = [];

  const TILT = -0.28;
  const SX = 0, SY = 1.838, SZ = 0.205;
  const along = (d) => new THREE.Vector3(SX, SY + Math.cos(TILT) * d, SZ + Math.sin(TILT) * d);

  const steel = new THREE.MeshStandardMaterial({ color: 0x5a6169, roughness: 0.62, metalness: 0.8 });
  steel.name = 'metal';
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.8, metalness: 0.45 });
  dark.name = 'metal';
  const shadeM = new THREE.MeshStandardMaterial({
    color: 0x8f9aa3, roughness: 0.68, metalness: 0.7, side: THREE.DoubleSide,
  });
  shadeM.name = 'metal';
  const reflect = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.55, side: THREE.DoubleSide,
    emissive: 0xffb45a, emissiveIntensity: 0.6,
  });
  const bulbM = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.25, emissive: 0xffb45a, emissiveIntensity: 3.0,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8cf7a, roughness: 0.45, metalness: 0.85 });
  brass.name = 'metal';
  const flexM = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.95 });

  const mesh = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(m); return m;
  };

  // --- cross foot -----------------------------------------------------------
  mesh(new THREE.BoxGeometry(0.40, 0.020, 0.055), dark, 0, 0.012, 0);
  mesh(new THREE.BoxGeometry(0.055, 0.020, 0.40), dark, 0, 0.012, 0);
  const pad = new THREE.CylinderGeometry(0.026, 0.030, 0.012, 8);
  for (const [px, pz] of [[-0.185, 0], [0.185, 0], [0, -0.185], [0, 0.185]]) mesh(pad, flexM, px, 0.006, pz);
  mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.055, 12), steel, 0, 0.049, 0);

  // --- mast, in two sections with a swaged joint ---------------------------
  mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.98, 12), steel, 0, 0.560, 0);
  mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.048, 12), dark, 0, 1.055, 0);
  mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.68, 12), steel, 0, 1.418, 0);
  mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.056, 6), brass, 0.028, 1.055, 0, 0, 0, Math.PI / 2);

  // --- the flex, coiled three times round the mast then up to the lamp -----
  const coil = [];
  // slack coiled flat on the ground, ending at the plug
  for (let i = 0; i <= 22; i++) {
    const t = i / 22, a = -0.4 + t * Math.PI * 2.1, r = 0.052 + t * 0.038;
    coil.push(new THREE.Vector3(-0.118 + Math.cos(a) * r, 0.010 + t * 0.006, 0.128 + Math.sin(a) * r * 0.85));
  }
  coil.push(new THREE.Vector3(-0.055, 0.014, 0.086));
  coil.push(new THREE.Vector3(0.020, 0.030, 0.052));
  coil.push(new THREE.Vector3(0.030, 0.090, 0.055));
  for (let i = 0; i <= 36; i++) {
    const t = i / 36, a = t * Math.PI * 6;
    coil.push(new THREE.Vector3(Math.cos(a) * 0.032, 0.30 + t * 0.72, Math.sin(a) * 0.032));
  }
  coil.push(new THREE.Vector3(0.026, 1.30, 0.012));
  coil.push(new THREE.Vector3(0.024, 1.62, 0.014));
  coil.push(new THREE.Vector3(0.010, 1.735, 0.070));
  coil.push(new THREE.Vector3(0, 1.850, 0.140));
  const cTop = along(0.098);
  coil.push(new THREE.Vector3(cTop.x, cTop.y + 0.010, cTop.z - 0.010));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 110, 0.0065, 4, false), flexM));

  // the plug on the loose end
  mesh(new THREE.BoxGeometry(0.046, 0.030, 0.062), flexM, -0.156, 0.017, 0.176, 0, 0.5, 0);
  for (const ps of [-1, 1])
    mesh(new THREE.BoxGeometry(0.009, 0.009, 0.030), brass, -0.156 + ps * 0.013, 0.026, 0.212, 0, 0.5, 0);

  // --- the clamp biting the mast -------------------------------------------
  mesh(new THREE.BoxGeometry(0.070, 0.028, 0.090), dark, 0, 1.700, 0.048);
  mesh(new THREE.BoxGeometry(0.070, 0.028, 0.090), dark, 0, 1.620, 0.048);
  mesh(new THREE.BoxGeometry(0.052, 0.088, 0.024), dark, 0, 1.660, 0.086);
  mesh(new THREE.TorusGeometry(0.032, 0.007, 4, 10, Math.PI), steel, 0, 1.660, -0.010, 0, 0, Math.PI / 2);
  mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.09, 6), brass, 0, 1.660, 0.048, Math.PI / 2, 0, 0);
  // clamp screw and its T-bar handle, hanging below the lower jaw
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.115, 6), steel, 0, 1.548, 0.070);
  mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.016, 8), steel, 0, 1.601, 0.070);
  mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.090, 6), steel, 0, 1.492, 0.070, 0, 0, Math.PI / 2);
  for (const hs of [-1, 1])
    mesh(new THREE.SphereGeometry(0.0085, 6, 5), steel, hs * 0.045, 1.492, 0.070);

  // --- swan neck out to the shade ------------------------------------------
  const neck = [
    new THREE.Vector3(0, 1.700, 0.070),
    new THREE.Vector3(0, 1.772, 0.115),
    new THREE.Vector3(0, 1.828, 0.162),
    new THREE.Vector3(along(0.062).x, along(0.062).y, along(0.062).z),
  ];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neck), 14, 0.014, 6, false), steel));

  // --- bell shade, built as three stacked flares ---------------------------
  const flare = (rt, rb, h, d, mat) => {
    const p = along(d);
    mesh(new THREE.CylinderGeometry(rt, rb, h, 20, 1, true), mat, p.x, p.y, p.z, TILT, 0, 0);
  };
  flare(0.048, 0.098, 0.052, 0.058, shadeM);
  flare(0.098, 0.152, 0.046, 0.009, shadeM);
  flare(0.152, 0.178, 0.028, -0.028, shadeM);
  flare(0.046, 0.094, 0.048, 0.056, reflect);
  flare(0.094, 0.146, 0.044, 0.010, reflect);
  const rimP = along(-0.043);
  mesh(new THREE.TorusGeometry(0.178, 0.008, 4, 20), shadeM, rimP.x, rimP.y, rimP.z, Math.PI / 2 + TILT, 0, 0);
  const hubP = along(0.092);
  mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.026, 12), shadeM, hubP.x, hubP.y, hubP.z, TILT, 0, 0);

  // --- bare bulb and its wire guard ----------------------------------------
  const sockP = along(0.042);
  mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.044, 10), brass, sockP.x, sockP.y, sockP.z, TILT, 0, 0);
  const bP = along(-0.020);
  mesh(new THREE.SphereGeometry(0.045, 12, 9), bulbM, bP.x, bP.y, bP.z);
  LIGHTS.push({ x: bP.x, y: bP.y, z: bP.z, warm: true });

  // Euler order XYZ applies Rz first, then Ry, then Rx: the half torus becomes a
  // meridian, gets spun round the bulb, and the whole cage finally tilts with the shade.
  const guardC = along(-0.014);
  const arc = new THREE.TorusGeometry(0.062, 0.0038, 3, 9, Math.PI);
  for (let i = 0; i < 5; i++)
    mesh(arc, steel, guardC.x, guardC.y, guardC.z, TILT, (i / 5) * Math.PI, -Math.PI / 2);
  const hoop = new THREE.TorusGeometry(0.062, 0.0038, 3, 14);
  const hp = along(-0.058);
  mesh(hoop, steel, hp.x, hp.y, hp.z, Math.PI / 2 + TILT, 0, 0);
  const hp2 = along(-0.020);
  mesh(new THREE.TorusGeometry(0.062, 0.0038, 3, 14), steel, hp2.x, hp2.y, hp2.z, Math.PI / 2 + TILT, 0, 0);

  // --- contract: base at y=0, centred on x and z ----------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const walk = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); walk(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    walk(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  const dx = c.x, dy = box.min.y, dz = c.z;
  g.children.forEach((o) => { o.position.x -= dx; o.position.y -= dy; o.position.z -= dz; });
  g.userData.lights = LIGHTS.map((L) => ({ x: L.x - dx, y: L.y - dy, z: L.z - dz, warm: L.warm }));
  return g;
}
