import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/util/load-state';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head"><h1>Mi contraseña</h1></header>
    <form class="card narrow" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <p class="muted">Sesión iniciada como <strong>{{ auth.user()?.email }}</strong>.</p>
      <label class="field"><span>Contraseña actual</span>
        <input type="password" formControlName="current" autocomplete="current-password" /></label>
      <label class="field"><span>Nueva contraseña <small>(12 a 72 caracteres; mejor una frase larga)</small></span>
        <input type="password" formControlName="next" autocomplete="new-password" minlength="12" maxlength="72" /></label>
      <label class="field"><span>Repite la nueva contraseña</span>
        <input type="password" formControlName="repeat" autocomplete="new-password" /></label>
      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }
      @if (done()) {
        <p class="form-ok" role="status">Contraseña cambiada.</p>
      }
      <button class="btn btn--primary" type="submit" [disabled]="sending()">Cambiar contraseña</button>
    </form>
  `,
})
export class Account {
  protected readonly auth = inject(AuthService);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    current: ['', Validators.required],
    next: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    repeat: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    this.done.set(false);
    const v = this.form.getRawValue();
    if (this.form.invalid) return this.error.set('La nueva contraseña debe tener entre 12 y 72 caracteres.');
    if (v.next !== v.repeat) return this.error.set('Las dos contraseñas nuevas no coinciden.');
    if (v.next === v.current) return this.error.set('La nueva contraseña debe ser distinta de la actual.');
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.auth.changePassword(v.current, v.next);
      this.done.set(true);
      this.form.reset();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.sending.set(false);
    }
  }
}
