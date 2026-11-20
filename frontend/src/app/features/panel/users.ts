import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/api/admin.service';
import { Role, User } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage, fieldErrors } from '../../core/util/load-state';
import { FieldError } from './shared/field-error';

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, FechaPipe, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head"><h1>Usuarios</h1></header>
    <div class="workspace">
      <form class="card" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <h2>Nueva cuenta</h2>
        <label class="field"><span>Correo *</span><input type="email" formControlName="email" maxlength="254" />
          <app-field-error [message]="errors()['email']" /></label>
        <label class="field"><span>Nombre visible *</span><input formControlName="displayName" maxlength="80" />
          <app-field-error [message]="errors()['displayName']" /></label>
        <label class="field"><span>Contraseña inicial * <small>(12 a 72; la persona puede cambiarla después)</small></span>
          <input type="password" formControlName="password" autocomplete="new-password" maxlength="72" />
          <app-field-error [message]="errors()['password']" /></label>
        <label class="field"><span>Rol</span>
          <select formControlName="role"><option value="EDITOR">Edición (solo sus artículos)</option><option value="ADMIN">Administración</option></select></label>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button class="btn btn--primary" type="submit" [disabled]="saving()">Crear cuenta</button>
      </form>

      <section>
        @if (listError()) {
          <p class="form-error" role="alert">{{ listError() }}</p>
        }
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr [class.row-muted]="!u.enabled">
                  <td><strong>{{ u.displayName }}</strong><br /><span class="muted">{{ u.email }}</span></td>
                  <td>
                    <select [value]="u.role" (change)="update(u, { role: $any($event.target).value })" [disabled]="u.id === me()" aria-label="Rol">
                      <option value="EDITOR">Edición</option><option value="ADMIN">Administración</option>
                    </select>
                  </td>
                  <td>{{ u.enabled ? 'Activa' : 'Desactivada' }}</td>
                  <td>{{ u.lastLoginAt ? (u.lastLoginAt | fecha: 'hora') : 'Nunca' }}</td>
                  <td class="actions">
                    <button type="button" class="link-btn" (click)="rename(u)">Renombrar</button>
                    <button type="button" class="link-btn" (click)="resetPassword(u)">Nueva contraseña</button>
                    @if (u.id !== me()) {
                      <button type="button" class="link-btn" [class.danger]="u.enabled" (click)="update(u, { enabled: !u.enabled })">{{ u.enabled ? 'Desactivar' : 'Activar' }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Users {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  protected readonly me = () => this.auth.user()?.id;
  protected readonly users = signal<User[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
    role: ['EDITOR' as Role],
  });

  constructor() {
    this.load();
  }

  protected create(): void {
    this.errors.set({});
    if (this.form.invalid) {
      this.error.set('Rellena correo, nombre y una contraseña de 12 a 72 caracteres.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.admin.createUser({ ...v, email: v.email.trim(), displayName: v.displayName.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.load();
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.errors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
      },
    });
  }

  protected update(u: User, change: Partial<Pick<User, 'role' | 'enabled' | 'displayName'>>): void {
    if (change.enabled === false && !confirm(`¿Desactivar la cuenta de ${u.displayName}? Se cerrará su sesión.`)) return;
    const body = { displayName: change.displayName ?? u.displayName, role: change.role ?? u.role, enabled: change.enabled ?? u.enabled };
    this.admin.updateUser(u.id, body).subscribe({ next: () => this.load(), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }

  protected rename(u: User): void {
    const name = prompt('Nombre visible:', u.displayName)?.trim();
    if (name && name !== u.displayName) this.update(u, { displayName: name.slice(0, 80) });
  }

  protected resetPassword(u: User): void {
    const pass = prompt(`Nueva contraseña para ${u.displayName} (12 a 72 caracteres):`);
    if (!pass) return;
    if (pass.length < 12 || pass.length > 72) {
      alert('La contraseña debe tener entre 12 y 72 caracteres.');
      return;
    }
    this.admin.resetPassword(u.id, pass).subscribe({
      next: () => alert('Contraseña cambiada. Comunícasela por un canal seguro.'),
      error: (e: unknown) => this.listError.set(errorMessage(e)),
    });
  }

  private load(): void {
    this.listError.set(null);
    this.admin.users(0, 50).subscribe({ next: (p) => this.users.set(p.content), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }
}
