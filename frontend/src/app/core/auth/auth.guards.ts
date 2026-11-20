import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Experiencia de usuario: sin sesión, al login. La seguridad real la impone el back. */
export const authGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    if (await auth.restore()) return true;
  } catch {
    // back caído: se manda al login, que mostrará el error al intentar entrar
  }
  const volver = '/panel/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/panel/login'], { queryParams: { volver } });
};

export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.restore().catch(() => null);
  return me?.role === 'ADMIN' ? true : router.createUrlTree(['/panel']);
};
