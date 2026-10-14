import { expect, test } from 'vitest';
import { faraid, label, val, type Heirs } from './faraid';

const run = (h: Heirs) => {
  const r = faraid(h);
  const total = r.rows.reduce((a, x) => a + (x.frac ? val(x.frac) : 0), 0) + val(r.leftover);
  expect(total).toBeCloseTo(1, 9);
  return { ...Object.fromEntries(r.rows.map((x) => [x.key, x.frac ? label(x.frac) : "X"])), mode: r.mode };
};

test.each<[string, Heirs, Record<string, string | null>]>([
  ['wife, son, parents', { wife: 1, son: 1, father: 1, mother: 1 }, { father: '1/6', mother: '1/6', wife: '1/8', son: '13/24', mode: null }],
  ["'aul", { husband: 1, fullSister: 2, mother: 1 }, { mother: '1/8', fullSister: '1/2', husband: '3/8', mode: 'aul' }],
  ['umariyatain', { husband: 1, mother: 1, father: 1 }, { father: '1/3', mother: '1/6', husband: '1/2', mode: null }],
  ['musytarakah', { husband: 1, mother: 1, maternalBrother: 2, fullBrother: 1 }, { mother: '1/6', fullBrother: '1/9', maternalBrother: '2/9', husband: '1/2', mode: 'musytarakah' }],
  ['radd', { daughter: 1, mother: 1 }, { mother: '1/4', daughter: '3/4', mode: 'radd' }],
  ["sister ma'al ghair", { daughter: 1, fullSister: 1 }, { fullSister: '1/2', daughter: '1/2', mode: null }],
  ['son and daughter 2:1', { son: 1, daughter: 1 }, { son: '2/3', daughter: '1/3', mode: null }],
  ['father fixed + asabah', { father: 1, mother: 1, daughter: 1 }, { father: '1/3', mother: '1/6', daughter: '1/2', mode: null }],
  ['two daughters block granddaughter', { daughter: 2, granddaughter: 1 }, { daughter: '1/1', granddaughter: 'X', mode: 'radd' }],
  ['grandson makes granddaughter asabah', { daughter: 2, grandson: 1, granddaughter: 1, wife: 1 }, { wife: '1/8', daughter: '2/3', grandson: '5/36', granddaughter: '5/72', mode: null }],
  ['daughter + granddaughter radd', { daughter: 1, granddaughter: 1 }, { daughter: '3/4', granddaughter: '1/4', mode: 'radd' }],
])('%s', (_name, heirs, want) => expect(run(heirs)).toEqual(want));

test('only a wife leaves a remainder', () => expect(label(faraid({ wife: 1 }).leftover)).toBe('3/4'));
