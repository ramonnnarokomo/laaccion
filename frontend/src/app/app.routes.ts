import { Routes } from '@angular/router';
import { PublicLayout } from './shared/layout/public-layout';

export const routes: Routes = [
  // Panel editorial: carga diferida y solo en el navegador (ver app.routes.server.ts).
  { path: 'panel', loadChildren: () => import('./features/panel/panel.routes').then((m) => m.PANEL_ROUTES) },
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
      { path: 'articulo/:slug', loadComponent: () => import('./features/article/article-page').then((m) => m.ArticlePage) },
      {
        path: 'seccion/:slug',
        data: { kind: 'section' },
        loadComponent: () => import('./features/listing/listing-page').then((m) => m.ListingPage),
      },
      {
        path: 'etiqueta/:slug',
        data: { kind: 'tag' },
        loadComponent: () => import('./features/listing/listing-page').then((m) => m.ListingPage),
      },
      { path: 'tablon', loadComponent: () => import('./features/board/board-page').then((m) => m.BoardPage) },
      {
        path: 'texto-fundacional',
        loadComponent: () => import('./features/fundacional/fundacional-page').then((m) => m.FundacionalPage),
      },
      { path: 'quienes-somos', loadComponent: () => import('./features/about/about-page').then((m) => m.AboutPage) },
      { path: 'encuestas', loadComponent: () => import('./features/polls/polls-page').then((m) => m.PollsPage) },
      { path: 'encuestas/:id', loadComponent: () => import('./features/polls/poll-page').then((m) => m.PollPage) },
      {
        path: 'aviso-legal',
        data: { legal: 'aviso' },
        loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
      },
      {
        path: 'privacidad',
        data: { legal: 'privacidad' },
        loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
      },
      {
        path: 'cookies',
        data: { legal: 'cookies' },
        loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
      },
      { path: '**', loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound) },
    ],
  },
];
