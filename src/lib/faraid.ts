// Faraid engine: pure functions, exact fractions. Scope: spouse, parents, grandmothers,
// children, grandchildren via sons, siblings. No grandfather, nephews, uncles, dzawil arham.
export type Frac = { n: number; d: number };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const fr = (n: number, d = 1): Frac => { const g = gcd(Math.abs(n), d); return { n: n / g, d: d / g }; };
const add = (a: Frac, b: Frac) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Frac, b: Frac) => add(a, fr(-b.n, b.d));
const mul = (a: Frac, b: Frac) => fr(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => fr(a.n * b.d, a.d * b.n);
const cmp = (a: Frac, b: Frac) => a.n * b.d - b.n * a.d;
const ZERO = fr(0), ONE = fr(1);
export const val = (f: Frac) => f.n / f.d;
export const label = (f: Frac) => `${f.n}/${f.d}`;

export const ORDER = [
  'grandmotherPaternal', 'father', 'mother', 'grandmotherMaternal',
  'fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister',
  'husband', 'wife', 'son', 'daughter', 'grandson', 'granddaughter',
] as const;
export type HeirKey = (typeof ORDER)[number];
export type Heirs = Partial<Record<HeirKey, number>>;
export type Row = { key: HeirKey; count: number } & (
  | { blocked: string; frac?: undefined; basis?: undefined }
  | { blocked?: undefined; frac: Frac; basis: string }
);
export type Mode = 'aul' | 'radd' | 'musytarakah' | null;
export type Result = { rows: Row[]; mode: Mode; leftover: Frac; umar: boolean };

type Share = { f: Frac; l: string };
type ByKey<T> = Partial<Record<HeirKey, T>>;

const SIBLINGS: HeirKey[] = ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister'];
const TIERS: HeirKey[][] = [['son', 'daughter'], ['grandson', 'granddaughter'], ['father'], ['fullBrother', 'fullSister'], ['paternalBrother', 'paternalSister']];
const PAIR: ByKey<HeirKey> = { daughter: 'son', granddaughter: 'grandson', fullSister: 'fullBrother', paternalSister: 'paternalBrother' };

export function faraid(h: Heirs): Result {
  const c = (k: HeirKey) => h[k] ?? 0;
  const why: ByKey<string> = {};
  const block = (k: HeirKey, r: string | null) => { if (r && c(k) && !why[k]) why[k] = r; };
  const live = (k: HeirKey) => c(k) > 0 && !why[k];

  const maleDesc = c('son') + c('grandson') > 0;
  const desc = maleDesc || c('daughter') + c('granddaughter') > 0;
  const sibs = SIBLINGS.reduce((n, k) => n + c(k), 0);

  // --- hijab (blocking)
  if (c('mother')) { block('grandmotherMaternal', 'Terhalang ibu'); block('grandmotherPaternal', 'Terhalang ibu'); }
  if (c('father')) block('grandmotherPaternal', 'Terhalang ayah');
  if (c('son')) { block('grandson', 'Terhalang anak laki-laki'); block('granddaughter', 'Terhalang anak laki-laki'); }
  if (c('daughter') > 1 && !c('grandson')) block('granddaughter', 'Dua anak perempuan sudah mengambil 2/3');
  const up = maleDesc ? 'Terhalang anak/cucu laki-laki' : c('father') ? 'Terhalang ayah' : null;
  if (up) SIBLINGS.slice(0, 4).forEach((k) => block(k, up));
  const femaleDesc = !maleDesc && c('daughter') + (why.granddaughter ? 0 : c('granddaughter')) > 0;
  const fsAsabah = live('fullSister') && !c('fullBrother') && femaleDesc;
  if (live('fullBrother')) (['paternalBrother', 'paternalSister'] as const).forEach((k) => block(k, 'Terhalang saudara kandung laki-laki'));
  else if (fsAsabah) (['paternalBrother', 'paternalSister'] as const).forEach((k) => block(k, 'Terhalang saudari kandung (asabah)'));
  else if (live('fullSister') && c('fullSister') > 1 && !live('paternalBrother')) block('paternalSister', 'Dua saudari kandung sudah mengambil 2/3');
  (['maternalBrother', 'maternalSister'] as const).forEach((k) => block(k, desc ? 'Terhalang anak/cucu' : c('father') ? 'Terhalang ayah' : null));

  // --- fixed shares (fx) and asabah weights (asb: male 2, female 1)
  const fx: ByKey<Share> = {}, asb: ByKey<number> = {};
  const fix = (k: HeirKey, n: number, d: number, l = label(fr(n, d))) => { fx[k] = { f: fr(n, d), l }; };
  const fixSh = (k: HeirKey) => (c(k) > 1 ? fix(k, 2, 3) : fix(k, 1, 2));

  if (live('husband')) desc ? fix('husband', 1, 4) : fix('husband', 1, 2);
  if (live('wife')) desc ? fix('wife', 1, 8) : fix('wife', 1, 4);

  const umar = live('father') && live('mother') && c('husband') + c('wife') > 0 &&
    ORDER.every((k) => !c(k) || ['husband', 'wife', 'father', 'mother'].includes(k));
  if (live('mother')) {
    if (umar) fx.mother = { f: div(sub(ONE, (fx.husband ?? fx.wife)!.f), fr(3)), l: '1/3 sisa' };
    else if (desc || sibs > 1) fix('mother', 1, 6);
    else fix('mother', 1, 3);
  }
  if (live('father')) {
    if (maleDesc) fix('father', 1, 6);
    else { if (desc) fix('father', 1, 6); asb.father = 2; }
  }
  const gms = (['grandmotherPaternal', 'grandmotherMaternal'] as const).filter(live);
  gms.forEach((k) => fix(k, 1, 6 * gms.length, gms.length > 1 ? '1/6 (dibagi)' : '1/6'));

  if (live('son')) asb.son = 2;
  if (live('daughter')) { if (c('son')) asb.daughter = 1; else fixSh('daughter'); }
  if (live('grandson')) asb.grandson = 2;
  if (live('granddaughter')) {
    if (c('grandson')) asb.granddaughter = 1;
    else if (c('daughter')) fix('granddaughter', 1, 6);
    else fixSh('granddaughter');
  }
  if (live('fullBrother')) asb.fullBrother = 2;
  if (live('fullSister')) { if (c('fullBrother') || femaleDesc) asb.fullSister = 1; else fixSh('fullSister'); }
  if (live('paternalBrother')) asb.paternalBrother = 2;
  if (live('paternalSister')) {
    if (c('paternalBrother') || femaleDesc) asb.paternalSister = 1;
    else if (c('fullSister') === 1) fix('paternalSister', 1, 6);
    else fixSh('paternalSister');
  }
  const mk = (['maternalBrother', 'maternalSister'] as const).filter(live);
  const mc = mk.reduce((n, k) => n + c(k), 0);
  if (mc) {
    const f = mc > 1 ? fr(1, 3) : fr(1, 6);
    mk.forEach((k) => { fx[k] = { f: mul(f, fr(c(k), mc)), l: `${label(f)} (dibagi rata)` }; });
  }

  // --- distribute
  const res: ByKey<Share> = {};
  let sum = ZERO;
  for (const k of ORDER) { const v = fx[k]; if (v) { res[k] = { ...v }; sum = add(sum, v.f); } }
  const R = sub(ONE, sum);
  const taker = TIERS.map((t) => t.filter((k) => asb[k])).find((t) => t.length);
  let mode: Mode = null, leftover = ZERO;

  if (cmp(sum, ONE) > 0) {
    mode = 'aul';
    for (const k of ORDER) { const v = res[k]; if (v) v.f = div(v.f, sum); }
  } else if (cmp(sum, ONE) === 0 && live('fullBrother') && mc > 1) {
    mode = 'musytarakah';
    const heads = mc + c('fullBrother') + c('fullSister');
    const per = div(mk.reduce((a, k) => add(a, res[k]!.f), ZERO), fr(heads));
    ([...mk, 'fullBrother', 'fullSister'] as HeirKey[]).forEach((k) => { if (c(k)) res[k] = { f: mul(per, fr(c(k))), l: 'Musytarakah' }; });
  } else if (taker && cmp(R, ZERO) > 0) {
    const units = taker.reduce((n, k) => n + asb[k]! * c(k), 0);
    for (const k of taker) {
      const pair = PAIR[k];
      const l = asb[k] === 1 ? (pair && live(pair) ? 'Asabah bil ghair (2:1)' : "Asabah ma'al ghair") : 'Asabah';
      const got = mul(R, fr(asb[k]! * c(k), units));
      const cur = res[k];
      res[k] = cur ? { f: add(cur.f, got), l: `${cur.l} + ${l}` } : { f: got, l };
    }
  } else if (!taker && cmp(R, ZERO) > 0) {
    const ks = ORDER.filter((k) => res[k] && k !== 'husband' && k !== 'wife');
    if (ks.length) {
      mode = 'radd';
      const base = ks.reduce((a, k) => add(a, res[k]!.f), ZERO);
      ks.forEach((k) => { const v = res[k]!; v.f = add(v.f, mul(R, div(v.f, base))); });
    } else leftover = R;
  }

  const rows = ORDER.filter((k) => c(k) > 0).map((key): Row => {
    const b = why[key];
    if (b) return { key, count: c(key), blocked: b };
    const r = res[key] ?? { f: ZERO, l: 'Asabah (tidak ada sisa)' };
    return { key, count: c(key), frac: r.f, basis: r.l };
  });
  return { rows, mode, leftover, umar };
}
