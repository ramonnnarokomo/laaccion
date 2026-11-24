/**
 * Anchos de carácter (en em) de Georgia en negrita, la letra de los titulares. Sirven para estimar
 * cuánto ocupa la palabra más larga de un titular y bajar el tamaño de letra lo justo para que
 * quepa en su columna, ya en el HTML del servidor (sin saltos al cargar).
 */
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const UPPER_EM = [
  0.695, 0.639, 0.695, 0.695, 0.639, 0.583, 0.75, 0.75, 0.362, 0.472, 0.75, 0.639, 0.916, 0.695, 0.75, 0.583, 0.75,
  0.695, 0.529, 0.639, 0.695, 0.695, 0.972, 0.695, 0.695, 0.639,
];
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const LOWER_EM = [
  0.472, 0.529, 0.416, 0.529, 0.416, 0.305, 0.472, 0.529, 0.25, 0.305, 0.529, 0.25, 0.805, 0.529, 0.472, 0.529,
  0.529, 0.416, 0.362, 0.305, 0.529, 0.472, 0.695, 0.472, 0.472, 0.416,
];
const OTHER_EM: Record<string, number> = {
  '“': 0.472, '”': 0.472, '"': 0.528, "'": 0.25, '‘': 0.25, '’': 0.25, '«': 0.5, '»': 0.5, '?': 0.472, '¿': 0.472,
  '!': 0.305, '¡': 0.305, '.': 0.222, ',': 0.222, ':': 0.305, ';': 0.305, '-': 0.305, '–': 0.5, '—': 0.972,
  '(': 0.333, ')': 0.333, '%': 0.85, '/': 0.3,
};
/** Las mediciones son de una letra parecida algo más estrecha que Georgia: margen de seguridad. */
const SAFETY = 1.15;
/** Los titulares llevan letter-spacing negativo (-0.04 / -0.045em). */
const LETTER_SPACING = 0.04;

function charEm(ch: string): number {
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '') || ch;
  const upper = UPPER.indexOf(base);
  if (upper >= 0) return UPPER_EM[upper];
  const lower = LOWER.indexOf(base);
  if (lower >= 0) return LOWER_EM[lower];
  if (/[0-9]/.test(base)) return 0.472;
  return OTHER_EM[ch] ?? 0.6;
}

/**
 * Ancho estimado, en em, de la palabra más larga del titular. En el CSS:
 * font-size: min(<tamaño normal>, calc(100cqi / var(--word-em)))
 */
export function longestWordEm(title: string): number {
  let max = 0;
  for (const word of title.split(/\s+/)) {
    let em = 0;
    for (const ch of word) em += charEm(ch) * SAFETY - LETTER_SPACING;
    max = Math.max(max, em);
  }
  return Math.ceil(max * 100) / 100;
}
