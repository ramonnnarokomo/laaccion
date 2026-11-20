import { CanDeactivateFn, Routes } from '@angular/router';
import { adminGuard, authGuard } from '../../core/auth/auth.guards';
import { PanelLayout } from './panel-layout';

/** Avisa antes de salir de un formulario con cambios sin guardar. */
export const unsavedChangesGuard: CanDeactivateFn<{ isDirty(): boolean }> = (component) =>
  !component?.isDirty?.() || confirm('Tienes cambios sin guardar. ¿Salir igualmente?');

export const PANEL_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login').then((m) => m.Login) },
  {
    path: '',
    component: PanelLayout,
    canMatch: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'articulos' },
      { path: 'articulos', loadComponent: () => import('./articles-list').then((m) => m.ArticlesList) },
      {
        path: 'articulos/nuevo',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./article-editor').then((m) => m.ArticleEditor),
      },
      {
        path: 'articulos/:id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./article-editor').then((m) => m.ArticleEditor),
      },
      { path: 'tablon', loadComponent: () => import('./announcements').then((m) => m.Announcements) },
      { path: 'encuestas', loadComponent: () => import('./polls-admin').then((m) => m.PollsAdmin) },
      {
        path: 'encuestas/nueva',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./poll-editor').then((m) => m.PollEditor),
      },
      {
        path: 'encuestas/:id',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./poll-editor').then((m) => m.PollEditor),
      },
      { path: 'imagenes', loadComponent: () => import('./images').then((m) => m.Images) },
      { path: 'cuenta', loadComponent: () => import('./account').then((m) => m.Account) },
      { path: 'secciones', canMatch: [adminGuard], loadComponent: () => import('./categories').then((m) => m.Categories) },
      { path: 'usuarios', canMatch: [adminGuard], loadComponent: () => import('./users').then((m) => m.Users) },
      { path: 'auditoria', canMatch: [adminGuard], loadComponent: () => import('./audit').then((m) => m.Audit) },
      { path: '**', redirectTo: 'articulos' },
    ],
  },
];
