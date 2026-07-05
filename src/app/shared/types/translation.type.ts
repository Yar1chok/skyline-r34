export type Language = 'ru' | 'en';

/** Карточка характеристики в оверлее (подпись / значение / расшифровка) */
export type SpecItem = {
  label: string;
  value: string;
  detail: string;
};

/** Заголовок и подзаголовок секции скролл-повествования */
export type SectionText = {
  title: string;
  subtitle: string;
};

/**
 * Полный словарь текстов одного языка.
 * Порядок в sections соответствует диапазонам SECTIONS из sections.const.
 */
export type Translation = {
  loaderText: string;
  scrollHint: string;
  themeAriaToLight: string;
  themeAriaToDark: string;
  langAria: string;
  sections: SectionText[];
  engineSpecs: SpecItem[];
  wheelSpecs: SpecItem[];
  interiorSpecs: SpecItem[];
  sceneControls: {
    title: string;
    sceneProperties: string;
    autoRotate: string;
    fogDensity: string;
    fogColor: string;
    grassProps: string;
    baseColor: string;
    tipColor1: string;
    tipColor2: string;
    noiseScale: string;
    lighting: string;
    lightIntensity: string;
    enableShadows: string;
    terrain: string;
    terrainColor: string;
    close: string;
  };
};
