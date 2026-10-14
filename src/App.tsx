import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Editor } from '@/components/Editor';
import { Notices, ResultTable, Summary } from '@/components/Results';
import { Tree } from '@/components/Tree';
import { faraid } from '@/lib/faraid';
import { blank, clear, heirsOf, load, newId, save, type Data, type Rel } from '@/lib/family';

const num = (s: string) => Math.max(0, Number(s) || 0);
const FIELDS = [['estate', 'Total harta (Rp)'], ['debt', 'Utang & biaya jenazah (Rp)'], ['will', 'Wasiat (Rp), maksimal 1/3 setelah utang']] as const;

export default function App() {
  const [data, setData] = useState<Data>(load);
  const [sel, setSel] = useState<string | null>(null);
  const [fresh, setFresh] = useState('');
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => save(data), [data]);
  useEffect(() => {
    if (!sel) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    editor.current?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }, [sel]);

  const result = useMemo(() => faraid(heirsOf(data)), [data]);
  const estate = num(data.estate), debt = Math.min(num(data.debt), estate);
  const cap = (estate - debt) / 3, will = Math.min(num(data.will), cap);
  const money = { estate, debt, will, cap, net: estate - debt - will, willAsked: num(data.will) };

  const add = (rel: Rel) => {
    const id = newId();
    setData((d) => ({ ...d, people: [...d.people, { id, name: '', g: 'm', photo: '', rel }] }));
    setFresh(id);
    setSel(id);
  };
  const remove = () => { setData((d) => ({ ...d, people: d.people.filter((p) => p.id !== sel) })); setSel(null); };
  const reset = () => {
    if (!confirm('Hapus semua data keluarga dan harta dari browser ini?')) return;
    clear(); setData(blank()); setSel(null);
  };

  return (
    <main className="mx-auto max-w-[76rem] p-5 sm:p-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">Hitung Waris</h1>
        <p className="mt-3 text-muted-foreground max-w-[60ch]">
          Pembagian harta peninggalan menurut faraid (mazhab Syafi'i). Semua dihitung dan disimpan di browser Anda; foto dan data tidak dikirim ke mana pun.
        </p>
        <div className="mt-5 h-[3px] w-12 bg-brass" />
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[22rem_1fr] lg:grid-rows-[auto_1fr_auto] lg:gap-x-12">
        <Card className="lg:col-start-1">
          <CardHeader><CardTitle className="font-serif text-xl font-medium">Harta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {FIELDS.map(([k, text]) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={k}>{text}</Label>
                <Input id={k} type="number" inputMode="numeric" min={0} step="any" placeholder="0" className="min-h-11 tabular-nums"
                  value={data[k]} onChange={(e) => setData((d) => ({ ...d, [k]: e.target.value }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-live="polite">
          <Summary m={money} />
          <Notices r={result} net={money.net} />
          <h2 className="mb-4 font-serif text-xl">Pohon keluarga</h2>
          <Tree data={data} result={result} net={money.net} sel={sel} onSelect={setSel} onAdd={add} />
        </section>

        <div ref={editor} className="scroll-mt-4 space-y-3 lg:col-start-1 lg:row-start-2">
          {sel ? (
            <Editor key={sel} data={data} sel={sel} autoFocus={sel === fresh} update={(fn) => setData(fn)} onClose={() => setSel(null)} onDelete={remove} />
          ) : (
            <p className="text-sm text-muted-foreground max-w-[40ch]">Pilih seseorang di pohon untuk mengubah nama, foto, dan jenis kelamin, atau tekan <b>+</b> untuk menambah anggota keluarga.</p>
          )}
          <Button type="button" variant="link" className="px-0" onClick={reset}>Hapus semua data</Button>
        </div>

        <div className="lg:col-start-2 lg:row-start-3"><ResultTable data={data} r={result} net={money.net} /></div>
      </div>

      <footer className="mt-12 max-w-[62ch] border-t pt-4 text-sm text-muted-foreground">
        Alat bantu hitung, bukan fatwa. Cakupan: pasangan, orang tua, nenek, anak, cucu dari anak laki-laki, dan saudara.
        Belum termasuk kakek, keponakan, paman, dan dzawil arham. Untuk keputusan resmi, tanyakan ulama atau Pengadilan Agama.
      </footer>
    </main>
  );
}
