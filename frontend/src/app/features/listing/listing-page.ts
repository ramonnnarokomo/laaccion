import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, combineLatest, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ArticleSummary, Page, Tag } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SITE_NAME, SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { ORG_ID, WEBSITE_ID, breadcrumbNode } from '../../core/seo/site-data';
import { injectHttpStatus } from '../../core/util/http-status';
import { LoadState, toLoadState } from '../../core/util/load-state';
import { Pager, pageIndex } from '../../shared/ui/pager';
import { StoryCard } from '../../shared/ui/story-card';

export type ListingKind = 'section' | 'tag';

interface Listing {
  kind: ListingKind;
  slug: string;
  name: string;
  description: string | null;
  page: Page<ArticleSummary>;
}

const PAGE_SIZE = 12;

function notFound(): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
}

function prettify(slug: string): string {
  const text = slug.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Listado de una sección (/seccion/:slug) o de una etiqueta (/etiqueta/:slug), con paginación. */
@Component({
  selector: 'app-listing-page',
  imports: [RouterLink, StoryCard, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 34px 28px;
    }
  `,
  template: `
    @switch (state().status) {
      @case ('loading') {
        <div class="page-head" aria-busy="true"><span class="skeleton" style="height: 70px; width: 50%"></span></div>
        <div class="grid">
          @for (i of [1, 2, 3]; track i) {
            <span class="skeleton" style="height: 260px"></span>
          }
        </div>
      }
      @case ('not-found') {
        <div class="state">
          <p>Esta página no existe.</p>
          <a class="read-link" routerLink="/">Volver a la portada</a>
        </div>
      }
      @case ('error') {
        <div class="state state--error" role="alert"><p>No hemos podido cargar los artículos. Inténtalo más tarde.</p></div>
      }
    }
    @if (state(); as s) {
      @if (s.status === 'ok') {
        @let l = s.data;
        <header class="page-head">
          <div class="eyebrow">{{ l.kind === 'section' ? 'Sección' : 'Etiqueta' }}</div>
          <h1>{{ l.kind === 'tag' ? '#' : '' }}{{ l.name }}</h1>
          @if (l.description) {
            <p class="lead">{{ l.description }}</p>
          }
        </header>
        @if (l.page.content.length) {
          <div class="grid">
            @for (a of l.page.content; track a.slug) {
              <app-story-card [article]="a" />
            }
          </div>
          <app-pager [page]="l.page.page" [totalPages]="l.page.totalPages" />
        } @else {
          <div class="state"><p>Todavía no hay artículos en esta sección.</p></div>
        }
      }
    }
  `,
})
export class ListingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly setStatus = injectHttpStatus();
  private readonly kind: ListingKind = this.route.snapshot.data['kind'] ?? 'section';

  protected readonly state = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([p, q]) => ({ slug: p.get('slug') ?? '', page: pageIndex(q.get('pagina')) })),
      switchMap(({ slug, page }) => toLoadState(this.load(slug, page))),
      tap((s) => this.onState(s)),
    ),
    { initialValue: { status: 'loading' } as LoadState<Listing> },
  );

  private load(slug: string, page: number): Observable<Listing> {
    if (this.kind === 'section') {
      return this.content.categories().pipe(
        switchMap((cats) => {
          const cat = cats.find((c) => c.slug === slug);
          if (!cat) return notFound();
          return this.content.articles({ category: slug, page, size: PAGE_SIZE }).pipe(
            map((p): Listing => ({ kind: 'section', slug, name: cat.name, description: cat.description, page: p })),
          );
        }),
      );
    }
    const tags$ = this.http
      .get<Page<Tag>>('/api/v1/tags', { params: new HttpParams().set('size', 50) })
      .pipe(catchError(() => of(null)));
    return forkJoin([this.content.articles({ tag: slug, page, size: PAGE_SIZE }), tags$]).pipe(
      switchMap(([p, tags]) => {
        // Una etiqueta sin artículos publicados no tiene página propia.
        if (p.totalElements === 0) return notFound();
        const name = tags?.content.find((t) => t.slug === slug)?.name ?? prettify(slug);
        return of<Listing>({ kind: 'tag', slug, name, description: null, page: p });
      }),
    );
  }

  private onState(s: LoadState<Listing>): void {
    if (s.status === 'not-found') {
      this.setStatus(404);
      this.seo.set({ title: 'Página no encontrada', path: '/404', noindex: true });
    } else if (s.status === 'error') {
      this.setStatus(503);
      this.seo.set({ title: 'Error', path: '/', noindex: true });
    } else if (s.status === 'ok') {
      const l = s.data;
      const base = `/${l.kind === 'section' ? 'seccion' : 'etiqueta'}/${l.slug}`;
      const outOfRange = l.page.page > 0 && l.page.content.length === 0;
      if (outOfRange) this.setStatus(404);
      const path = l.page.page > 0 ? `${base}?pagina=${l.page.page + 1}` : base;
      this.seo.set({
        title: l.kind === 'tag' ? `#${l.name}` : l.name,
        description: l.description
          ? `${l.name}: ${l.description.trim().replace(/[.\s]+$/, '')}. Artículos de ${SITE_NAME}, periódico independiente de pensamiento, cultura y democracia.`
          : `Artículos de ${l.kind === 'tag' ? 'la etiqueta' : 'la sección'} ${l.name} en ${SITE_NAME}.`,
        path,
        // Las etiquetas generan muchas páginas finas: se indexan las secciones, no las etiquetas.
        noindex: l.kind === 'tag' || outOfRange,
        jsonLd: [
          {
            '@type': 'CollectionPage',
            '@id': absoluteUrl(path),
            name: l.name,
            url: absoluteUrl(path),
            inLanguage: 'es-ES',
            isPartOf: { '@id': WEBSITE_ID },
            publisher: { '@id': ORG_ID },
          },
          breadcrumbNode([
            { name: 'Portada', path: '/' },
            { name: l.kind === 'tag' ? `#${l.name}` : l.name, path: base },
          ]),
        ],
      });
    }
  }
}
