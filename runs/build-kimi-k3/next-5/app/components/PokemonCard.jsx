import Link from 'next/link';

import { apiUrl } from '@/lib/api.js';
import { dexNumber, humanize } from '@/lib/format.js';
import TypeBadge from './TypeBadge.jsx';

/**
 * A Pokémon card: a link to the species page containing the front sprite, the dex
 * number and the humanized species name. Optionally shows the Pokémon's types (home
 * page) and a note (e.g. "Hidden ability").
 */
export default function PokemonCard({ id, speciesName, types, note }) {
  return (
    <li className="card">
      <Link href={`/pokemon/${speciesName}`}>
        <img
          src={apiUrl(`/media/sprites/pokemon/${id}.png`)}
          alt=""
          width={96}
          height={96}
        />
        <span className="dex">{dexNumber(id)}</span>
        <span className="name">{humanize(speciesName)}</span>
        {types && types.length > 0 && (
          <span className="badges">
            {types.map((t) => (
              <TypeBadge key={t.name} name={t.name} label={t.label} />
            ))}
          </span>
        )}
        {note && <span className="card-note">{note}</span>}
      </Link>
    </li>
  );
}
