import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminService } from '../../../core/api/admin.service';
import { AiAssistResponse, AiField, AiMode } from '../../../core/api/models';
import { errorMessage } from '../../../core/util/load-state';
import { ArticleHtmlPipe } from '../../../shared/ui/safe-html.pipe';

/**
 * Asistente de redacción con IA para el cuerpo o el resumen. Puede revisar el texto (lista de sugerencias)
 * o proponer una versión mejorada, que solo se aplica si el editor pulsa «Aplicar».
 */
@Component({
  selector: 'app-ai-assist',
  imports: [ArticleHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (field(); as f) {
      <div class="modal-backdrop" (click)="close()"></div>
      <div
        class="modal ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-title"
        #dialog
        tabindex="-1"
        (keydown.escape)="onEscape($event)"
      >
        <header class="modal-head">
          <h2 id="ai-title">Asistente de redacción · {{ f === 'BODY' ? 'Cuerpo' : 'Resumen' }}</h2>
          <button type="button" class="link-btn" (click)="close()" aria-label="Cerrar">✕</button>
        </header>

        @if (loading()) {
          <p class="ai-loading" role="status">Leyendo y pensando… puede tardar unos segundos.</p>
        } @else if (result(); as r) {
          @if (mode() === 'REVIEW') {
            <div class="ai-suggestions">{{ r.result }}</div>
            <div class="row">
              <button class="btn btn--primary" type="button" (click)="run('REWRITE')">Proponer una versión mejorada</button>
              <button class="btn" type="button" (click)="reset()">Volver</button>
            </div>
          } @else {
            <p class="muted">Esto es una propuesta: revísala antes de aplicarla, la IA puede equivocarse.</p>
            @if (r.format === 'html') {
              <div class="ai-proposal prose" [innerHTML]="r.result | articleHtml"></div>
            } @else {
              <div class="ai-proposal ai-proposal--text">{{ r.result }}</div>
              @if (f === 'SUMMARY') {
                <p class="muted">{{ r.result.length }}/600 caracteres</p>
              }
            }
            <div class="row">
              <button class="btn btn--primary" type="button" (click)="apply(r.result)">Aplicar</button>
              <button class="btn" type="button" (click)="reset()">Descartar</button>
            </div>
            @if (f === 'BODY') {
              <p class="muted">Si la aplicas y no te convence, la deshaces con ↶ en la barra del editor.</p>
            }
          }
        } @else {
          <p class="muted">
            La IA lee lo que has escrito y te ayuda a mejorarlo: claridad, estructura, estilo y dónde hace falta una
            fuente. No inventa datos y no cambia nada sin que lo apliques tú.
          </p>
          <div class="ai-actions">
            <button class="btn btn--primary" type="button" (click)="run('REVIEW')">Revisar y sugerir mejoras</button>
            <button class="btn" type="button" (click)="run('REWRITE')">Proponer una versión mejorada</button>
          </div>
        }
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
      </div>
    }
  `,
})
export class AiAssist {
  private readonly admin = inject(AdminService);

  /** Campo sobre el que se trabaja; null = cerrado. */
  readonly field = input<AiField | null>(null);
  /** Texto actual (HTML si es el cuerpo). Se lee al pulsar un botón. */
  readonly text = input('');
  readonly title = input('');
  /** Cuerpo del artículo, como contexto al trabajar el resumen. */
  readonly context = input('');
  readonly applied = output<string>();
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  protected readonly mode = signal<AiMode>('REVIEW');
  protected readonly loading = signal(false);
  protected readonly result = signal<AiAssistResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  private request: Subscription | null = null;

  constructor() {
    // Cada vez que se abre, empieza de cero y recibe el foco.
    effect(() => {
      if (this.field()) {
        this.reset();
        queueMicrotask(() => this.dialog()?.nativeElement.focus());
      } else {
        this.cancel();
      }
    });
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  protected run(mode: AiMode): void {
    const field = this.field();
    if (!field || this.loading()) return;
    this.cancel();
    this.mode.set(mode);
    this.result.set(null);
    this.error.set(null);
    this.loading.set(true);
    this.request = this.admin
      .aiAssist({
        field,
        mode,
        text: this.text(),
        title: this.title() || undefined,
        context: field === 'SUMMARY' ? this.context() || undefined : undefined,
      })
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.loading.set(false);
        },
        error: (e: unknown) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }

  protected apply(text: string): void {
    this.applied.emit(text);
    this.closed.emit();
  }

  protected reset(): void {
    this.cancel();
    this.result.set(null);
    this.error.set(null);
    this.loading.set(false);
  }

  /** Escape cierra solo el diálogo: no debe llegar a la página (reduciría el editor ampliado). */
  protected onEscape(event: Event): void {
    event.stopPropagation();
    this.close();
  }

  protected close(): void {
    this.cancel();
    this.closed.emit();
  }

  private cancel(): void {
    this.request?.unsubscribe();
    this.request = null;
  }
}
