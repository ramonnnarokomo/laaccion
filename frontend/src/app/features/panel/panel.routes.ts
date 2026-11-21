import { DOCUMENT, inject } from '@angular/core';
import { CanDeactivateFn, Router, Routes } from '@angular/router';
import { adminGuard, authGuard } from '../../core/auth/auth.guards';
import { isSoftKeyboardOpen, isTextEditable } from '../../core/util/soft-keyboard';
import { PanelLayout } from './panel-layout';

/**
 * Al salir de una página del panel:
 * 1. Si se ha pulsado «atrás» mientras se escribe con el teclado del móvil abierto, solo se cierra el
 *    teclado y no se navega (como en cualquier app). Va en el mismo guard que el aviso de cambios porque
 *    Angular ejecuta todos los guards de una ruta a la vez y el confirm() saltaría igualmente.
 * 2. Si la página tiene algo abierto (un diálogo, el editor a pantalla completa), «atrás» lo cierra.
 * 3. Si el formulario tiene cambios sin guardar, se pide confirmación.
 */
export const unsavedChangesGuard: CanDeactivateFn<{ isDirty?(): boolean; handleBack?(): boolean } | null> = (
  component,
) => {
  const doc = inject(DOCUMENT);
  if (inject(Router).currentNavigation()?.trigger === 'popstate') {
    const active = doc.activeElement;
    if (isTextEditable(active) && isSoftKeyboardOpen(doc)) {
      active.blur();
      return false;
    }
    // La página puede tener algo abierto que «atrás» debe cerrar primero (diálogo, editor ampliado).
    if (component?.handleBack?.()) return false;
  }
  return !component?.isDirty?.() || confirm('Tienes cambios sin guardar. ¿Salir igualmente?');
};

export const PANEL_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login').then((m) => m.Login) },
  {
    path: '',
    component: PanelLayout,
    canMatch: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'articulos' },
      { path: 'articulos', canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./articles-list').then((m) => m.ArticlesList) },
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
      { path: 'tablon', canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./announcements').then((m) => m.Announcements) },
      { path: 'encuestas', canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./polls-admin').then((m) => m.PollsAdmin) },
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
      { path: 'imagenes', canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./images').then((m) => m.Images) },
      { path: 'cuenta', canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./account').then((m) => m.Account) },
      { path: 'secciones', canMatch: [adminGuard], canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./categories').then((m) => m.Categories) },
      { path: 'usuarios', canMatch: [adminGuard], canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./users').then((m) => m.Users) },
      { path: 'auditoria', canMatch: [adminGuard], canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./audit').then((m) => m.Audit) },
      { path: '**', redirectTo: 'articulos' },
    ],
  },
];
