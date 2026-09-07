// rolled_shutter_shopfront — arm C: a different reading of the same subject.
// The shutter is HALF ROLLED UP rather than shut. You get the barrel of curtain
// visible in an open-fronted hood, a short skirt of slats hanging below it, and
// under that a metre and a half of deep, lit shop interior: counter, shelf racks,
// hanging stock. In a dark lane that pocket of warm light is what makes the wall
// read as a shopfront rather than as a slab. 3.4 w x 4.2 h.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back'; // shopfront panel: the back abuts the shop behind it.

  const M = (color, roughness, name, extra) =>
    Object.assign(
      new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra || {})),
      { name }
    );
  const brick = M(0x6d4a2f, 0.95, 'stone');
  const brickDark = M(0x2a2f35, 0.95, 'stone');
  const render = M(0x8f9aa3, 0.9, 'stone');
  const slatM = M(0x8f9aa3, 0.42, 'metal', { metalness: 0.78 });
  const frame = M(0x5a6169, 0.6, 'metal', { metalness: 0.6 });
  const hoodM = M(0x2a2f35, 0.55, 'metal', { metalness: 0.65 });
  const brass = M(0xd8cf7a, 0.4, 'metal', { metalness: 0.8 });
  const dark = M(0x1b1e22, 0.95, 'stone');
  const timber = M(0xa9784f, 0.85, 'timber');
  const timberD = M(0x6d4a2f, 0.9, 'timber');
  const jade = M(0x2f7a6a, 0.8, 'plaster');
  const red = M(0xc4442f, 0.85, 'plaster');
  const bone = M(0xe8dcc0, 0.9, 'fabric');
  const blue = M(0x1d5f8a, 0.85, 'fabric');
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
  const cyl = (r, h, mat, x, y, z, seg, axis) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 8), mat);
    me.position.set(x, y, z);
    if (axis === 'x') me.rotation.z = Math.PI / 2;
    if (axis === 'z') me.rotation.x = Math.PI / 2;
    g.add(me);
    return me;
  };

  const W = 3.4, HW = W / 2, ZF = -0.05;

  // ---------------------------------------------------------------- masonry
  const PIER = 0.5;
  for (const s of [-1, 1]) {
    box(PIER, 4.2, 0.5, brick, s * (HW - PIER / 2), 2.1, ZF - 0.25);
    for (let i = 0; i < 8; i++) {
      box(PIER + 0.07, 0.11, 0.56, brickDark, s * (HW - PIER / 2), 0.55 + i * 0.46, ZF - 0.25);
    }
    box(0.14, 4.0, 0.14, render, s * (HW - 0.07), 2.1, ZF - 0.02); // quoin edge
  }
  box(W, 0.5, 0.5, brick, 0, 3.95, ZF - 0.25);
  box(W + 0.12, 0.14, 0.6, render, 0, 4.13, ZF - 0.25);
  box(W, 0.24, 0.5, brickDark, 0, 0.12, ZF - 0.25);
  box(2.5, 0.12, 0.16, frame, 0, 3.64, ZF + 0.02); // head angle over the opening

  // ------------------------------------------------------ the interior pocket
  const IZ = ZF - 0.5; // back of the shop pocket
  box(2.42, 3.5, 0.06, dark, 0, 1.85, IZ - 0.14);
  box(2.42, 0.06, 0.7, dark, 0, 3.56, IZ);
  for (const s of [-1, 1]) box(0.06, 3.5, 0.7, dark, s * 1.2, 1.85, IZ);
  box(2.42, 0.08, 0.7, render, 0, 0.28, IZ); // floor of the pocket
  // a lit back wall panel, the source of the glow
  box(2.1, 1.4, 0.04, warm, 0, 2.0, IZ - 0.12);
  cyl(0.05, 2.1, warm, 0, 3.3, IZ - 0.12, 6, 'x'); // strip light on the ceiling
  // shelving racks against the back
  for (let i = 0; i < 3; i++) {
    box(2.1, 0.05, 0.28, frame, 0, 1.2 + i * 0.62, IZ - 0.06);
    for (let k = 0; k < 6; k++) {
      const bx = -0.9 + k * 0.36;
      box(0.24, 0.3, 0.2, [red, jade, blue, bone, timber, brass][(i * 6 + k) % 6], bx, 1.4 + i * 0.62, IZ - 0.06);
    }
  }
  // counter across the opening
  box(2.3, 0.84, 0.5, timberD, 0, 0.46, ZF - 0.32);
  box(2.42, 0.08, 0.62, render, 0, 0.92, ZF - 0.3);
  box(2.3, 0.06, 0.05, brass, 0, 0.86, ZF - 0.06);
  // stock on the counter
  for (let i = 0; i < 5; i++) {
    const bx = -0.86 + i * 0.43;
    box(0.3, 0.26, 0.3, [red, jade, blue, timber, bone][i % 5], bx, 1.09, ZF - 0.3);
    if (i % 2) box(0.26, 0.12, 0.26, brass, bx, 1.28, ZF - 0.3);
  }
  // stock hanging from a rail
  cyl(0.025, 2.2, frame, 0, 2.92, ZF - 0.24, 6, 'x');
  for (let i = 0; i < 9; i++) {
    const bx = -0.94 + i * 0.235;
    const h = 0.3 + ((i * 7) % 5) * 0.08;
    cyl(0.008, 0.1, frame, bx, 2.86, ZF - 0.24, 4);
    box(0.15, h, 0.12, [bone, red, jade, blue][i % 4], bx, 2.8 - h / 2, ZF - 0.24);
  }

  // ------------------------------------------- the hood, open, with the roll
  box(2.78, 0.1, 0.5, hoodM, 0, 3.92, ZF + 0.2);
  for (const s of [-1, 1]) box(0.07, 0.62, 0.5, hoodM, s * 1.38, 3.62, ZF + 0.2);
  box(2.78, 0.09, 0.12, hoodM, 0, 3.34, ZF + 0.4); // front lip only: the roll shows
  // the rolled curtain: a barrel with visible coil grooves
  cyl(0.24, 2.6, slatM, 0, 3.6, ZF + 0.2, 14, 'x');
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.012, 4, 14), hoodM);
    t.position.set(-1.16 + i * 0.29, 3.6, ZF + 0.2);
    t.rotation.y = Math.PI / 2;
    g.add(t);
  }
  cyl(0.05, 2.86, frame, 0, 3.6, ZF + 0.2, 8, 'x');
  cyl(0.11, 0.06, brass, 1.44, 3.6, ZF + 0.2, 10, 'x');

  // the skirt of curtain still hanging, and its guides
  const CW = 2.26, sy0 = 3.34, sy1 = 2.16;
  for (let i = 0; i < 15; i++) cyl(0.041, CW, slatM, 0, sy1 + 0.05 + i * 0.082, ZF + 0.03, 8, 'x');
  box(CW + 0.06, sy0 - sy1, 0.05, hoodM, 0, (sy0 + sy1) / 2, ZF - 0.02);
  box(CW + 0.14, 0.15, 0.13, hoodM, 0, sy1 - 0.02, ZF + 0.04);
  box(0.34, 0.05, 0.07, brass, 0, sy1 - 0.02, ZF + 0.12);
  for (const s of [-1, 1]) {
    box(0.1, 3.3, 0.16, frame, s * 1.19, 1.9, ZF + 0.02);
    box(0.05, 3.3, 0.06, hoodM, s * 1.14, 1.9, ZF + 0.08);
  }

  // ---------------------------------------------------------------- kerb, stock
  box(W, 0.2, 0.7, render, 0, 0.1, ZF + 0.35);
  box(W - 0.3, 0.09, 0.6, render, 0, 0.24, ZF + 0.31);
  for (let i = 0; i < 3; i++) {
    box(0.44, 0.3, 0.34, [jade, blue, red][i], -1.1 + i * 0.06, 0.35 + i * 0.31, ZF + 0.5);
  }
  box(0.5, 0.34, 0.36, blue, 1.15, 0.37, ZF + 0.5);
  box(0.46, 0.06, 0.32, timber, 1.15, 0.57, ZF + 0.5);

  // ------------------------------------------------------- awning, folded out
  for (const s of [-1, 1]) {
    const arm = box(0.06, 0.72, 0.06, frame, s * 1.24, 3.42, ZF + 0.3);
    arm.rotation.x = 0.8;
  }
  const aw = box(2.66, 0.05, 0.66, red, 0, 3.6, ZF + 0.42, 0.3);
  aw.material = red;
  for (let i = 0; i < 5; i++) box(0.24, 0.055, 0.66, i % 2 ? bone : red, -1.08 + i * 0.54, 3.6, ZF + 0.42, 0.3);
  box(2.7, 0.17, 0.05, bone, 0, 3.42, ZF + 0.63);

  // ------------------------------------------------------------------ services
  box(0.3, 0.42, 0.18, frame, 1.44, 2.34, ZF + 0.09);
  box(0.24, 0.13, 0.05, dark, 1.44, 2.44, ZF + 0.19);
  for (let i = 0; i < 4; i++) cyl(0.028, 0.55, frame, 1.62, 0.55 + i * 0.56, ZF + 0.06, 6);
  for (let i = 0; i < 4; i++) cyl(0.05, 1.0, frame, -1.54, 0.55 + i * 1.0, ZF + 0.1, 8);
  for (let i = 0; i < 4; i++) {
    const cl = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 5, 9), frame);
    cl.position.set(-1.54, 1.05 + i * 1.0, ZF + 0.1);
    cl.rotation.y = Math.PI / 2;
    g.add(cl);
  }

  // ---------------------------------------------- lit shapes, never lettering
  box(0.06, 0.06, 0.44, frame, 1.02, 3.02, ZF + 0.26);
  box(0.5, 0.72, 0.1, jade, 1.02, 2.7, ZF + 0.44);
  box(0.36, 0.08, 0.05, neon, 1.02, 2.86, ZF + 0.5);
  box(0.36, 0.08, 0.05, neon, 1.02, 2.7, ZF + 0.5);
  box(0.22, 0.08, 0.05, neon, 1.02, 2.54, ZF + 0.5);
  for (const bx of [-0.7, 0.7]) {
    cyl(0.028, 0.16, frame, bx, 3.24, ZF + 0.44, 6);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), warm);
    b.position.set(bx, 3.12, ZF + 0.44);
    g.add(b);
  }

  // ------------------------------------------------------------ centre and seat
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let c2 = 0; c2 < nd.count; c2++) { nd.getMatrixAt(c2, im); put(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
