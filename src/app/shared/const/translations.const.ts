import { Language, Translation } from '@models/translation.type';

/**
 * Словари текстов интерфейса. Ключи обоих языков типизированы одной
 * структурой Translation — забыть перевод невозможно: TypeScript не соберёт.
 * Порядок sections соответствует диапазонам SECTIONS из sections.const.
 */
export const TRANSLATIONS: Record<Language, Translation> = {
  ru: {
    loaderText: 'ЗАГРУЗКА СТРАНИЦЫ',
    scrollHint: 'Листайте вниз',
    themeAriaToLight: 'Переключить на светлую тему',
    themeAriaToDark: 'Переключить на тёмную тему',
    langAria: 'Switch language to English',

    sections: [
      { title: 'Nissan Skyline GT-R R34', subtitle: 'C-West Edition · 1999 год' },
      { title: 'Тормозная система', subtitle: 'Brembo · 4-поршневые суппорты · 324 мм' },
      { title: 'Кокпит', subtitle: 'Гоночный интерьер · NISMO Edition' },
      { title: 'Легенда автоспорта', subtitle: 'Рождён для гоночных трасс · 11 000 машин' },
    ],

    engineSpecs: [
      { label: 'Двигатель', value: 'RB26DETT', detail: 'Рядный · 6 цил. · Twin-Turbo' },
      { label: 'Мощность', value: '276 л.с.', detail: 'при 6 800 об/мин' },
      { label: 'Момент', value: '362 Нм', detail: 'при 4 400 об/мин' },
      { label: 'Разгон 0 – 100', value: '4.9 с', detail: 'Полный привод ATTESA' },
      { label: 'КПП', value: '6 ст.', detail: 'Механическая' },
      { label: 'Макс. скорость', value: '250+ км/ч', detail: 'Ограничитель электроники' },
    ],

    wheelSpecs: [
      { label: 'Передние тормоза', value: '324 мм', detail: 'Вентилируемые диски · 4-поршневые' },
      { label: 'Задние тормоза', value: '296 мм', detail: 'Вентилируемые диски · 2-поршневые' },
      { label: 'Колёса', value: '17"', detail: 'BBS LM · Кованые · C-West' },
      { label: 'Суппорт', value: 'Brembo', detail: 'Алюминиевый · Лёгкосплавной' },
    ],

    interiorSpecs: [
      { label: 'Сиденья', value: 'Recaro', detail: 'Ковшеобразные · гоночный профиль' },
      { label: 'Руль', value: 'MOMO', detail: '320 мм · карбон · замша' },
      { label: 'MFD дисплей', value: '1-й в Японии', detail: 'Мультифункц. дисплей · серийно' },
      { label: 'Приборы', value: '7 шкал', detail: 'Турбо · масло · температура · g-сенсор' },
    ],

    sceneControls: {
      title: 'Параметры сцены',
      sceneProperties: 'Свойства сцены',
      autoRotate: 'Авто-вращение',
      fogDensity: 'Плотность тумана',
      fogColor: 'Цвет тумана',
      grassProps: 'Трава',
      baseColor: 'Основной цвет',
      tipColor1: 'Цвет кончиков 1',
      tipColor2: 'Цвет кончиков 2',
      noiseScale: 'Масштаб шума',
      lighting: 'Освещение',
      lightIntensity: 'Яркость света',
      enableShadows: 'Включить тени',
      terrain: 'Ландшафт',
      terrainColor: 'Цвет земли',
      close: 'Закрыть панель',
    },
  },

  en: {
    loaderText: 'LOADING',
    scrollHint: 'Scroll down',
    themeAriaToLight: 'Switch to light theme',
    themeAriaToDark: 'Switch to dark theme',
    langAria: 'Переключить язык на русский',

    sections: [
      { title: 'Nissan Skyline GT-R R34', subtitle: 'C-West Edition · 1999' },
      { title: 'Braking System', subtitle: 'Brembo · 4-piston calipers · 324 mm' },
      { title: 'Cockpit', subtitle: 'Racing interior · NISMO Edition' },
      { title: 'Motorsport Legend', subtitle: 'Born for the racetrack · 11,000 built' },
    ],

    engineSpecs: [
      { label: 'Engine', value: 'RB26DETT', detail: 'Inline-6 · Twin-Turbo' },
      { label: 'Power', value: '276 hp', detail: '@ 6,800 rpm' },
      { label: 'Torque', value: '362 Nm', detail: '@ 4,400 rpm' },
      { label: '0 – 100 km/h', value: '4.9 s', detail: 'ATTESA all-wheel drive' },
      { label: 'Gearbox', value: '6-speed', detail: 'Manual' },
      { label: 'Top speed', value: '250+ km/h', detail: 'Electronically limited' },
    ],

    wheelSpecs: [
      { label: 'Front brakes', value: '324 mm', detail: 'Ventilated discs · 4-piston' },
      { label: 'Rear brakes', value: '296 mm', detail: 'Ventilated discs · 2-piston' },
      { label: 'Wheels', value: '17"', detail: 'BBS LM · Forged · C-West' },
      { label: 'Calipers', value: 'Brembo', detail: 'Lightweight aluminium alloy' },
    ],

    interiorSpecs: [
      { label: 'Seats', value: 'Recaro', detail: 'Bucket · racing profile' },
      { label: 'Steering wheel', value: 'MOMO', detail: '320 mm · carbon · suede' },
      { label: 'MFD display', value: '1st in Japan', detail: 'Multi-function display · stock' },
      { label: 'Gauges', value: '7 dials', detail: 'Boost · oil · temp · g-sensor' },
    ],

    sceneControls: {
      title: 'Scene settings',
      sceneProperties: 'Scene Properties',
      autoRotate: 'Auto Rotate',
      fogDensity: 'Fog density',
      fogColor: 'Fog color',
      grassProps: 'Grass',
      baseColor: 'Base color',
      tipColor1: 'Tip color 1',
      tipColor2: 'Tip color 2',
      noiseScale: 'Noise scale',
      lighting: 'Lighting',
      lightIntensity: 'Light intensity',
      enableShadows: 'Enable shadows',
      terrain: 'Terrain',
      terrainColor: 'Terrain color',
      close: 'Close controls',
    },
  },
};
