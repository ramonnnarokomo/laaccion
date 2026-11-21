/**
 * Utilidades para el teclado del móvil.
 *
 * En Android, la tecla o el gesto de «atrás» debería cerrar el teclado antes que nada. Algunos navegadores
 * (sobre todo con el gesto de atrás predictivo) a veces navegan hacia atrás con el teclado abierto: el usuario
 * sale del formulario sin querer y el teclado se queda. El guard del panel usa estas funciones para que,
 * en ese caso, «atrás» solo cierre el teclado.
 */

/** Tipos de `<input>` que abren el teclado en pantalla. */
const KEYBOARD_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'url', 'tel', 'password', 'number',
  'date', 'datetime-local', 'month', 'time', 'week',
]);

/** Diferencia mínima (px) entre la ventana y la parte visible para dar el teclado por abierto. */
const KEYBOARD_MIN_HEIGHT = 150;

/** ¿El elemento es un campo en el que se está escribiendo con el teclado? */
export function isTextEditable(el: Element | null | undefined): el is HTMLElement {
  if (!el || typeof (el as HTMLElement).blur !== 'function') return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') {
    const t = el as HTMLTextAreaElement;
    return !t.readOnly && !t.disabled;
  }
  if (tag === 'INPUT') {
    const i = el as HTMLInputElement;
    return KEYBOARD_INPUT_TYPES.has((i.type || 'text').toLowerCase()) && !i.readOnly && !i.disabled;
  }
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * ¿Está abierto el teclado en pantalla? Con el comportamiento por defecto de Chrome para Android, el teclado
 * encoge la parte visible (visualViewport) pero no la ventana de maquetación (clientHeight). Si el navegador
 * encoge las dos, no podemos saberlo y devolvemos false: entonces todo funciona como siempre.
 */
export function isSoftKeyboardOpen(doc: Document): boolean {
  const vv = doc.defaultView?.visualViewport;
  const layoutHeight = doc.documentElement?.clientHeight ?? 0;
  if (!vv || !layoutHeight) return false;
  // height * scale: con zoom, la parte visible encoge sin que haya teclado.
  return layoutHeight - vv.height * vv.scale > KEYBOARD_MIN_HEIGHT;
}
