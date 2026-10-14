import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Face } from '@/components/Tree';
import { RELS, fixedGender, genderOf, relLabel, relMax, toAvatar, type Data, type Gender, type Person, type Rel } from '@/lib/family';

type Props = {
  data: Data; sel: string; autoFocus: boolean;
  update: (fn: (d: Data) => Data) => void; onClose: () => void; onDelete: () => void;
};

export function Editor({ data, sel, autoFocus, update, onClose, onDelete }: Props) {
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const me = sel === 'me';
  const dg = data.deceased.g;
  const person = me ? undefined : data.people.find((p) => p.id === sel);
  const target = me ? data.deceased : person;
  if (!target) return null;

  const patch = (v: Partial<Person>) =>
    update((d) => (me ? { ...d, deceased: { ...d.deceased, ...v } } : { ...d, people: d.people.map((p) => (p.id === sel ? { ...p, ...v } : p)) }));

  const setGender = (g: Gender) => {
    if (!me) return patch({ g });
    const spouses = data.people.filter((p) => p.rel === 'spouse').length;
    if (g === 'f' && spouses > 1 && !confirm('Pewaris perempuan hanya punya satu suami. Hapus pasangan lainnya?')) return;
    update((d) => {
      let kept = 0;
      return { ...d, deceased: { ...d.deceased, g }, people: d.people.filter((p) => p.rel !== 'spouse' || g === 'm' || ++kept === 1) };
    });
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    try { patch({ photo: await toAvatar(f) }); setErr(''); }
    catch { setErr('Foto tidak bisa dibaca. Coba file JPG atau PNG.'); }
  };

  const fixed = person ? fixedGender(person.rel, dg) : undefined;
  const g = person ? genderOf(person, dg) : data.deceased.g;

  return (
    <Card id="editor">
      <CardHeader><CardTitle className="font-serif text-xl font-medium">{me ? 'Pewaris' : 'Anggota keluarga'}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Face photo={target.photo} className="size-16" />
          <div className="space-y-1">
            <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1}
              onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <Button type="button" variant="outline" className="min-h-11" onClick={() => file.current?.click()}>
              <Camera aria-hidden /> {target.photo ? 'Ganti foto' : 'Pilih foto'}
            </Button>
            {target.photo && <Button type="button" variant="link" onClick={() => patch({ photo: '' })}>Hapus foto</Button>}
            {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nama</Label>
          <Input id="name" className="min-h-11" maxLength={40} placeholder="Opsional" autoComplete="off" autoFocus={autoFocus}
            value={target.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>

        {person && (
          <div className="space-y-1.5">
            <Label htmlFor="rel">Hubungan dengan pewaris</Label>
            <Select value={person.rel} onValueChange={(v) => patch({ rel: v as Rel })}>
              <SelectTrigger id="rel" className="w-full min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELS.map((r) => (
                  <SelectItem key={r} value={r}
                    disabled={r !== person.rel && data.people.filter((p) => p.rel === r).length >= relMax(r, dg)}>
                    {relLabel(r, dg)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {person?.rel === 'grandchild' && (() => {
          const sons = data.people.filter((x) => x.rel === 'child' && x.g === 'm');
          return (
            <div className="space-y-1.5">
              <Label htmlFor="parent">Orang tua (anak laki-laki)</Label>
              {sons.length ? (
                <Select value={person.parent ?? ''} onValueChange={(v) => patch({ parent: v })}>
                  <SelectTrigger id="parent" className="w-full min-h-11"><SelectValue placeholder="Pilih orang tua" /></SelectTrigger>
                  <SelectContent>{sons.map((x, i) => <SelectItem key={x.id} value={x.id}>{x.name || `Anak laki-laki ${i + 1}`}</SelectItem>)}</SelectContent>
                </Select>
              ) : <p className="text-sm text-muted-foreground">Tambahkan anak laki-laki dulu. Cucu hanya mewarisi lewat anak laki-laki.</p>}
            </div>
          );
        })()}

        <div className="space-y-1.5">
          <Label id="g-label">Jenis kelamin</Label>
          <ToggleGroup type="single" variant="outline" spacing={0} className="w-full" aria-labelledby="g-label"
            value={g} disabled={!!fixed} onValueChange={(v) => v && setGender(v as Gender)}>
            {(['m', 'f'] as const).map((v) => (
              <ToggleGroupItem key={v} value={v}
                className="min-h-11 flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {v === 'm' ? 'Laki-laki' : 'Perempuan'}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {fixed && <p className="text-sm text-muted-foreground">Ditentukan oleh hubungan.</p>}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" className="min-h-11" onClick={onClose}>Selesai</Button>
          {!me && <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={onDelete}><Trash2 aria-hidden /> Hapus anggota</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
