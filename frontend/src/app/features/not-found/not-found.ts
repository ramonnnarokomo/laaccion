import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { injectHttpStatus } from '../../core/util/http-status';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state">
      <div class="eyebrow">Error 404</div>
      <p>La página que buscas no existe o se ha movido.</p>
      <a class="read-link" routerLink="/">Volver a la portada</a>
    </div>
  `,
})
export class NotFound {
  constructor() {
    injectHttpStatus()(404);
    inject(SeoService).set({ title: 'Página no encontrada', path: '/404', noindex: true });
  }
}
