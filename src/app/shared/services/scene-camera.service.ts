import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { easeInOutCubic } from '@utils/math.utils';
import { CAMERA_KEYFRAMES, AUTO_ROTATE_SPEED, CAMERA_SMOOTHING } from '@const/scene.const';
import { CameraKeyframe } from '@models/camera-keyframe.type';

/**
 * Камера: маршрут по кейфреймам, управляемый прогрессом прокрутки.
 *
 * Как устроен маршрут:
 * CAMERA_KEYFRAMES — 9 опорных точек (позиция камеры + куда смотреть),
 * т.е. 8 сегментов по 12.5% прокрутки. Фазы: сбоку и облёт (0–25%) →
 * переднее колесо (25–55%) → салон (55–78%) → вид сзади (78–100%).
 * Пары одинаковых соседних кейфреймов (3–4, 5–6) дают «паузу»: камера
 * стоит на месте, пока пользователь читает характеристики.
 *
 * Двухступенчатое движение:
 *  1. setScrollProgress() переводит прогресс 0..1 в пару (targetPosition,
 *     targetLookAt): выбирается сегмент, внутри него — линейная интерполяция
 *     с изгибом easeInOutCubic, чтобы камера мягко стартовала и тормозила;
 *  2. update(dt) каждый кадр экспоненциально доводит фактическую камеру до
 *     цели (сглаживание не зависит от FPS). Поэтому даже резкий скролл
 *     выглядит как плавный полёт.
 *
 * Авто-вращение (чекбокс в панели настроек) перехватывает управление:
 * скролл игнорируется, камера кружит вокруг машины по окружности радиуса 5.5.
 */
@Injectable({ providedIn: 'root' })
export class SceneCameraService {
  private _camera!: THREE.PerspectiveCamera;

  // Клоны, а не ссылки: кейфреймы 3–4 перезаписываются позицией колеса,
  // константа должна остаться нетронутой
  private keyframes: CameraKeyframe[] = CAMERA_KEYFRAMES.map((kf) => ({
    position: kf.position.clone(),
    target: kf.target.clone(),
  }));

  // Фактическая точка взгляда и цель, к которой камера "догоняется" в update()
  private currentLookAt = this.keyframes[0].target.clone();
  private targetPosition = this.keyframes[0].position.clone();
  private targetLookAt = this.keyframes[0].target.clone();

  private autoRotateEnabled = false;
  private autoRotateAngle = 0;

  public get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  public init(aspect: number): THREE.PerspectiveCamera {
    // near = 0.05: при 0.01 точность depth-буфера вдали падает настолько,
    // что дорога и разметка начинают мерцать (z-fighting).
    // far = 150: туман (FogExp2 0.022) полностью съедает всё дальше ~100,
    // но объекты до far-плоскости всё равно рисовались бы — отсекаем их
    this._camera = new THREE.PerspectiveCamera(40, aspect, 0.05, 150);
    this._camera.position.copy(this.targetPosition);
    this._camera.lookAt(this.currentLookAt);
    return this._camera;
  }

  /**
   * Кейфреймы 3 и 4 (фаза «колесо») задаются в константе приблизительно,
   * потому что точное положение колеса зависит от масштаба конкретной модели.
   * После загрузки GLB сюда приходит мировая позиция узла 3DWheel_Front_R,
   * и оба кейфрейма перепривязываются к ней со смещениями.
   */
  public setWheelKeyframes(wheelWorldPos: THREE.Vector3): void {
    this.keyframes[3] = {
      position: wheelWorldPos.clone().add(new THREE.Vector3(-1.1, 0, 0)),
      target: wheelWorldPos.clone(),
    };
    this.keyframes[4] = {
      position: wheelWorldPos.clone().add(new THREE.Vector3(-1.1, 0.3, -0.4)),
      target: wheelWorldPos.clone(),
    };
  }

  /** Прогресс 0..1 → целевая позиция/взгляд камеры (см. описание класса) */
  public setScrollProgress(progress: number): void {
    if (this.autoRotateEnabled) return;

    const segments = this.keyframes.length - 1;
    const scaled = progress * segments; // напр. 0.3 * 8 = 2.4
    const idx = Math.min(Math.floor(scaled), segments - 1); // сегмент 2
    const local = easeInOutCubic(scaled - idx); // позиция внутри сегмента 0..1
    const { position: fromPos, target: fromTgt } = this.keyframes[idx];
    const { position: toPos, target: toTgt } = this.keyframes[idx + 1];

    this.targetPosition.lerpVectors(fromPos, toPos, local);
    this.targetLookAt.lerpVectors(fromTgt, toTgt, local);
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotateEnabled = enabled;
    if (enabled) {
      this.autoRotateAngle = Math.atan2(this._camera.position.x, this._camera.position.z);
    }
  }

  /**
   * Кадровое обновление (dt — секунды с прошлого кадра).
   * Сглаживание экспоненциальное: 1 - exp(-k·dt) даёт одинаковую скорость
   * "догона" при любом FPS — на 144 Гц камера не станет резвее, чем на 60.
   */
  public update(dt: number): void {
    if (this.autoRotateEnabled) {
      this.autoRotateAngle += AUTO_ROTATE_SPEED * dt;
      this.targetPosition.set(
        Math.sin(this.autoRotateAngle) * 5.5,
        1.5,
        Math.cos(this.autoRotateAngle) * 5.5,
      );
      this.targetLookAt.set(0, 0.4, 0);
    }

    const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * dt);
    this._camera.position.lerp(this.targetPosition, smoothing);
    this.currentLookAt.lerp(this.targetLookAt, smoothing);
    this._camera.lookAt(this.currentLookAt);
  }

  public resize(aspect: number): void {
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
  }
}
