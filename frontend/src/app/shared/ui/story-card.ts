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
  `,
  template: `
    @let a = article();
    <article class="story">
      @if (a.imageUrl && showImage()) {
        <a class="thumb" [routerLink]="['/articulo', a.slug]" tabindex="-1" aria-hidden="true">
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
