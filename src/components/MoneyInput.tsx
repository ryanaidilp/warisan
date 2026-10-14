import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

const fmt = new Intl.NumberFormat('id-ID').format;
type Props = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & { value: string; onChange: (digits: string) => void };

// Shows 1.200.000 while storing digits only; keeps the caret after the same digit.
export function MoneyInput({ value, onChange, className, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const digitsBeforeCaret = useRef<number | null>(null);
  const shown = value ? fmt(Number(value)) : '';

  useLayoutEffect(() => {
    if (digitsBeforeCaret.current === null || !ref.current) return;
    let seen = 0, pos = 0;
    while (pos < shown.length && seen < digitsBeforeCaret.current) if (/\d/.test(shown[pos++])) seen++;
    ref.current.setSelectionRange(pos, pos);
    digitsBeforeCaret.current = null;
  });

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden>Rp</span>
      <Input
        {...props} ref={ref} inputMode="numeric" autoComplete="off" value={shown} className={`pl-10 ${className ?? ''}`}
        onChange={(e) => {
          const el = e.target;
          let digits = el.value.replace(/\D/g, '');
          let before = el.value.slice(0, el.selectionStart ?? 0).replace(/\D/g, '').length;
          // Backspace over a separator only removed the dot: remove the digit before it instead.
          if (digits === value && el.value.length < shown.length && before > 0) {
            digits = digits.slice(0, before - 1) + digits.slice(before);
            before--;
          }
          digitsBeforeCaret.current = before;
          onChange(digits.replace(/^0+(?=\d)/, '').slice(0, 15));
        }}
      />
    </div>
  );
}
