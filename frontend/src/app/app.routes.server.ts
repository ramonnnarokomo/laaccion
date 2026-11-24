import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Páginas estáticas: se generan una vez en el build.
  { path: 'texto-fundacional', renderMode: RenderMode.Prerender },
  { path: 'quienes-somos', renderMode: RenderMode.Prerender },
  { path: 'aviso-legal', renderMode: RenderMode.Prerender },
  { path: 'privacidad', renderMode: RenderMode.Prerender },
  { path: 'cookies', renderMode: RenderMode.Prerender },
  // Panel: sin SSR (no indexable, depende de la sesión del navegador).
  { path: 'panel', renderMode: RenderMode.Client },
  { path: 'panel/**', renderMode: RenderMode.Client },
  // Todo lo demás se renderiza en el servidor en cada petición (contenido vivo de la API).
  { path: '**', renderMode: RenderMode.Server },
];
