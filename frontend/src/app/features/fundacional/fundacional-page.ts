import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';

/** Texto fundacional: página estática, se genera en build (prerender). */
@Component({
  selector: 'app-fundacional-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './fundacional-page.scss',
  templateUrl: './fundacional-page.html',
})
export class FundacionalPage {
  constructor() {
    inject(SeoService).set({
      title: 'Texto fundacional',
      description:
        'El pensamiento que conduce a la acción: Democracia Formal, hegemonía cultural y libertad política colectiva. La declaración de principios de LA ACCIÓN.',
      path: '/texto-fundacional',
      type: 'article',
    });
  }
}
