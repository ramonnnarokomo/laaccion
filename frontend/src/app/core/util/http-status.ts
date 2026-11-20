import { RESPONSE_INIT, inject } from '@angular/core';

/**
 * Devuelve una función que fija el código HTTP de la respuesta SSR (404 de verdad para páginas
 * que no existen, en vez de un "soft 404" con 200). En el navegador no hace nada.
 */
export function injectHttpStatus(): (status: number) => void {
  const init = inject(RESPONSE_INIT, { optional: true });
  return (status) => {
    if (init) init.status = status;
  };
}
