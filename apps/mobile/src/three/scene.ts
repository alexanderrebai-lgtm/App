// Scène three.js du mannequin, indépendante de React Native (testable et réutilisable sur le web).
import * as THREE from 'three';
import {
  BODY, sampleExercise, highlightedParts, movementFor, type Joints, type Prop, type Sample, type V3,
} from '@muscu/motion';
import { colors } from '../theme';

const UP = new THREE.Vector3(0, 1, 0);
const toV = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

export type ViewName = 'face' | 'side' | 'three';
export const VIEW_AZIMUTH: Record<ViewName, number> = { face: 0, side: Math.PI / 2, three: Math.PI / 4 };

export interface MannequinScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Change d'exercice : accessoires, muscles en couleur, cadrage. */
  setExercise(exerciseId: string, muscles: string[]): void;
  /** Pose à l'instant `time` (secondes), avec un facteur de ralenti. */
  update(time: number, slow?: number): Sample;
  /** Angle de vue autour du mannequin (radians, 0 = de face). */
  setAzimuth(a: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createMannequinScene(): MannequinScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.slate);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);

  scene.add(new THREE.HemisphereLight('#dfe6ff', '#1a2033', 1.3));
  const key = new THREE.DirectionalLight('#ffffff', 2.0);
  key.position.set(2.5, 4, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(colors.azure, 1.1);
  rim.position.set(-3, 2.5, -2);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 64), new THREE.MeshStandardMaterial({ color: '#20263C', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), new THREE.MeshBasicMaterial({ color: '#0E1220', transparent: true, opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  scene.add(shadow);

  const matBody = new THREE.MeshStandardMaterial({ color: '#B4BED2', roughness: 0.5, metalness: 0.05 });
  const matJoint = new THREE.MeshStandardMaterial({ color: '#8E99B0', roughness: 0.5 });
  const matHi = new THREE.MeshStandardMaterial({ color: colors.neon, roughness: 0.45, emissive: '#3d4d00', emissiveIntensity: 0.6 });
  const matLoad = new THREE.MeshStandardMaterial({ color: colors.coral, roughness: 0.4, metalness: 0.2 });
  const matMetal = new THREE.MeshStandardMaterial({ color: '#3A4260', roughness: 0.4, metalness: 0.6 });
  const matProp = new THREE.MeshStandardMaterial({ color: '#2E3654', roughness: 0.8 });
  const matWall = new THREE.MeshStandardMaterial({ color: '#2E3654', roughness: 0.9, transparent: true, opacity: 0.35 });

  const cyl = new THREE.CylinderGeometry(1, 1, 1, 18);
  const sph = new THREE.SphereGeometry(1, 22, 14);
  const parts = new Map<string, THREE.Mesh>();
  const body = new THREE.Group();
  scene.add(body);
  const mk = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.userData.base = mat;
    body.add(m);
    parts.set(name, m);
    return m;
  };
  const limb = (name: string, r: number) => { const m = mk(name, cyl, matBody); m.userData.r = r; return m; };
  const ball = (name: string, r: number, mat = matJoint) => { const m = mk(name, sph, mat); m.scale.setScalar(r); return m; };
  for (const s of ['L', 'R']) {
    limb(`thigh${s}`, 0.068); limb(`shin${s}`, 0.052); limb(`upper${s}`, 0.048); limb(`fore${s}`, 0.04);
    ball(`knee${s}`, 0.058); ball(`ankle${s}`, 0.045); ball(`elbow${s}`, 0.045); ball(`hand${s}`, 0.045, matBody);
    ball(`sh${s}`, 0.07, matBody); ball(`hip${s}`, 0.07);
    limb(`foot${s}`, 0.04);
  }
  limb('torso', 0.125);
  const chest = mk('chest', sph, matBody);
  const pelvis = mk('pelvis', sph, matBody);
  limb('neck', 0.045);
  const head = ball('head', BODY.head, matBody);

  const between = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    const d = b.clone().sub(a);
    const l = d.length();
    m.position.copy(a).add(b).multiplyScalar(0.5);
    if (l > 1e-6) m.quaternion.setFromUnitVectors(UP, d.normalize());
    m.scale.set(m.userData.r, l, m.userData.r);
  };

  // accessoires tenus
  const handle = new THREE.CylinderGeometry(0.016, 0.016, 1, 10);
  const plate = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 18);
  const makeBell = () => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(handle, matMetal); h.scale.y = 0.2;
    const p1 = new THREE.Mesh(plate, matLoad); p1.position.y = 0.09;
    const p2 = new THREE.Mesh(plate, matLoad); p2.position.y = -0.09;
    g.add(h, p1, p2);
    scene.add(g);
    return g;
  };
  const bellL = makeBell();
  const bellR = makeBell();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), matMetal);
  const plateGeo = new THREE.CylinderGeometry(1, 1, 0.04, 24);
  const barPlates = [new THREE.Mesh(plateGeo, matLoad), new THREE.Mesh(plateGeo, matLoad)];
  scene.add(bar, ...barPlates);
  const medBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), matLoad);
  scene.add(medBall);
  const cableLine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6), new THREE.MeshBasicMaterial({ color: colors.mute }));
  cableLine.userData.r = 0.006;
  scene.add(cableLine);

  const propGroup = new THREE.Group();
  scene.add(propGroup);
  const box = (center: V3, size: V3, tilt = 0, mat: THREE.Material = matProp) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
    m.position.set(center[0], center[1], center[2]);
    m.rotation.z = tilt;
    propGroup.add(m);
  };
  const buildProps = (props: Prop[] | undefined) => {
    propGroup.clear();
    for (const p of props ?? []) {
      if (p.kind === 'bench') {
        // plateau rembourré et pieds ; s'il est incliné, le dossier suit l'angle
        if (p.tilt) {
          box([p.center[0] - 0.25, p.center[1] + 0.12 + Math.sin(p.tilt) * 0.3, p.center[2]], [0.75, 0.08, p.size[2]], -p.tilt);
          box([p.center[0] + 0.35, p.center[1] + 0.18, p.center[2]], [0.4, 0.08, p.size[2]]);
        } else box([p.center[0], p.center[1] + p.size[1] / 2 - 0.05, p.center[2]], [p.size[0], 0.1, p.size[2]]);
        box([p.center[0], p.center[1] - 0.05, p.center[2]], [0.08, p.size[1] - 0.1, p.size[2] * 0.6]);
      } else if (p.kind === 'box') box(p.center, p.size);
      else if (p.kind === 'bar') {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, p.width, 10), matMetal);
        m.position.set(p.at[0], p.at[1], p.at[2]);
        if (p.width > 0.6) m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
        propGroup.add(m);
      } else if (p.kind === 'wall') box(p.side ? [0.1, 1.1, 0.85 * p.side] : [p.x, 1.1, 0], p.side ? [1.2, 2.2, 0.06] : [0.06, 2.2, 1.6], 0, matWall);
      else if (p.kind === 'roller') {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.6, 20), matLoad);
        m.position.set(p.at[0], p.at[1], p.at[2]);
        m.rotation.x = Math.PI / 2;
        propGroup.add(m);
      } else if (p.kind === 'post') box([p.at[0] + 0.08, p.at[1] / 2, p.at[2]], [0.08, Math.max(0.3, p.at[1] + 0.1), 0.08]);
      else if (p.kind === 'bike') {
        box([-0.25, 0.84, 0], [0.24, 0.05, 0.16]);
        box([-0.08, 0.55, 0], [0.07, 0.6, 0.07], -0.35);
        box([0.12, 0.35, 0], [0.1, 0.1, 0.3]);
        box([0.38, 0.75, 0], [0.06, 0.75, 0.06], 0.3);
        box([0.5, 1.1, 0], [0.06, 0.05, 0.5]);
        box([0.05, 0.03, 0], [0.9, 0.06, 0.4]);
      }
    }
  };

  let current = '';
  let implement = movementFor('squat-goblet');
  let azimuth = VIEW_AZIMUTH.three;
  const target = new THREE.Vector3(0, 0.8, 0);
  let distance = 3.4;
  let aspect = 1;

  const place = () => {
    const el = 0.18;
    const d = distance / Math.min(1, aspect * 1.15);
    camera.position.set(
      target.x + d * Math.cos(el) * Math.cos(azimuth),
      target.y + d * Math.sin(el) + 0.25,
      target.z + d * Math.cos(el) * Math.sin(azimuth),
    );
    camera.lookAt(target);
  };

  const apply = (j: Joints, sample: Sample) => {
    const J = (k: keyof Joints) => toV(j[k]);
    for (const s of ['L', 'R'] as const) {
      between(parts.get(`thigh${s}`)!, J(`hip${s}`), J(`knee${s}`));
      between(parts.get(`shin${s}`)!, J(`knee${s}`), J(`ankle${s}`));
      between(parts.get(`foot${s}`)!, J(`ankle${s}`), J(`toe${s}`));
      between(parts.get(`upper${s}`)!, J(`sh${s}`), J(`elbow${s}`));
      between(parts.get(`fore${s}`)!, J(`elbow${s}`), J(`hand${s}`));
      for (const n of ['knee', 'ankle', 'elbow', 'hand', 'sh', 'hip'] as const) parts.get(`${n}${s}`)!.position.copy(J(`${n}${s}` as keyof Joints));
    }
    const { up, front } = sample.pose.frame;
    const u = toV(up);
    between(parts.get('torso')!, J('pelvis').add(u.clone().multiplyScalar(0.06)), J('chest').sub(u.clone().multiplyScalar(0.05)));
    // orientation du buste : axe y le long du buste, axe x vers l'avant de la poitrine
    const basis = new THREE.Matrix4().makeBasis(toV(front), u, toV(front).cross(u).normalize());
    chest.quaternion.setFromRotationMatrix(basis);
    chest.scale.set(0.13, 0.13, 0.2);
    chest.position.copy(J('chest')).sub(u.clone().multiplyScalar(0.06));
    pelvis.quaternion.setFromRotationMatrix(basis);
    pelvis.scale.set(0.12, 0.1, 0.17);
    pelvis.position.copy(J('pelvis'));
    between(parts.get('neck')!, J('chest'), J('neck'));
    head.position.copy(J('head'));
    shadow.position.x = j.pelvis[0];
    shadow.position.z = j.pelvis[2];

    // accessoire
    const hl = J('handL');
    const hr = J('handR');
    const mid = hl.clone().add(hr).multiplyScalar(0.5);
    bellL.visible = bellR.visible = bar.visible = medBall.visible = cableLine.visible = false;
    barPlates.forEach((p) => (p.visible = false));
    const fore = (s: 'L' | 'R') => J(`hand${s}`).sub(J(`elbow${s}`)).normalize();
    const kind = implement.implement;
    if (kind === 'dumbbells' || kind === 'dumbbell') {
      for (const [b, s] of [[bellL, 'L'], [bellR, 'R']] as const) {
        if (kind === 'dumbbell' && s === 'L') continue;
        b.visible = true;
        b.position.copy(J(`hand${s}`));
        const f = fore(s);
        const lat = toV(sample.pose.frame.left);
        // prise pronation : poignée perpendiculaire à l'avant-bras, de gauche à droite
        const axis = implement.grip === 'neutral' ? f.clone().cross(lat).normalize() : lat.clone().sub(f.clone().multiplyScalar(lat.dot(f))).normalize();
        b.quaternion.setFromUnitVectors(UP, axis.lengthSq() > 0.1 ? axis : lat);
      }
    } else if (kind === 'goblet') {
      bellL.visible = true;
      bellL.position.copy(mid);
      bellL.quaternion.setFromUnitVectors(UP, u);
    } else if (kind === 'barbell') {
      bar.visible = true;
      const axis = hr.clone().sub(hl);
      const short = axis.length() < 0.45; // barre EZ ou barre au front : barre courte, petits disques
      const w = short ? 0.9 : Math.max(1.3, axis.length() + 0.6);
      bar.position.copy(mid);
      bar.quaternion.setFromUnitVectors(UP, axis.normalize());
      bar.scale.y = w;
      barPlates.forEach((p, i) => {
        p.visible = true;
        p.position.copy(mid).add(axis.clone().multiplyScalar((i ? 1 : -1) * (w / 2 - 0.08)));
        p.quaternion.copy(bar.quaternion);
        p.scale.set(short ? 0.09 : 0.16, 1, short ? 0.09 : 0.16);
      });
    } else if (kind === 'ball') {
      medBall.visible = true;
      medBall.position.copy(sample.frame.ball ? toV(sample.frame.ball) : mid);
    } else if (kind === 'cable' && sample.frame.anchor) {
      cableLine.visible = true;
      between(cableLine, mid, toV(sample.frame.anchor));
      bellL.visible = false;
    }
  };

  return {
    scene,
    camera,
    setExercise(exerciseId, muscles) {
      current = exerciseId;
      implement = movementFor(exerciseId);
      const hi = highlightedParts(muscles);
      for (const [name, m] of parts) m.material = hi.has(name) ? matHi : (m.userData.base as THREE.Material);
      // cadrage : boîte englobante du geste sur un cycle
      const bb = new THREE.Box3();
      for (let i = 0; i < 12; i++) {
        const s = sampleExercise(exerciseId, i * 0.35);
        for (const p of Object.values(s.pose.joints)) bb.expandByPoint(toV(p));
      }
      bb.getCenter(target);
      const size = bb.getSize(new THREE.Vector3());
      // un peu de marge en haut pour les boutons posés sur la vue
      target.y += 0.12;
      distance = Math.max(3.1, Math.max(size.x, size.y, size.z) * 2.3);
      buildProps(sampleExercise(exerciseId, 0).frame.props);
      place();
    },
    update(time, slow = 1) {
      const s = sampleExercise(current, time, slow);
      apply(s.pose.joints, s);
      return s;
    },
    setAzimuth(a) { azimuth = a; place(); },
    resize(width, height) {
      aspect = width / Math.max(1, height);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      place();
    },
    dispose() {
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      [matBody, matJoint, matHi, matLoad, matMetal, matProp, matWall].forEach((m) => m.dispose());
    },
  };
}
