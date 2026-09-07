// paper_lantern_large - arm A: primitives (cut sphere skin + torus rib hoops)
export default function (THREE) {
  const g = new THREE.Group();
  const LIGHTS = [];

  const RX = 0.29, RY = 0.27, CY = 0.42, TH = 0.30;

  const skin = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.95, metalness: 0.0,
    emissive: 0xffb45a, emissiveIntensity: 1.5, side: THREE.DoubleSide,
  });
  skin.name = 'fabric';
  const wood = new THREE.MeshStandardMaterial({ color: 0x6d4a2f, roughness: 0.75, metalness: 0.0 });
  wood.name = 'timber';
  const cordM = new THREE.MeshStandardMaterial({ color: 0xa9784f, roughness: 1.0 });
  cordM.name = 'fabric';
  const bulbM = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.4, emissive: 0xffb45a, emissiveIntensity: 3.0,
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8f9aa3, roughness: 0.5, metalness: 0.8 });
  steel.name = 'metal';

  const add = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(m);
    return m;
  };

  // --- paper skin: a sphere with both poles cut away, so it is open-ended -----
  const shell = new THREE.SphereGeometry(RX, 24, 14, 0, Math.PI * 2, TH, Math.PI - TH * 2);
  shell.scale(1, RY / RX, 1);
  add(shell, skin, 0, CY, 0);

  // --- rib hoops, spaced by polar angle so they follow the sphere ------------
  for (let i = 1; i < 13; i++) {
    const th = TH + (Math.PI - TH * 2) * (i / 13);
    const r = RX * Math.sin(th) + 0.004;
    const y = CY + RY * Math.cos(th);
    add(new THREE.TorusGeometry(r, 0.0075, 4, 20), skin, 0, y, 0, Math.PI / 2, 0, 0);
  }

  // --- the lamp inside ------------------------------------------------------
  add(new THREE.SphereGeometry(0.052, 10, 8), bulbM, 0, CY + 0.02, 0);
  LIGHTS.push({ x: 0, y: CY, z: 0, warm: true });

  // --- top wooden collar: outer wall, inner wall, and a cross bar ------------
  add(new THREE.CylinderGeometry(0.084, 0.084, 0.048, 20, 1, true), wood, 0, 0.686, 0);
  add(new THREE.CylinderGeometry(0.068, 0.068, 0.048, 20, 1, true), wood, 0, 0.686, 0);
  add(new THREE.TorusGeometry(0.076, 0.009, 4, 20), wood, 0, 0.710, 0, Math.PI / 2, 0, 0);
  add(new THREE.CylinderGeometry(0.005, 0.005, 0.152, 6), steel, 0, 0.708, 0, 0, 0, Math.PI / 2);

  // --- suspension: eye ring and cord ----------------------------------------
  add(new THREE.TorusGeometry(0.014, 0.0035, 4, 12), steel, 0, 0.723, 0);
  add(new THREE.CylinderGeometry(0.0075, 0.0075, 0.058, 6), cordM, 0, 0.752, 0);

  // --- bottom wooden collar, bead and tassel --------------------------------
  add(new THREE.CylinderGeometry(0.078, 0.056, 0.046, 20), wood, 0, 0.154, 0);
  add(new THREE.SphereGeometry(0.019, 10, 8), wood, 0, 0.113, 0);
  add(new THREE.CylinderGeometry(0.013, 0.028, 0.042, 12), cordM, 0, 0.075, 0);
  const strand = new THREE.CylinderGeometry(0.0045, 0.0028, 0.058, 4);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    add(strand, cordM, Math.cos(a) * 0.017, 0.029, Math.sin(a) * 0.017, 0, 0, 0);
  }
  add(new THREE.CylinderGeometry(0.010, 0.006, 0.058, 6), cordM, 0, 0.029, 0);

  // --- contract: base at y=0, centred on x and z ----------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  const dx = c.x, dy = box.min.y, dz = c.z;
  g.children.forEach((o) => { o.position.x -= dx; o.position.y -= dy; o.position.z -= dz; });
  g.userData.lights = LIGHTS.map((L) => ({ x: L.x - dx, y: L.y - dy, z: L.z - dz, warm: L.warm }));
  return g;
}
