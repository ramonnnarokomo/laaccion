import { Pipe, PipeTransform } from '@angular/core';

const ZONE = 'Europe/Madrid';
const formats: Record<string, Intl.DateTimeFormat> = {
  larga: new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, day: 'numeric', month: 'long', year: 'numeric' }),
  corta: new Intl.DateTimeFormat('es-ES', { timeZone: ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }),
  hora: new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }),
  // Fechas sin hora (AAAA-MM-DD): se formatean en UTC para que no "cambien de día".
  dia: new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }),
};

export type FormatoFecha = 'larga' | 'corta' | 'hora' | 'dia';

/**
 * Fecha en hora de Madrid, igual en el servidor (UTC) y en el navegador. Usar el DatePipe sin
 * zona daría textos distintos en SSR y en el cliente y la hidratación se quejaría.
 */
export function formatFecha(value: string | Date | null | undefined, formato: FormatoFecha = 'larga'): string {
  if (!value) return '';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00Z') : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : formats[formato].format(date);
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, formato: FormatoFecha = 'larga'): string {
    return formatFecha(value, formato);
  }
}
