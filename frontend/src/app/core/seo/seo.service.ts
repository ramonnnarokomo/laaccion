import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export const SITE_NAME = 'LA ACCIÓN';
const DEFAULT_DESCRIPTION = 'Periódico independiente de pensamiento, cultura y democracia.';
const DEFAULT_IMAGE = '/img/og-default.jpg';

export interface SeoData {
  /** Título de la página, sin el nombre del sitio. Vacío = portada. */
  title?: string;
  description?: string | null;
  /** Ruta canónica empezando por "/". */
  path: string;
  image?: string | null;
  imageAlt?: string | null;
  type?: 'website' | 'article';
  noindex?: boolean;
  article?: {
    publishedAt: string;
    modifiedAt?: string;
    author: string;
    section: string;
    tags?: string[];
  };
  /** Datos estructurados (JSON-LD). */
  jsonLd?: Record<string, unknown> | null;
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
    const description = (data.description || DEFAULT_DESCRIPTION).slice(0, 300);
    const url = absoluteUrl(data.path);
    const image = absoluteUrl(data.image || DEFAULT_IMAGE);

    this.title.setTitle(fullTitle);
    this.tag('name', 'description', description);
    this.tag('name', 'robots', data.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');

    this.tag('property', 'og:site_name', SITE_NAME);
    this.tag('property', 'og:locale', 'es_ES');
    this.tag('property', 'og:type', data.type ?? 'website');
    this.tag('property', 'og:title', data.title || fullTitle);
    this.tag('property', 'og:description', description);
    this.tag('property', 'og:url', url);
    this.tag('property', 'og:image', image);
    this.tag('property', 'og:image:alt', data.imageAlt || SITE_NAME);

    this.tag('name', 'twitter:card', 'summary_large_image');
    this.tag('name', 'twitter:title', data.title || fullTitle);
    this.tag('name', 'twitter:description', description);
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

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    this.document.head.querySelector('script#ld-json')?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.id = 'ld-json';
    script.type = 'application/ld+json';
    // "<" escapado: el texto de un titular no puede cerrar la etiqueta <script>.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }
}
