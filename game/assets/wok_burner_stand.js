// wok_burner_stand — cast trivet ring on three splayed strap legs, jet burner alight in
// the middle, brass valve arm off one side. Trivet and burner head are each one lathe.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness, name, metalness) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: metalness ?? 0 }); m.name = name; return m; };

  const iron = mat(0x2a2f35, 0.82, 'metal', 0.15);
  const steel = mat(0x5a6169, 0.7, 'metal', 0.25);
  const brass = mat(0xd8cf7a, 0.45, 'metal', 0.55);
  const knobM = mat(0x1b1e22, 0.85, 'plaster');
  const flame = mat(0x2a2f35, 0.7, 'metal', 0.2);
  flame.emissive = new THREE.Color(0xffb45a); flame.emissiveIntensity = 0.35;
  const jet = mat(0x2a2f35, 0.7, 'metal', 0.2);
  jet.emissive = new THREE.Color(0xffb45a); jet.emissiveIntensity = 0.55;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const V2 = (p) => new THREE.Vector2(p[0], p[1]);

  // trivet casting section, closed loop: underside, outer face, lip, dished top, inner lip
  const ringProf = [[0.130, 0.321], [0.208, 0.321], [0.213, 0.331], [0.213, 0.351],
                    [0.207, 0.360], [0.196, 0.357], [0.193, 0.343], [0.168, 0.338],
                    [0.146, 0.340], [0.135, 0.347], [0.128, 0.343], [0.130, 0.321]];
  const ring = new THREE.Mesh(new THREE.LatheGeometry(ringProf.map(V2), 20), iron);
  g.add(ring);

  // three cast pads on the ring top and three webs running in to the burner boss
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + 0.55;
    const pad = new THREE.Mesh(box, iron);
    pad.scale.set(0.062, 0.019, 0.046);
    pad.position.set(Math.cos(a) * 0.170, 0.348, Math.sin(a) * 0.170);
    pad.rotation.y = -a; g.add(pad);
  }
  const webProf = [[0.000, 0.000], [0.100, 0.000], [0.100, 0.020], [0.052, 0.032], [0.000, 0.034]];
  const webShape = new THREE.Shape();
  webShape.moveTo(webProf[0][0], webProf[0][1]);
  for (let i = 1; i < webProf.length; i++) webShape.lineTo(webProf[i][0], webProf[i][1]);
  webShape.closePath();
  const webGeo = new THREE.ExtrudeGeometry(webShape, { depth: 0.026, bevelEnabled: false, steps: 1, curveSegments: 1 });
  webGeo.translate(0, 0, -0.013);
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + 1.6;
    const web = new THREE.Mesh(webGeo, iron);
    web.rotation.y = -a + Math.PI;                  // the shape runs outward from the boss
    web.position.set(Math.cos(a) * 0.130, 0.302, Math.sin(a) * 0.130);
    g.add(web);
  }

  // burner head, one lathe: boss, jet crown, cap
  // the head sits up in the ring opening so the crown of jets is visible from above,
  // which is the only place the warm emissive can do its job
  const headProf = [[0.000, 0.246], [0.056, 0.246], [0.058, 0.282], [0.052, 0.288],
                    [0.080, 0.294], [0.081, 0.318], [0.070, 0.325], [0.044, 0.327],
                    [0.038, 0.340], [0.000, 0.340]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(headProf.map(V2), 14), iron));
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.0805, 0.0795, 0.022, 16), flame);
  crown.position.y = 0.307; g.add(crown);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.024, 0.015), jet, 20);
  {
    const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < 20; i++) {
      const a = i * (Math.PI * 2 / 20);
      p.set(Math.cos(a) * 0.081, 0.311, Math.sin(a) * 0.081);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
      mm.compose(p, q, sc); teeth.setMatrixAt(i, mm);
    }
    teeth.instanceMatrix.needsUpdate = true; g.add(teeth);
  }
  const pilotRing = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.007, 10), jet);
  pilotRing.position.y = 0.338; g.add(pilotRing);

  // legs: a folded strap section swept down a splayed path, with a turned-out foot
  const strap = new THREE.Shape();
  strap.moveTo(-0.022, 0.000); strap.lineTo(0.022, 0.000); strap.lineTo(0.022, 0.007);
  strap.lineTo(0.014, 0.010); strap.lineTo(-0.014, 0.010); strap.lineTo(-0.022, 0.007);
  strap.closePath();
  const legPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.183, 0.322, 0), new THREE.Vector3(0.196, 0.230, 0),
    new THREE.Vector3(0.220, 0.110, 0), new THREE.Vector3(0.244, 0.006, 0),
  ]);
  const legGeo = new THREE.ExtrudeGeometry(strap, { extrudePath: legPath, steps: 4, bevelEnabled: false, curveSegments: 1 });
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + 0.55;
    const arm = new THREE.Group(); arm.rotation.y = -a; g.add(arm);
    arm.add(new THREE.Mesh(legGeo, steel));
    const foot = new THREE.Mesh(box, steel);
    foot.scale.set(0.052, 0.008, 0.044); foot.position.set(0.252, 0.004, 0);
    arm.add(foot);
    const gus = new THREE.Mesh(box, iron);
    gus.scale.set(0.034, 0.028, 0.046); gus.position.set(0.180, 0.312, 0);
    arm.add(gus);
  }

  // valve arm: pipe, brass body, knob, spigot, and the wire bail under it
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.176, 8), iron);
  pipe.rotation.z = Math.PI / 2; pipe.position.set(0.116, 0.240, 0); g.add(pipe);
  const vbProf = [[0.000, -0.028], [0.021, -0.028], [0.021, 0.000], [0.026, 0.006],
                  [0.021, 0.012], [0.021, 0.028], [0.000, 0.028]];
  const vb = new THREE.Mesh(new THREE.LatheGeometry(vbProf.map(V2), 8), brass);
  vb.rotation.z = Math.PI / 2; vb.position.set(0.224, 0.240, 0); g.add(vb);
  const knProf = [[0.000, 0.000], [0.026, 0.000], [0.031, 0.010], [0.029, 0.028], [0.016, 0.032], [0.000, 0.032]];
  const kn = new THREE.Mesh(new THREE.LatheGeometry(knProf.map(V2), 12), knobM);
  kn.rotation.z = -Math.PI / 2; kn.position.set(0.256, 0.240, 0); g.add(kn);
  const spig = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.064, 7), steel);
  spig.rotation.set(0, 0, -0.55); spig.position.set(0.206, 0.206, 0.019); g.add(spig);
  // hose tail off the spigot, attached at both ends so nothing floats
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.190, 0.182, 0.033), new THREE.Vector3(0.212, 0.108, 0.078),
    new THREE.Vector3(0.176, 0.038, 0.126), new THREE.Vector3(0.096, 0.011, 0.152),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 8, 0.010, 5, false), mat(0x2a2f35, 0.9, 'plaster')));

  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im4 = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const pa = n.isMesh && n.geometry.attributes.position; if (!pa) return;
    const putv = (mt) => { for (let i = 0; i < pa.count; i++) bx.expandByPoint(v.fromBufferAttribute(pa, i).applyMatrix4(mt)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im4); putv(m4.multiplyMatrices(n.matrixWorld, im4)); } return; }
    putv(n.matrixWorld);
  });
  const ctr = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bx.min.y; o.position.z -= ctr.z; });
  return g;
}
