import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService } from '../../core/api/admin.service';
import { Poll, PollRequest } from '../../core/api/models';
import { toVideoEmbed } from '../../core/util/embed';
import { errorMessage, fieldErrors } from '../../core/util/load-state';
import { FieldError } from './shared/field-error';
import { fromLocalInput, toLocalInput } from './shared/panel-util';

/** En encuestas el back solo admite vídeos de YouTube, TikTok e Instagram. */
export function isPollVideo(url: string): boolean {
  const e = toVideoEmbed(url);
  return !!e && e.provider !== 'Vimeo';
}

@Component({
  selector: 'app-poll-editor',
  imports: [ReactiveFormsModule, RouterLink, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="panel-head">
      <div>
        <a class="muted" routerLink="/panel/encuestas">← Encuestas</a>
        <h1>{{ poll() ? 'Editar encuesta' : 'Nueva encuesta' }}</h1>
      </div>
      @if (poll(); as p) {
        <div class="row">
          @if (p.status === 'DRAFT') {
            <button class="btn" type="button" (click)="open()">Abrir votación</button>
          }
          @if (p.status === 'OPEN') {
            <button class="btn" type="button" (click)="close()">Cerrar votación</button>
          }
        </div>
      }
    </header>

    <div class="workspace">
      <form class="card" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <label class="field"><span>Pregunta * <small>{{ form.controls.question.value.length }}/300</small></span>
          <textarea formControlName="question" rows="2" maxlength="300"></textarea>
          <app-field-error [message]="err('question')" /></label>
        <label class="field"><span>Descripción <small>{{ form.controls.description.value.length }}/1000</small></span>
          <textarea formControlName="description" rows="3" maxlength="1000"></textarea>
          <app-field-error [message]="err('description')" /></label>
        <label class="field"><span>Vídeo <small>(enlace de YouTube, TikTok o Instagram)</small></span>
          <input type="url" formControlName="videoUrl" maxlength="500" placeholder="https://www.tiktok.com/@laaccion/video/…" />
          <app-field-error [message]="err('videoUrl')" /></label>
        <label class="field"><span>Cierre automático <small>(opcional)</small></span>
          <input type="datetime-local" formControlName="closesAt" />
          <app-field-error [message]="err('closesAt')" /></label>

        <fieldset class="field options" [disabled]="locked()">
          <legend>Opciones * <small>(2 a 10{{ locked() ? ' · ya no se pueden cambiar porque la votación se ha abierto' : '' }})</small></legend>
          @for (o of options(); track $index; let i = $index) {
            <div class="option-row">
              <input [value]="o" (input)="setOption(i, $any($event.target).value)" maxlength="200" [attr.aria-label]="'Opción ' + (i + 1)" />
              <button type="button" class="link-btn danger" (click)="removeOption(i)" [disabled]="options().length <= 2" aria-label="Quitar opción">✕</button>
            </div>
          }
          @if (options().length < 10) {
            <button type="button" class="link-btn" (click)="addOption()">+ Añadir opción</button>
          }
          <app-field-error [message]="serverErrors()['options']" />
        </fieldset>

        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="form-ok" role="status">{{ saved() }}</p>
        }
        <button class="btn btn--primary" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
      </form>

      @if (poll(); as p) {
        <section class="card">
          <h2>Resultados</h2>
          <p class="muted">Estado: {{ p.status === 'DRAFT' ? 'Borrador (no visible)' : p.status === 'OPEN' ? 'Abierta' : 'Cerrada' }} · {{ p.totalVotes }} votos</p>
          <ul class="results-mini">
            @for (o of p.options; track o.id) {
              <li><span>{{ o.label }}</span><strong>{{ o.votes }} · {{ o.percentage }} %</strong>
                <div class="bar"><span [style.width.%]="o.percentage"></span></div></li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class PollEditor {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  protected readonly poll = signal<Poll | null>(null);
  protected readonly options = signal<string[]>(['', '']);
  protected readonly locked = computed(() => !!this.poll() && this.poll()!.status !== 'DRAFT');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string>>({});
  private optionsDirty = false;

  protected readonly form = inject(NonNullableFormBuilder).group({
    question: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', Validators.maxLength(1000)],
    videoUrl: ['', Validators.maxLength(500)],
    closesAt: [''],
  });

  constructor() {
    const notice = this.router.currentNavigation()?.extras.state?.['saved'];
    if (typeof notice === 'string') this.saved.set(notice);
    const raw = inject(ActivatedRoute).snapshot.paramMap.get('id');
    if (raw) {
      this.admin.poll(Number(raw)).subscribe({ next: (p) => this.fill(p), error: (e: unknown) => this.error.set(errorMessage(e)) });
    }
  }

  isDirty(): boolean {
    return !this.saving() && (this.form.dirty || this.optionsDirty);
  }

  protected err(field: string): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Obligatorio.';
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;
    return 'Valor no válido.';
  }

  protected setOption(i: number, value: string): void {
    this.options.update((list) => list.map((o, j) => (j === i ? value : o)));
    this.optionsDirty = true;
  }
  protected addOption(): void {
    this.options.update((list) => [...list, '']);
    this.optionsDirty = true;
  }
  protected removeOption(i: number): void {
    this.options.update((list) => list.filter((_, j) => j !== i));
    this.optionsDirty = true;
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.serverErrors.set({});
    this.saved.set(null);
    const v = this.form.getRawValue();
    const options = this.options().map((o) => o.trim()).filter(Boolean);
    const closesAt = fromLocalInput(v.closesAt);
    const problems: string[] = [];
    if (this.form.invalid) problems.push('Revisa los campos marcados.');
    if (options.length < 2) problems.push('Hacen falta al menos 2 opciones.');
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) problems.push('Hay opciones repetidas.');
    if (v.videoUrl.trim() && !isPollVideo(v.videoUrl)) problems.push('El vídeo debe ser un enlace de YouTube, TikTok o Instagram.');
    if (closesAt && new Date(closesAt) <= new Date() && this.poll()?.status !== 'CLOSED') problems.push('La fecha de cierre debe ser futura.');
    if (problems.length) {
      this.error.set(problems.join(' '));
      return;
    }
    const body: PollRequest = {
      question: v.question.trim(),
      description: v.description.trim() || null,
      videoUrl: v.videoUrl.trim() || null,
      closesAt,
      options: this.locked() ? this.poll()!.options.map((o) => o.label) : options,
    };
    const current = this.poll();
    this.saving.set(true);
    this.error.set(null);
    (current ? this.admin.updatePoll(current.id, body) : this.admin.createPoll(body)).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.fill(p);
        this.saved.set(p.status === 'DRAFT' ? 'Guardada como borrador. Ábrela cuando quieras que se pueda votar.' : 'Cambios guardados.');
        if (!current) void this.router.navigate(['/panel/encuestas', p.id], { replaceUrl: true, state: { saved: this.saved() } });
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
      },
    });
  }

  protected open(): void {
    const p = this.poll();
    if (!p || !confirm('¿Abrir la votación? Después ya no se podrán cambiar las opciones.')) return;
    this.admin.openPoll(p.id).subscribe({ next: (r) => this.fill(r), error: (e: unknown) => this.error.set(errorMessage(e)) });
  }

  protected close(): void {
    const p = this.poll();
    if (!p || !confirm('¿Cerrar la votación ahora?')) return;
    this.admin.closePoll(p.id).subscribe({ next: (r) => this.fill(r), error: (e: unknown) => this.error.set(errorMessage(e)) });
  }

  private fill(p: Poll): void {
    this.poll.set(p);
    this.form.reset({ question: p.question, description: p.description ?? '', videoUrl: p.videoUrl ?? '', closesAt: toLocalInput(p.closesAt) });
    this.options.set(p.options.map((o) => o.label));
    this.optionsDirty = false;
  }
}
