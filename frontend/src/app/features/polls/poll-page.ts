import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { Poll } from '../../core/api/models';
import { ContentService } from '../../core/api/content.service';
import { SeoService } from '../../core/seo/seo.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { injectHttpStatus } from '../../core/util/http-status';
import { LoadState, errorMessage, toLoadState } from '../../core/util/load-state';
import { TurnstileService } from '../../core/util/turnstile.service';
import { VideoFacade } from '../../shared/ui/video-facade';

const VOTED_KEY = 'laaccion.votos';

function readVoted(): number[] {
  try {
    const raw = globalThis.localStorage?.getItem(VOTED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function rememberVote(id: number): void {
  try {
    const list = [...new Set([...readVoted(), id])].slice(-200);
    globalThis.localStorage?.setItem(VOTED_KEY, JSON.stringify(list));
  } catch {
    // almacenamiento no disponible (modo privado, etc.): solo se pierde el recordatorio local
  }
}

@Component({
  selector: 'app-poll-page',
  imports: [RouterLink, FechaPipe, VideoFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './polls.scss',
  templateUrl: './poll-page.html',
})
export class PollPage {
  private readonly route = inject(ActivatedRoute);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly turnstile = inject(TurnstileService);
  private readonly setStatus = injectHttpStatus();
  private readonly captchaHost = viewChild<ElementRef<HTMLElement>>('captcha');

  /** Encuesta actualizada tras votar (sustituye a la cargada). */
  private readonly updated = signal<Poll | null>(null);
  protected readonly selected = signal<number | null>(null);
  protected readonly sending = signal(false);
  protected readonly message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);
  protected readonly voted = signal(false);
  protected readonly revealed = signal(false);

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      map((p) => Number(p.get('id'))),
      switchMap((id) => toLoadState(this.content.poll(Number.isSafeInteger(id) && id > 0 ? id : -1))),
      tap((s) => this.onState(s)),
    ),
    { initialValue: { status: 'loading' } as LoadState<Poll> },
  );

  protected readonly poll = computed(() => {
    const s = this.state();
    return this.updated() ?? (s.status === 'ok' ? s.data : null);
  });

  protected readonly showResults = computed(() => {
    const p = this.poll();
    return !!p && (p.status === 'CLOSED' || this.voted() || this.revealed());
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.updated.set(null);
      this.selected.set(null);
      this.message.set(null);
      this.revealed.set(false);
    });
  }

  protected async vote(): Promise<void> {
    const poll = this.poll();
    const optionId = this.selected();
    if (!poll || optionId === null || this.sending()) return;
    this.sending.set(true);
    this.message.set(null);
    try {
      const token = await this.captchaToken();
      this.content.vote(poll.id, optionId, token).subscribe({
        next: (result) => {
          this.updated.set(result);
          this.markVoted(poll.id);
          this.message.set({ kind: 'ok', text: '¡Gracias! Tu voto se ha registrado.' });
          this.sending.set(false);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.markVoted(poll.id);
            this.refresh(poll.id);
          }
          this.message.set({ kind: 'error', text: errorMessage(error) });
          this.sending.set(false);
        },
      });
    } catch {
      this.message.set({ kind: 'error', text: 'No se pudo completar la verificación anti-bots. Recarga la página e inténtalo de nuevo.' });
      this.sending.set(false);
    }
  }

  private markVoted(id: number): void {
    rememberVote(id);
    this.voted.set(true);
  }

  private refresh(id: number): void {
    this.content.poll(id).subscribe({ next: (p) => this.updated.set(p), error: () => undefined });
  }

  /** Token de Cloudflare Turnstile (null si no hay clave configurada: el back decide si lo exige). */
  private async captchaToken(): Promise<string | null> {
    const key = await this.turnstile.siteKey();
    const host = this.captchaHost()?.nativeElement;
    if (!key || !host) return null;
    const api = await this.turnstile.load();
    host.replaceChildren();
    return new Promise<string>((resolve, reject) => {
      api.render(host, {
        sitekey: key,
        language: 'es',
        appearance: 'interaction-only',
        callback: (token: string) => resolve(token),
        'error-callback': () => reject(new Error('turnstile')),
        'timeout-callback': () => reject(new Error('turnstile')),
      });
    });
  }

  private onState(s: LoadState<Poll>): void {
    if (s.status === 'not-found') {
      this.setStatus(404);
      this.seo.set({ title: 'Encuesta no encontrada', path: '/404', noindex: true });
    } else if (s.status === 'error') {
      this.setStatus(503);
    } else if (s.status === 'ok') {
      const p = s.data;
      this.voted.set(readVoted().includes(p.id));
      this.seo.set({
        title: p.question,
        description: p.description || `Encuesta de LA ACCIÓN: ${p.question}`,
        path: `/encuestas/${p.id}`,
      });
    }
  }
}
