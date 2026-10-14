// Faraid engine: pure functions, exact fractions. Scope: spouse, parents, grandmothers,
// children, grandchildren via sons, siblings. No grandfather, nephews, uncles, dzawil arham.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const fr = (n, d = 1) => { const g = gcd(Math.abs(n), d); return { n: n / g, d: d / g }; };
const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => add(a, fr(-b.n, b.d));
const mul = (a, b) => fr(a.n * b.n, a.d * b.d);
const div = (a, b) => fr(a.n * b.d, a.d * b.n);
const cmp = (a, b) => a.n * b.d - b.n * a.d;
const ZERO = fr(0), ONE = fr(1);
export const val = (f) => f.n / f.d;
export const label = (f) => `${f.n}/${f.d}`;

export const ORDER = [
  'grandmotherPaternal', 'father', 'mother', 'grandmotherMaternal',
  'fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister',
  'husband', 'wife', 'son', 'daughter', 'grandson', 'granddaughter',
];
const SIBLINGS = ORDER.slice(4, 10);
const TIERS = [['son', 'daughter'], ['grandson', 'granddaughter'], ['father'], ['fullBrother', 'fullSister'], ['paternalBrother', 'paternalSister']];
const PAIR = { daughter: 'son', granddaughter: 'grandson', fullSister: 'fullBrother', paternalSister: 'paternalBrother' };

// h: { key: count }. Returns { rows, mode, leftover, umar }.
export function faraid(h) {
  const c = (k) => h[k] || 0;
  const why = {};
  const block = (k, r) => { if (c(k) && !why[k]) why[k] = r; };
  const live = (k) => c(k) > 0 && !why[k];

  const maleDesc = c('son') + c('grandson') > 0;
  const desc = maleDesc || c('daughter') + c('granddaughter') > 0;
  const sibs = SIBLINGS.reduce((n, k) => n + c(k), 0);

  // --- hijab (blocking)
  if (c('mother')) block('grandmotherMaternal', 'Terhalang ibu'), block('grandmotherPaternal', 'Terhalang ibu');
  if (c('father')) block('grandmotherPaternal', 'Terhalang ayah');
  if (c('son')) block('grandson', 'Terhalang anak laki-laki'), block('granddaughter', 'Terhalang anak laki-laki');
  if (c('daughter') > 1 && !c('grandson')) block('granddaughter', 'Dua anak perempuan sudah mengambil 2/3');
  const up = maleDesc ? 'Terhalang anak/cucu laki-laki' : c('father') ? 'Terhalang ayah' : null;
  if (up) ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister'].forEach((k) => block(k, up));
  const femaleDesc = !maleDesc && c('daughter') + (why.granddaughter ? 0 : c('granddaughter')) > 0;
  const fsAsabah = live('fullSister') && !c('fullBrother') && femaleDesc;
  if (live('fullBrother')) ['paternalBrother', 'paternalSister'].forEach((k) => block(k, 'Terhalang saudara kandung laki-laki'));
  else if (fsAsabah) ['paternalBrother', 'paternalSister'].forEach((k) => block(k, 'Terhalang saudari kandung (asabah)'));
  else if (live('fullSister') && c('fullSister') > 1 && !live('paternalBrother')) block('paternalSister', 'Dua saudari kandung sudah mengambil 2/3');
  ['maternalBrother', 'maternalSister'].forEach((k) => block(k, desc ? 'Terhalang anak/cucu' : c('father') ? 'Terhalang ayah' : null));

  // --- fixed shares (fx) and asabah weights (as: male 2, female 1)
  const fx = {}, as = {};
  const fix = (k, n, d, l = label(fr(n, d))) => { fx[k] = { f: fr(n, d), l }; };
  const fixSh = (k) => (c(k) > 1 ? fix(k, 2, 3) : fix(k, 1, 2));

  if (live('husband')) desc ? fix('husband', 1, 4) : fix('husband', 1, 2);
  if (live('wife')) desc ? fix('wife', 1, 8) : fix('wife', 1, 4);

  const umar = live('father') && live('mother') && (c('husband') || c('wife')) > 0 &&
    ORDER.every((k) => !c(k) || ['husband', 'wife', 'father', 'mother'].includes(k));
  if (live('mother')) {
    if (umar) fx.mother = { f: div(sub(ONE, (fx.husband || fx.wife).f), fr(3)), l: '1/3 sisa' };
    else if (desc || sibs > 1) fix('mother', 1, 6);
    else fix('mother', 1, 3);
  }
  if (live('father')) {
    if (maleDesc) fix('father', 1, 6);
    else { if (desc) fix('father', 1, 6); as.father = 2; }
  }
  const gms = ['grandmotherPaternal', 'grandmotherMaternal'].filter(live);
  gms.forEach((k) => fix(k, 1, 6 * gms.length, gms.length > 1 ? '1/6 (dibagi)' : '1/6'));

  if (live('son')) as.son = 2;
  if (live('daughter')) c('son') ? (as.daughter = 1) : fixSh('daughter');
  if (live('grandson')) as.grandson = 2;
  if (live('granddaughter')) {
    if (c('grandson')) as.granddaughter = 1;
    else if (c('daughter')) fix('granddaughter', 1, 6);
    else fixSh('granddaughter');
  }
  if (live('fullBrother')) as.fullBrother = 2;
  if (live('fullSister')) c('fullBrother') || femaleDesc ? (as.fullSister = 1) : fixSh('fullSister');
  if (live('paternalBrother')) as.paternalBrother = 2;
  if (live('paternalSister')) {
    if (c('paternalBrother') || femaleDesc) as.paternalSister = 1;
    else if (c('fullSister') === 1) fix('paternalSister', 1, 6);
    else fixSh('paternalSister');
  }
  const mk = ['maternalBrother', 'maternalSister'].filter(live);
  const mc = mk.reduce((n, k) => n + c(k), 0);
  if (mc) {
    const f = mc > 1 ? fr(1, 3) : fr(1, 6);
    mk.forEach((k) => { fx[k] = { f: mul(f, fr(c(k), mc)), l: `${label(f)} (dibagi rata)` }; });
  }

  // --- distribute
  const res = {};
  let sum = ZERO;
  for (const [k, v] of Object.entries(fx)) { res[k] = { ...v }; sum = add(sum, v.f); }
  const R = sub(ONE, sum);
  const taker = TIERS.map((t) => t.filter((k) => as[k])).find((t) => t.length);
  let mode = null, leftover = ZERO;

  if (cmp(sum, ONE) > 0) {
    mode = 'aul';
    for (const v of Object.values(res)) v.f = div(v.f, sum);
  } else if (cmp(sum, ONE) === 0 && live('fullBrother') && mc > 1) {
    mode = 'musytarakah';
    const heads = mc + c('fullBrother') + c('fullSister');
    const per = div(mk.reduce((a, k) => add(a, res[k].f), ZERO), fr(heads));
    [...mk, 'fullBrother', 'fullSister'].forEach((k) => { if (c(k)) res[k] = { f: mul(per, fr(c(k))), l: 'Musytarakah' }; });
  } else if (taker && cmp(R, ZERO) > 0) {
    const units = taker.reduce((n, k) => n + as[k] * c(k), 0);
    for (const k of taker) {
      const l = as[k] === 1 ? (live(PAIR[k]) ? 'Asabah bil ghair (2:1)' : "Asabah ma'al ghair") : 'Asabah';
      const got = mul(R, fr(as[k] * c(k), units));
      res[k] = res[k] ? { f: add(res[k].f, got), l: `${res[k].l} + ${l}` } : { f: got, l };
    }
  } else if (!taker && cmp(R, ZERO) > 0) {
    const ks = Object.keys(res).filter((k) => k !== 'husband' && k !== 'wife');
    if (ks.length) {
      mode = 'radd';
      const base = ks.reduce((a, k) => add(a, res[k].f), ZERO);
      ks.forEach((k) => { res[k].f = add(res[k].f, mul(R, div(res[k].f, base))); });
    } else leftover = R;
  }

  const rows = ORDER.filter((k) => c(k) > 0).map((key) =>
    why[key] ? { key, count: c(key), blocked: why[key] }
      : { key, count: c(key), ...(res[key] || { f: ZERO, l: 'Asabah (tidak ada sisa)' }) });
  return { rows: rows.map((r) => ({ ...r, frac: r.f, basis: r.l })), mode, leftover, umar };
}
