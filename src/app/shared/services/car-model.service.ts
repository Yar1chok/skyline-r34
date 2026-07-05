import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { WHEEL_NAMES } from '@const/scene.const';

/**
 * Модель машины: загрузка GLB и всё, что относится к самому кузову.
 *
 * Пайплайн load():
 *  1. LoadingManager считает загруженные файлы и обновляет сигнал
 *     loadProgress (0..100) — его отображает лоадер на главной;
 *  2. модель нормализуется: масштабируется так, чтобы наибольший габарит
 *     стал 3 юнита, и центрируется по X/Z (по Y ставится на землю) —
 *     благодаря этому остальной код не зависит от размеров исходника;
 *  3. по именам из WHEEL_NAMES находятся узлы колёс (для вращения при
 *     скролле), а мировая позиция переднего правого колеса отдаётся
 *     в onLoaded — оркестратор передаёт её камере под кейфреймы «колесо».
 *
 * Сигнал loaded переключает исчезновение лоадера.
 */
@Injectable({ providedIn: 'root' })
export class CarModelService {
  private carModel: THREE.Group | null = null;
  private wheelNodes: THREE.Object3D[] = [];

  private readonly _loaded = signal(false);
  private readonly _loadProgress = signal(0);

  readonly loaded = this._loaded.asReadonly();
  readonly loadProgress = this._loadProgress.asReadonly();

  public get model(): THREE.Group | null {
    return this.carModel;
  }

  /**
   * Загружает модель в сцену. В onLoaded приходит модель и мировая позиция
   * переднего правого колеса (для кейфреймов камеры), если колесо нашлось.
   */
  public load(
    scene: THREE.Scene,
    onLoaded: (model: THREE.Group, frontRightWheelPos: THREE.Vector3 | null) => void,
  ): void {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      this._loadProgress.set(Math.round((loaded / total) * 100));
    };

    new GLTFLoader(manager).load('models/skyline-r34.glb', (gltf) => {
      const model = gltf.scene;

      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const scale = 3 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);

      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.y = 0;

      this.carModel = model;
      scene.add(model);
      model.updateWorldMatrix(true, true);

      for (const name of WHEEL_NAMES) {
        const node = model.getObjectByName(name);
        if (node) this.wheelNodes.push(node);
      }

      this.mergeStaticMeshes(model);

      let frontRightWheelPos: THREE.Vector3 | null = null;
      const frontRight = model.getObjectByName('3DWheel_Front_R');
      if (frontRight) {
        frontRightWheelPos = new THREE.Vector3();
        frontRight.getWorldPosition(frontRightWheelPos);
      }

      this._loadProgress.set(100);
      this._loaded.set(true);
      onLoaded(model, frontRightWheelPos);
    });
  }

  /**
   * Оптимизация draw calls: GLB машины состоит из ~1400 отдельных мешей
   * (каждое колесо — 316 штук: спицы, болты, ламели протектора), и каждый —
   * свой вызов отрисовки. На этом сцена держала <15 FPS.
   * Кузов сливается относительно корня модели, каждое колесо — относительно
   * своего узла: колесо вращается как узел, и запечённые в него меши
   * вращаются вместе с ним.
   */
  private mergeStaticMeshes(model: THREE.Group): void {
    const wheelRoots = this.wheelNodes;
    const inWheel = (obj: THREE.Object3D): boolean => {
      for (let p: THREE.Object3D | null = obj; p; p = p.parent) {
        if (wheelRoots.includes(p)) return true;
      }
      return false;
    };

    this.mergeSubtree(model, inWheel);
    for (const wheel of this.wheelNodes) this.mergeSubtree(wheel);
  }

  /**
   * Сливает меши поддерева с одинаковым материалом и совместимой геометрией
   * в один меш на материал. Трансформация каждого меша запекается в вершины
   * (относительно root), атрибуты сводятся к position/normal/uv.
   * Несовместимые группы (мультиматериалы и т.п.) остаются как есть.
   */
  private mergeSubtree(root: THREE.Object3D, exclude?: (obj: THREE.Object3D) => boolean): void {
    const KEEP_ATTRS = ['position', 'normal', 'uv'];

    root.updateWorldMatrix(true, true);
    const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const relative = new THREE.Matrix4();

    type Bucket = { material: THREE.Material; geos: THREE.BufferGeometry[]; sources: THREE.Mesh[] };
    const buckets = new Map<string, Bucket>();

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || exclude?.(mesh)) return;

      const geo = mesh.geometry.clone();
      for (const attr of Object.keys(geo.attributes)) {
        if (!KEEP_ATTRS.includes(attr)) geo.deleteAttribute(attr);
      }
      geo.morphAttributes = {};
      // Запекаем позицию/поворот/масштаб меша в вершины (относительно root)
      relative.multiplyMatrices(rootInverse, mesh.matrixWorld);
      geo.applyMatrix4(relative);

      const attrsKey = Object.keys(geo.attributes).sort().join(',');
      const key = `${(mesh.material as THREE.Material).uuid}|${attrsKey}|${geo.index ? 'i' : 'n'}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material: mesh.material as THREE.Material, geos: [], sources: [] };
        buckets.set(key, bucket);
      }
      bucket.geos.push(geo);
      bucket.sources.push(mesh);
    });

    for (const { material, geos, sources } of buckets.values()) {
      if (geos.length < 2) continue;
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) continue; // несовместимые атрибуты — оставляем исходные меши

      for (const src of sources) src.removeFromParent();
      root.add(new THREE.Mesh(merged, material));
    }
  }

  /** Вращение колёс синхронно с прокруткой: 14 полных оборотов на весь скролл */
  public animateWheels(progress: number): void {
    const angle = progress * Math.PI * 28;
    for (const wheel of this.wheelNodes) wheel.rotation.x = angle;
  }

  public setCastShadow(enabled: boolean): void {
    this.carModel?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = enabled;
        mesh.receiveShadow = false;
        if (mesh.material) (mesh.material as THREE.Material).needsUpdate = true;
      }
    });
  }
}
