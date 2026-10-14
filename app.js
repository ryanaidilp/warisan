import { faraid, label, val } from './faraid.js';

// Safe by construction: every interpolated value is a constant label or a number from a numeric input.
const NAME = {
  husband: 'Suami', wife: 'Istri', father: 'Ayah', mother: 'Ibu',
  grandmotherPaternal: 'Nenek (dari ayah)', grandmotherMaternal: 'Nenek (dari ibu)',
  son: 'Anak laki-laki', daughter: 'Anak perempuan', grandson: 'Cucu laki-laki', granddaughter: 'Cucu perempuan',
  fullBrother: 'Saudara laki-laki kandung', fullSister: 'Saudari kandung',
  paternalBrother: 'Saudara laki-laki seayah', paternalSister: 'Saudari seayah',
  maternalBrother: 'Saudara laki-laki seibu', maternalSister: 'Saudari seibu',
};
const GROUPS = [
  ['Pasangan', ['husband', 'wife']],
  ['Orang tua & nenek', ['father', 'mother', 'grandmotherPaternal', 'grandmotherMaternal']],
  ['Anak & cucu (dari anak laki-laki)', ['son', 'daughter', 'grandson', 'granddaughter']],
  ['Saudara', ['fullBrother', 'fullSister', 'paternalBrother', 'paternalSister', 'maternalBrother', 'maternalSister']],
];
const MAX = { husband: 1, wife: 4, father: 1, mother: 1, grandmotherPaternal: 1, grandmotherMaternal: 1 };
const GENS = [
  ['grandmotherPaternal', 'father', 'mother', 'grandmotherMaternal'],
  [...GROUPS[3][1], 'DECEASED', 'husband', 'wife'],
  ['son', 'daughter'],
  ['grandson', 'granddaughter'],
];
const NOTES = {
  aul: "'Aul: jumlah bagian tetap melebihi harta, jadi semua bagian dikurangi secara sebanding.",
  radd: 'Radd: harta yang tersisa dikembalikan kepada ahli waris selain pasangan, sebanding bagian mereka.',
  musytarakah: "Musytarakah: saudara kandung laki-laki berbagi 1/3 bersama saudara seibu (pendapat Syafi'i dan Maliki).",
};

const $ = (id) => document.getElementById(id);
const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format;
const pct = (f) => `${(val(f) * 100).toFixed(1).replace(/\.0$/, '')}%`;
const state = { gender: 'male', h: {} };

$('heirs').innerHTML = GROUPS.map(([title, keys]) => `
  <fieldset><legend>${title}</legend>${keys.map((k) => `
    <label class="f row" data-k="${k}">${NAME[k]}
      <input type="number" inputmode="numeric" min="0" max="${MAX[k] ?? 30}" step="1" data-heir="${k}" placeholder="0">
    </label>`).join('')}
  </fieldset>`).join('');

function syncSpouse() {
  const keep = state.gender === 'male' ? 'wife' : 'husband';
  const drop = state.gender === 'male' ? 'husband' : 'wife';
  document.querySelector(`[data-k="${drop}"]`).hidden = true;
  document.querySelector(`[data-k="${keep}"]`).hidden = false;
  delete state.h[drop];
  document.querySelector(`[data-heir="${drop}"]`).value = '';
}

$('form').addEventListener('input', (e) => {
  const t = e.target;
  if (t.name === 'gender') { state.gender = t.value; syncSpouse(); }
  else if (t.dataset.heir) {
    const max = MAX[t.dataset.heir] ?? 30;
    const n = Math.min(max, Math.max(0, Math.floor(+t.value) || 0));
    if (n) state.h[t.dataset.heir] = n; else delete state.h[t.dataset.heir];
    if (+t.value > max) t.value = max;
  }
  render();
});
syncSpouse();

const node = (r, net) => {
  const b = !!r.blocked;
  return `<div class="node${b ? ' blocked' : ''}" ${b ? `title="${r.blocked}"` : ''}>
    <span class="who">${NAME[r.key]}${r.count > 1 ? ` <span class="n">×${r.count}</span>` : ''}</span>
    <span class="fr">${b ? 'Terhalang' : label(r.frac)}</span>
    ${b ? '' : `<span class="pc">${pct(r.frac)} · ${rp(val(r.frac) * net)}</span>`}
  </div>`;
};

function render() {
  const num = (id) => Math.max(0, +$(id).value || 0);
  const estate = num('estate'), debt = Math.min(num('debt'), estate);
  const cap = (estate - debt) / 3, will = Math.min(num('will'), cap);
  const net = estate - debt - will;
  const r = faraid(state.h);
  const byKey = Object.fromEntries(r.rows.map((x) => [x.key, x]));

  $('summary').innerHTML = estate ? `
    <dl>
      <div><dt>Total harta</dt><dd>${rp(estate)}</dd></div>
      <div><dt>Utang &amp; biaya</dt><dd>− ${rp(debt)}</dd></div>
      <div><dt>Wasiat</dt><dd>− ${rp(will)}</dd></div>
      <div class="net"><dt>Dibagi ke ahli waris</dt><dd>${rp(net)}</dd></div>
    </dl>
    ${num('will') > cap ? `<p class="warn">Wasiat dibatasi 1/3 dari harta setelah utang (${rp(cap)}).</p>` : ''}` : '';

  const notes = [r.mode && NOTES[r.mode], r.umar && 'Umariyatain: ibu mendapat 1/3 dari sisa setelah bagian pasangan.',
    val(r.leftover) > 0 && `Sisa ${label(r.leftover)} (${rp(val(r.leftover) * net)}) tidak punya penerima dalam cakupan alat ini; urusannya mengikuti ketentuan setempat (baitul mal atau wali hakim).`]
    .filter(Boolean);
  $('notice').innerHTML = notes.map((n) => `<p class="note">${n}</p>`).join('');

  const deceased = `<div class="node me"><span class="who">Pewaris</span><span class="fr">${state.gender === 'male' ? 'Laki-laki' : 'Perempuan'}</span></div>`;
  $('tree').innerHTML = GENS.map((g) => g.map((k) => (k === 'DECEASED' ? deceased : byKey[k] ? node(byKey[k], net) : '')).join(''))
    .map((html) => (html ? `<div class="gen">${html}</div>` : '')).join('');

  $('result').innerHTML = r.rows.length ? `
    <table>
      <caption>Rincian pembagian</caption>
      <thead><tr><th scope="col">Ahli waris</th><th scope="col">Bagian</th><th scope="col">Rupiah</th></tr></thead>
      <tbody>${r.rows.map((x) => x.blocked
        ? `<tr class="blocked"><th scope="row">${NAME[x.key]}${x.count > 1 ? ` ×${x.count}` : ''}<small>${x.blocked}</small></th><td>—</td><td>Rp 0</td></tr>`
        : `<tr><th scope="row">${NAME[x.key]}${x.count > 1 ? ` ×${x.count}` : ''}<small>${x.basis}</small></th>
            <td>${label(x.frac)}<small>${pct(x.frac)}</small></td>
            <td>${rp(val(x.frac) * net)}${x.count > 1 ? `<small>${rp((val(x.frac) * net) / x.count)} per orang</small>` : ''}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p class="empty">Isi data ahli waris di samping. Hasil dan pohon keluarga muncul di sini.</p>';
}

render();
setTimeout(() => document.body.classList.remove('intro'), 1200);
