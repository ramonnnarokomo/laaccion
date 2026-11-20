import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Me } from '../api/models';

/**
 * Sesión del panel editorial. La sesión real es la cookie HttpOnly que pone el back; aquí solo
 * se guarda quién es el usuario para pintar la interfaz. La autorización de verdad está en el back.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly current = signal<Me | null>(null);
  private restoring: Promise<Me | null> | null = null;

  readonly user = this.current.asReadonly();
  readonly isLoggedIn = computed(() => this.current() !== null);
  readonly isAdmin = computed(() => this.current()?.role === 'ADMIN');

  /** Recupera la sesión existente (si la hay) una sola vez por carga de la aplicación. */
  restore(): Promise<Me | null> {
    if (!this.restoring) {
      this.restoring = (async () => {
        try {
          const me = await firstValueFrom(this.http.get<Me>('/api/v1/auth/me'));
          this.current.set(me);
          return me;
        } catch (error) {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.current.set(null);
            return null;
          }
          this.restoring = null; // error de red: se reintentará en la siguiente navegación
          throw error;
        }
      })();
    }
    return this.restoring;
  }

  async login(email: string, password: string): Promise<Me> {
    const me = await firstValueFrom(this.http.post<Me>('/api/v1/auth/login', { email, password }));
    this.current.set(me);
    this.restoring = Promise.resolve(me);
    return me;
  }

  async logout(): Promise<void> {
    try {
        await firstValueFrom(this.http.post('/api/v1/auth/logout', null));
    } finally {
      this.clearSession();
    }
  }

  changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
    return firstValueFrom(this.http.post('/api/v1/auth/password', { currentPassword, newPassword }));
  }

  clearSession(): void {
    this.current.set(null);
    this.restoring = Promise.resolve(null);
  }
}
