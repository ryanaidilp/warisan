// Run: node faraid.test.js
import assert from 'node:assert/strict';
import { faraid, label, val } from './faraid.js';

const run = (h) => {
  const r = faraid(h);
  const total = r.rows.reduce((a, x) => a + (x.blocked ? 0 : val(x.frac)), 0) + val(r.leftover);
  assert.ok(Math.abs(total - 1) < 1e-9, `total ${total} for ${JSON.stringify(h)}`);
  return { ...Object.fromEntries(r.rows.map((x) => [x.key, x.blocked ? 'X' : label(x.frac)])), mode: r.mode };
};
const eq = (h, want) => assert.deepEqual(run(h), want);

eq({ wife: 1, son: 1, father: 1, mother: 1 }, { father: '1/6', mother: '1/6', wife: '1/8', son: '13/24', mode: null });
eq({ husband: 1, fullSister: 2, mother: 1 }, { mother: '1/8', fullSister: '1/2', husband: '3/8', mode: 'aul' });
eq({ husband: 1, mother: 1, father: 1 }, { father: '1/3', mother: '1/6', husband: '1/2', mode: null });
eq({ husband: 1, mother: 1, maternalBrother: 2, fullBrother: 1 }, { mother: '1/6', fullBrother: '1/9', maternalBrother: '2/9', husband: '1/2', mode: 'musytarakah' });
eq({ daughter: 1, mother: 1 }, { mother: '1/4', daughter: '3/4', mode: 'radd' });
eq({ daughter: 1, fullSister: 1 }, { fullSister: '1/2', daughter: '1/2', mode: null });
eq({ son: 1, daughter: 1 }, { son: '2/3', daughter: '1/3', mode: null });
eq({ father: 1, mother: 1, daughter: 1 }, { father: '1/3', mother: '1/6', daughter: '1/2', mode: null });
eq({ daughter: 2, granddaughter: 1 }, { daughter: '1/1', granddaughter: 'X', mode: 'radd' });
eq({ daughter: 2, grandson: 1, granddaughter: 1, wife: 1 }, { wife: '1/8', daughter: '2/3', grandson: '5/36', granddaughter: '5/72', mode: null });
eq({ daughter: 1, granddaughter: 1 }, { daughter: '3/4', granddaughter: '1/4', mode: 'radd' });
assert.equal(label(faraid({ wife: 1 }).leftover), '3/4');
console.log('ok');
