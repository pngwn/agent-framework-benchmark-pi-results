'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Option = { value: string; label: string };

export function GameSelect({ options, value }: { options: Option[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSelected(value);
  }

  return (
    <div className="game-select">
      <label htmlFor="game">Game</label>
      <select
        id="game"
        value={selected}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const game = e.target.value;
          setSelected(game);
          startTransition(() => router.replace(`${pathname}?game=${encodeURIComponent(game)}`, { scroll: false }));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
