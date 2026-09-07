// plastic_stool_stack — six moulded stools nested unevenly. The seat is one
// LatheGeometry of the moulding section: dished centre, raised rim, hollow underside.
export default function (THREE) {
  const g = new THREE.Group();
  let s = 0x85ebca6b;
  const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();
  const mat = (color, roughness, name) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }); m.name = name; return m; };

  const SEAT_H = 0.42, PITCH = 0.104, N = 6;
  const COLS = [0xc4442f, 0xc4442f, 0x2f7a6a, 0xc4442f, 0xe8dcc0, 0xc4442f];

  // seat section, (radius, y). y = 0 is the rim crown, the top of the object.
  const prof = [[0.000, -0.014], [0.052, -0.013], [0.098, -0.010], [0.124, -0.004],
                [0.138, 0.000], [0.150, -0.006], [0.150, -0.024], [0.145, -0.036],
                [0.136, -0.042], [0.096, -0.046], [0.048, -0.048], [0.000, -0.048]];
  const seatGeo = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 16);

  // leg: a blade section swept down a bowed path
  const blade = new THREE.Shape();
  blade.moveTo(-0.016, -0.008); blade.lineTo(0.016, -0.008); blade.lineTo(0.019, 0.000);
  blade.lineTo(0.016, 0.008); blade.lineTo(-0.016, 0.008); blade.lineTo(-0.019, 0.000);
  blade.closePath();
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.124, -0.030, 0), new THREE.Vector3(0.131, -0.170, 0),
    new THREE.Vector3(0.151, -0.310, 0), new THREE.Vector3(0.176, -0.420, 0),
  ]);
  const legGeo = new THREE.ExtrudeGeometry(blade, { extrudePath: path, steps: 5, bevelEnabled: false, curveSegments: 1 });

  const stool = (col) => {
    const st = new THREE.Group();
    const m = mat(col, 0.58, 'plaster'); m.side = THREE.DoubleSide;
    st.add(new THREE.Mesh(seatGeo, m));
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = -(i * Math.PI / 2 + Math.PI / 4);
      arm.add(new THREE.Mesh(legGeo, m));
      st.add(arm);
    }
    return st;
  };

  const drop = [0, 0.010, -0.006, 0.014, 0.002, -0.004];
  const yaw = [0.0, 0.51, 1.13, 0.34, 0.88, 1.46];
  for (let k = 0; k < N; k++) {
    const st = stool(COLS[k]);
    st.position.set(rr(-0.010, 0.010), SEAT_H + k * PITCH - drop[k], rr(-0.010, 0.010));
    st.rotation.y = yaw[k] + rr(-0.06, 0.06);
    st.rotation.z = rr(-0.011, 0.011);
    g.add(st);
  }

  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pa = n.isMesh && n.geometry.attributes.position; if (!pa) return;
    const put = (mt) => { for (let i = 0; i < pa.count; i++) bx.expandByPoint(v.fromBufferAttribute(pa, i).applyMatrix4(mt)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); put(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bx.min.y; o.position.z -= ctr.z; });
  return g;
}
