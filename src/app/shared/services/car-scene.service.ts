import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { clamp } from '@utils/math.utils';
import { SceneCameraService } from '@services/scene-camera.service';
import { SceneLightingService } from '@services/scene-lighting.service';
import { SceneEnvironmentService } from '@services/scene-environment.service';
import { CarModelService } from '@services/car-model.service';
import { Theme } from '@services/theme.service';

/**
 * Оркестратор 3D-сцены — единственная точка входа для компонентов.
 *
 * Владеет тем, что нельзя отдать подсистемам: WebGL-рендерером, объектом
 * сцены и циклом кадров (requestAnimationFrame). Всю предметную работу
 * делегирует четырём сервисам:
 *  - SceneCameraService      — положение камеры (кейфреймы, авто-вращение);
 *  - SceneLightingService    — свет: студийная схема, фары/фонари, солнце/луна;
 *  - SceneEnvironmentService — окружение: земля, дорога, трава, деревья, туман;
 *  - CarModelService         — загрузка GLB-модели и её колёса.
 *
 * Жизненный цикл: HomeComponent вызывает init(canvas) после создания вью
 * и destroy() при уничтожении. Каждое событие скролла страницы транслируется
 * в setScrollProgress(0..1), от которого подсистемы рассчитывают своё состояние.
 *
 * Схема кадра (animate):
 *  1. dt — время с прошлого кадра в секундах (для скоростей, не зависящих от FPS);
 *  2. окружение обновляет время ветра в шейдере травы;
 *  3. свет вращает солнце/луну;
 *  4. камера доводится к целевой позиции (плавное сглаживание);
 *  5. рендер.
 */
@Injectable({ providedIn: 'root' })
export class CarSceneService {
  private cameraService = inject(SceneCameraService);
  private lighting = inject(SceneLightingService);
  private environment = inject(SceneEnvironmentService);
  private model = inject(CarModelService);

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private canvas!: HTMLCanvasElement;
  private rafId = 0;
  private resizeObserver!: ResizeObserver;
  private lastFrameTime = performance.now();

  // ─── Адаптивное качество ──────────────────────────────────────────────────
  // Сцена fill-rate-bound: на слабых GPU стоимость пикселя (свет + MSAA)
  // ограничивает FPS. Если кадры проседают, понижаем разрешение рендера
  // ступенями по 20% (до 60% от базового) — плавность важнее чёткости.
  private static readonly PIXEL_RATIO_CAP = 1.5;
  private static readonly MIN_QUALITY_SCALE = 0.6;
  private static readonly TARGET_FPS = 28;
  private qualityScale = 1;
  private fpsFrames = 0;
  private fpsWindowStart = performance.now();

  /** Прокси на сигналы CarModelService — их читает лоадер на главной */
  readonly loaded = this.model.loaded;
  readonly loadProgress = this.model.loadProgress;

  /**
   * Создаёт сцену, рендерер и камеру, инициализирует подсистемы и запускает
   * цикл кадров. Загрузка модели асинхронная: когда GLB готов, фары/фонари
   * привязываются к габаритам машины, а кейфреймы камеры — к колесу.
   * ResizeObserver держит размер рендерера и аспект камеры в актуальном виде.
   */
  public init(canvas: HTMLCanvasElement): void {
    const { offsetWidth: w, offsetHeight: h } = canvas;
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.camera = this.cameraService.init(w / h);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.applyRenderSize();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.lighting.init(this.scene);
    this.environment.init(this.scene);

    this.model.load(this.scene, (carModel, frontRightWheelPos) => {
      if (frontRightWheelPos) this.cameraService.setWheelKeyframes(frontRightWheelPos);
      this.lighting.setupCarLights(carModel);
    });

    this.resizeObserver = new ResizeObserver(() => this.onResize(canvas));
    this.resizeObserver.observe(canvas);

    this.animate();
  }

  /**
   * Главный «нерв» страницы: прогресс прокрутки 0..1 раздаётся подсистемам —
   * камера едет по кейфреймам, колёса крутятся, окружение смещается навстречу.
   */
  public setScrollProgress(rawProgress: number): void {
    const progress = clamp(rawProgress, 0, 1);
    this.cameraService.setScrollProgress(progress);
    this.model.animateWheels(progress);
    this.environment.updateScroll(progress);
  }

  /** День/ночь: свет и небесное тело меняет lighting, цвета окружения — environment */
  public updateTheme(theme: Theme): void {
    this.lighting.updateTheme(theme);
    this.environment.applyTheme(theme === 'dark');
  }

  /** Тени включаются сразу в трёх подсистемах: свет, земля, модель */
  public setShadowsEnabled(enabled: boolean): void {
    this.lighting.setKeyLightShadow(enabled);
    this.environment.enableGroundShadow();
    this.model.setCastShadow(enabled);
  }

  private animate(): void {
    this.rafId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    // Кап на 0.1 c: после возврата на фоновую вкладку rAF отдаёт огромную дельту
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.adaptQuality(now);

    this.environment.updateGrassTime(now * 0.001);
    this.lighting.update(dt);
    this.cameraService.update(dt);

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Раз в 2.5 c сверяет средний FPS с целевым и при просадке понижает
   * разрешение рендера на ступень. Пока модель грузится, замер не идёт
   * (FPS во время загрузки нерепрезентативен). Обратно качество не
   * поднимается — иначе система осциллирует между ступенями.
   */
  private adaptQuality(now: number): void {
    if (!this.model.loaded()) {
      this.fpsFrames = 0;
      this.fpsWindowStart = now;
      return;
    }

    this.fpsFrames++;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed < 2500) return;

    const fps = (this.fpsFrames * 1000) / elapsed;
    this.fpsFrames = 0;
    this.fpsWindowStart = now;

    if (fps < CarSceneService.TARGET_FPS && this.qualityScale > CarSceneService.MIN_QUALITY_SCALE) {
      this.qualityScale = Math.max(CarSceneService.MIN_QUALITY_SCALE, this.qualityScale - 0.2);
      this.applyRenderSize();
    }
  }

  /**
   * Итоговое разрешение = devicePixelRatio (кап 1.5: выше — почти
   * незаметно, но кратно дороже) × адаптивный множитель качества.
   */
  private applyRenderSize(): void {
    const { offsetWidth: w, offsetHeight: h } = this.canvas;
    if (!w || !h) return;
    const ratio = Math.min(window.devicePixelRatio, CarSceneService.PIXEL_RATIO_CAP);
    this.renderer.setPixelRatio(ratio * this.qualityScale);
    this.renderer.setSize(w, h, false);
  }

  private onResize(canvas: HTMLCanvasElement): void {
    const { offsetWidth: w, offsetHeight: h } = canvas;
    if (!w || !h) return;
    this.cameraService.resize(w / h);
    // devicePixelRatio мог измениться (переезд окна на другой монитор)
    this.applyRenderSize();
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
