import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { buildLights } from '@utils/scene-builders.utils';
import { makeGlowSprite } from '@utils/glow-sprite.utils';
import { Theme } from '@services/theme.service';

/**
 * Освещение сцены. Три независимых слоя:
 *
 * 1. Студийная схема (buildLights): ambient — общая заливка; key —
 *    основной направленный свет, единственный источник теней; fill —
 *    подсветка теневой стороны; rim — контровой сзади, обрисовывает силуэт.
 *    updateTheme() перекрашивает всю схему: ночь — холодные сине-фиолетовые,
 *    день/закат — тёплые оранжевые, key переезжает к солнцу у горизонта.
 *
 * 2. Огни машины (setupCarLights). Позиции не захардкожены, а считаются
 *    в долях от bbox загруженной модели (например, фары — 21% высоты кузова),
 *    поэтому переживут замену GLB. Каждый огонь — glow-спрайт (визуальное
 *    свечение) + PointLight (реальная засветка окружения). Фары видны только
 *    ночью; у фонарей отдельно живёт белая подсветка номера с коротким
 *    радиусом, чтобы номер не розовел от красного света.
 *
 * 3. Небесное тело (setupCelestialBody): сфера с текстурой луны или солнца
 *    на z=85 + два glow-спрайта (ближний ореол и дальнее гало) + PointLight
 *    и DirectionalLight в сторону машины. Пересоздаётся при смене темы;
 *    текстуры кэшируются, чтобы не перезагружать при каждом переключении.
 */
@Injectable({ providedIn: 'root' })
export class SceneLightingService {
  private scene!: THREE.Scene;

  private ambientLight: THREE.AmbientLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private rimLight: THREE.DirectionalLight | null = null;

  private headlightGroup: THREE.Group | null = null;
  private taillightGroup: THREE.Group | null = null;

  private celestialGroup: THREE.Group | null = null;
  private celestialLight: THREE.DirectionalLight | null = null;
  private celestialMesh: THREE.Mesh | null = null;
  private celestialTextures: Partial<Record<'sun' | 'moon', THREE.Texture>> = {};

  private currentTheme: Theme = 'dark';

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    ({
      ambientLight: this.ambientLight,
      keyLight: this.keyLight,
      fillLight: this.fillLight,
      rimLight: this.rimLight,
    } = buildLights(scene));
    this.setupCelestialBody('dark');
  }

  /** Вызывается один раз после загрузки модели (см. слой 2 в описании класса) */
  public setupCarLights(carModel: THREE.Group): void {
    this.setupHeadlights(carModel);
    this.setupTaillights(carModel);
  }

  public setLightIntensity(v: number): void {
    if (this.ambientLight) this.ambientLight.intensity = v;
  }

  public setKeyLightShadow(enabled: boolean): void {
    if (this.keyLight) this.keyLight.castShadow = enabled;
  }

  /** Перекраска студийной схемы + видимость фар + пересоздание солнца/луны */
  public updateTheme(theme: Theme): void {
    this.currentTheme = theme;
    const isDark = theme === 'dark';

    if (this.ambientLight) {
      this.ambientLight.color.set(isDark ? 0x8888ff : 0xffcc88);
      this.ambientLight.intensity = isDark ? 0.18 : 0.35;
    }
    if (this.keyLight) {
      this.keyLight.color.set(isDark ? 0xaabbff : 0xffaa44);
      this.keyLight.intensity = isDark ? 1.2 : 1.8;
      this.keyLight.position.set(isDark ? 5 : 0, isDark ? 10 : 8, isDark ? 5 : 85);
    }
    if (this.fillLight) {
      this.fillLight.color.set(isDark ? 0x6c7fff : 0xff8833);
      this.fillLight.intensity = isDark ? 0.4 : 0.5;
    }
    if (this.rimLight) {
      this.rimLight.color.set(isDark ? 0x9b6fff : 0xff6644);
      this.rimLight.intensity = isDark ? 0.3 : 0.4;
    }
    if (this.headlightGroup) {
      this.headlightGroup.visible = isDark;
    }

    this.setupCelestialBody(theme);
  }

  /** Кадровое обновление: медленное вращение солнца/луны */
  public update(dt: number): void {
    if (this.celestialMesh) this.celestialMesh.rotation.y += 0.02 * dt;
  }

  // ─── Car lights ──────────────────────────────────────────────────────────

  private setupHeadlights(carModel: THREE.Group): void {
    const bbox = new THREE.Box3().setFromObject(carModel);
    const frontZ = bbox.max.z - 0.05;
    const headY = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.21;
    const halfW = (bbox.max.x - bbox.min.x) * 0.29;

    const group = new THREE.Group();

    for (const sx of [-1, 1]) {
      const glow = makeGlowSprite('rgba(210,225,255,1.0)', 'rgba(150,180,255,0.2)', 0.5);
      glow.position.set(sx * halfW, headY, frontZ);
      group.add(glow);

      const light = new THREE.PointLight(0xbbd0ff, 2.5, 14);
      light.position.set(sx * halfW, headY, frontZ + 0.3);
      group.add(light);
    }

    group.visible = this.currentTheme === 'dark';
    this.scene.add(group);
    this.headlightGroup = group;
  }

  private setupTaillights(carModel: THREE.Group): void {
    const bbox = new THREE.Box3().setFromObject(carModel);
    const rearZ = bbox.min.z + 0.11;
    const tailY = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.65;
    const halfW = (bbox.max.x - bbox.min.x) * 0.36;

    const group = new THREE.Group();

    for (const sx of [-1, 1]) {
      const glow = makeGlowSprite('rgba(255,20,10,0.95)', 'rgba(200,0,0,0.25)', 0.4);
      glow.position.set(sx * halfW, tailY, rearZ);
      group.add(glow);
    }

    // Один общий свет далеко позади машины — освещает асфальт, не проникает в салон
    const light = new THREE.PointLight(0xff1100, 1.2, 8);
    light.position.set(0, tailY * 0.25, rearZ - 1.8);
    group.add(light);

    // Белая подсветка номерного знака: близко и с коротким радиусом,
    // чтобы не смешиваться с красным светом фонарей
    const plateY = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.18;
    const plateLight = new THREE.PointLight(0xffffff, 0.4, 1.2);
    plateLight.position.set(0, plateY, bbox.min.z - 0.35);
    group.add(plateLight);

    this.scene.add(group);
    this.taillightGroup = group;
  }

  // ─── Celestial body (sun / moon) ─────────────────────────────────────────

  private getCelestialTexture(kind: 'sun' | 'moon'): THREE.Texture {
    const cached = this.celestialTextures[kind];
    if (cached) return cached;
    const tex = new THREE.TextureLoader().load(`models/space/${kind}.jpg`);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.celestialTextures[kind] = tex;
    return tex;
  }

  private setupCelestialBody(theme: Theme): void {
    if (this.celestialGroup) {
      this.scene.remove(this.celestialGroup);
      this.celestialGroup = null;
      this.celestialMesh = null;
    }
    if (this.celestialLight) {
      this.scene.remove(this.celestialLight);
      this.scene.remove(this.celestialLight.target);
      this.celestialLight = null;
    }

    const isSun = theme === 'light';
    const group = new THREE.Group();

    // fog: false — тело на z=85 иначе почти полностью растворяется в FogExp2
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(isSun ? 2.5 : 2.0, 32, 32),
      new THREE.MeshBasicMaterial({
        map: this.getCelestialTexture(isSun ? 'sun' : 'moon'),
        toneMapped: false,
        fog: false,
      }),
    );
    this.celestialMesh = core;

    if (isSun) {
      group.add(
        core,
        makeGlowSprite('rgba(255,200,80,0.5)', 'rgba(255,100,20,0.2)', 14),
        makeGlowSprite('rgba(255,60,10,0.25)', 'rgba(255,20,0,0)', 55),
        new THREE.PointLight(0xff9933, 4, 140),
      );
    } else {
      group.add(
        core,
        makeGlowSprite('rgba(180,200,255,0.35)', 'rgba(60,80,200,0.08)', 10),
        makeGlowSprite('rgba(40,60,180,0.2)', 'rgba(0,0,80,0)', 44),
        new THREE.PointLight(0x6688dd, 3, 100),
      );
    }
    group.position.set(0, 8, 85);

    this.celestialGroup = group;
    this.scene.add(group);

    this.celestialLight = new THREE.DirectionalLight(
      isSun ? 0xffaa44 : 0x8899cc,
      isSun ? 2.5 : 3.0,
    );
    this.celestialLight.position.copy(group.position);
    this.celestialLight.target.position.set(0, 0, 0);
    this.scene.add(this.celestialLight);
    this.scene.add(this.celestialLight.target);
  }
}
