import { Plus, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fr, label, val, type Result } from '@/lib/faraid';
import { HEIR_NAME, keyOf, okPhoto, pct, relLabel, relMax, rp, type Data, type Person, type Rel } from '@/lib/family';
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
  onSelect: (id: string) => void; onAdd: (rel: Rel) => void;
};

export function Tree({ data, result, net, sel, onSelect, onAdd }: Props) {
  const dg = data.deceased.g;
  const by = new Map(result.rows.map((r) => [r.key, r]));
  const of = (...rels: Rel[]) => data.people.filter((p) => rels.includes(p.rel));

  const node = (p: Person) => {
    const key = keyOf(p, dg);
    const row = by.get(key)!;
    const per = row.frac ? fr(row.frac.n, row.frac.d * row.count) : null;
    return (
      <button
        key={p.id} type="button" data-sel={sel === p.id} data-blocked={!per} className="node"
        aria-pressed={sel === p.id} title={row.blocked} onClick={() => onSelect(p.id)}
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
          <span className="text-sm text-muted-foreground mt-1">Terhalang</span>
        )}
      </button>
    );
  };

  const slot = (rel: Rel, text = relLabel(rel, dg)) => (
    <button key={`add-${rel}`} type="button" className="slot" aria-label={`Tambah ${relLabel(rel, dg)}`} onClick={() => onAdd(rel)}>
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
  const kids = (rel: Rel) => [...of(rel).map((p) => <div className="kid" key={p.id}>{node(p)}</div>), <div className="kid" key="add">{slot(rel)}</div>];

  return (
    <div className="tree">
      <div className="gen" role="group" aria-label="Orang tua dan nenek">
        <div className="kids">
          {(['gmP', 'father', 'mother', 'gmM'] as Rel[]).map((rel) => { const p = of(rel)[0]; return p ? node(p) : slot(rel); })}
        </div>
      </div>
      <div className="gen mid" role="group" aria-label="Pewaris, pasangan, dan saudara">
        <div className="sibs">{[...of('full', 'paternal', 'maternal').map(node), slot('full', 'Saudara')]}</div>
        {me}
        <div className="spouses">
          {spouses.map(node)}
          {spouses.length < relMax('spouse', dg) && slot('spouse')}
        </div>
      </div>
      <div className="gen down" role="group" aria-label="Anak"><div className="kids">{kids('child')}</div></div>
      <div className="gen down" role="group" aria-label="Cucu dari anak laki-laki"><div className="kids">{kids('grandchild')}</div></div>
    </div>
  );
}
