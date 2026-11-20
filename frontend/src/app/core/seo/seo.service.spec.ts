import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SeoService, absoluteUrl } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  const meta = (sel: string) => doc.head.querySelector(sel)?.getAttribute('content');

  it('pone título, descripción, canónica, Open Graph y Twitter', () => {
    seo.set({ title: 'Mi artículo', description: 'Resumen', path: '/articulo/mi-articulo', type: 'article', image: '/media/a.jpg' });
    expect(doc.title).toBe('Mi artículo — LA ACCIÓN');
    expect(meta('meta[name="description"]')).toBe('Resumen');
    expect(meta('meta[property="og:type"]')).toBe('article');
    expect(meta('meta[property="og:image"]')).toBe(absoluteUrl('/media/a.jpg'));
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(absoluteUrl('/articulo/mi-articulo'));
  });

  it('marca noindex y no deja metadatos de artículo de la página anterior', () => {
    seo.set({ title: 'A', path: '/a', article: { publishedAt: '2026-01-01', author: 'X', section: 'S', tags: ['t1', 't2'] } });
    expect(doc.head.querySelectorAll('meta[property="article:tag"]').length).toBe(2);
    seo.set({ title: 'B', path: '/b', noindex: true });
    expect(meta('meta[name="robots"]')).toContain('noindex');
    expect(doc.head.querySelectorAll('meta[property="article:tag"]').length).toBe(0);
    expect(doc.head.querySelector('meta[property="article:author"]')).toBeNull();
  });

  it('escapa "<" en el JSON-LD para que un titular no pueda cerrar el <script>', () => {
    seo.set({ path: '/', jsonLd: { headline: '</script><script>alert(1)</script>' } });
    const script = doc.head.querySelector('script#ld-json');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script!.textContent!).headline).toBe('</script><script>alert(1)</script>');
    seo.set({ path: '/' });
    expect(doc.head.querySelector('script#ld-json')).toBeNull();
  });
});
