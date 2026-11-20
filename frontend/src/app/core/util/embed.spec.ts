import { describe, expect, it } from 'vitest';
import { facadeIframes, toVideoEmbed } from './embed';

describe('toVideoEmbed', () => {
  it('convierte enlaces de YouTube (normal, corto, shorts y embed) a youtube-nocookie', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(toVideoEmbed(url)?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
    expect(toVideoEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.vertical).toBe(true);
  });

  it('acepta TikTok, Instagram y Vimeo', () => {
    expect(toVideoEmbed('https://www.tiktok.com/@laaccion/video/7234567890123456789')?.embedUrl).toBe(
      'https://www.tiktok.com/embed/v2/7234567890123456789',
    );
    expect(toVideoEmbed('https://www.instagram.com/reel/Cabc123_-x/')?.embedUrl).toBe('https://www.instagram.com/reel/Cabc123_-x/embed');
    expect(toVideoEmbed('https://vimeo.com/123456789')?.embedUrl).toBe('https://player.vimeo.com/video/123456789');
  });

  it('rechaza http, dominios desconocidos, IDs raros y javascript:', () => {
    expect(toVideoEmbed('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(toVideoEmbed('https://evil.com/embed/dQw4w9WgXcQ')).toBeNull();
    expect(toVideoEmbed('https://www.youtube.com/watch?v=<script>')).toBeNull();
    expect(toVideoEmbed('javascript:alert(1)')).toBeNull();
    expect(toVideoEmbed('')).toBeNull();
    expect(toVideoEmbed(null)).toBeNull();
  });
});

describe('facadeIframes', () => {
  it('cambia los iframes admitidos por un botón y elimina los demás', () => {
    const html =
      '<p>a</p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="640"></iframe>' +
      '<iframe src="https://evil.com/x"></iframe><p>b</p>';
    const out = facadeIframes(html);
    expect(out).not.toContain('<iframe');
    expect(out).toContain('data-embed="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(out).toContain('Cargar vídeo de YouTube');
    expect(out).not.toContain('evil.com');
    expect(out.startsWith('<p>a</p>')).toBe(true);
  });
});
