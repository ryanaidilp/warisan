import type { Frac, HeirKey, Heirs } from './faraid';
import { val } from './faraid';

export type Gender = 'm' | 'f';
export type Rel = 'father' | 'mother' | 'gmP' | 'gmM' | 'full' | 'paternal' | 'maternal' | 'spouse' | 'child' | 'grandchild';
export type Person = { id: string; name: string; g: Gender; photo: string; rel: Rel; parent?: string };
export type Deceased = { name: string; g: Gender; photo: string };
export type Data = { deceased: Deceased; estate: string; debt: string; will: string; people: Person[] };

export const HEIR_NAME: Record<HeirKey, string> = {
  husband: 'Suami', wife: 'Istri', father: 'Ayah', mother: 'Ibu',
  grandmotherPaternal: 'Nenek (dari ayah)', grandmotherMaternal: 'Nenek (dari ibu)',
  son: 'Anak laki-laki', daughter: 'Anak perempuan', grandson: 'Cucu laki-laki', granddaughter: 'Cucu perempuan',
  fullBrother: 'Saudara laki-laki kandung', fullSister: 'Saudari kandung',
  paternalBrother: 'Saudara laki-laki seayah', paternalSister: 'Saudari seayah',
  maternalBrother: 'Saudara laki-laki seibu', maternalSister: 'Saudari seibu',
};

const REL: Record<Rel, { label: string; g?: Gender; max?: number }> = {
  father: { label: 'Ayah', g: 'm', max: 1 },
  mother: { label: 'Ibu', g: 'f', max: 1 },
  gmP: { label: 'Nenek (dari ayah)', g: 'f', max: 1 },
  gmM: { label: 'Nenek (dari ibu)', g: 'f', max: 1 },
  full: { label: 'Saudara kandung' },
  paternal: { label: 'Saudara seayah' },
  maternal: { label: 'Saudara seibu' },
  spouse: { label: '' }, // label, gender and max depend on the deceased
  child: { label: 'Anak' },
  grandchild: { label: 'Cucu (dari anak laki-laki)' },
};
export const RELS = Object.keys(REL) as Rel[];

export const relLabel = (r: Rel, dg: Gender) => (r === 'spouse' ? (dg === 'm' ? 'Istri' : 'Suami') : REL[r].label);
export const relMax = (r: Rel, dg: Gender) => (r === 'spouse' ? (dg === 'm' ? 4 : 1) : REL[r].max ?? 40);
export const fixedGender = (r: Rel, dg: Gender): Gender | undefined => (r === 'spouse' ? (dg === 'm' ? 'f' : 'm') : REL[r].g);
export const genderOf = (p: Person, dg: Gender): Gender => fixedGender(p.rel, dg) ?? p.g;

const KEY: Record<Exclude<Rel, 'spouse'>, HeirKey | [HeirKey, HeirKey]> = {
  father: 'father', mother: 'mother', gmP: 'grandmotherPaternal', gmM: 'grandmotherMaternal',
  child: ['son', 'daughter'], grandchild: ['grandson', 'granddaughter'],
  full: ['fullBrother', 'fullSister'], paternal: ['paternalBrother', 'paternalSister'], maternal: ['maternalBrother', 'maternalSister'],
};
export const keyOf = (p: Person, dg: Gender): HeirKey => {
  if (p.rel === 'spouse') return dg === 'm' ? 'wife' : 'husband';
  const k = KEY[p.rel];
  return typeof k === 'string' ? k : k[genderOf(p, dg) === 'm' ? 0 : 1];
};
// A grandchild only inherits through a son, so it needs a son as its parent.
export const eligible = (p: Person, all: Person[]) =>
  p.rel !== 'grandchild' || all.some((x) => x.id === p.parent && x.rel === 'child' && x.g === 'm');
export const heirsOf = (d: Data): Heirs => {
  const h: Heirs = {};
  for (const p of d.people.filter((x) => eligible(x, d.people))) { const k = keyOf(p, d.deceased.g); h[k] = (h[k] ?? 0) + 1; }
  return h;
};

// --- formatting
export const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format;
export const pct = (f: Frac) => `${(val(f) * 100).toFixed(1).replace(/\.0$/, '')}%`;

// --- photos: resized client-side to a small JPEG data URL, never uploaded
export const okPhoto = (s: unknown): s is string => typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s);
export async function toAvatar(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), N = 160;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  cv.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, N, N);
  return cv.toDataURL('image/jpeg', 0.82);
}

// --- persistence (localStorage only)
const STORE = 'warisan:v1';
export const blank = (): Data => ({ deceased: { name: '', g: 'm', photo: '' }, estate: '', debt: '', will: '', people: [] });
export const newId = () => Math.random().toString(36).slice(2, 10);

export function load(): Data {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (!s || !Array.isArray(s.people)) return blank();
    const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
    const money = (v: unknown) => { const n = Math.min(Math.trunc(Number(v) || 0), 999_999_999_999_999); return n > 0 ? String(n) : ''; };
    return {
      deceased: { name: str(s.deceased?.name, 40), g: s.deceased?.g === 'f' ? 'f' : 'm', photo: okPhoto(s.deceased?.photo) ? s.deceased.photo : '' },
      estate: money(s.estate), debt: money(s.debt), will: money(s.will),
      people: s.people.filter((p: Person) => p && p.rel in REL).map((p: Person): Person => ({
        id: str(p.id, 12).replace(/\W/g, '') || newId(), name: str(p.name, 40), rel: p.rel,
        g: p.g === 'f' ? 'f' : 'm', photo: okPhoto(p.photo) ? p.photo : '',
        parent: str(p.parent, 12).replace(/\W/g, '') || undefined,
      })),
    };
  } catch { return blank(); }
}
export const save = (d: Data) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* quota or private mode */ } };
export const clear = () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } };
