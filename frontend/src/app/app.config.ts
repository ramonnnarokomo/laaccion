import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { authErrorInterceptor } from './core/http/auth-error.interceptor';
import { csrfInterceptor } from './core/http/csrf.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([csrfInterceptor, authErrorInterceptor])),
    // La hidratación reutiliza el HTML del servidor y su caché de peticiones (sin pedir dos veces).
    provideClientHydration(withEventReplay()),
  ],
};
