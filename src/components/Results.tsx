import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { label, val, type Mode, type Result } from '@/lib/faraid';
import { HEIR_NAME, eligible, keyOf, pct, rp, type Data } from '@/lib/family';

const NOTES: Record<NonNullable<Mode>, string> = {
  aul: "'Aul: jumlah bagian tetap melebihi harta, jadi semua bagian dikurangi secara sebanding.",
  radd: 'Radd: harta yang tersisa dikembalikan kepada ahli waris selain pasangan, sebanding bagian mereka.',
  musytarakah: "Musytarakah: saudara kandung laki-laki berbagi 1/3 bersama saudara seibu (pendapat Syafi'i dan Maliki).",
};

type Money = { estate: number; debt: number; will: number; cap: number; net: number; willAsked: number };

export function Summary({ m }: { m: Money }) {
  if (!m.estate) return null;
  const items: [string, string][] = [['Total harta', rp(m.estate)], ['Utang & biaya', `− ${rp(m.debt)}`], ['Wasiat', `− ${rp(m.will)}`]];
  return (
    <div className="mb-6 border-b pb-4">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4">
        {items.map(([k, v]) => (
          <div key={k}><dt className="text-sm text-muted-foreground">{k}</dt><dd className="font-serif text-xl tabular-nums">{v}</dd></div>
        ))}
        <div><dt className="text-sm text-muted-foreground">Dibagi ke ahli waris</dt><dd className="font-serif text-2xl text-primary tabular-nums">{rp(m.net)}</dd></div>
      </dl>
      {m.willAsked > m.cap && <p className="mt-3 text-sm text-muted-foreground">Wasiat dibatasi 1/3 dari harta setelah utang ({rp(m.cap)}).</p>}
    </div>
  );
}

export function Notices({ r, net }: { r: Result; net: number }) {
  const notes = [
    r.mode && NOTES[r.mode],
    r.umar && 'Umariyatain: ibu mendapat 1/3 dari sisa setelah bagian pasangan.',
    val(r.leftover) > 0 && `Sisa ${label(r.leftover)} (${rp(val(r.leftover) * net)}) tidak punya penerima dalam cakupan alat ini; urusannya mengikuti ketentuan setempat (baitul mal atau wali hakim).`,
  ].filter(Boolean);
  return (
    <div className="mb-6 space-y-2">
      {notes.map((n) => (
        <Alert key={String(n)} className="bg-accent max-w-prose"><Info aria-hidden /><AlertDescription className="text-foreground">{n}</AlertDescription></Alert>
      ))}
    </div>
  );
}

export function ResultTable({ data, r, net }: { data: Data; r: Result; net: number }) {
  const dg = data.deceased.g;
  if (!r.rows.length) return <p className="text-muted-foreground max-w-[44ch]">Tambahkan anggota keluarga dengan tombol + di pohon. Hasil perhitungan muncul di sini.</p>;
  return (
    <Table className="tabular-nums">
      <TableCaption className="mb-2 text-left font-serif text-xl text-foreground caption-top">Rincian pembagian</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Ahli waris</TableHead><TableHead className="text-right">Bagian</TableHead><TableHead className="text-right">Rupiah</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {r.rows.map((x) => {
          const names = data.people.filter((p) => p.name && eligible(p, data.people) && keyOf(p, dg) === x.key).map((p) => p.name).join(', ');
          const who = (
            <TableCell className="whitespace-normal align-top">
              <span className="font-medium">{HEIR_NAME[x.key]}{x.count > 1 && ` ×${x.count}`}</span>
              {names && <small className="block text-muted-foreground">{names}</small>}
              <small className="block text-muted-foreground">{x.blocked ?? x.basis}</small>
            </TableCell>
          );
          if (!x.frac) return <TableRow key={x.key} className="text-muted-foreground">{who}<TableCell className="text-right align-top">—</TableCell><TableCell className="text-right align-top">Rp 0</TableCell></TableRow>;
          const amount = val(x.frac) * net;
          return (
            <TableRow key={x.key}>
              {who}
              <TableCell className="text-right align-top">{label(x.frac)}<small className="block text-muted-foreground">{pct(x.frac)}</small></TableCell>
              <TableCell className="text-right align-top">{rp(amount)}{x.count > 1 && <small className="block text-muted-foreground">{rp(amount / x.count)} per orang</small>}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
