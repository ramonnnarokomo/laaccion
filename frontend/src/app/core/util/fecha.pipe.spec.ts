import { describe, expect, it } from 'vitest';
import { formatFecha } from './fecha.pipe';

describe('formatFecha', () => {
  it('usa la hora de Madrid (no la del servidor)', () => {
    // 23:30 UTC del 31 de diciembre = 00:30 del 1 de enero en Madrid
    expect(formatFecha('2026-12-31T23:30:00Z', 'larga')).toBe('1 de enero de 2027');
    expect(formatFecha('2026-07-01T10:05:00Z', 'hora')).toBe('01/07/2026, 12:05');
  });

  it('no cambia de día las fechas sin hora', () => {
    expect(formatFecha('2026-11-26', 'dia')).toBe('jueves, 26 de noviembre');
  });

  it('devuelve vacío con valores nulos o inválidos', () => {
    expect(formatFecha(null)).toBe('');
    expect(formatFecha('no-es-fecha')).toBe('');
  });
});
