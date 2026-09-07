// steam_basket_tower — arm B: swept profiles. Every tier, the pan and the domed lid are
// lathed sections revolved from a drawn profile, which is what a turned bamboo steamer is.
// 0.50 x 0.44 x 0.95.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o || {}));
    m.name = name; return m;
  };
  const STEEL  = mat(0x5a6169, 'metal',  { roughness: 0.55, metalness: 0.65 });
  const STEELD = mat(0x2a2f35, 'metal',  { roughness: 0.6,  metalness: 0.5 });
  const STAIN  = mat(0x8f9aa3, 'metal',  { roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide });
  const BAMB   = mat(0xe8dcc0, 'timber', { roughness: 0.8, side: THREE.DoubleSide });
  const BAMBD  = mat(0xa9784f, 'timber', { roughness: 0.85, side: THREE.DoubleSide });
  const TIMBD  = mat(0x6d4a2f, 'timber', { roughness: 0.9 });
  const BRASS  = mat(0xd8cf7a, 'metal',  { roughness: 0.45, metalness: 0.8 });
  const BULB   = mat(0xffb45a, 'tile',   { emissive: 0xffb45a, emissiveIntensity: 2.0, roughness: 0.5 });

  const box = (w, h, d, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const lathe = (pts, seg, m, x, y, z, rx, ry, rz) => {
    const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), m);
    o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(o); return o;
  };
  const inst = (geo, m, list) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
          p = new THREE.Vector3(), sv = new THREE.Vector3();
    list.forEach((t, i) => {
      p.set(t[0], t[1], t[2]); e.set(t[3] || 0, t[4] || 0, t[5] || 0); q.setFromEuler(e);
      const sc = t[6] === undefined ? 1 : t[6]; sv.set(sc, sc, sc);
      M.compose(p, q, sv); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true; g.add(im); return im;
  };

  // ---- stand and burner, lathed -------------------------------------------
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.4;
    box(0.032, 0.10, 0.032, STEELD, Math.cos(a) * 0.19, 0.05, Math.sin(a) * 0.19);
    box(0.085, 0.02, 0.085, STEELD, Math.cos(a) * 0.19, 0.005, Math.sin(a) * 0.19);
  }
  lathe([[0.175, 0], [0.205, 0], [0.205, 0.022], [0.175, 0.022]], 16, STEELD, 0, 0.09, 0);
  lathe([[0.082, 0], [0.115, 0.006], [0.115, 0.028], [0.082, 0.022]], 14, BRASS, 0, 0.05, 0);
  lathe([[0, 0], [0.092, 0], [0.092, 0.012], [0, 0.012]], 14, BULB, 0, 0.070, 0);
  inst(new THREE.BoxGeometry(0.013, 0.05, 0.013), BULB,
    Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4) * 0.10, 0.095, Math.sin(i * Math.PI / 4) * 0.10]));
  lathe([[0, -0.08], [0.022, -0.08], [0.022, 0.08], [0, 0.08]], 8, STEELD, 0.15, 0.05, 0.10, 0, 0, 1.2);

  // ---- the pan: one revolved section with a rolled rim --------------------
  lathe([[0, 0.045], [0.16, 0.045], [0.20, 0.075], [0.232, 0.15], [0.240, 0.225],
         [0.246, 0.238], [0.238, 0.245], [0.232, 0.236], [0.226, 0.150], [0.194, 0.080],
         [0.155, 0.055], [0, 0.055]], 22, STAIN, 0, 0, 0);
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.010, 4, 10, Math.PI), STAIN);
    h.position.set(sx * 0.275, 0.215, 0); h.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h);
    box(0.045, 0.018, 0.03, STAIN, sx * 0.248, 0.218, 0);
  }
  lathe([[0.185, 0], [0.205, 0], [0.205, 0.012], [0.185, 0.012]], 16, STEEL, 0, 0.208, 0);
  inst(new THREE.BoxGeometry(0.012, 0.10, 0.012), STEEL,
    Array.from({ length: 3 }, (_, i) => [Math.cos(i * 2.094) * 0.196, 0.16, Math.sin(i * 2.094) * 0.196]));

  // ---- nine tiers, each a revolved wall section ---------------------------
  const T0 = 0.232, TH = 0.0645, R = 0.205;
  const tier = [[R - 0.010, 0], [R + 0.006, 0.004], [R + 0.006, 0.016], [R - 0.002, 0.020],
                [R - 0.002, TH - 0.014], [R + 0.004, TH - 0.010], [R + 0.004, TH - 0.002],
                [R - 0.012, TH], [R - 0.012, TH - 0.004], [R - 0.008, TH - 0.010],
                [R - 0.008, 0.014], [R - 0.014, 0.006]];
  const lash = [];
  for (let i = 0; i < 9; i++) {
    const y = T0 + i * TH;
    lathe(tier, 20, i % 2 ? BAMB : BAMBD, 0, y, 0);
    const a = 0.9;
    for (const s of [-1, 1])
      lash.push([Math.cos(a) * (R + 0.010), y + TH / 2, Math.sin(a) * (R + 0.010), 0, -a, s * 0.7, 1]);
  }
  inst(new THREE.BoxGeometry(0.006, 0.056, 0.010), TIMBD, lash);
  inst(new THREE.BoxGeometry(0.024, 0.006, 0.38), BAMBD,
    Array.from({ length: 9 }, (_, i) => [-0.16 + i * 0.04, T0 + 8 * TH + 0.014, 0]));
  for (let i = 0; i < 6; i++)
    lathe([[0, 0.030], [0.020, 0.026], [0.030, 0.008], [0.028, 0]], 8, BAMB,
      Math.cos(i * 1.05) * 0.09, T0 + 8 * TH + 0.018, Math.sin(i * 1.05) * 0.09);

  // ---- domed woven lid, lathed --------------------------------------------
  const LY = T0 + 9 * TH;
  lathe([[R + 0.008, 0], [R + 0.008, 0.026], [R - 0.008, 0.026], [R - 0.008, 0]], 20, BAMBD, 0, LY, 0);
  lathe([[0, 0.070], [0.06, 0.066], [0.13, 0.048], [0.185, 0.020], [0.20, 0.004], [0.20, 0]], 20, BAMB, 0, LY + 0.008, 0);
  inst(new THREE.BoxGeometry(0.30, 0.005, 0.020), BAMBD,
    Array.from({ length: 12 }, (_, i) => [0, LY + 0.072, 0, 0, i * Math.PI / 6, 0]));
  lathe([[0, 0], [0.05, 0], [0.05, 0.010], [0, 0.010]], 12, BAMBD, 0, LY + 0.074, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 5, 12, Math.PI), BAMBD);
  handle.position.set(0, LY + 0.080, 0); handle.rotation.y = 0.6; g.add(handle);

  // ---- contract -----------------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); put(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });
  return g;
}
