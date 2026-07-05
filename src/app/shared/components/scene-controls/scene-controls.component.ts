import { Component, inject, signal } from '@angular/core';
import { CarSceneService } from '@services/car-scene.service';
import { SceneCameraService } from '@services/scene-camera.service';
import { SceneLightingService } from '@services/scene-lighting.service';
import { SceneEnvironmentService } from '@services/scene-environment.service';
import { LanguageService } from '@services/language.service';

type SceneParams = {
  fogDensity: number;
  fogColor: string;
  autoRotate: boolean;
  grassBase: string;
  grassTip1: string;
  grassTip2: string;
  noiseScale: number;
  lightIntensity: number;
  shadowsEnabled: boolean;
  terrainColor: string;
};

@Component({
  selector: 'app-scene-controls',
  standalone: true,
  imports: [],
  templateUrl: './scene-controls.component.html',
  styleUrl: './scene-controls.component.scss',
})
export class SceneControlsComponent {
  private carScene = inject(CarSceneService);
  private camera = inject(SceneCameraService);
  private lighting = inject(SceneLightingService);
  private environment = inject(SceneEnvironmentService);

  /** Тексты панели на активном языке */
  protected readonly t = inject(LanguageService).t;

  protected open = signal(false);

  protected params: SceneParams = {
    fogDensity: 0.022,
    fogColor: '#05050f',
    autoRotate: false,
    grassBase: '#2d6614',
    grassTip1: '#5ab428',
    grassTip2: '#459020',
    noiseScale: 0.45,
    lightIntensity: 0.6,
    shadowsEnabled: false,
    terrainColor: '#2e4221',
  };

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected onFogDensity(e: Event): void {
    const v = +(e.target as HTMLInputElement).value;
    this.params.fogDensity = v;
    this.environment.setFogDensity(v);
  }

  protected onFogColor(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.params.fogColor = v;
    this.environment.setFogColor(v);
  }

  protected onAutoRotate(e: Event): void {
    const v = (e.target as HTMLInputElement).checked;
    this.params.autoRotate = v;
    this.camera.setAutoRotate(v);
  }

  protected onGrassBase(e: Event): void {
    this.params.grassBase = (e.target as HTMLInputElement).value;
    this.applyGrassColors();
  }

  protected onGrassTip1(e: Event): void {
    this.params.grassTip1 = (e.target as HTMLInputElement).value;
    this.applyGrassColors();
  }

  protected onGrassTip2(e: Event): void {
    this.params.grassTip2 = (e.target as HTMLInputElement).value;
    this.applyGrassColors();
  }

  protected onNoiseScale(e: Event): void {
    const v = +(e.target as HTMLInputElement).value;
    this.params.noiseScale = v;
    this.environment.setGrassNoiseScale(v);
  }

  protected onLightIntensity(e: Event): void {
    const v = +(e.target as HTMLInputElement).value;
    this.params.lightIntensity = v;
    this.lighting.setLightIntensity(v);
  }

  protected onShadowsEnabled(e: Event): void {
    const v = (e.target as HTMLInputElement).checked;
    this.params.shadowsEnabled = v;
    this.carScene.setShadowsEnabled(v);
  }

  protected onTerrainColor(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.params.terrainColor = v;
    this.environment.setTerrainColor(v);
  }

  private applyGrassColors(): void {
    this.environment.setGrassColors(
      this.params.grassBase,
      this.params.grassTip1,
      this.params.grassTip2,
    );
  }
}
