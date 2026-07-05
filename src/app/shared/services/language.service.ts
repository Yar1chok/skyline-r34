import { Injectable, computed, signal } from '@angular/core';
import { Language } from '@models/translation.type';
import { TRANSLATIONS } from '@const/translations.const';

/**
 * Текущий язык интерфейса (ru/en), по образцу ThemeService.
 * Правда живёт в сигнале language; t — computed-словарь активного языка:
 * компоненты читают тексты как t().scrollHint, и при переключении языка
 * Angular сам перерисовывает всё, что от словаря зависит.
 * Атрибут lang на <html> обновляется для доступности и поисковиков.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _language = signal<Language>('ru');
  public readonly language = this._language.asReadonly();

  /** Словарь активного языка — единственный источник текстов интерфейса */
  public readonly t = computed(() => TRANSLATIONS[this._language()]);

  public toggle(): void {
    const next: Language = this._language() === 'ru' ? 'en' : 'ru';
    this._language.set(next);
    document.documentElement.lang = next;
  }
}
