import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { errorMessage, fieldErrors, toLoadState } from './load-state';

const httpError = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('errorMessage', () => {
  it('usa el detail del problem+json del back', () => {
    expect(errorMessage(httpError(409, { title: 'Conflict', detail: 'Ya has votado en esta encuesta.' }))).toBe('Ya has votado en esta encuesta.');
  });
  it('tiene mensajes por defecto para red, permisos, límite y servidor', () => {
    expect(errorMessage(httpError(0))).toContain('conexión');
    expect(errorMessage(httpError(403))).toContain('permiso');
    expect(errorMessage(httpError(429))).toContain('Demasiadas');
    expect(errorMessage(httpError(502))).toContain('servidor');
    expect(errorMessage(new Error('x'))).toBe('Ha ocurrido un error inesperado.');
  });
});

describe('fieldErrors', () => {
  it('convierte errors[] del back en un mapa campo → mensaje', () => {
    const e = httpError(400, { errors: [{ field: 'title', message: 'no debe estar vacío' }] });
    expect(fieldErrors(e)).toEqual({ title: 'no debe estar vacío' });
    expect(fieldErrors(new Error())).toEqual({});
  });
});

describe('toLoadState', () => {
  it('emite loading y luego ok', async () => {
    const states = await firstValueFrom(toLoadState(of(1)).pipe(toArray()));
    expect(states).toEqual([{ status: 'loading' }, { status: 'ok', data: 1 }]);
  });
  it('distingue 404 del resto de errores', async () => {
    expect((await firstValueFrom(toLoadState(throwError(() => httpError(404))).pipe(toArray())))[1]).toEqual({ status: 'not-found' });
    expect((await firstValueFrom(toLoadState(throwError(() => httpError(500))).pipe(toArray())))[1].status).toBe('error');
  });
});
