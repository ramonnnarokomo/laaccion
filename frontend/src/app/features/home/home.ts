import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SITE_NAME, SeoService, absoluteUrl } from '../../core/seo/seo.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { toLoadState } from '../../core/util/load-state';
import { StoryCard } from '../../shared/ui/story-card';
import { SunArt } from '../../shared/ui/sun-art';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FechaPipe, StoryCard, SunArt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.set({
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        inLanguage: 'es-ES',
        publisher: {
          '@type': 'NewsMediaOrganization',
          name: SITE_NAME,
          url: absoluteUrl('/'),
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 },
        },
      },
    });
  }

  protected readonly state = toSignal(toLoadState(this.content.articles({ size: 13 })), {
    requireSync: true,
  });

  /** Portada: el destacado más reciente abre; si no hay destacados, el último publicado. */
  protected readonly layout = computed(() => {
    const s = this.state();
    if (s.status !== 'ok') return null;
    const list = [...s.data.content];
    if (!list.length) return { lead: null, side: null, grid: [] as ArticleSummary[], more: [] as ArticleSummary[] };
    const leadIndex = Math.max(0, list.findIndex((a) => a.featured));
    const [lead] = list.splice(leadIndex, 1);
    const side = list.shift() ?? null;
    return { lead, side, grid: list.slice(0, 3), more: list.slice(3) };
  });
}
