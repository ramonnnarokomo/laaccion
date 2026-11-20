import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/seo/seo.service';
import { errorMessage } from '../../core/util/load-state';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panel.scss',
  template: `
    <div class="login">
      <form class="login-card" [formGroup]="form" (ngSubmit)="submit()">
        <img src="/img/logo-560.webp" width="280" height="93" alt="LA ACCIÓN" />
        <h1>Panel editorial</h1>
        <label>
          Correo electrónico
          <input type="email" formControlName="email" autocomplete="username" required />
        </label>
        <label>
          Contraseña
          <input type="password" formControlName="password" autocomplete="current-password" required />
        </label>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button class="btn btn--primary" type="submit" [disabled]="sending() || form.invalid">
          {{ sending() ? 'Entrando…' : 'Entrar' }}
        </button>
        <a class="login-back" href="/">← Volver a la web</a>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  constructor() {
    inject(SeoService).set({ title: 'Acceso editorial', path: '/panel/login', noindex: true });
    // Si ya hay sesión, directamente al panel.
    this.auth
      .restore()
      .then((me) => {
        if (me) void this.router.navigateByUrl(this.destination());
      })
      .catch(() => undefined);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl(this.destination());
    } catch (e) {
      this.error.set(errorMessage(e));
      this.form.controls.password.reset();
    } finally {
      this.sending.set(false);
    }
  }

  /** Solo se vuelve a rutas del propio panel (evita redirecciones abiertas). */
  private destination(): string {
    const volver = this.route.snapshot.queryParamMap.get('volver') ?? '';
    return /^\/panel(\/[\w\-/]*)?$/.test(volver) && !volver.startsWith('/panel/login') ? volver : '/panel';
  }
}
