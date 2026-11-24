import { describe, expect, it } from 'vitest';
import { longestWordEm } from './headline-fit';

describe('longestWordEm', () => {
  it('mide la palabra más larga, no el titular entero', () => {
    expect(longestWordEm('LA “IA” METODO INTELECTUAL?')).toBeCloseTo(longestWordEm('INTELECTUAL?'), 5);
    expect(longestWordEm('El 29N no vas a elegir a nadie')).toBeLessThan(3);
  });

  it('las mayúsculas ocupan más que las minúsculas y las tildes no cambian el ancho', () => {
    expect(longestWordEm('INTELECTUAL')).toBeGreaterThan(longestWordEm('intelectual'));
    expect(longestWordEm('MÉTODO')).toBeCloseTo(longestWordEm('METODO'), 5);
  });
});
