import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

type LegalKind = 'aviso' | 'privacidad' | 'cookies';

const META: Record<LegalKind, { title: string; path: string }> = {
  aviso: { title: 'Aviso legal', path: '/aviso-legal' },
  privacidad: { title: 'Política de privacidad', path: '/privacidad' },
  cookies: { title: 'Política de cookies', path: '/cookies' },
};

/**
 * Textos legales (LSSI-CE, RGPD/LOPDGDD). Proyecto sin ánimo de lucro y sin personalidad jurídica: no se
 * publican NIF ni domicilio. Si algún día hay ingresos (anuncios, donaciones, suscripciones), habrá que
 * añadir los datos del titular (lo ideal: una asociación con su propio NIF). Conviene que lo revise un profesional.
 */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .legal {
      max-width: 780px;
      margin: 0 auto;
    }
    h2 {
      font-size: 26px;
      font-weight: 500;
      margin: 32px 0 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 14px/1.5 var(--sans);
      margin: 10px 0 20px;
    }
    th,
    td {
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--line);
      padding: 8px 10px 8px 0;
    }
    th {
      font-weight: 700;
      color: var(--burgundy);
    }
    .updated {
      font: 12px var(--sans);
      color: var(--stone);
      margin-top: 36px;
    }
  `,
  templateUrl: './legal-page.html',
})
export class LegalPage {
  protected readonly kind: LegalKind = inject(ActivatedRoute).snapshot.data['legal'];

  constructor() {
    const meta = META[this.kind];
    inject(SeoService).set({ title: meta.title, path: meta.path });
  }

  protected readonly title = META[this.kind].title;
}
