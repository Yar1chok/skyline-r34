import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/**
 * Текущая тема (ночь/закат). Правда живёт в сигнале theme; при переключении
 * дублируется в атрибут data-theme на <html> — по нему CSS-переменные
 * в variables.scss меняют палитру интерфейса. 3D-сцена о переключении
 * узнаёт отдельно: HomeComponent.toggleTheme() дёргает CarSceneService.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>('dark');
  readonly theme = this._theme.asReadonly();

  public toggle(): void {
    const next: Theme = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
  }
}
