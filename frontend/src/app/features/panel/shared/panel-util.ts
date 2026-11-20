/** Instante ISO → valor de <input type="datetime-local"> en la hora local del navegador. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Valor de <input type="datetime-local"> (hora local) → instante ISO en UTC para la API. */
export function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "a, b , c" → ["a","b","c"] sin vacíos ni duplicados (sin distinguir mayúsculas). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim().replace(/^#/, '');
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      out.push(tag);
    }
  }
  return out;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programado',
  PUBLISHED: 'Publicado',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  ACTIVE: 'Activo',
  EXPIRED: 'Pasado',
  HIDDEN: 'Oculto',
};
