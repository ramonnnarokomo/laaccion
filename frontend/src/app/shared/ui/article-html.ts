import { Directive, ElementRef, inject } from '@angular/core';
import { createVideoIframe } from '../../core/util/embed';

/**
 * Activa los botones "Cargar vídeo" que deja facadeIframes() en el HTML de un artículo o encuesta:
 * al pulsar, se sustituye el aviso por el iframe del proveedor.
 */
@Directive({
  selector: '[appEmbedFacades]',
  host: { '(click)': 'onClick($event)' },
})
export class EmbedFacades {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onClick(event: Event): void {
    const button = (event.target as Element | null)?.closest?.('.embed-facade__button');
    const facade = button?.closest<HTMLElement>('.embed-facade');
    if (!facade || !this.host.nativeElement.contains(facade)) return;
    const url = facade.dataset['embed'];
    const iframe = url ? createVideoIframe(facade.ownerDocument, url, 'Vídeo incrustado') : null;
    if (iframe) {
      facade.replaceWith(iframe);
      iframe.focus();
    }
  }
}
