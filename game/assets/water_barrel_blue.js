// water_barrel_blue - ARM B: one swept profile. A blow-moulded drum IS a
// profile revolved, so the whole shell - rolled base chime, belly, three
// pressed swage grooves, shoulder and neck flange - is a single LatheGeometry
// from one point list, with the screw cap a second short lathe over it. Open at
// the neck, so the shell is DoubleSide.
export default function (THREE) {
  const g = new THREE.Group();

  const M = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.06, ...o });
    m.name = name; return m;
  };
  const BLUE = M(0x1d5f8a, 'plaster', { roughness: 0.62, metalness: 0.10, side: THREE.DoubleSide });
  const BLUE2 = M(0x1d5f8a, 'plaster', { roughness: 0.82, metalness: 0.05 });
  const CAP = M(0x1b1e22, 'plaster', { roughness: 0.70, metalness: 0.08, side: THREE.DoubleSide });
  const CAP2 = M(0x2a2f35, 'plaster', { roughness: 0.76, metalness: 0.06 });
  const GRIME = M(0x2a2f35, 'plaster', { roughness: 0.94, metalness: 0.03, side: THREE.DoubleSide });
  const BRASS = M(0xd8cf7a, 'metal', { roughness: 0.45, metalness: 0.72 });

  const add = (geo, mat, pos, rot, scl) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scl) m.scale.set(scl[0], scl[1], scl[2]);
    g.add(m); return m;
  };

  const RS = 22;   // a lathe almost never needs more than about twenty

  // the whole shell: r against y. The three tight in-out-in triples are the
  // pressed swage grooves; everything else is the moulded curve.
  const P = [
    [0.000, 0.000], [0.150, 0.000], [0.176, 0.004], [0.196, 0.014], [0.212, 0.032],
    [0.228, 0.062], [0.243, 0.104], [0.256, 0.152], [0.266, 0.198],
    [0.271, 0.226], [0.264, 0.243], [0.271, 0.260],
    [0.276, 0.320], [0.278, 0.372],
    [0.278, 0.404], [0.270, 0.421], [0.278, 0.438],
    [0.279, 0.500], [0.279, 0.556],
    [0.278, 0.588], [0.270, 0.605], [0.278, 0.622],
    [0.276, 0.672], [0.270, 0.712], [0.258, 0.748], [0.240, 0.780],
    [0.218, 0.806], [0.200, 0.824], [0.194, 0.836], [0.198, 0.844],
    [0.212, 0.848], [0.212, 0.860], [0.196, 0.862],
  ].map((q) => new THREE.Vector2(q[0], q[1]));
  add(new THREE.LatheGeometry(P, RS), BLUE);

  // a second, very slightly larger lathe over the bottom 20 cm: the splash and
  // scum line a market drum carries, in one sweep rather than a decal. Kept low
  // and short - run up the belly it stops reading as dirt and starts reading as
  // a painted band.
  const GP = [
    [0.2100, 0.030], [0.2209, 0.045], [0.2347, 0.075], [0.2466, 0.110],
    [0.2587, 0.155], [0.2663, 0.190], [0.2600, 0.206],
  ].map((q) => new THREE.Vector2(q[0], q[1]));
  add(new THREE.LatheGeometry(GP, RS), GRIME);
  // moulding seam, a thin sweep down one side
  // seam set at 45 deg: on an axis it sits exactly on the silhouette and reads
  // as a line floating clear of the drum.
  add(new THREE.BoxGeometry(0.010, 0.780, 0.012), BLUE2, [0.1959, 0.430, 0.1959], [0, -Math.PI / 4, 0]);

  // ---- screw cap: a second short lathe -------------------------------------
  const CP = [
    [0.000, 0.930], [0.150, 0.930], [0.170, 0.926], [0.174, 0.906], [0.198, 0.902],
    [0.208, 0.892], [0.212, 0.868], [0.210, 0.850], [0.200, 0.842], [0.176, 0.840],
  ].map((q) => new THREE.Vector2(q[0], q[1]));
  add(new THREE.LatheGeometry(CP, RS), CAP);
  // the vertical grip ribs round the collar
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    add(new THREE.BoxGeometry(0.019, 0.056, 0.024), CAP2,
        [Math.cos(a) * 0.208, 0.874, Math.sin(a) * 0.208], [0, -a, 0]);
  }
  // folding strap handle, squashed flat so it clears the cap by 4 cm and no more
  add(new THREE.TorusGeometry(0.086, 0.011, 5, 14, Math.PI), CAP2, [0, 0.906, 0], null, [1, 0.48, 1]);
  add(new THREE.BoxGeometry(0.026, 0.020, 0.048), CAP2, [0.086, 0.908, 0]);
  add(new THREE.BoxGeometry(0.026, 0.020, 0.048), CAP2, [-0.086, 0.908, 0]);
  add(new THREE.BoxGeometry(0.108, 0.018, 0.030), CAP2, [0, 0.947, 0]);

  // ---- tap, swept where it is round -----------------------------------------
  const TP = [[0.000, 0.000], [0.030, 0.000], [0.032, 0.014], [0.028, 0.030],
              [0.021, 0.034], [0.021, 0.062], [0.026, 0.066], [0.026, 0.076],
              [0.000, 0.076]].map((q) => new THREE.Vector2(q[0], q[1]));
  add(new THREE.LatheGeometry(TP, 12), CAP, [0, 0.128, 0.256], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.013, 0.011, 0.050, 8), CAP2, [0, 0.108, 0.316]);
  add(new THREE.BoxGeometry(0.022, 0.014, 0.076), CAP2, [0, 0.156, 0.308], [-0.32, 0, 0]);
  add(new THREE.TorusGeometry(0.034, 0.006, 4, 12), BRASS, [0, 0.128, 0.264], [Math.PI / 2, 0, 0]);

  // --- contract: base at y = 0, centred on x and z --------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
