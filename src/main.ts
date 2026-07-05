import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';


// Скролл-презентация всегда начинается с верхней позиции,
// даже если пользователь обновил страницу в середине документа

history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
