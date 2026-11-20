import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminService } from '../../core/api/admin.service';
import { ImageInfo } from '../../core/api/models';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage } from '../../core/util/load-state';
import { formatBytes } from './shared/panel-util';

@Component({
  selector: 'app-images',
  imports: [FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head">
      <h1>Imágenes</h1>
      <label class="btn btn--primary">
        {{ uploading() ? 'Subiendo…' : '+ Subir imagen' }}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" (change)="upload($event)" [disabled]="uploading()" hidden />
      </label>
    </header>
    @if (error()) {
      <p class="form-error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="form-ok" role="status">{{ notice() }}</p>
    }
    <div class="image-grid image-grid--large">
      @for (img of images(); track img.id) {
        <figure class="image-card">
          <img [src]="img.url" alt="" loading="lazy" />
          <figcaption>
            <span>{{ img.width }}×{{ img.height }} · {{ size(img.sizeBytes) }}</span>
            <span class="muted">{{ img.createdAt | fecha: 'corta' }}</span>
            <span class="row">
              <button type="button" class="link-btn" (click)="copy(img)">Copiar enlace</button>
              <button type="button" class="link-btn danger" (click)="remove(img)">Eliminar</button>
            </span>
          </figcaption>
        </figure>
      } @empty {
        <p class="muted">Todavía no hay imágenes.</p>
      }
    </div>
    @if (hasMore()) {
      <button class="btn" type="button" (click)="more()">Cargar más</button>
    }
  `,
})
export class Images {
  private readonly admin = inject(AdminService);
  protected readonly images = signal<ImageInfo[]>([]);
  protected readonly hasMore = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly size = formatBytes;
  private page = 0;

  constructor() {
    this.fetch();
  }

  protected more(): void {
    this.page++;
    this.fetch();
  }

  protected upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.error.set(null);
    this.admin.uploadImage(file).subscribe({
      next: (img) => {
        this.uploading.set(false);
        input.value = '';
        this.images.update((list) => [img, ...list]);
        this.notice.set('Imagen subida.');
      },
      error: (e: unknown) => {
        this.uploading.set(false);
        input.value = '';
        this.error.set(errorMessage(e));
      },
    });
  }

  protected async copy(img: ImageInfo): Promise<void> {
    const url = new URL(img.url, location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set('Enlace copiado.');
    } catch {
      prompt('Copia el enlace:', url);
    }
  }

  protected remove(img: ImageInfo): void {
    if (!confirm('¿Eliminar esta imagen? Si algún artículo la usa, dejará de verse.')) return;
    this.admin.deleteImage(img.id).subscribe({
      next: () => this.images.update((list) => list.filter((i) => i.id !== img.id)),
      error: (e: unknown) => this.error.set(errorMessage(e)),
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
