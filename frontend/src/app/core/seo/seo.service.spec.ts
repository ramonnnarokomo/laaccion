import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { SeoService, absoluteUrl, metaDescription } from './seo.service';
import { ORG_ID, authorNode, findEditor } from './site-data';

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

  it('publica una lista de nodos como @graph y las medidas de la imagen social', () => {
    seo.set({ path: '/', image: '/media/a.webp', imageWidth: 1600, imageHeight: 900, jsonLd: [{ '@type': 'A' }, { '@type': 'B' }] });
    const data = JSON.parse(doc.head.querySelector('script#ld-json')!.textContent!);
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['A', 'B']);
    expect(meta('meta[property="og:image:width"]')).toBe('1600');
    seo.set({ path: '/b', image: '/media/b.webp' });
    expect(doc.head.querySelector('meta[property="og:image:width"]')).toBeNull();
  });

  it('usa la descripción para buscadores y la social para redes', () => {
    seo.set({ path: '/a', description: 'Resumen largo para Google', socialDescription: 'Entradilla' });
    expect(meta('meta[name="description"]')).toBe('Resumen largo para Google');
    expect(meta('meta[property="og:description"]')).toBe('Entradilla');
  });
});

describe('metaDescription', () => {
  it('deja igual un texto corto y recorta uno largo sin partir palabras', () => {
    expect(metaDescription('  Hola   mundo ')).toBe('Hola mundo');
    const long = 'palabra '.repeat(40);
    const out = metaDescription(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('palabra…')).toBe(true);
  });
});

describe('site-data', () => {
  it('enlaza a los editores con su ficha y deja a otros autores sin enlace', () => {
    expect(findEditor('ramón ángel nnar okomo')?.id).toBe('ramon-angel-nnar-okomo');
    expect(authorNode('Alberto Marín Burguillo')).toMatchObject({ url: absoluteUrl('/quienes-somos#alberto-marin-burguillo'), worksFor: { '@id': ORG_ID } });
    expect(authorNode('Invitada')).toEqual({ '@type': 'Person', name: 'Invitada' });
  });
});
