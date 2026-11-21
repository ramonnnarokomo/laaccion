import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/api/admin.service';
import { ArticleAdminSummary, ArticleStatus, Page } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage } from '../../core/util/load-state';
import { STATUS_LABEL } from './shared/panel-util';

@Component({
  selector: 'app-articles-list',
  imports: [RouterLink, FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head">
      <h1>Artículos</h1>
      <a class="btn btn--primary" routerLink="nuevo">+ Nuevo artículo</a>
    </header>

    <div class="tabs" role="tablist" aria-label="Filtrar por estado">
      @for (t of tabs; track t.label) {
        <button type="button" role="tab" [attr.aria-selected]="status() === t.value" [class.active]="status() === t.value" (click)="setStatus(t.value)">
          {{ t.label }}
        </button>
      }
    </div>

    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (data(); as d) {
      @if (d.content.length) {
        <div class="table-wrap table-wrap--cards">
          <table class="table table--cards">
            <thead>
              <tr><th>Titular</th><th>Estado</th><th>Sección</th><th>Autor</th><th>Fecha</th><th><span class="visually-hidden">Acciones</span></th></tr>
            </thead>
            <tbody>
              @for (a of d.content; track a.id) {
                <tr>
                  <td>
                    <a class="strong-link" [routerLink]="[a.id]">{{ a.title }}</a>
                    @if (a.featured) {
                      <span class="badge badge--gold">Destacado</span>
                    }
                  </td>
                  <td><span class="badge" [class]="'badge--' + a.status.toLowerCase()">{{ label[a.status] }}</span></td>
                  <td>{{ a.categoryName }}</td>
                  <td>{{ a.authorName }}</td>
                  <td>{{ (a.publishedAt ?? a.updatedAt) | fecha: 'hora' }}</td>
                  <td class="actions">
                    @if (a.status === 'PUBLISHED') {
                      <a [href]="'/articulo/' + a.slug" target="_blank" rel="noopener">Ver</a>
                    }
                    @if (canEdit(a)) {
                      <a [routerLink]="[a.id]">Editar</a>
                      <button type="button" class="link-btn danger" (click)="remove(a)">Eliminar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button class="btn" type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">← Anterior</button>
          <span>Página {{ d.page + 1 }} de {{ d.totalPages }} · {{ d.totalElements }} artículos</span>
          <button class="btn" type="button" [disabled]="d.page + 1 >= d.totalPages" (click)="page.set(page() + 1)">Siguiente →</button>
        </div>
      } @else {
        <div class="state"><p>No hay artículos en este estado.</p></div>
      }
    } @else if (!error()) {
      <p class="muted">Cargando…</p>
    }
  `,
})
export class ArticlesList {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  protected readonly label = STATUS_LABEL;
  protected readonly tabs: { label: string; value: ArticleStatus | null }[] = [
    { label: 'Todos', value: null },
    { label: 'Borradores', value: 'DRAFT' },
    { label: 'Programados', value: 'SCHEDULED' },
    { label: 'Publicados', value: 'PUBLISHED' },
  ];
  protected readonly status = signal<ArticleStatus | null>(null);
  protected readonly page = signal(0);
  protected readonly data = signal<Page<ArticleAdminSummary> | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const status = this.status();
      const page = this.page();
      untracked(() => this.load(status, page));
    });
  }

  protected setStatus(value: ArticleStatus | null): void {
    this.status.set(value);
    this.page.set(0);
  }

  /** Un editor solo puede tocar sus artículos; el admin, todos (lo impone el back). */
  protected canEdit(a: ArticleAdminSummary): boolean {
    return this.auth.isAdmin() || a.authorId === this.auth.user()?.id;
  }

  protected remove(a: ArticleAdminSummary): void {
    if (!confirm(`¿Eliminar «${a.title}»? No se puede deshacer.`)) return;
    this.admin.deleteArticle(a.id).subscribe({
      next: () => this.load(this.status(), this.page()),
      error: (e: unknown) => this.error.set(errorMessage(e)),
    });
  }

  private load(status: ArticleStatus | null, page: number): void {
    this.error.set(null);
    this.admin.articles(status, page, 20).subscribe({
      next: (d) => this.data.set(d),
      error: (e: unknown) => this.error.set(errorMessage(e)),
    });
  }
}
