/**
 * Configuración pública del front (producción). Aquí solo van valores públicos por diseño:
 * cualquier cosa que se ponga en este fichero acaba en el JavaScript que descarga el navegador.
 */
export const environment = {
  production: true,
  /** URL canónica del sitio, sin barra final. Se usa en enlaces canónicos, Open Graph y JSON-LD. */
  siteUrl: 'https://www.laaccion.com',
  /**
   * Site key PÚBLICA de Cloudflare Turnstile (la secreta solo vive en el back). Normalmente se deja
   * vacía y se configura en Railway con la variable TURNSTILE_SITE_KEY del servicio del front.
   */
  turnstileSiteKey: '',
};
