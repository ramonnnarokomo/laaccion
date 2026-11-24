/** Lado mayor máximo: de sobra para una portada a pantalla completa en un monitor normal. */
const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;
/** Por debajo de esto y sin pasarse de tamaño, la imagen ya está bien: se sube tal cual. */
const ALREADY_LIGHT_BYTES = 250 * 1024;
/** El GIF no se toca: podría ser animado. */
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/**
 * Prepara una imagen antes de subirla: la reduce a 1600 px de lado como máximo y la pasa a WebP.
 * Una foto de móvil de 3-8 MB queda en unos 150-300 KB, así la página carga rápido (Google mide esa
 * velocidad para posicionar) y WhatsApp enseña la vista previa (no lo hace si la imagen pesa demasiado).
 * Si algo falla, o el resultado no pesa menos, se sube el original.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type) || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= ALREADY_LIGHT_BYTES) return file;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
    let type = 'image/webp';
    let extension = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      // Navegadores que no saben codificar WebP: JPEG con fondo blanco (el JPEG no admite transparencia).
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      blob = await toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
      type = 'image/jpeg';
      extension = 'jpg';
    }
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^./\\]+$/, '') || 'imagen'}.${extension}`;
    return new File([blob], name, { type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
