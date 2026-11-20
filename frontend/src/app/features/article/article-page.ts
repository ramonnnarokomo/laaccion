import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { ArticleDetail } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SITE_NAME, SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { injectHttpStatus } from '../../core/util/http-status';
import { LoadState, toLoadState } from '../../core/util/load-state';
import { EmbedFacades } from '../../shared/ui/article-html';
import { ArticleHtmlPipe } from '../../shared/ui/safe-html.pipe';
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
      const image = a.imageUrl ? absoluteUrl(a.imageUrl) : absoluteUrl('/img/og-default.jpg');
      this.seo.set({
        title: a.title,
        description: a.dek || a.summary,
        path,
        image: a.imageUrl,
        imageAlt: a.imageAlt,
        type: 'article',
        article: {
          publishedAt: a.publishedAt,
          modifiedAt: a.updatedAt,
          author: a.author,
          section: a.category.name,
          tags: a.tags.map((t) => t.name),
        },
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: a.title.slice(0, 110),
          description: a.dek || a.summary,
          image: [image],
          datePublished: a.publishedAt,
          dateModified: a.updatedAt,
          inLanguage: 'es-ES',
          articleSection: a.category.name,
          keywords: a.tags.map((t) => t.name).join(', ') || undefined,
          author: [{ '@type': 'Person', name: a.author }],
          publisher: {
            '@type': 'NewsMediaOrganization',
            name: SITE_NAME,
            url: absoluteUrl('/'),
            logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 },
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
        },
      });
    }
  }
}

