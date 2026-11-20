import { describe, expect, it } from 'vitest';
import { isPollVideo } from '../poll-editor';
import { SLUG_PATTERN, formatBytes, fromLocalInput, parseTags, toLocalInput } from './panel-util';

describe('utilidades del panel', () => {
  it('parsea etiquetas sin vacíos ni duplicados', () => {
    expect(parseTags(' educación, #Democracia,, educación , democracia ')).toEqual(['educación', 'Democracia']);
  });
  it('ida y vuelta entre ISO y datetime-local', () => {
    const iso = '2026-11-20T10:30:00.000Z';
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(fromLocalInput('')).toBeNull();
    expect(toLocalInput(null)).toBe('');
  });
  it('valida slugs como el back', () => {
    expect(SLUG_PATTERN.test('mi-articulo-2')).toBe(true);
    expect(SLUG_PATTERN.test('Mi Artículo')).toBe(false);
    expect(SLUG_PATTERN.test('-mal-')).toBe(false);
  });
  it('formatea tamaños', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
  it('en encuestas solo admite YouTube, TikTok e Instagram', () => {
    expect(isPollVideo('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isPollVideo('https://vimeo.com/123456789')).toBe(false);
  });
});
