import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { CsrfService } from './csrf.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { 'X-XSRF-TOKEN': token } }) : req;
}

/**
 * Añade la cabecera CSRF a las escrituras contra la API, consiguiendo antes la cookie si falta.
 * Si el back responde 403 (token caducado o rotado), se renueva y se reintenta una sola vez.
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!MUTATING.has(req.method) || !req.url.startsWith('/api/') || !isPlatformBrowser(inject(PLATFORM_ID))) {
    return next(req);
  }
  const csrf = inject(CsrfService);
  return from(csrf.ensure()).pipe(
    switchMap((token) => next(withToken(req, token))),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        return from(csrf.ensure(true)).pipe(switchMap((token) => next(withToken(req, token))));
      }
      return throwError(() => error);
    }),
  );
};
