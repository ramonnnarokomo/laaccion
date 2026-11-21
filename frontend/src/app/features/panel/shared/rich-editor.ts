import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, input, output, signal, viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import { toVideoEmbed } from '../../../core/util/embed';
import { Video } from './video-node';

interface ToolButton {
  label: string;
  title: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
}

/** Editor de texto enriquecido (TipTap) para el cuerpo de los artículos. Solo en el navegador. */
@Component({
  selector: 'app-rich-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rte" [class.focused]="focused()">
      <div class="rte-toolbar" role="toolbar" aria-label="Formato del texto">
        @for (b of buttons; track b.title) {
          <button type="button" [title]="b.title" [attr.aria-label]="b.title" [class.active]="isActive(b)" (mousedown)="$event.preventDefault()" (click)="exec(b)">
            {{ b.label }}
          </button>
        }
        <button type="button" title="Insertar imagen" (mousedown)="$event.preventDefault()" (click)="imageRequested.emit()">🖼 Imagen</button>
        <button type="button" title="Insertar vídeo" (mousedown)="$event.preventDefault()" (click)="insertVideo()">▶ Vídeo</button>
      </div>
      <div class="rte-content" #host></div>
    </div>
  `,
})
export class RichEditor implements OnDestroy {
  /** HTML inicial. Se lee al crear el editor (o con setContent). */
  readonly initial = input('');
  readonly label = input('Cuerpo del artículo');
  readonly changed = output<string>();
  readonly imageRequested = output<void>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private editor: Editor | null = null;
  /** Contador que se incrementa en cada cambio para refrescar los botones activos. */
  protected readonly tick = signal(0);
  protected readonly focused = signal(false);

  protected readonly buttons: ToolButton[] = [
    { label: 'B', title: 'Negrita', run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive('bold') },
    { label: 'I', title: 'Cursiva', run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive('italic') },
    { label: 'U', title: 'Subrayado', run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive('underline') },
    { label: 'H2', title: 'Subtítulo', run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
    { label: 'H3', title: 'Ladillo', run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
    { label: '❝', title: 'Cita', run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
    { label: '• Lista', title: 'Lista', run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
    { label: '1. Lista', title: 'Lista numerada', run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
    { label: '🔗', title: 'Enlace', run: (e) => this.toggleLink(e), active: (e) => e.isActive('link') },
    { label: '―', title: 'Separador', run: (e) => e.chain().focus().setHorizontalRule().run() },
    { label: '↶', title: 'Deshacer', run: (e) => e.chain().focus().undo().run() },
    { label: '↷', title: 'Rehacer', run: (e) => e.chain().focus().redo().run() },
  ];

  constructor() {
    afterNextRender(() => {
      this.editor = new Editor({
        element: this.host().nativeElement,
        content: this.initial(),
        extensions: [
          StarterKit.configure({
            heading: { levels: [2, 3] },
            code: false,
            codeBlock: false,
            link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'], HTMLAttributes: { target: null, rel: null } },
          }),
          Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
          Video,
        ],
        editorProps: { attributes: { class: 'prose rte-prose', 'aria-label': this.label(), role: 'textbox', 'aria-multiline': 'true' } },
        onUpdate: ({ editor }) => {
          this.tick.update((n) => n + 1);
          this.changed.emit(editor.isEmpty ? '' : editor.getHTML());
        },
        onSelectionUpdate: () => this.tick.update((n) => n + 1),
        onFocus: () => this.focused.set(true),
        onBlur: () => this.focused.set(false),
      });
      this.tick.update((n) => n + 1);
    });
  }

  /** Sustituye el contenido (al cargar un artículo existente). */
  setContent(html: string): void {
    this.editor?.commands.setContent(html, { emitUpdate: false });
  }

  /** Sustituye el contenido como un cambio más del usuario: avisa al formulario y se puede deshacer (↶). */
  replaceContent(html: string): void {
    // Sin focus(): en el móvil abriría el teclado al aplicar la propuesta.
    this.editor?.commands.setContent(html, { emitUpdate: true });
  }

  /** Inserta detrás de la selección: así no sustituye un vídeo o imagen que esté seleccionado. */
  insertImage(src: string, alt: string): void {
    const e = this.editor;
    if (!e) return;
    e.chain().focus().insertContentAt(e.state.selection.to, { type: 'image', attrs: { src, alt } }).run();
  }

  protected isActive(b: ToolButton): boolean {
    this.tick();
    return !!(this.editor && b.active?.(this.editor));
  }

  protected exec(b: ToolButton): void {
    if (this.editor) b.run(this.editor);
  }

  protected insertVideo(): void {
    const url = prompt('Pega el enlace del vídeo (YouTube, TikTok, Instagram o Vimeo):');
    if (!url) return;
    if (!toVideoEmbed(url)) {
      alert('Ese enlace no es de un vídeo admitido (YouTube, TikTok, Instagram o Vimeo).');
      return;
    }
    const e = this.editor;
    const embed = toVideoEmbed(url);
    if (e && embed) e.chain().focus().insertContentAt(e.state.selection.to, { type: 'video', attrs: { src: embed.embedUrl } }).run();
  }

  private toggleLink(e: Editor): void {
    if (e.isActive('link')) {
      e.chain().focus().unsetLink().run();
      return;
    }
    const url = prompt('Dirección del enlace (https://…):');
    if (!url) return;
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url.trim())) {
      alert('El enlace debe empezar por https://, http://, mailto: o /');
      return;
    }
    e.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }
}
