import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CarSceneService } from '@services/car-scene.service';
import { ThemeService } from '@services/theme.service';
import { LanguageService } from '@services/language.service';
import { LoaderComponent } from '@components/loader/loader.component';
import { SceneControlsComponent } from '@components/scene-controls/scene-controls.component';
import { clamp } from '@utils/math.utils';
import { SECTIONS } from '@const/sections.const';

@Component({
  selector: 'app-home',
  imports: [LoaderComponent, SceneControlsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private carScene = inject(CarSceneService);
  protected themeService = inject(ThemeService);
  protected languageService = inject(LanguageService);

  /** Словарь текстов активного языка (см. LanguageService) */
  protected readonly t = this.languageService.t;

  protected readonly scrollProgress = signal(0);
  protected readonly isModelLoaded = computed(() => this.carScene.loaded());
  protected readonly loadProgress = computed(() => this.carScene.loadProgress());

  protected readonly showTitle = computed(() => this.scrollProgress() < 0.1);
  protected readonly showSectionInfo = computed(() => this.scrollProgress() > 0.1);
  protected readonly showScrollHint = computed(() => this.scrollProgress() < 0.05);
  protected readonly showEngineSpecs = computed(
    () => this.scrollProgress() >= 0.08 && this.scrollProgress() < 0.25,
  );
  protected readonly showWheelSpecs = computed(
    () => this.scrollProgress() >= 0.25 && this.scrollProgress() < 0.55,
  );
  protected readonly showInteriorSpecs = computed(
    () => this.scrollProgress() >= 0.55 && this.scrollProgress() < 0.78,
  );

  /** Тексты текущей секции: индекс диапазона → словарь активного языка */
  protected readonly currentSection = computed(() => {
    const progress = this.scrollProgress();
    const idx = SECTIONS.findIndex((s) => progress >= s.from && progress < s.to);
    return this.t().sections[idx === -1 ? SECTIONS.length - 1 : idx];
  });

  ngAfterViewInit(): void {
    this.carScene.init(this.canvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.carScene.destroy();
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
    this.scrollProgress.set(progress);
    this.carScene.setScrollProgress(progress);
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
    this.carScene.updateTheme(this.themeService.theme());
  }

  protected toggleLanguage(): void {
    this.languageService.toggle();
  }
}
