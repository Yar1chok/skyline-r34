import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { CarSceneService } from '@services/car-scene.service';

// jsdom не поддерживает WebGL, поэтому сцена подменяется моком
class CarSceneServiceMock {
  readonly loaded = signal(false).asReadonly();
  readonly loadProgress = signal(0).asReadonly();
  init(): void {}
  destroy(): void {}
  setScrollProgress(): void {}
  updateTheme(): void {}
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: CarSceneService, useClass: CarSceneServiceMock }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Skyline GT-R');
  });
});
