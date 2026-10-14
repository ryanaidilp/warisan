import { Plus, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fr, label, val, type Result } from '@/lib/faraid';
import { HEIR_NAME, eligible, keyOf, okPhoto, pct, relLabel, relMax, rp, type Data, type Person, type Rel } from '@/lib/family';
import { cn } from '@/lib/utils';

export function Face({ photo, className }: { photo: string; className?: string }) {
  return (
    <Avatar className={cn('size-14 bg-accent text-primary', className)}>
      {okPhoto(photo) && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className="bg-accent text-primary"><UserRound className="size-1/2" aria-hidden /></AvatarFallback>
    </Avatar>
  );
}

type Props = {
  data: Data; result: Result; net: number; sel: string | null;
  onSelect: (id: string) => void; onAdd: (rel: Rel, parent?: string) => void;
};

export function Tree({ data, result, net, sel, onSelect, onAdd }: Props) {
  const dg = data.deceased.g;
  const by = new Map(result.rows.map((r) => [r.key, r]));
  const of = (...rels: Rel[]) => data.people.filter((p) => rels.includes(p.rel));

  const node = (p: Person) => {
    const key = keyOf(p, dg);
    const linked = eligible(p, data.people);
    const row = linked ? by.get(key) : undefined;
    const per = row?.frac ? fr(row.frac.n, row.frac.d * row.count) : null;
    const why = linked ? row?.blocked : 'Cucu hanya mewarisi lewat anak laki-laki. Pilih orang tuanya di editor.';
    return (
      <button
        key={p.id} type="button" data-sel={sel === p.id} data-blocked={!per} className="node"
        aria-pressed={sel === p.id} title={why} onClick={() => onSelect(p.id)}
      >
        <Face photo={p.photo} />
        <span className="font-medium leading-tight break-words">{p.name || HEIR_NAME[key]}</span>
        {p.name && <span className="text-xs text-muted-foreground">{HEIR_NAME[key]}</span>}
        {per ? (
          <>
            <span className="font-serif text-2xl leading-none tabular-nums mt-1">{label(per)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{pct(per)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{rp(val(per) * net)}</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground mt-1">{linked ? 'Terhalang' : 'Belum terhubung'}</span>
        )}
      </button>
    );
  };

  const slot = (rel: Rel, text = relLabel(rel, dg), parent?: string) => (
    <button key={`add-${rel}`} type="button" className="slot" aria-label={`Tambah ${relLabel(rel, dg)}`} onClick={() => onAdd(rel, parent)}>
      <Plus className="size-5" aria-hidden />
      <span>{text}</span>
    </button>
  );

  const me = (
    <button type="button" data-sel={sel === 'me'} className="node me" aria-pressed={sel === 'me'} onClick={() => onSelect('me')}>
      <Face photo={data.deceased.photo} />
      <span className="font-medium leading-tight break-words">{data.deceased.name || 'Pewaris'}</span>
      <span className="text-xs opacity-75">Pewaris · {dg === 'm' ? 'Laki-laki' : 'Perempuan'}</span>
    </button>
  );
  const spouses = of('spouse');
  const grandkids = of('grandchild');
  const orphans = grandkids.filter((p) => !eligible(p, data.people));
  const branch = (son: Person) => (
    <div className="branch">
      <div className="kids">
        {grandkids.filter((g) => g.parent === son.id).map((g) => <div className="kid" key={g.id}>{node(g)}</div>)}
        <div className="kid" key="add">{slot('grandchild', 'Cucu', son.id)}</div>
      </div>
    </div>
  );

  return (
    <div className="tree">
      <div className="gen" role="group" aria-label="Orang tua dan nenek">
        <div className="kids">
          {(['gmP', 'father', 'mother', 'gmM'] as Rel[]).map((rel) => { const p = of(rel)[0]; return p ? node(p) : slot(rel); })}
        </div>
      </div>
      <div className="gen mid" role="group" aria-label="Pewaris, pasangan, dan saudara">
        <div className="sibs">{[...of('full', 'paternal', 'maternal').map(node), slot('full', 'Saudara')]}</div>
        <div className="self">{me}</div>
        <div className="spouses">
          {spouses.map(node)}
          {spouses.length < relMax('spouse', dg) && slot('spouse')}
        </div>
      </div>
      <div className="gen down" role="group" aria-label="Anak dan cucu">
        <div className="kids">
          {of('child').map((p) => <div className="kid" key={p.id}>{node(p)}{p.g === 'm' && branch(p)}</div>)}
          <div className="kid" key="add">{slot('child')}</div>
        </div>
      </div>
      {orphans.length > 0 && (
        <div className="mt-8" role="group" aria-label="Cucu belum terhubung">
          <p className="mb-3 text-center text-sm text-muted-foreground">Cucu ini belum terhubung ke anak laki-laki. Pilih orang tuanya.</p>
          <div className="kids">{orphans.map(node)}</div>
        </div>
      )}
    </div>
  );
}
