/** Vídeos incrustados de YouTube, TikTok, Instagram y Vimeo, con carga bajo demanda (privacidad). */

export type VideoProvider = 'YouTube' | 'TikTok' | 'Instagram' | 'Vimeo';

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
  /** Formato vertical (TikTok, Instagram) u horizontal. */
  vertical: boolean;
}

function parse(raw: string): URL | null {
  try {
    const url = new URL(raw.trim().replace(/&amp;/g, '&'));
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Convierte un enlace (normal o de embed) en la URL de embed oficial. Solo acepta IDs con el
 * formato esperado: lo que no encaja devuelve null y nunca se incrusta.
 */
export function toVideoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  const url = parse(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const path = url.pathname;

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? path.slice(1).split('/')[0]
        : url.searchParams.get('v') ?? path.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? { provider: 'YouTube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}`, vertical: path.startsWith('/shorts/') }
      : null;
  }
  if (host === 'tiktok.com') {
    const id = path.match(/\/video\/(\d{8,25})/)?.[1] ?? path.match(/^\/embed\/(?:v2\/)?(\d{8,25})/)?.[1];
    return id ? { provider: 'TikTok', embedUrl: `https://www.tiktok.com/embed/v2/${id}`, vertical: true } : null;
  }
  if (host === 'instagram.com') {
    const m = path.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]{5,40})/);
    return m ? { provider: 'Instagram', embedUrl: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, vertical: true } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = path.match(/^\/(?:video\/)?(\d{5,12})/)?.[1];
    return id ? { provider: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${id}`, vertical: false } : null;
  }
  return null;
}

/**
 * Sustituye los iframes del HTML de un artículo por un botón "Cargar vídeo": así no se conecta
 * con YouTube/TikTok/Instagram (ni se cargan sus cookies) hasta que el lector lo pide. Los iframes
 * que no son de un proveedor admitido se eliminan.
 */
export function facadeIframes(html: string): string {
  return html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
    const embed = toVideoEmbed(src);
    if (!embed) return '';
    return (
      `<div class="embed-facade${embed.vertical ? ' embed-facade--vertical' : ''}" data-embed="${embed.embedUrl}">` +
      `<button type="button" class="embed-facade__button">▶ Cargar vídeo de ${embed.provider}</button>` +
      `<p class="embed-facade__note">Al cargarlo te conectarás con ${embed.provider}, que puede usar cookies.</p></div>`
    );
  });
}

/** Crea el iframe real a partir de una URL de embed ya validada. */
export function createVideoIframe(doc: Document, embedUrl: string, title: string): HTMLIFrameElement | null {
  const embed = toVideoEmbed(embedUrl);
  if (!embed || embed.embedUrl !== embedUrl) return null;
  const iframe = doc.createElement('iframe');
  iframe.src = embed.provider === 'YouTube' ? `${embedUrl}?autoplay=1` : embedUrl;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.className = 'embed-frame' + (embed.vertical ? ' embed-frame--vertical' : '');
  return iframe;
}
