import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminService } from '../../core/api/admin.service';
import { ArticleAdmin, ArticleRequest, ArticleStatus, Category, ImageInfo } from '../../core/api/models';
import { fieldErrors, errorMessage } from '../../core/util/load-state';
import { ArticleHtmlPipe } from '../../shared/ui/safe-html.pipe';
import { EmbedFacades } from '../../shared/ui/article-html';
import { FieldError } from './shared/field-error';
import { ImagePicker } from './shared/image-picker';
import { SLUG_PATTERN, fromLocalInput, parseTags, toLocalInput } from './shared/panel-util';
import { RichEditor } from './shared/rich-editor';

type PickerTarget = 'featured' | 'content' | null;

@Component({
  selector: 'app-article-editor',
  imports: [ReactiveFormsModule, RouterLink, RichEditor, ImagePicker, FieldError, ArticleHtmlPipe, EmbedFacades],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './article-editor.html',
})
export class ArticleEditor {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly editorRef = viewChild(RichEditor);

  protected readonly id = signal<number | null>(null);
  protected readonly article = signal<ArticleAdmin | null>(null);
  protected readonly content = signal('');
  protected readonly contentDirty = signal(false);
  protected readonly categories = toSignal(this.admin.categories(), { initialValue: [] as Category[] });
  protected readonly picker = signal<PickerTarget>(null);
  protected readonly preview = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', [Validators.maxLength(160), Validators.pattern(SLUG_PATTERN)]],
    dek: ['', Validators.maxLength(300)],
    summary: ['', [Validators.required, Validators.maxLength(600)]],
    categoryId: [0, Validators.min(1)],
    tags: [''],
    byline: ['', Validators.maxLength(120)],
    featured: [false],
    status: ['DRAFT' as ArticleStatus],
    publishedAt: [''],
    featuredImageId: [null as number | null],
    featuredImageUrl: [''],
    featuredImageAlt: ['', Validators.maxLength(250)],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly isNew = computed(() => this.id() === null);
  protected readonly tagCount = computed(() => parseTags(this.formValue().tags ?? '').length);

  constructor() {
    const notice = this.router.currentNavigation()?.extras.state?.['saved'];
    if (typeof notice === 'string') this.saved.set(notice);
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw) {
      const id = Number(raw);
      this.id.set(id);
      this.admin.article(id).subscribe({
        next: (a) => this.fill(a),
        error: (e: unknown) => this.loadError.set(errorMessage(e)),
      });
    }
  }

  /** Para el guard de cambios sin guardar. */
  isDirty(): boolean {
    return !this.saving() && (this.form.dirty || this.contentDirty());
  }

  protected onContent(html: string): void {
    this.content.set(html);
    this.contentDirty.set(true);
  }

  protected openPicker(target: PickerTarget): void {
    this.picker.set(target);
  }

  protected onPicked(img: ImageInfo): void {
    if (this.picker() === 'featured') {
      this.form.patchValue({ featuredImageId: img.id, featuredImageUrl: img.url });
      this.form.markAsDirty();
    } else {
      const alt = prompt('Texto alternativo de la imagen (qué se ve en ella):') ?? '';
      this.editorRef()?.insertImage(img.url, alt.trim());
    }
    this.picker.set(null);
  }

  protected removeFeatured(): void {
    this.form.patchValue({ featuredImageId: null, featuredImageUrl: '', featuredImageAlt: '' });
    this.form.markAsDirty();
  }

  protected err(field: string): string | null {
    const server = this.serverErrors()[field];
    if (server) return server;
    const c = this.form.get(field);
    if (!c || !(c.touched || c.dirty) || !c.errors) return null;
    if (c.errors['required'] || c.errors['min']) return 'Obligatorio.';
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;
    if (c.errors['pattern']) return 'Solo minúsculas, números y guiones (p. ej. mi-articulo).';
    return 'Valor no válido.';
  }

  protected save(statusOverride?: ArticleStatus): void {
    this.form.markAllAsTouched();
    this.error.set(null);
    this.saved.set(null);
    this.serverErrors.set({});
    const v = this.form.getRawValue();
    const status = statusOverride ?? v.status;
    const tags = parseTags(v.tags);
    const publishedAt = fromLocalInput(v.publishedAt);

    const problems: string[] = [];
    if (this.form.invalid) problems.push('Revisa los campos marcados.');
    if (!this.content().trim()) problems.push('El cuerpo del artículo está vacío.');
    if (tags.length > 10) problems.push('Máximo 10 etiquetas.');
    if (tags.some((t) => t.length > 40)) problems.push('Cada etiqueta puede tener como mucho 40 caracteres.');
    if (v.featuredImageId && !v.featuredImageAlt.trim()) problems.push('La imagen principal necesita un texto alternativo.');
    if (status === 'SCHEDULED' && (!publishedAt || new Date(publishedAt) <= new Date())) {
      problems.push('Para programar, indica una fecha de publicación futura.');
    }
    if (problems.length) {
      this.error.set(problems.join(' '));
      return;
    }

    const body: ArticleRequest = {
      title: v.title.trim(),
      slug: v.slug.trim() || null,
      dek: v.dek.trim() || null,
      summary: v.summary.trim(),
      contentHtml: this.content(),
      status,
      publishedAt,
      categoryId: v.categoryId,
      tags,
      featuredImageId: v.featuredImageId,
      featuredImageAlt: v.featuredImageId ? v.featuredImageAlt.trim() : null,
      byline: v.byline.trim() || null,
      featured: v.featured,
    };
    this.saving.set(true);
    const id = this.id();
    const request = id === null ? this.admin.createArticle(body) : this.admin.updateArticle(id, body);
    request.subscribe({
      next: (a) => {
        this.saving.set(false);
        this.fill(a);
        this.saved.set(a.status === 'PUBLISHED' ? 'Guardado y publicado.' : a.status === 'SCHEDULED' ? 'Guardado y programado.' : 'Borrador guardado.');
        if (id === null) void this.router.navigate(['/panel/articulos', a.id], { replaceUrl: true, state: { saved: this.saved() } });
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.serverErrors.set(fieldErrors(e));
        this.error.set(errorMessage(e));
      },
    });
  }

  private fill(a: ArticleAdmin): void {
    this.id.set(a.id);
    this.article.set(a);
    this.form.reset({
      title: a.title,
      slug: a.slug,
      dek: a.dek ?? '',
      summary: a.summary,
      categoryId: a.categoryId,
      tags: a.tags.join(', '),
      byline: a.byline ?? '',
      featured: a.featured,
      status: a.status,
      publishedAt: toLocalInput(a.publishedAt),
      featuredImageId: a.featuredImageId,
      featuredImageUrl: a.featuredImageUrl ?? '',
      featuredImageAlt: a.featuredImageAlt ?? '',
    });
    this.content.set(a.contentHtml);
    this.contentDirty.set(false);
    this.editorRef()?.setContent(a.contentHtml);
  }
}
