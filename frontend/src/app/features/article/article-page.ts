import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { ArticleDetail } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { WEBSITE_ID, authorNode, breadcrumbNode, findEditor, organizationNode } from '../../core/seo/site-data';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { injectHttpStatus } from '../../core/util/http-status';
import { LoadState, toLoadState } from '../../core/util/load-state';
import { EmbedFacades } from '../../shared/ui/article-html';
import { ArticleHtmlPipe } from '../../shared/ui/safe-html.pipe';
import { longestWordEm } from '../../shared/ui/headline-fit';
import { StoryCard } from '../../shared/ui/story-card';

@Component({
  selector: 'app-article-page',
  imports: [RouterLink, FechaPipe, ArticleHtmlPipe, EmbedFacades, StoryCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './article-page.scss',
  templateUrl: './article-page.html',
})
export class ArticlePage {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly setStatus = injectHttpStatus();

  private readonly article$ = this.route.paramMap.pipe(
    map((p) => p.get('slug') ?? ''),
    switchMap((slug) => toLoadState(this.content.article(slug))),
    tap((s) => this.onState(s)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly state = toSignal(this.article$, {
    initialValue: { status: 'loading' } as LoadState<ArticleDetail>,
  });

  private readonly article = computed(() => {
    const s = this.state();
    return s.status === 'ok' ? s.data : null;
  });

  protected readonly wordEm = longestWordEm;

  /** Ancla del autor en Quiénes somos, si es uno de los editores. */
  protected readonly authorAnchor = computed(() => findEditor(this.article()?.author ?? '')?.id ?? null);

  /** Otros artículos de la misma sección (si falla, simplemente no se muestran). */
  protected readonly related = toSignal(
    this.article$.pipe(
      switchMap((s) =>
        s.status !== 'ok'
          ? of([])
          : this.content.articles({ category: s.data.category.slug, size: 4 }).pipe(
              map((page) => page.content.filter((x) => x.slug !== s.data.slug).slice(0, 3)),
              catchError(() => of([])),
            ),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly shareLinks = computed(() => {
    const a = this.article();
    if (!a) return [];
    const url = encodeURIComponent(absoluteUrl(`/articulo/${a.slug}`));
    const text = encodeURIComponent(a.title);
    return [
      { label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${url}` },
      { label: 'X', href: `https://x.com/intent/post?url=${url}&text=${text}` },
      { label: 'Telegram', href: `https://t.me/share/url?url=${url}&text=${text}` },
      { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    ];
  });

  private onState(s: LoadState<ArticleDetail>): void {
    if (s.status === 'not-found') {
      this.setStatus(404);
      this.seo.set({ title: 'Artículo no encontrado', path: '/404', noindex: true });
    } else if (s.status === 'error') {
      this.setStatus(503);
      this.seo.set({ title: 'Error', path: '/', noindex: true });
    } else if (s.status === 'ok') {
      const a = s.data;
      const path = `/articulo/${a.slug}`;
      const sectionPath = `/seccion/${a.category.slug}`;
      const image = a.imageUrl ? absoluteUrl(a.imageUrl) : absoluteUrl('/img/og-default.jpg');
      const hasSize = !!a.imageUrl && !!a.imageWidth && !!a.imageHeight;
      this.seo.set({
        title: a.title,
        // El resumen es el texto pensado para buscadores; la entradilla, más corta, para las redes.
        description: a.summary || a.dek,
        socialDescription: a.dek || a.summary,
        path,
        image: a.imageUrl,
        imageAlt: a.imageAlt,
        imageWidth: a.imageWidth,
        imageHeight: a.imageHeight,
        type: 'article',
        article: {
          publishedAt: a.publishedAt,
          modifiedAt: a.updatedAt,
          author: a.author,
          section: a.category.name,
          tags: a.tags.map((t) => t.name),
        },
        jsonLd: [
          {
            '@type': 'NewsArticle',
            '@id': absoluteUrl(path) + '#articulo',
            headline: a.title.slice(0, 110),
            description: a.dek || a.summary,
            abstract: a.summary,
            image: [
              hasSize
                ? { '@type': 'ImageObject', url: image, width: a.imageWidth, height: a.imageHeight }
                : image,
            ],
            datePublished: a.publishedAt,
            dateModified: a.updatedAt,
            inLanguage: 'es-ES',
            articleSection: a.category.name,
            keywords: a.tags.map((t) => t.name).join(', ') || undefined,
            isAccessibleForFree: true,
            timeRequired: a.readingMinutes ? `PT${a.readingMinutes}M` : undefined,
            author: [authorNode(a.author)],
            publisher: organizationNode(),
            isPartOf: { '@id': WEBSITE_ID },
            mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
          },
          breadcrumbNode([
            { name: 'Portada', path: '/' },
            { name: a.category.name, path: sectionPath },
            { name: a.title, path },
          ]),
        ],
      });
    }
  }
}

