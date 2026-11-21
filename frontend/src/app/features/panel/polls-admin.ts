import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AdminService } from '../../core/api/admin.service';
import { Page, Poll } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage } from '../../core/util/load-state';
import { STATUS_LABEL } from './shared/panel-util';

@Component({
  selector: 'app-polls-admin',
  imports: [RouterLink, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head">
      <h1>Encuestas</h1>
      <a class="btn btn--primary" routerLink="nueva">+ Nueva encuesta</a>
    </header>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (data(); as d) {
      @if (d.content.length) {
        <div class="table-wrap table-wrap--cards">
          <table class="table table--cards">
            <thead><tr><th>Pregunta</th><th>Estado</th><th>Votos</th><th>Cierre</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>
            <tbody>
              @for (p of d.content; track p.id) {
                <tr>
                  <td><a class="strong-link" [routerLink]="[p.id]">{{ p.question }}</a></td>
                  <td><span class="badge" [class]="'badge--' + p.status.toLowerCase()">{{ p.status === 'DRAFT' ? 'Borrador' : label[p.status] }}</span></td>
                  <td data-label="Votos">{{ p.totalVotes }}</td>
                  <td data-label="Cierre">{{ p.closesAt ? (p.closesAt | fecha: 'hora') : '—' }}</td>
                  <td class="actions">
                    @if (p.status !== 'DRAFT') {
                      <a [href]="'/encuestas/' + p.id" target="_blank" rel="noopener">Ver</a>
                    }
                    @if (p.status === 'DRAFT') {
                      <button type="button" class="link-btn" (click)="run(admin.openPoll(p.id), '¿Abrir la votación? Después ya no se podrán cambiar las opciones.')">Abrir</button>
                    }
                    @if (p.status === 'OPEN') {
                      <button type="button" class="link-btn" (click)="run(admin.closePoll(p.id), '¿Cerrar la votación ahora?')">Cerrar</button>
                    }
                    @if (auth.isAdmin()) {
                      <button type="button" class="link-btn danger" (click)="run(admin.deletePoll(p.id), '¿Eliminar la encuesta y todos sus votos?')">Eliminar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (d.totalPages > 1) {
          <div class="pager">
            <button class="btn" type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">← Anterior</button>
            <span>Página {{ d.page + 1 }} de {{ d.totalPages }}</span>
            <button class="btn" type="button" [disabled]="d.page + 1 >= d.totalPages" (click)="page.set(page() + 1)">Siguiente →</button>
          </div>
        }
      } @else {
        <div class="state"><p>Todavía no hay encuestas.</p></div>
      }
    }
  `,
})
export class PollsAdmin {
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly label = STATUS_LABEL;
  protected readonly page = signal(0);
  protected readonly data = signal<Page<Poll> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const page = this.page();
      untracked(() => this.load(page));
    });
  }

  protected run(action: Observable<unknown>, question: string): void {
    if (!confirm(question)) return;
    action.subscribe({ next: () => this.load(this.page()), error: (e: unknown) => this.error.set(errorMessage(e)) });
  }

  private load(page: number): void {
    this.error.set(null);
    this.admin.polls(page, 20).subscribe({ next: (d) => this.data.set(d), error: (e: unknown) => this.error.set(errorMessage(e)) });
  }
}
