import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, startWith } from 'rxjs';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

/** Envuelve una petición en estados de carga, éxito, no encontrado y error para las plantillas. */
export function toLoadState<T>(source: Observable<T>): Observable<LoadState<T>> {
  return source.pipe(
    map((data): LoadState<T> => ({ status: 'ok', data })),
    catchError((error: unknown) =>
      of<LoadState<T>>(
        error instanceof HttpErrorResponse && error.status === 404
          ? { status: 'not-found' }
          : { status: 'error', message: errorMessage(error) },
      ),
    ),
    startWith<LoadState<T>>({ status: 'loading' }),
  );
}

/** Mensaje legible a partir de un error de la API (problem+json) o de red. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. Inténtalo de nuevo en unos segundos.';
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail) return detail;
    if (error.status === 403) return 'No tienes permiso para hacer esto.';
    if (error.status === 429) return 'Demasiadas peticiones seguidas. Espera un momento.';
    if (error.status >= 500) return 'El servidor ha tenido un problema. Inténtalo más tarde.';
  }
  return 'Ha ocurrido un error inesperado.';
}

/** Errores de validación por campo que devuelve el back ({ field, message }[]). */
export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (error instanceof HttpErrorResponse) {
    const errors = (error.error as { errors?: { field: string; message: string }[] } | null)?.errors;
    for (const e of errors ?? []) result[e.field] = e.message;
  }
  return result;
}
