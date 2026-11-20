import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Paginación por enlaces (?pagina=N, empezando en 1): rastreable por buscadores. */
@Component({
  selector: 'app-pager',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pager" aria-label="Paginación">
        @if (page() > 0) {
          <a class="read-link" [routerLink]="[]" [queryParams]="{ pagina: page() > 1 ? page() : null }" rel="prev">← Más recientes</a>
        } @else {
          <span></span>
        }
        <span>Página {{ page() + 1 }} de {{ totalPages() }}</span>
        @if (hasNext()) {
          <a class="read-link" [routerLink]="[]" [queryParams]="{ pagina: page() + 2 }" rel="next">Anteriores →</a>
        } @else {
          <span></span>
        }
      </nav>
    }
  `,
})
export class Pager {
  /** Página actual, empezando en 0 (como la API). */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  protected readonly hasNext = computed(() => this.page() + 1 < this.totalPages());
}

/** Lee ?pagina=N (1..n) y devuelve el índice 0..n-1 para la API. */
export function pageIndex(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n - 1 : 0;
}
