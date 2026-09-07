// lantern_string_run - arm C: a different reading. A market festoon is TWO
// lines: a galvanised support cable and a black power flex clipped under it
// that sags again between every lamp. The lanterns are squat nylon drums with
// flat caps, hung at mixed sizes, two of them in market red.
export default function (THREE) {
  const g = new THREE.Group();
  const LIGHTS = [];

  const HALF = 2.97, YC = 0.400, A = 18.8;
  const cableY = (x) => YC + A * (Math.cosh(x / A) - 1);

  const mkSkin = (col) => {
    const m = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.95, emissive: 0xffb45a, emissiveIntensity: 2.0,
      side: THREE.DoubleSide,
    });
    m.name = 'fabric'; return m;
  };
  const bone = mkSkin(0xe8dcc0), red = mkSkin(0xc4442f);
  const wire = new THREE.MeshStandardMaterial({ color: 0x5a6169, roughness: 0.55, metalness: 0.8 });
  wire.name = 'metal';
  const flexM = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.9 });
  const brack = new THREE.MeshStandardMaterial({ color: 0x8f9aa3, roughness: 0.45, metalness: 0.85 });
  brack.name = 'metal';
  const capM = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.7, metalness: 0.4 });
  capM.name = 'metal';

  const mesh = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(m); return m;
  };

  // --- support cable --------------------------------------------------------
  const sp = [];
  for (let i = 0; i <= 20; i++) { const x = -HALF + 2 * HALF * (i / 20); sp.push(new THREE.Vector3(x, cableY(x), 0)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 34, 0.012, 5, false), wire));

  // --- lantern stations -----------------------------------------------------
  const XS = [-2.55, -1.90, -1.28, -0.64, 0.00, 0.64, 1.28, 1.92, 2.55];
  const DROP = [0.11, 0.15, 0.13, 0.18, 0.12, 0.17, 0.13, 0.16, 0.10];
  const BIG = [0, 1, 0, 1, 0, 1, 0, 1, 0];
  const REDS = [3, 6];

  // --- the power flex: clipped at each lamp, sagging again between them -----
  const fp = [new THREE.Vector3(-HALF + 0.10, cableY(-HALF + 0.10) - 0.02, 0.012)];
  for (let i = 0; i < XS.length; i++) {
    const x = XS[i], y = cableY(x) - 0.028;
    if (i > 0) {
      const xm = (XS[i - 1] + XS[i]) / 2;
      fp.push(new THREE.Vector3(xm, cableY(xm) - 0.085, 0.012));
    }
    fp.push(new THREE.Vector3(x, y, 0.012));
  }
  fp.push(new THREE.Vector3(HALF - 0.10, cableY(HALF - 0.10) - 0.02, 0.012));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 46, 0.006, 4, false), flexM));

  // --- the lanterns ---------------------------------------------------------
  for (let i = 0; i < XS.length; i++) {
    const x = XS[i], big = BIG[i];
    const R = big ? 0.088 : 0.070, HB = big ? 0.098 : 0.078, SH = big ? 0.032 : 0.026;
    const half = HB / 2 + SH;
    const top = cableY(x) - 0.028;
    const cy = top - DROP[i] - half;
    const mat = REDS.indexOf(i) >= 0 ? red : bone;

    // socket and hanging flex
    mesh(new THREE.CylinderGeometry(0.0045, 0.0045, DROP[i], 4), flexM, x, top - DROP[i] / 2, 0.012);
    mesh(new THREE.CylinderGeometry(0.017, 0.020, 0.030, 6), capM, x, cy + half + 0.012, 0.004);

    // drum: straight wall, two shoulders, two caps
    mesh(new THREE.CylinderGeometry(R, R, HB, 12, 1, true), mat, x, cy, 0);
    mesh(new THREE.CylinderGeometry(R * 0.44, R, SH, 12, 1, true), mat, x, cy + HB / 2 + SH / 2, 0);
    mesh(new THREE.CylinderGeometry(R, R * 0.44, SH, 12, 1, true), mat, x, cy - HB / 2 - SH / 2, 0);
    mesh(new THREE.CylinderGeometry(R * 0.44, R * 0.44, 0.008, 8), capM, x, cy + half, 0);
    mesh(new THREE.CylinderGeometry(R * 0.44, R * 0.44, 0.008, 8), capM, x, cy - half, 0);
    // two rib hoops on the wall
    mesh(new THREE.TorusGeometry(R + 0.003, 0.004, 3, 10), mat, x, cy + HB * 0.26, 0, Math.PI / 2, 0, 0);
    mesh(new THREE.TorusGeometry(R + 0.003, 0.004, 3, 10), mat, x, cy - HB * 0.26, 0, Math.PI / 2, 0, 0);

    LIGHTS.push({ x, y: cy, z: 0, warm: true });
  }

  // --- anchors: an eye bolt through a pipe clamp, both ends ------------------
  for (const sgn of [-1, 1]) {
    const x = sgn * (HALF + 0.03);
    mesh(new THREE.BoxGeometry(0.06, 0.24, 0.11), brack, x, 0.545, 0);
    mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.09, 6), brack, x - sgn * 0.045, 0.638, 0, 0, 0, Math.PI / 2);
    mesh(new THREE.TorusGeometry(0.030, 0.008, 4, 12), brack, x - sgn * 0.105, 0.638, 0, 0, sgn * Math.PI / 2, 0);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.20, 6), wire, x - sgn * 0.012, 0.425, 0);
    mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), capM, x - sgn * 0.012, 0.472, 0);
  }

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
