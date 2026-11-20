import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../core/api/models';
import { FechaPipe } from '../../core/util/fecha.pipe';

/** Tarjeta de artículo de los listados (portada, secciones, etiquetas, relacionados). */
@Component({
  selector: 'app-story-card',
  imports: [RouterLink, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .story {
      height: 100%;
    }
    .thumb {
      display: block;
      aspect-ratio: 3 / 2;
      overflow: hidden;
      margin-bottom: 14px;
      background: rgba(165, 140, 97, 0.15);
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }
    .category {
      color: var(--burgundy);
      font: 700 11px var(--sans);
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    h3 {
      font-size: 27px;
      line-height: 1.05;
      margin: 8px 0 10px;
      font-weight: 600;
      a:hover {
        color: var(--burgundy);
      }
    }
    p {
      font-size: 15px;
      line-height: 1.5;
      color: #45443f;
      margin: 0 0 14px;
    }
    /* Sin imagen en escritorio (p. ej. la fila bajo el destacado), pero sí en móvil. */
    .thumb.mobile-only {
      display: none;
    }
    /* Móvil: titular a la izquierda y miniatura cuadrada a la derecha, como en las apps de prensa. */
    @media (max-width: 620px) {
      .story.has-thumb {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 104px;
        grid-template-areas:
          'cat thumb'
          'title thumb'
          'dek dek'
          'meta meta';
        column-gap: 14px;
        align-items: start;
      }
      .story.has-thumb .thumb {
        display: block;
        grid-area: thumb;
        aspect-ratio: 1;
        margin: 2px 0 12px;
      }
      .story.has-thumb .category {
        grid-area: cat;
      }
      .story.has-thumb h3 {
        grid-area: title;
      }
      .story.has-thumb p {
        grid-area: dek;
      }
      .story.has-thumb .story-meta {
        grid-area: meta;
      }
      h3 {
        font-size: 22px;
        line-height: 1.1;
        margin: 6px 0 10px;
      }
    }
  `,
  template: `
    @let a = article();
    <article class="story" [class.has-thumb]="!!a.imageUrl">
      @if (a.imageUrl) {
        <a
          class="thumb"
          [class.mobile-only]="!showImage()"
          [routerLink]="['/articulo', a.slug]"
          tabindex="-1"
          aria-hidden="true"
        >
          <img [src]="a.imageUrl" [attr.width]="a.imageWidth" [attr.height]="a.imageHeight" alt="" loading="lazy" decoding="async" />
        </a>
      }
      <a class="category" [routerLink]="['/seccion', a.category.slug]">{{ a.category.name }}</a>
      <h3><a [routerLink]="['/articulo', a.slug]">{{ a.title }}</a></h3>
      <p>{{ a.dek || a.summary }}</p>
      <div class="story-meta">
        <time [attr.datetime]="a.publishedAt">{{ a.publishedAt | fecha }}</time> · {{ a.readingMinutes }} min
      </div>
    </article>
  `,
})
export class StoryCard {
  readonly article = input.required<ArticleSummary>();
  readonly showImage = input(true);
}
