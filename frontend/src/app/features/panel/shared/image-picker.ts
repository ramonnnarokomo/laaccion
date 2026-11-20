import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { AdminService } from '../../../core/api/admin.service';
import { ImageInfo } from '../../../core/api/models';
import { errorMessage } from '../../../core/util/load-state';

/** Ventana para elegir una imagen de la biblioteca o subir una nueva. */
@Component({
  selector: 'app-image-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'closed.emit()' },
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="closed.emit()"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" #dialog tabindex="-1">
        <header class="modal-head">
          <h2 id="picker-title">Elegir imagen</h2>
          <button type="button" class="link-btn" (click)="closed.emit()" aria-label="Cerrar">✕</button>
        </header>
        <div class="upload-row">
          <label class="btn btn--primary">
            {{ uploading() ? 'Subiendo…' : 'Subir imagen' }}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" (change)="upload($event)" [disabled]="uploading()" hidden />
          </label>
          <span class="muted">JPG, PNG, WebP, GIF o AVIF.</span>
        </div>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="image-grid">
          @for (img of images(); track img.id) {
            <button type="button" class="image-tile" (click)="picked.emit(img)">
              <img [src]="img.url" alt="" loading="lazy" />
              <span>{{ img.width }}×{{ img.height }}</span>
            </button>
          } @empty {
            <p class="muted">Todavía no hay imágenes. Sube la primera.</p>
          }
        </div>
        @if (hasMore()) {
          <button class="btn" type="button" (click)="loadMore()">Cargar más</button>
        }
      </div>
    }
  `,
})
export class ImagePicker {
  private readonly admin = inject(AdminService);
  readonly open = input(false);
  readonly picked = output<ImageInfo>();
  readonly closed = output<void>();
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  protected readonly images = signal<ImageInfo[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  private page = 0;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.page = 0;
        this.images.set([]);
        this.fetch();
        queueMicrotask(() => this.dialog()?.nativeElement.focus());
      }
    });
  }

  protected loadMore(): void {
    this.page++;
    this.fetch();
  }

  protected upload(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.admin.uploadImage(file).subscribe({
      next: (img) => {
        this.uploading.set(false);
        inputEl.value = '';
        this.picked.emit(img);
      },
      error: (e: unknown) => {
        this.uploading.set(false);
        inputEl.value = '';
        this.error.set(errorMessage(e));
      },
    });
  }

  private fetch(): void {
    this.admin.images(this.page, 24).subscribe({
      next: (p) => {
        this.images.update((list) => [...list, ...p.content]);
        this.hasMore.set(p.page + 1 < p.totalPages);
      },
      error: (e: unknown) => this.error.set(errorMessage(e)),
    });
  }
}
