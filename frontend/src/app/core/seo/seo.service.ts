import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export const SITE_NAME = 'LA ACCIÓN';
const DEFAULT_DESCRIPTION = 'Periódico independiente de pensamiento, cultura y democracia.';
const DEFAULT_IMAGE = '/img/og-default.jpg';
const DEFAULT_IMAGE_SIZE = { width: 1200, height: 630 };

export interface SeoData {
  /** Título de la página, sin el nombre del sitio. Vacío = portada. */
  title?: string;
  /** Meta description (buscadores): se recorta a ~160 caracteres sin cortar palabras. */
  description?: string | null;
  /** Texto para la vista previa en redes; si falta, se usa la descripción. */
  socialDescription?: string | null;
  /** Ruta canónica empezando por "/". */
  path: string;
  image?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  type?: 'website' | 'article';
  noindex?: boolean;
  article?: {
    publishedAt: string;
    modifiedAt?: string;
    author: string;
    section: string;
    tags?: string[];
  };
  /** Datos estructurados (JSON-LD). Una lista se publica como @graph. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
}

const DESCRIPTION_MAX = 160;

/** Recorta para la meta description: Google enseña unos 155-160 caracteres. */
export function metaDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : environment.siteUrl + (pathOrUrl.startsWith('/') ? '' : '/') + pathOrUrl;
}

/**
 * Title, meta description, canónica, Open Graph, Twitter Cards y JSON-LD por página. Se ejecuta
 * en el servidor, así que los buscadores y las vistas previas de WhatsApp/X lo ven en el HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set(data: SeoData): void {
    const fullTitle = data.title ? `${data.title} — ${SITE_NAME}` : `${SITE_NAME} — Pensamiento, cultura y democracia`;
    const description = metaDescription(data.description || DEFAULT_DESCRIPTION);
    const socialDescription = metaDescription(data.socialDescription || data.description || DEFAULT_DESCRIPTION, 200);
    const url = absoluteUrl(data.path);
    const image = absoluteUrl(data.image || DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);
    this.tag('name', 'description', description);
    this.tag('name', 'robots', data.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');

    this.tag('property', 'og:site_name', SITE_NAME);
    this.tag('property', 'og:locale', 'es_ES');
    this.tag('property', 'og:type', data.type ?? 'website');
    this.tag('property', 'og:title', data.title || fullTitle);
    this.tag('property', 'og:description', socialDescription);
    this.tag('property', 'og:url', url);
    this.tag('property', 'og:image', image);
    this.tag('property', 'og:image:alt', data.imageAlt || SITE_NAME);
    this.optionalTag('property', 'og:image:width', data.image ? data.imageWidth : DEFAULT_IMAGE_SIZE.width);
    this.optionalTag('property', 'og:image:height', data.image ? data.imageHeight : DEFAULT_IMAGE_SIZE.height);

    this.tag('name', 'twitter:card', 'summary_large_image');
    this.tag('name', 'twitter:title', data.title || fullTitle);
    this.tag('name', 'twitter:description', socialDescription);
    this.tag('name', 'twitter:image:alt', data.imageAlt || SITE_NAME);
    this.tag('name', 'twitter:image', image);

    for (const name of ['article:published_time', 'article:modified_time', 'article:author', 'article:section']) {
      this.meta.removeTag(`property="${name}"`);
    }
    this.meta.getTags('property="article:tag"').forEach((el) => el.remove());
    if (data.article) {
      this.tag('property', 'article:published_time', data.article.publishedAt);
      if (data.article.modifiedAt) this.tag('property', 'article:modified_time', data.article.modifiedAt);
      this.tag('property', 'article:author', data.article.author);
      this.tag('property', 'article:section', data.article.section);
      for (const t of data.article.tags ?? []) this.meta.addTag({ property: 'article:tag', content: t });
    }

    this.setCanonical(url);
    this.setJsonLd(data.jsonLd ?? null);
  }

  private tag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
  }

  private optionalTag(attr: 'name' | 'property', key: string, value: number | null | undefined): void {
    if (value && value > 0) this.tag(attr, key, String(value));
    else this.meta.removeTag(`${attr}="${key}"`);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(input: Record<string, unknown> | Record<string, unknown>[] | null): void {
    this.document.head.querySelector('script#ld-json')?.remove();
    if (!input) return;
    const data = Array.isArray(input) ? { '@context': 'https://schema.org', '@graph': input } : input;
    const script = this.document.createElement('script');
    script.id = 'ld-json';
    script.type = 'application/ld+json';
    // "<" escapado: el texto de un titular no puede cerrar la etiqueta <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
