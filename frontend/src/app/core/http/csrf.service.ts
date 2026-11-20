import { HttpBackend, HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';


/**
 * El back exige CSRF en todo POST/PUT/DELETE (cookie XSRF-TOKEN + cabecera X-XSRF-TOKEN), también
 * en el voto público. Este servicio consigue la cookie cuando falta (primera visita, tras cerrar
 * sesión, o si Spring la rota al iniciar sesión) y lee su valor para la cabecera.
 */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  /** HttpBackend directo: no pasa por los interceptores (evita bucles). */
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly document = inject(DOCUMENT);
  private pending: Promise<void> | null = null;

  token(): string | null {
    const match = this.document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /** Garantiza que existe la cookie. Con force, la pide de nuevo aunque exista. */
  async ensure(force = false): Promise<string | null> {
    if (force || !this.token()) {
      this.pending ??= firstValueFrom(this.http.get('/api/v1/auth/csrf', { withCredentials: true }))
        .then(() => undefined)
        .finally(() => (this.pending = null));
      await this.pending;
    }
    return this.token();
  }
}

