import { SITE_NAME, absoluteUrl } from './seo.service';

/**
 * Datos de la publicación para los datos estructurados (schema.org). Google y los buscadores con IA
 * los usan para saber quién publica, quién escribe y con qué principios: identidad clara = más confianza.
 */

export interface Editor {
  name: string;
  /** Ancla en /quienes-somos. */
  id: string;
}

export const EDITORS: readonly Editor[] = [
  { name: 'Alberto Marín Burguillo', id: 'alberto-marin-burguillo' },
  { name: 'Ramón Ángel Nnar Okomo', id: 'ramon-angel-nnar-okomo' },
];

export const CONTACT_EMAIL = 'contacto@laaccion.com';

/** Perfiles oficiales en redes (Instagram, TikTok, X, YouTube...). Se publican como sameAs. */
export const SOCIAL_PROFILES: readonly string[] = [];

export const ORG_ID = absoluteUrl('/#organizacion');
export const WEBSITE_ID = absoluteUrl('/#web');

function personId(editor: Editor): string {
  return absoluteUrl(`/quienes-somos#${editor.id}`);
}

function same(a: string, b: string): boolean {
  const norm = (s: string) => s.normalize('NFC').trim().toLowerCase();
  return norm(a) === norm(b);
}

export function findEditor(name: string): Editor | undefined {
  return EDITORS.find((e) => same(e.name, name));
}

/** Autor de un texto: si es uno de los editores, enlazado a su ficha en Quiénes somos. */
export function authorNode(name: string): Record<string, unknown> {
  const editor = findEditor(name);
  if (!editor) return { '@type': 'Person', name };
  return { '@type': 'Person', '@id': personId(editor), name: editor.name, url: personId(editor), worksFor: { '@id': ORG_ID } };
}

export function organizationNode(): Record<string, unknown> {
  return {
    '@type': 'NewsMediaOrganization',
    '@id': ORG_ID,
    name: SITE_NAME,
    alternateName: 'La Acción',
    url: absoluteUrl('/'),
    logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 },
    description: 'Periódico independiente de pensamiento, cultura y democracia.',
    email: CONTACT_EMAIL,
    foundingDate: '2026',
    founder: EDITORS.map((e) => ({ '@type': 'Person', '@id': personId(e), name: e.name })),
    publishingPrinciples: absoluteUrl('/texto-fundacional'),
    ...(SOCIAL_PROFILES.length ? { sameAs: [...SOCIAL_PROFILES] } : {}),
  };
}

export function websiteNode(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: 'La Acción',
    url: absoluteUrl('/'),
    inLanguage: 'es-ES',
    publisher: { '@id': ORG_ID },
  };
}

/** Migas de pan: Google las enseña en el resultado en lugar de la URL. */
export function breadcrumbNode(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
