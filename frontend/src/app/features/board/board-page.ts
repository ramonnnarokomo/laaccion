import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import { Announcement } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { formatFecha } from '../../core/util/fecha.pipe';
import { injectHttpStatus } from '../../core/util/http-status';
import { toLoadState } from '../../core/util/load-state';

// Disposición escalonada de la maqueta: [left %, top en "unidades" × 3,1 px].
const ACTIVE_POSITIONS = [
  [1, 1], [25, 8], [51, 0], [75, 10], [7, 34],
  [31, 39], [57, 33], [79, 42], [18, 68], [53, 70],
];
const EXPIRED_POSITIONS = [
  [0, 0], [19, 5], [39, 0], [59, 7], [78, 1],
  [8, 25], [28, 29], [48, 24], [68, 30], [83, 25],
  [0, 50], [20, 53], [40, 49], [60, 55], [79, 50],
  [8, 75], [28, 78], [48, 74], [68, 80], [84, 74],
  [0, 100], [20, 103], [40, 99], [60, 105], [80, 100],
];
const TILTS = [-2.2, 1.6, -0.8, 2.4, -1.5, 0.9, -2.6, 1.2, -0.5, 2];

export interface Flyer {
  item: Announcement;
  expired: boolean;
  left: string;
  top: string;
  z: number;
  tilt: string;
  url: string | null;
  label: string;
}

/** Solo enlaces http(s): nunca javascript: ni similares (el back ya lo valida; doble seguro). */
export function safeExternalUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function toFlyers(items: Announcement[], expired: boolean): Flyer[] {
  const positions = expired ? EXPIRED_POSITIONS : ACTIVE_POSITIONS;
  return items.map((item, i) => {
    const [left, top] = positions[i % positions.length];
    const title = item.title.replace(/\s*\n\s*/g, ' ');
    return {
      item,
      expired,
      left: `${left}%`,
      top: `${top * 3.1}px`,
      z: (expired ? 1 : 100) + i,
      tilt: `${TILTS[(i + (expired ? 3 : 0)) % TILTS.length]}deg`,
      url: safeExternalUrl(item.url),
      label: `${title}. ${expired ? 'Anuncio pasado' : 'Anuncio activo'}${item.url ? ' (abre en una pestaña nueva)' : ''}`,
    };
  });
}

/** Alto del tablón (px) según cuántos carteles hay: sin huecos vacíos enormes ni carteles cortados. */
export function canvasHeight(active: number, expired: number): number {
  const lastTop = (positions: number[][], n: number) =>
    n ? Math.max(...positions.slice(0, Math.min(n, positions.length)).map(([, top]) => top * 3.1)) : 0;
  return Math.round(Math.max(lastTop(ACTIVE_POSITIONS, active), lastTop(EXPIRED_POSITIONS, expired)) + 340);
}

@Component({
  selector: 'app-board-page',
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './board-page.scss',
  templateUrl: './board-page.html',
})
export class BoardPage {
  private readonly content = inject(ContentService);
  private readonly setStatus = injectHttpStatus();

  protected readonly state = toSignal(
    toLoadState(this.content.board()).pipe(
      tap((s) => {
        if (s.status === 'error') this.setStatus(503);
      }),
    ),
    { requireSync: true },
  );

  protected readonly flyers = (active: Announcement[], expired: Announcement[]) => ({
    active: toFlyers(active, false),
    expired: toFlyers(expired, true),
    height: canvasHeight(active.length, expired.length),
  });

  protected readonly formatFecha = formatFecha;

  constructor() {
    inject(SeoService).set({
      title: 'El Tablón',
      description: 'Convocatorias, encuentros, lecturas y propuestas de la comunidad de LA ACCIÓN.',
      path: '/tablon',
    });
  }
}
