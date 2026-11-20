import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { ContentService } from '../../core/api/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { injectHttpStatus } from '../../core/util/http-status';
import { toLoadState } from '../../core/util/load-state';
import { Pager, pageIndex } from '../../shared/ui/pager';

@Component({
  selector: 'app-polls-page',
  imports: [RouterLink, FechaPipe, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './polls.scss',
  template: `
    <header class="page-head">
      <div class="eyebrow">La comunidad · Participación</div>
      <h1>Encuestas</h1>
      <p class="lead">Preguntas abiertas a los lectores. Cada encuesta acompaña a uno de nuestros vídeos y admite un voto por persona.</p>
    </header>

    @switch (state().status) {
      @case ('loading') {
        <span class="skeleton" style="height: 300px" aria-busy="true"></span>
      }
      @case ('error') {
        <div class="state state--error" role="alert"><p>No hemos podido cargar las encuestas. Inténtalo más tarde.</p></div>
      }
    }
    @if (state(); as s) {
      @if (s.status === 'ok') {
        @if (s.data.content.length) {
          <ul class="poll-list">
            @for (p of s.data.content; track p.id) {
              <li class="poll-card" [class.closed]="p.status === 'CLOSED'">
                <span class="badge">{{ p.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}</span>
                <h2><a [routerLink]="['/encuestas', p.id]">{{ p.question }}</a></h2>
                <p class="byline">
                  {{ p.totalVotes }} {{ p.totalVotes === 1 ? 'voto' : 'votos' }}
                  @if (p.closesAt) {
                    · {{ p.status === 'OPEN' ? 'Cierra el' : 'Cerró el' }} {{ p.closesAt | fecha: 'hora' }}
                  }
                </p>
                <a class="read-link" [routerLink]="['/encuestas', p.id]">{{ p.status === 'OPEN' ? 'Votar' : 'Ver resultados' }}&nbsp; ↗</a>
              </li>
            }
          </ul>
          <app-pager [page]="s.data.page" [totalPages]="s.data.totalPages" />
        } @else {
          <div class="state"><p>Todavía no hay encuestas. Pronto abriremos la primera.</p></div>
        }
      }
    }
  `,
})
export class PollsPage {
  private readonly content = inject(ContentService);
  private readonly setStatus = injectHttpStatus();

  protected readonly state = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((q) => pageIndex(q.get('pagina'))),
      switchMap((page) => toLoadState(this.content.polls(page, 10))),
      tap((s) => {
        if (s.status === 'error') this.setStatus(503);
      }),
    ),
    { initialValue: { status: 'loading' } as const },
  );

  constructor() {
    inject(SeoService).set({
      title: 'Encuestas',
      description: 'Las preguntas que LA ACCIÓN abre a sus lectores. Vota y consulta los resultados.',
      path: '/encuestas',
    });
  }
}
