import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { ORG_ID, WEBSITE_ID, authorNode, breadcrumbNode, organizationNode } from '../../core/seo/site-data';

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
      jsonLd: [
        {
          '@type': 'Article',
          '@id': absoluteUrl('/texto-fundacional') + '#articulo',
          headline: 'El pensamiento que conduce a la acción',
          alternativeHeadline: 'Texto fundacional de LA ACCIÓN',
          description:
            'Declaración de principios de LA ACCIÓN sobre la Democracia Formal, la hegemonía cultural y la libertad política colectiva.',
          inLanguage: 'es-ES',
          author: [authorNode('Alberto Marín Burguillo')],
          publisher: { '@id': ORG_ID },
          about: { '@id': ORG_ID },
          isPartOf: { '@id': WEBSITE_ID },
          mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl('/texto-fundacional') },
        },
        organizationNode(),
        breadcrumbNode([
          { name: 'Portada', path: '/' },
          { name: 'Texto fundacional', path: '/texto-fundacional' },
        ]),
      ],
    });
  }
}
