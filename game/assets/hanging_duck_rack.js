// hanging_duck_rack - arm C: a different reading. Not a bare display gantry but
// a working char-siu counter: a splash panel behind, a drip pan on the floor,
// two rails packed two deep,
// sausage strings and belly slabs among the ducks, and a row of three warm
// bulbs on the front rail. The span under the goods is left clear to slide.
export default function (THREE) {
  const g = new THREE.Group();
  const LIGHTS = [];

  const HW = 0.675, RAIL_Y = 1.500, POST_H = 1.600;

  const steel = new THREE.MeshStandardMaterial({ color: 0x8f9aa3, roughness: 0.42, metalness: 0.9 });
  steel.name = 'metal';
  const dull = new THREE.MeshStandardMaterial({ color: 0x5a6169, roughness: 0.6, metalness: 0.8 });
  dull.name = 'metal';
  const roast = new THREE.MeshStandardMaterial({ color: 0x6d4a2f, roughness: 0.32, metalness: 0.05 });
  const glaze = new THREE.MeshStandardMaterial({ color: 0xc4442f, roughness: 0.28, metalness: 0.05 });
  const tin = new THREE.MeshStandardMaterial({
    color: 0x5a6169, roughness: 0.7, metalness: 0.7, side: THREE.DoubleSide,
  });
  tin.name = 'metal';
  const bulbM = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.25, emissive: 0xffb45a, emissiveIntensity: 3.0,
  });
  const flexM = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.95 });

  const mesh = (geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    g.add(m); return m;
  };

  // --- gantry, splash panel, feet ------------------------------------------
  for (const sgn of [-1, 1]) {
    const x = sgn * HW;
    mesh(new THREE.BoxGeometry(0.050, POST_H, 0.055), steel, x, POST_H / 2, -0.030);
    mesh(new THREE.BoxGeometry(0.085, 0.018, 0.380), dull, x, 0.009, -0.020);
    mesh(new THREE.CylinderGeometry(0.020, 0.026, 0.014, 6), dull, x, 0.021, 0.140);
    mesh(new THREE.CylinderGeometry(0.020, 0.026, 0.014, 6), dull, x, 0.021, -0.180);
    mesh(new THREE.BoxGeometry(0.012, 0.110, 0.110), steel, x - sgn * 0.031, RAIL_Y - 0.070, -0.010);
  }
  // splash panel: mounts flush against the stall behind it
  mesh(new THREE.BoxGeometry(HW * 2 - 0.05, 0.560, 0.014), steel, 0, 1.215, -0.150);
  mesh(new THREE.BoxGeometry(HW * 2 - 0.05, 0.030, 0.048), dull, 0, 0.945, -0.132);
  mesh(new THREE.CylinderGeometry(0.024, 0.024, HW * 2 + 0.05, 10), steel, 0, RAIL_Y, 0.075, 0, 0, Math.PI / 2);
  mesh(new THREE.CylinderGeometry(0.020, 0.020, HW * 2 + 0.05, 8), steel, 0, RAIL_Y - 0.012, -0.070, 0, 0, Math.PI / 2);
  mesh(new THREE.BoxGeometry(HW * 2 - 0.05, 0.030, 0.030), steel, 0, POST_H - 0.030, -0.030);

  // --- drip tray -----------------------------------------------------------
  // The full reference has a gastronorm pan on the floor catching the glaze. I
  // left it out on a truncated crop; it is most of what says "roast meats" at
  // ground level. Kept to 95 mm so it reads as clutter to slide over, not a wall.
  const TW = 1.20, TD = 0.45, TH = 0.085, TZ = -0.010;
  mesh(new THREE.BoxGeometry(TW, 0.012, TD), steel, 0, 0.010, TZ);
  mesh(new THREE.BoxGeometry(TW, TH, 0.014), steel, 0, 0.050, TZ + TD / 2);
  mesh(new THREE.BoxGeometry(TW, TH, 0.014), steel, 0, 0.050, TZ - TD / 2);
  mesh(new THREE.BoxGeometry(0.014, TH, TD), steel, -TW / 2, 0.050, TZ);
  mesh(new THREE.BoxGeometry(0.014, TH, TD), steel, TW / 2, 0.050, TZ);
  mesh(new THREE.BoxGeometry(TW + 0.030, 0.011, 0.030), steel, 0, 0.090, TZ + TD / 2 + 0.006);
  mesh(new THREE.BoxGeometry(TW + 0.030, 0.011, 0.030), steel, 0, 0.090, TZ - TD / 2 - 0.006);
  mesh(new THREE.BoxGeometry(0.030, 0.011, TD + 0.030), steel, -TW / 2 - 0.006, 0.090, TZ);
  mesh(new THREE.BoxGeometry(0.030, 0.011, TD + 0.030), steel, TW / 2 + 0.006, 0.090, TZ);
  const puddle = new THREE.CylinderGeometry(1, 1, 0.004, 9);
  for (const [px, pz, pr] of [[-0.18, 0.05, 0.085], [0.10, -0.06, 0.062], [0.34, 0.07, 0.048]]) {
    const m = mesh(puddle, roast, px, 0.018, TZ + pz);
    m.scale.set(pr, 1, pr * 0.8);
  }

  // --- hooks ---------------------------------------------------------------
  const topArc = new THREE.TorusGeometry(0.030, 0.0038, 3, 5, Math.PI);
  const botArc = new THREE.TorusGeometry(0.021, 0.0038, 3, 5, Math.PI);
  const shank = new THREE.CylinderGeometry(0.0038, 0.0038, 0.048, 4);
  const hook = (x, z) => {
    mesh(topArc, steel, x, RAIL_Y, z);
    mesh(shank, steel, x + 0.030, RAIL_Y - 0.026, z);
    mesh(botArc, steel, x + 0.030, RAIL_Y - 0.070, z, 0, 0, Math.PI);
    return RAIL_Y - 0.088;
  };

  // --- goods ---------------------------------------------------------------
  const duck = (x, z, top, mat) => {
    mesh(new THREE.CylinderGeometry(0.019, 0.025, 0.092, 6), mat, x, top - 0.044, z + 0.012, 0.22, 0, 0);
    mesh(new THREE.SphereGeometry(0.028, 7, 5), mat, x, top - 0.096, z + 0.032);
    mesh(new THREE.ConeGeometry(0.014, 0.050, 6), mat, x, top - 0.108, z + 0.064, 1.32, 0, 0);
    mesh(new THREE.SphereGeometry(0.086, 8, 6), mat, x, top - 0.228, z, 0, 0, 0, 0.84, 1.42, 0.80);
    mesh(new THREE.SphereGeometry(0.058, 7, 5), mat, x, top - 0.192, z + 0.036, 0, 0, 0, 0.85, 1.12, 0.8);
    mesh(new THREE.ConeGeometry(0.044, 0.074, 7), mat, x, top - 0.350, z - 0.010, Math.PI, 0, 0);
  };
  const belly = (x, z, top, mat) => {
    mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.066, 4), steel, x, top - 0.028, z);
    mesh(new THREE.BoxGeometry(0.106, 0.215, 0.050), mat, x, top - 0.172, z);
    mesh(new THREE.BoxGeometry(0.102, 0.050, 0.046), mat, x, top - 0.297, z + 0.009, 0.20, 0, 0);
    mesh(new THREE.BoxGeometry(0.106, 0.026, 0.016), glaze, x, top - 0.070, z);
  };
  const sausages = (x, z, top, mat) => {
    const link = new THREE.SphereGeometry(0.027, 6, 4);
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      mesh(link, mat, x + s * 0.020, top - 0.045 - i * 0.052, z, 0, 0, s * 0.35, 0.85, 1.85, 0.85);
    }
    mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.040, 4), steel, x, top - 0.020, z);
  };

  const FRONT = [-0.53, -0.34, -0.15, 0.04, 0.23, 0.42];
  const BACK = [-0.44, -0.25, -0.06, 0.13, 0.32];
  for (let i = 0; i < FRONT.length; i++) {
    const top = hook(FRONT[i], 0.075);
    if (i === 1) belly(FRONT[i] + 0.030, 0.075, top, roast);
    else if (i === 4) sausages(FRONT[i] + 0.030, 0.075, top, glaze);
    else duck(FRONT[i] + 0.030, 0.075, top, i % 2 ? glaze : roast);
  }
  for (let i = 0; i < BACK.length; i++) {
    const top = hook(BACK[i], -0.070);
    if (i === 2) sausages(BACK[i] + 0.030, -0.070, top, roast);
    else if (i % 2 === 0) belly(BACK[i] + 0.030, -0.070, top, i === 0 ? glaze : roast);
    else duck(BACK[i] + 0.030, -0.070, top, roast);
  }
  hook(0.60, 0.075);
  hook(-0.62, -0.070);

  // --- three warm bulbs in tin shades on the front rail --------------------
  for (const bx of [-0.44, 0, 0.44]) {
    mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.062, 6), dull, bx, RAIL_Y + 0.038, 0.160);
    mesh(new THREE.ConeGeometry(0.070, 0.050, 10, 1, true), tin, bx, RAIL_Y + 0.006, 0.160);
    mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.030, 8), dull, bx, RAIL_Y + 0.008, 0.160);
    mesh(new THREE.SphereGeometry(0.032, 8, 6), bulbM, bx, RAIL_Y - 0.028, 0.160);
    LIGHTS.push({ x: bx, y: RAIL_Y - 0.044, z: 0.160, warm: true });
  }
  const run = [
    new THREE.Vector3(-0.44, RAIL_Y + 0.066, 0.160),
    new THREE.Vector3(0, RAIL_Y + 0.030, 0.170),
    new THREE.Vector3(0.44, RAIL_Y + 0.066, 0.160),
    new THREE.Vector3(HW - 0.02, RAIL_Y + 0.040, 0.070),
    new THREE.Vector3(HW + 0.006, 1.10, 0.010),
    new THREE.Vector3(HW + 0.006, 0.28, 0.010),
  ];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run), 30, 0.006, 4, false), flexM));

  g.userData.mounts = 'back';

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
