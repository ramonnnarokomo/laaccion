import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { facadeIframes } from '../../core/util/embed';

/**
 * HTML de artículo listo para [innerHTML]. El back ya lo sanea con una lista blanca (jsoup), así que
 * se confía en él; si no, Angular quitaría los atributos de los embeds. Los iframes se cambian por
 * un botón de carga bajo demanda.
 */
@Pipe({ name: 'articleHtml' })
export class ArticleHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(html: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(facadeIframes(html ?? ''));
  }
}
