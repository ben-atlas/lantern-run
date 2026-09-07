// neon_sign_box - arm B: swept profiles. The case is one extruded rounded
// rectangle with a hole in it, so the frame has a real inner reveal, and the
// neon is a single closed tube swept round a rounded-rect path.
export default function (THREE) {
  const g = new THREE.Group();
  const LIGHTS = [];

  const CY = 0.62, BW = 0.90, BH = 0.62, BD = 0.16, BZ = 0.05;

  const frame = new THREE.MeshStandardMaterial({ color: 0x5a6169, roughness: 0.6, metalness: 0.75 });
  frame.name = 'metal';
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.75, metalness: 0.5 });
  dark.name = 'metal';
  const grime = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.9 });
  const openM = new THREE.MeshStandardMaterial({ color: 0x5a6169, roughness: 0.6, metalness: 0.75, side: THREE.DoubleSide });
  openM.name = 'metal';
  const face = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.85, emissive: 0x63e0ff, emissiveIntensity: 1.3,
  });
  const tubeM = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.3, emissive: 0x63e0ff, emissiveIntensity: 3.5,
  });

  const mesh = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(m); return m;
  };

  const rr = (w, h, r) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  };

  // --- the case, swept: one profile with a hole. No bevel: bevelSize grows the
  // profile outward and would make the box wider than it was drawn.
  const caseShape = rr(BW, BH, 0.030);
  caseShape.holes.push(new THREE.Path(rr(BW - 0.10, BH - 0.10, 0.024).getPoints(20)));
  const caseGeo = new THREE.ExtrudeGeometry(caseShape, { depth: BD, bevelEnabled: false, curveSegments: 3 });
  mesh(caseGeo, frame, 0, CY, BZ - BD / 2);

  // back pan and blank lit face
  mesh(new THREE.BoxGeometry(BW - 0.02, BH - 0.02, 0.018), dark, 0, CY, BZ - BD / 2 + 0.009);
  const faceGeo = new THREE.ExtrudeGeometry(rr(BW - 0.09, BH - 0.09, 0.022), { depth: 0.014, bevelEnabled: false, curveSegments: 3 });
  mesh(faceGeo, face, 0, CY, BZ + 0.030);
  LIGHTS.push({ x: 0, y: CY, z: BZ + 0.10, warm: false });

  // --- the neon, swept as one closed tube ----------------------------------
  const w = 0.330, h = 0.195, rc = 0.062, TZ = BZ + 0.078;
  const pts = [];
  const corners = [[w - rc, h - rc, 0], [-(w - rc), h - rc, Math.PI / 2], [-(w - rc), -(h - rc), Math.PI], [w - rc, -(h - rc), -Math.PI / 2]];
  for (const [cx, cyy, a0] of corners) {
    for (let k = 0; k <= 3; k++) {
      const a = a0 + (Math.PI / 2) * (k / 3);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * rc, CY + cyy + Math.sin(a) * rc, TZ));
    }
  }
  const path = new THREE.CatmullRomCurve3(pts, true);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 52, 0.013, 6, true), tubeM));
  const clip = new THREE.BoxGeometry(0.018, 0.018, 0.040);
  for (const [cx, cyy] of [[-w, CY + 0.10], [-w, CY - 0.10], [w, CY + 0.10], [w, CY - 0.10], [-0.16, CY + h], [0.16, CY + h], [-0.16, CY - h], [0.16, CY - h]])
    mesh(clip, grime, cx, cyy, TZ - 0.021);

  // --- bracket: an extruded plate and two extruded arms --------------------
  const plate = new THREE.ExtrudeGeometry(rr(0.16, 1.10, 0.035), { depth: 0.030, bevelEnabled: false, curveSegments: 3 });
  mesh(plate, frame, 0, 0.55, -0.200);
  const bolt = new THREE.CylinderGeometry(0.011, 0.011, 0.024, 6);
  for (const [bx, by] of [[-0.045, 0.10], [0.045, 0.10], [-0.045, 0.52], [0.045, 0.52], [-0.045, 1.02], [0.045, 1.02]])
    mesh(bolt, dark, bx, by, -0.168, Math.PI / 2, 0, 0);

  const armShape = new THREE.Shape();
  armShape.moveTo(-0.085, -0.025); armShape.lineTo(0.075, -0.025);
  armShape.lineTo(0.075, 0.025); armShape.lineTo(-0.085, 0.025);
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: 0.048, bevelEnabled: false });
  for (const ay of [0.40, 0.86]) mesh(armGeo, frame, -0.024, ay, -0.095, 0, Math.PI / 2, 0);
  // black cable gland high on the left edge, bare conduit ferrule low on the same
  // edge, both projecting back toward the bracket
  mesh(new THREE.CylinderGeometry(0.017, 0.021, 0.075, 8), dark, -0.335, CY + 0.235, -0.075, Math.PI / 2, 0, 0);
  mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.030, 6), grime, -0.335, CY + 0.235, -0.124, Math.PI / 2, 0, 0);
  mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.070, 8, 1, true), openM, -0.335, CY - 0.235, -0.075, Math.PI / 2, 0, 0);
  mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.014, 8), frame, -0.335, CY - 0.235, -0.044, Math.PI / 2, 0, 0);

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
