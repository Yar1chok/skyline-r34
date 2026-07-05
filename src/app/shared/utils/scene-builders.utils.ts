import * as THREE from 'three';
import { DASH_COUNT, DASH_SPACING, POLE_COUNT, POLE_SPACING } from '@const/scene.const';
import { GRASS_VERTEX_SHADER, GRASS_FRAGMENT_SHADER } from '@utils/grass-shader.utils';

// ─── Lights ──────────────────────────────────────────────────────────────────
export type LightsResult = {
  ambientLight: THREE.AmbientLight;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
};

export function buildLights(scene: THREE.Scene): LightsResult {
  const ambientLight = new THREE.AmbientLight(0x8888ff, 0.18);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xaabbff, 1.2);
  keyLight.position.set(5, 10, 5);
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 150;
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.001;
  keyLight.shadow.camera.updateProjectionMatrix();
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6c7fff, 0.4);
  fillLight.position.set(-5, 3, -4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x9b6fff, 0.3);
  rimLight.position.set(0, 2, -7);
  scene.add(rimLight);

  return { ambientLight, keyLight, fillLight, rimLight };
}

// ─── Ground ──────────────────────────────────────────────────────────────────
export type GroundResult = {
  groundMesh: THREE.Mesh;
  groundMat: THREE.MeshStandardMaterial;
};

export function buildGround(scene: THREE.Scene): GroundResult {
  const texLoader = new THREE.TextureLoader();

  const applyRepeat = (t: THREE.Texture): THREE.Texture => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 80);
    return t;
  };

  // Текстура тайлится 6×80 раз — 1K диффуза и 512px карты высот достаточно;
  // 4K-оригиналы лежат в assets-src (в GPU-память они не влезали без лагов)
  const diffuse = applyRepeat(texLoader.load('/models/ground/rocky_terrain_02_diff.jpg'));
  const dispTex = applyRepeat(texLoader.load('/models/ground/rocky_terrain_02_disp.png'));

  const groundMat = new THREE.MeshStandardMaterial({
    map: diffuse,
    displacementMap: dispTex,
    // Максимум рельефа: -0.06 - 0.15 + 0.2 = -0.01 — чуть ниже дороги (y=0),
    // иначе пики прорываются сквозь асфальт и мерцают вдали
    displacementScale: 0.2,
    displacementBias: -0.15,
    roughness: 0.92,
    metalness: 0.0,
    color: new THREE.Color(0.18, 0.26, 0.13),
  });

  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 600, 16, 80), groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.06;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  return { groundMesh, groundMat };
}

// ─── Road ────────────────────────────────────────────────────────────────────
export type RoadResult = {
  roadDashes: THREE.Mesh[];
  roadPoles: THREE.Group[];
};

export function buildRoad(scene: THREE.Scene): RoadResult {
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x111119,
    roughness: 0.94,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 600), asphaltMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0;
  road.receiveShadow = true;
  scene.add(road);

  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  for (const x of [-3.4, 3.4]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 600), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.01, 0);
    scene.add(edge);
  }

  const roadDashes: THREE.Mesh[] = [];
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
  for (let i = 0; i < DASH_COUNT; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 5), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.01, i * DASH_SPACING - (DASH_COUNT / 2) * DASH_SPACING);
    scene.add(dash);
    roadDashes.push(dash);
  }

  const roadPoles: THREE.Group[] = [];
  const postMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xdd1111 });
  for (let i = 0; i < POLE_COUNT; i++) {
    for (const x of [-4.0, 4.0]) {
      const group = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.7, 6), postMat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.14, 6), bandMat);
      band.position.y = 0.18;
      group.add(post, band);
      group.position.set(x, 0.35, i * POLE_SPACING - (POLE_COUNT / 2) * POLE_SPACING);
      scene.add(group);
      roadPoles.push(group);
    }
  }

  return { roadDashes, roadPoles };
}

// ─── Background ──────────────────────────────────────────────────────────────
export type BackgroundResult = {
  starMesh: THREE.Points;
};

export function buildBackground(scene: THREE.Scene): BackgroundResult {
  const starCount = 1800;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 400;
    starPos[i * 3 + 1] = Math.random() * 100 + 10;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 400;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMesh = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xeeeeff,
      size: 0.08,
      sizeAttenuation: true,
      transparent: true,
    }),
  );
  scene.add(starMesh);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 12),
    new THREE.MeshBasicMaterial({
      color: 0x3311bb,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  );
  glow.position.set(0, 6, 80);
  glow.rotation.x = -0.2;
  scene.add(glow);

  const groundGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 6),
    new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    }),
  );
  groundGlow.position.set(0, 0.5, 78);
  groundGlow.rotation.x = -0.05;
  scene.add(groundGlow);

  return { starMesh };
}

// ─── Grass material ──────────────────────────────────────────────────────────
export function createGrassMaterial(
  grassAlpha: THREE.Texture,
  noiseTex: THREE.Texture,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGrassAlpha: { value: grassAlpha },
      uNoiseTex: { value: noiseTex },
      uBaseColor: { value: new THREE.Color('#2d6614') },
      uTipColor1: { value: new THREE.Color('#5ab428') },
      uTipColor2: { value: new THREE.Color('#459020') },
      uWindAmp: { value: 0.09 },
      uWindSpeed: { value: 1.2 },
      uNoiseFactor: { value: 0.45 },
    },
    vertexShader: GRASS_VERTEX_SHADER,
    fragmentShader: GRASS_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });
}
