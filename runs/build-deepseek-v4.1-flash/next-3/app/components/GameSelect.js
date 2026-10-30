'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function GameSelect({ games, selected }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="field game-field">
      <label htmlFor="game-select">Game</label>
      <select
        id="game-select"
        value={selected}
        onChange={(event) => {
          const game = event.target.value;
          router.push(`${pathname}?game=${encodeURIComponent(game)}`, { scroll: false });
        }}
      >
        {games.map((game) => (
          <option key={game.name} value={game.name}>
            {game.label}
          </option>
        ))}
      </select>
    </div>
  );
}
