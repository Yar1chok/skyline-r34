import { Component, inject, input } from '@angular/core';
import { LanguageService } from '@services/language.service';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
})
export class LoaderComponent {
  public readonly progress = input.required<number>();
  public readonly loaded = input.required<boolean>();

  protected readonly t = inject(LanguageService).t;
}
