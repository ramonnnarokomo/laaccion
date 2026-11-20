import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/api/admin.service';
import { AnnouncementAdmin, AnnouncementMetrics, AnnouncementState, Page, Tone } from '../../core/api/models';
import { FechaPipe } from '../../core/util/fecha.pipe';
import { errorMessage, fieldErrors } from '../../core/util/load-state';
import { FieldError } from './shared/field-error';
import { STATUS_LABEL } from './shared/panel-util';

@Component({
  selector: 'app-announcements',
  imports: [ReactiveFormsModule, FechaPipe, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head"><h1>El Tablón</h1></header>

    @if (metrics(); as m) {
      <div class="metrics">
        <div><strong>{{ m.total }}</strong><span>Total</span></div>
        <div><strong>{{ m.active }}</strong><span>Activos (máx. 10 visibles)</span></div>
        <div><strong>{{ m.expired }}</strong><span>Pasados (máx. 25 visibles)</span></div>
        <div><strong>{{ m.hidden }}</strong><span>Ocultos</span></div>
      </div>
    }

    <div class="workspace">
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2>{{ editingId() ? 'Editar anuncio' : 'Nuevo anuncio' }}</h2>
        <label class="field"><span>Antetítulo * <small>{{ form.controls.section.value.length }}/90</small></span>
          <input formControlName="section" maxlength="90" placeholder="Seminario abierto · Filosofía" />
          <app-field-error [message]="err('section')" /></label>
        <label class="field"><span>Título * <small>{{ form.controls.title.value.length }}/110 · salto de línea permitido</small></span>
          <textarea formControlName="title" rows="2" maxlength="110"></textarea>
          <app-field-error [message]="err('title')" /></label>
        <label class="field"><span>Descripción * <small>{{ form.controls.description.value.length }}/280</small></span>
          <textarea formControlName="description" rows="3" maxlength="280"></textarea>
          <app-field-error [message]="err('description')" /></label>
        <label class="field"><span>Detalles <small>(día, hora, lugar · {{ form.controls.details.value.length }}/180)</small></span>
          <textarea formControlName="details" rows="2" maxlength="180" placeholder="JUEVES · 19:00 H&#10;AULA ABIERTA"></textarea>
          <app-field-error [message]="err('details')" /></label>
        <div class="field-grid">
          <label class="field"><span>Fecha del evento *</span>
            <input type="date" formControlName="eventDate" />
            <app-field-error [message]="err('eventDate')" /></label>
          <label class="field"><span>Sello <small>{{ form.controls.stamp.value.length }}/35</small></span>
            <input formControlName="stamp" maxlength="35" placeholder="Entrada libre" />
            <app-field-error [message]="err('stamp')" /></label>
          <label class="field"><span>Color</span>
            <select formControlName="tone">
              <option value="IVORY">Marfil</option>
              <option value="RED">Burdeos</option>
              <option value="GOLD">Dorado</option>
              <option value="DARK">Oscuro</option>
            </select></label>
        </div>
        <label class="field"><span>Enlace <small>(opcional, https://…)</small></span>
          <input type="url" formControlName="url" maxlength="500" />
          <app-field-error [message]="err('url')" /></label>
        <label class="check"><input type="checkbox" formControlName="visible" /> Visible en el tablón</label>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <div class="row">
          <button class="btn btn--primary" type="submit" [disabled]="saving()">{{ editingId() ? 'Guardar cambios' : 'Publicar anuncio' }}</button>
          @if (editingId()) {
            <button class="btn" type="button" (click)="reset()">Cancelar</button>
          }
        </div>
      </form>

      <section>
        <div class="tabs" role="tablist">
          @for (t of tabs; track t.label) {
            <button type="button" role="tab" [attr.aria-selected]="state() === t.value" [class.active]="state() === t.value" (click)="state.set(t.value); page.set(0)">{{ t.label }}</button>
          }
        </div>
        @if (listError()) {
          <p class="form-error" role="alert">{{ listError() }}</p>
        }
        @if (data(); as d) {
          <ul class="item-list">
            @for (a of d.content; track a.id) {
              <li class="item" [class.item--muted]="a.state !== 'ACTIVE'">
                <div>
                  <span class="badge" [class]="'badge--' + a.state.toLowerCase()">{{ label[a.state] }}</span>
                  <span class="muted">{{ a.eventDate | fecha: 'dia' }} · {{ a.section }}</span>
                  <h3>{{ a.title }}</h3>
                  <p>{{ a.description }}</p>
                </div>
                <div class="actions">
                  <button type="button" class="link-btn" (click)="edit(a)">Editar</button>
                  <button type="button" class="link-btn" (click)="toggle(a)">{{ a.visible ? 'Ocultar' : 'Mostrar' }}</button>
                  <button type="button" class="link-btn danger" (click)="remove(a)">Eliminar</button>
                </div>
              </li>
            } @empty {
              <li class="muted">No hay anuncios aquí.</li>
            }
          </ul>
          @if (d.totalPages > 1) {
            <div class="pager">
              <button class="btn" type="button" [disabled]="page() === 0" (click)="page.set(page() - 1)">←</button>
              <span>{{ d.page + 1 }} / {{ d.totalPages }}</span>
              <button class="btn" type="button" [disabled]="d.page + 1 >= d.totalPages" (click)="page.set(page() + 1)">→</button>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export class Announcements {
  private readonly admin = inject(AdminService);
  protected readonly label = STATUS_LABEL;
  protected readonly tabs: { label: string; value: AnnouncementState | null }[] = [
    { label: 'Todos', value: null },
    { label: 'Activos', value: 'ACTIVE' },
    { label: 'Pasados', value: 'EXPIRED' },
    { label: 'Ocultos', value: 'HIDDEN' },
  ];
  protected readonly state = signal<AnnouncementState | null>(null);
  protected readonly page = signal(0);
  protected readonly data = signal<Page<AnnouncementAdmin> | null>(null);
  protected readonly metrics = signal<AnnouncementMetrics | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly listError = signal<string | null>(null);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    section: ['', [Validators.required, Validators.maxLength(90)]],
    title: ['', [Validators.required, Validators.maxLength(110)]],
    description: ['', [Validators.required, Validators.maxLength(280)]],
    details: ['', Validators.maxLength(180)],
    url: ['', [Validators.maxLength(500), Validators.pattern(/^(https?:\/\/\S+)?$/)]],
    eventDate: ['', Validators.required],
    stamp: ['', Validators.maxLength(35)],
    tone: ['IVORY' as Tone],
    visible: [true],
  });

  constructor() {
    effect(() => {
      const state = this.state();
      const page = this.page();
      untracked(() => this.load(state, page));
    });
  }

  protected err(field: string): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Obligatorio.';
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;
    if (c.errors['pattern']) return 'Debe empezar por https:// o http://';
    return 'Valor no válido.';
  }

  protected edit(a: AnnouncementAdmin): void {
    this.editingId.set(a.id);
    this.form.reset({
      section: a.section, title: a.title, description: a.description, details: a.details ?? '', url: a.url ?? '',
      eventDate: a.eventDate, stamp: a.stamp ?? '', tone: a.tone, visible: a.visible,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected reset(): void {
    this.editingId.set(null);
    this.serverErrors.set({});
    this.error.set(null);
    this.form.reset();
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados.');
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      section: v.section.trim(), title: v.title.trim(), description: v.description.trim(), details: v.details.trim() || null,
      url: v.url.trim() || null, eventDate: v.eventDate, stamp: v.stamp.trim() || null, tone: v.tone, visible: v.visible,
    };
    const id = this.editingId();
    this.saving.set(true);
    this.error.set(null);
    (id ? this.admin.updateAnnouncement(id, body) : this.admin.createAnnouncement(body)).subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.refresh();
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
      },
    });
  }

  protected toggle(a: AnnouncementAdmin): void {
    const body = {
      section: a.section, title: a.title, description: a.description, details: a.details, url: a.url,
      eventDate: a.eventDate, stamp: a.stamp, tone: a.tone, visible: !a.visible,
    };
    this.admin.updateAnnouncement(a.id, body).subscribe({ next: () => this.refresh(), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }

  protected remove(a: AnnouncementAdmin): void {
    if (!confirm(`¿Eliminar el anuncio «${a.title}»?`)) return;
    this.admin.deleteAnnouncement(a.id).subscribe({ next: () => this.refresh(), error: (e: unknown) => this.listError.set(errorMessage(e)) });
  }

  private refresh(): void {
    this.load(this.state(), this.page());
  }

  private load(state: AnnouncementState | null, page: number): void {
    this.listError.set(null);
    this.admin.announcements(state, page, 20).subscribe({ next: (d) => this.data.set(d), error: (e: unknown) => this.listError.set(errorMessage(e)) });
    this.admin.announcementMetrics().subscribe({ next: (m) => this.metrics.set(m), error: () => undefined });
  }
}
