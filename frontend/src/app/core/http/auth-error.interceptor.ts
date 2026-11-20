import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/**
 * Si una llamada del panel devuelve 401 (la sesión caducó o un admin desactivó la cuenta),
 * se limpia el estado local y se manda al login. /auth/me se excluye: el propio AuthService
 * interpreta ese 401 como "no hay sesión".
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      const isPanelCall = req.url.startsWith('/api/v1/admin/') || req.url === '/api/v1/auth/password';
      if (error instanceof HttpErrorResponse && error.status === 401 && isPanelCall) {
        auth.clearSession();
        void router.navigate(['/panel/login'], { queryParams: { volver: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
