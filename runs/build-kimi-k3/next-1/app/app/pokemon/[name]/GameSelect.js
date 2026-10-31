'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Version-group picker for the moves section. The selection is reflected in
// the URL query as ?game=<version group name>.
export default function GameSelect({ options, selected }) {
  const router = useRouter();
  const [value, setValue] = useState(selected);
  useEffect(() => setValue(selected), [selected]);

  return (
    <div className="field game-field">
      <label htmlFor="game-select">Game</label>
      <select
        id="game-select"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          router.replace(`?game=${encodeURIComponent(event.target.value)}#moves`);
        }}
      >
        {options.map((o) => (
          <option key={o.name} value={o.name}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
