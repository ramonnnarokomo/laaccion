import { Node, mergeAttributes } from '@tiptap/core';
import { toVideoEmbed } from '../../../core/util/embed';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /** Inserta un vídeo de YouTube, TikTok, Instagram o Vimeo a partir de su enlace. */
      setVideo: (url: string) => ReturnType;
    };
  }
}

/**
 * Vídeo incrustado como <iframe src="https://…/embed/…">. Al leer HTML acepta cualquier iframe de un
 * proveedor admitido (el back quita los atributos data-*, así que no vale el formato de la extensión
 * oficial de YouTube). En el editor se muestra un recuadro, no el reproductor.
 */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: { default: null } };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]',
        getAttrs: (el) => {
          const embed = toVideoEmbed((el as HTMLElement).getAttribute('src'));
          return embed ? { src: embed.embedUrl } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes({ width: '640', height: '360', allowfullscreen: 'true', title: 'Vídeo' }, HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'rte-video';
      dom.contentEditable = 'false';
      const embed = toVideoEmbed(node.attrs['src'] as string | null);
      dom.textContent = `▶ Vídeo de ${embed?.provider ?? 'origen desconocido'} · ${node.attrs['src'] ?? ''}`;
      return { dom };
    };
  },

  addCommands() {
    return {
      setVideo:
        (url: string) =>
        ({ commands }) => {
          const embed = toVideoEmbed(url);
          return embed ? commands.insertContent({ type: this.name, attrs: { src: embed.embedUrl } }) : false;
        },
    };
  },
});
