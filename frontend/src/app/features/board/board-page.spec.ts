import { describe, expect, it } from 'vitest';
import { Announcement } from '../../core/api/models';
import { canvasHeight, safeExternalUrl, toFlyers } from './board-page';

const item = (id: number, url: string | null = null): Announcement => ({
  id, section: 'S', title: 'LA CIUDAD\nEN COMÚN', description: 'D', details: null, url, eventDate: '2026-12-01', stamp: '', tone: 'RED',
});

describe('tablón', () => {
  it('solo enlaza URLs http(s)', () => {
    expect(safeExternalUrl('https://example.org/a')).toBe('https://example.org/a');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('nota')).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it('coloca los activos por encima de los pasados y con etiqueta accesible', () => {
    const [active] = toFlyers([item(1, 'https://example.org')], false);
    const [expired] = toFlyers([item(2)], true);
    expect(active.z).toBeGreaterThan(expired.z);
    expect(active.label).toContain('LA CIUDAD EN COMÚN');
    expect(active.label).toContain('pestaña nueva');
    expect(expired.url).toBeNull();
  });

  it('ajusta la altura al número de carteles', () => {
    expect(canvasHeight(4, 0)).toBeLessThan(canvasHeight(10, 0));
    expect(canvasHeight(0, 25)).toBeGreaterThan(canvasHeight(10, 0));
  });
});
