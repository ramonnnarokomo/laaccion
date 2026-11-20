import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { AdminService } from '../../core/api/admin.service';
import { AuditEntry, Page } from '../../core/api/models';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage } from '../../core/util/load-state';

@Component({
  selector: 'app-audit',
  imports: [FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head"><h1>Auditoría</h1></header>
    <p class="muted">Registro de quién hizo qué en el panel (inicios de sesión, publicaciones, cambios de cuentas…).</p>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (data(); as d) {
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Quién</th><th>Acción</th><th>Elemento</th><th>Detalle</th></tr></thead>
          <tbody>
            @for (e of d.content; track e.id) {
              <tr>
                <td>{{ e.createdAt | fecha: 'hora' }}</td>
                <td>{{ e.actorEmail ?? '—' }}</td>
                <td><code>{{ e.action }}</code></td>
                <td>{{ e.entityType ?? '' }} {{ e.entityId ?? '' }}</td>
                <td>{{ e.summary ?? '' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted">Sin registros.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (d.totalPages > 1) {
        <div class="pager">
          <button class="btn" type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">← Más recientes</button>
          <span>Página {{ d.page + 1 }} de {{ d.totalPages }}</span>
          <button class="btn" type="button" [disabled]="d.page + 1 >= d.totalPages" (click)="page.set(page() + 1)">Anteriores →</button>
        </div>
      }
    }
  `,
})
export class Audit {
  private readonly admin = inject(AdminService);
  protected readonly page = signal(0);
  protected readonly data = signal<Page<AuditEntry> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const page = this.page();
      untracked(() =>
        this.admin.audit(page, 50).subscribe({ next: (d) => this.data.set(d), error: (e: unknown) => this.error.set(errorMessage(e)) }),
      );
    });
  }
}
