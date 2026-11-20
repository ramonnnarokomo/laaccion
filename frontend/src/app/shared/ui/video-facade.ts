import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { toVideoEmbed } from '../../core/util/embed';

/** Vídeo de YouTube/TikTok/Instagram/Vimeo que solo se carga cuando el lector lo pide. */
@Component({
  selector: 'app-video-facade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (embed(); as e) {
      @if (loaded()) {
        <iframe
          class="embed-frame"
          [class.embed-frame--vertical]="e.vertical"
          [src]="src()"
          [title]="title()"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      } @else {
        <div class="embed-facade" [class.embed-facade--vertical]="e.vertical">
          <button type="button" class="embed-facade__button" (click)="loaded.set(true)">▶ Cargar vídeo de {{ e.provider }}</button>
          <p class="embed-facade__note">Al cargarlo te conectarás con {{ e.provider }}, que puede usar cookies.</p>
        </div>
      }
    }
  `,
})
export class VideoFacade {
  private readonly sanitizer = inject(DomSanitizer);
  readonly url = input<string | null>(null);
  readonly title = input('Vídeo');
  protected readonly loaded = signal(false);
  protected readonly embed = computed(() => toVideoEmbed(this.url()));
  // La URL sale de toVideoEmbed (proveedor e ID validados), por eso se marca como segura.
  protected readonly src = computed(() => {
    const e = this.embed();
    return e ? this.sanitizer.bypassSecurityTrustResourceUrl(e.provider === 'YouTube' ? `${e.embedUrl}?autoplay=1` : e.embedUrl) : null;
  });
}
