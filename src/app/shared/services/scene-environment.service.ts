import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  buildGround,
  buildRoad,
  buildBackground,
  createGrassMaterial,
} from '@utils/scene-builders.utils';
import {
  DASH_COUNT,
  DASH_SPACING,
  POLE_COUNT,
  POLE_SPACING,
  TREE_COUNT,
  TREE_SPACING,
  GRASS_COUNT,
} from '@const/scene.const';

/**
 * Окружение: земля, дорога, трава, деревья сакуры, звёзды и туман.
 *
 * Иллюзия движения. Машина всегда стоит в центре сцены — «едет» окружение.
 * updateScroll() переводит прогресс прокрутки в дистанцию (0..70 юнитов)
 * и смещает объекты навстречу камере. Штрихи разметки и столбики зациклены
 * через модульную арифметику: уехавший за спину объект возвращается вперёд,
 * поэтому конечного набора мешей хватает на «бесконечную» дорогу.
 * Разные слои движутся с разными коэффициентами (разметка ×1, столбики
 * ×0.88, деревья/земля/трава ×0.75) — лёгкий параллакс добавляет глубины.
 *
 * Трава — один InstancedMesh на 4000 копий лезвия из grassLODs.glb
 * (одна геометрия, один draw call). Ветер считается в вершинном шейдере:
 * каждый кадр туда передаётся время (updateGrassTime), смещение растёт
 * к кончику лезвия и модулируется картой шума Перлина.
 *
 * Туман FogExp2 скрывает место, где дорога «заканчивается», и создаёт
 * атмосферу; его цвет совпадает с фоном сцены и меняется темой (applyTheme).
 * Панель настроек управляет туманом, цветами травы и земли напрямую
 * (see: setFogDensity, setGrassColors и далее).
 */
@Injectable({ providedIn: 'root' })
export class SceneEnvironmentService {
  private scene!: THREE.Scene;

  private roadDashes: THREE.Mesh[] = [];
  private roadPoles: THREE.Group[] = [];
  private sakuraTrees: THREE.Group[] = [];
  private grassMaterial: THREE.ShaderMaterial | null = null;
  private grassMesh: THREE.InstancedMesh | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private groundMat: THREE.MeshStandardMaterial | null = null;
  private starMesh: THREE.Points | null = null;

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    scene.background = new THREE.Color(0x05050f);
    scene.fog = new THREE.FogExp2(0x05050f, 0.022);

    ({ groundMesh: this.groundMesh, groundMat: this.groundMat } = buildGround(scene));
    ({ roadDashes: this.roadDashes, roadPoles: this.roadPoles } = buildRoad(scene));
    ({ starMesh: this.starMesh } = buildBackground(scene));

    this.loadSakuraTrees();
    this.loadFluffyGrass();
  }

  /**
   * Иллюзия движения (см. описание класса). Формула цикла для каждого меша:
   * базовая позиция минус пройденная дистанция, обёрнутая по модулю длины
   * цикла (span) и отцентрированная относительно машины (± span/2).
   */
  public updateScroll(progress: number): void {
    const offset = progress * 70;

    const dashSpan = DASH_COUNT * DASH_SPACING;
    for (let i = 0; i < this.roadDashes.length; i++) {
      const base = i * DASH_SPACING;
      this.roadDashes[i].position.z =
        ((base - (offset % dashSpan) + dashSpan) % dashSpan) - dashSpan / 2;
    }

    const poleSpan = POLE_COUNT * POLE_SPACING;
    const poleOffset = offset * 0.88;
    for (let i = 0; i < this.roadPoles.length; i++) {
      const base = Math.floor(i / 2) * POLE_SPACING;
      this.roadPoles[i].position.z =
        ((base - (poleOffset % poleSpan) + poleSpan) % poleSpan) - poleSpan / 2;
    }

    if (this.sakuraTrees.length) {
      const treeSpan = TREE_COUNT * TREE_SPACING;
      const treeOffset = offset * 0.75;
      for (let i = 0; i < this.sakuraTrees.length; i++) {
        const base = Math.floor(i / 2) * TREE_SPACING;
        this.sakuraTrees[i].position.z =
          ((base - (treeOffset % treeSpan) + treeSpan) % treeSpan) - treeSpan / 2;
      }
    }

    const envOffset = offset * 0.75;
    if (this.groundMesh) this.groundMesh.position.z = -envOffset;
    if (this.grassMesh) this.grassMesh.position.z = -envOffset;
  }

  /** Кадровое обновление ветра в шейдере травы (время в секундах) */
  public updateGrassTime(timeSec: number): void {
    if (this.grassMaterial) this.grassMaterial.uniforms['uTime'].value = timeSec;
  }

  /** Цвета атмосферы под тему: фон+туман, видимость звёзд, оттенки травы и земли */
  public applyTheme(isDark: boolean): void {
    (this.scene.background as THREE.Color).set(isDark ? 0x05050f : 0x160804);
    (this.scene.fog as THREE.FogExp2).color.set(isDark ? 0x05050f : 0x1a0a02);

    if (this.starMesh) {
      (this.starMesh.material as THREE.PointsMaterial).opacity = isDark ? 1 : 0;
    }

    this.setGrassColors(
      isDark ? '#2d6614' : '#1e3a06',
      isDark ? '#5ab428' : '#9aac1c',
      isDark ? '#459020' : '#c8c030',
    );
    this.setTerrainColor(isDark ? '#2e4221' : '#2a4a14');
  }

  // ─── Scene controls API ──────────────────────────────────────────────────

  public setFogDensity(v: number): void {
    (this.scene.fog as THREE.FogExp2).density = v;
  }

  public setFogColor(hex: string): void {
    const c = new THREE.Color(hex);
    (this.scene.background as THREE.Color).copy(c);
    (this.scene.fog as THREE.FogExp2).color.copy(c);
  }

  public setGrassColors(base: string, tip1: string, tip2: string): void {
    if (!this.grassMaterial) return;
    this.grassMaterial.uniforms['uBaseColor'].value.set(base);
    this.grassMaterial.uniforms['uTipColor1'].value.set(tip1);
    this.grassMaterial.uniforms['uTipColor2'].value.set(tip2);
  }

  public setGrassNoiseScale(v: number): void {
    if (this.grassMaterial) this.grassMaterial.uniforms['uNoiseFactor'].value = v;
  }

  public setTerrainColor(hex: string): void {
    if (this.groundMat) this.groundMat.color.set(hex);
  }

  public enableGroundShadow(): void {
    if (this.groundMesh) this.groundMesh.receiveShadow = true;
    if (this.groundMat) this.groundMat.needsUpdate = true;
  }

  // ─── Loaders ─────────────────────────────────────────────────────────────

  /**
   * Одна сакура-шаблон клонируется TREE_COUNT раз на каждую обочину.
   * Случайные масштаб, поворот и сдвиг от оси прячут повторяемость.
   */
  private loadSakuraTrees(): void {
    new GLTFLoader().load('models/tree_sakura.glb', (gltf) => {
      const template = gltf.scene;
      template.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      const box = new THREE.Box3().setFromObject(template);
      const baseScale = 3.5 / box.getSize(new THREE.Vector3()).y;
      const bottomOffset = box.min.y;

      for (let i = 0; i < TREE_COUNT; i++) {
        for (const sideX of [-5.8, 5.8]) {
          const tree = template.clone(true) as THREE.Group;
          const finalScale = baseScale * (0.8 + Math.random() * 0.4);
          tree.scale.setScalar(finalScale);
          tree.rotation.y = Math.random() * Math.PI * 2;
          tree.position.set(
            sideX + (Math.random() - 0.5) * 0.6,
            -bottomOffset * finalScale,
            i * TREE_SPACING - (TREE_COUNT / 2) * TREE_SPACING,
          );
          this.scene.add(tree);
          this.sakuraTrees.push(tree);
        }
      }
    });
  }

  /**
   * Из grassLODs.glb берётся самое детальное лезвие (LOD00), растягивается
   * и рассыпается 4000 экземплярами по обеим обочинам вдоль 300 юнитов дороги.
   * Матрица каждого экземпляра записывается один раз — дальше всё движение
   * делает шейдер (ветер) и сдвиг всего меша по z (скролл).
   */
  private loadFluffyGrass(): void {
    const texLoader = new THREE.TextureLoader();
    const grassAlpha = texLoader.load('models/grass/grass.jpeg');
    const noiseTex = texLoader.load('models/grass/perlinnoise.webp');
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;

    this.grassMaterial = createGrassMaterial(grassAlpha, noiseTex);

    new GLTFLoader().load('models/grass/grassLODs.glb', (gltf) => {
      let bladeGeo: THREE.BufferGeometry | null = null;
      gltf.scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && child.name.includes('LOD00')) bladeGeo = mesh.geometry.clone();
      });
      if (!bladeGeo || !this.grassMaterial) return;

      const geo = bladeGeo as THREE.BufferGeometry;
      geo.scale(5, -7, 5);
      geo.computeBoundingBox();
      geo.translate(0, -geo.boundingBox!.min.y, 0);

      const mesh = new THREE.InstancedMesh(geo, this.grassMaterial, GRASS_COUNT);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.position.y = -0.18;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < GRASS_COUNT; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        dummy.position.set(side * (3.7 + Math.random() * 8), 0, (Math.random() - 0.5) * 300);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.setScalar(0.5 + Math.random() * 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.grassMesh = mesh;
      this.scene.add(mesh);
    });
  }
}
