import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/api/admin.service';
import { Category } from '../../core/api/models';
import { errorMessage, fieldErrors } from '../../core/util/load-state';
import { FieldError } from './shared/field-error';
import { SLUG_PATTERN } from './shared/panel-util';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head"><h1>Secciones</h1></header>
    <p class="muted">Las cuatro secciones del menú principal (La Acción, La Mónada, La Asociación y La Comunidad) están fijadas en el diseño: si cambias su dirección (slug), el menú dejará de enlazarlas.</p>
    <div class="workspace">
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2>{{ editingId() ? 'Editar sección' : 'Nueva sección' }}</h2>
        <label class="field"><span>Nombre *</span><input formControlName="name" maxlength="80" />
          <app-field-error [message]="errors()['name']" /></label>
        <label class="field"><span>Dirección (slug) <small>(vacía = a partir del nombre)</small></span><input formControlName="slug" maxlength="100" />
          <app-field-error [message]="errors()['slug'] || (form.controls.slug.errors?.['pattern'] ? 'Solo minúsculas, números y guiones.' : null)" /></label>
        <label class="field"><span>Descripción <small>(aparece en la cabecera de la sección)</small></span>
          <textarea formControlName="description" rows="3" maxlength="300"></textarea>
          <app-field-error [message]="errors()['description']" /></label>
        <label class="field"><span>Orden</span><input type="number" formControlName="sortOrder" min="0" max="10000" /></label>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="row">
          <button class="btn btn--primary" type="submit" [disabled]="saving()">Guardar</button>
          @if (editingId()) {
            <button class="btn" type="button" (click)="reset()">Cancelar</button>
          }
        </div>
      </form>
      <section>
        @if (listError()) {
          <p class="form-error" role="alert">{{ listError() }}</p>
        }
        <ul class="item-list">
          @for (c of categories(); track c.id) {
            <li class="item">
              <div>
                <h3>{{ c.name }}</h3>
                <span class="muted">/seccion/{{ c.slug }} · orden {{ c.sortOrder }}</span>
                @if (c.description) {
                  <p>{{ c.description }}</p>
                }
              </div>
              <div class="actions">
                <button type="button" class="link-btn" (click)="edit(c)">Editar</button>
                <button type="button" class="link-btn danger" (click)="remove(c)">Eliminar</button>
              </div>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class Categories {
  private readonly admin = inject(AdminService);
  protected readonly categories = signal<Category[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    slug: ['', [Validators.maxLength(100), Validators.pattern(SLUG_PATTERN)]],
    description: ['', Validators.maxLength(300)],
    sortOrder: [0, [Validators.min(0), Validators.max(10000)]],
  });

  constructor() {
    this.load();
  }

  protected edit(c: Category): void {
    this.editingId.set(c.id);
    this.form.reset({ name: c.name, slug: c.slug, description: c.description ?? '', sortOrder: c.sortOrder });
  }

  protected reset(): void {
    this.editingId.set(null);
    this.errors.set({});
    this.error.set(null);
    this.form.reset();
  }

  protected save(): void {
    this.errors.set({});
    if (this.form.invalid) {
      this.error.set('Revisa los campos.');
      return;
    }
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), slug: v.slug.trim() || null, description: v.description.trim() || null, sortOrder: v.sortOrder };
    const id = this.editingId();
    this.saving.set(true);
    this.error.set(null);
    (id ? this.admin.updateCategory(id, body) : this.admin.createCategory(body)).subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.load();
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.errors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
      },
    });
  }

  protected remove(c: Category): void {
    if (!confirm(`¿Eliminar la sección «${c.name}»? Solo se puede si no tiene artículos.`)) return;
    this.admin.deleteCategory(c.id).subscribe({ next: () => this.load(), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }

  private load(): void {
    this.admin.categories().subscribe({ next: (c) => this.categories.set(c), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }
}
