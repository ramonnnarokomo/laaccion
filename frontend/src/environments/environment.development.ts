export const environment = {
  production: false,
  siteUrl: 'http://localhost:4300',
  /**
   * Vacío = sin captcha (en local el back lo tiene apagado). Para probar el widget pon la clave de
   * prueba oficial de Cloudflare, que siempre aprueba: '1x00000000000000000000AA'.
   */
  turnstileSiteKey: '',
};
