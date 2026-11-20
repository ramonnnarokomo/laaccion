import { HttpBackend, HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Carga Cloudflare Turnstile solo cuando hace falta (al ir a votar), nunca en el servidor. */
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  private readonly document = inject(DOCUMENT);
  private readonly http = new HttpClient(inject(HttpBackend));
  private loading: Promise<TurnstileApi> | null = null;
  private key: Promise<string> | null = null;

  /**
   * Site key pública. La da el servidor en /config.json (variable TURNSTILE_SITE_KEY de Railway), así
   * no hay que recompilar para cambiarla. Si no está, se usa la de environment.ts. Vacía = sin captcha.
   */
  siteKey(): Promise<string> {
    this.key ??= firstValueFrom(this.http.get<{ turnstileSiteKey?: string }>('/config.json'))
      .then((c) => c.turnstileSiteKey || environment.turnstileSiteKey)
      .catch(() => environment.turnstileSiteKey);
    return this.key;
  }

  load(): Promise<TurnstileApi> {
    const win = this.document.defaultView;
    if (win?.turnstile) return Promise.resolve(win.turnstile);
    this.loading ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => (win?.turnstile ? resolve(win.turnstile) : reject(new Error('Turnstile no disponible')));
      script.onerror = () => {
        this.loading = null;
        reject(new Error('No se pudo cargar el captcha'));
      };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }
}
