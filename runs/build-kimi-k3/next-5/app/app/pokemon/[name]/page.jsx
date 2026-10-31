import Link from 'next/link';
import { notFound } from 'next/navigation';

import MovesSection from '@/components/MovesSection.jsx';
import Section from '@/components/Section.jsx';
import TypeBadge from '@/components/TypeBadge.jsx';
import { apiJson, apiPath } from '@/lib/api.js';
import { getTypeLabels } from '@/lib/data.js';
import {
  dexNumber,
  englishName,
  humanize,
  latestEnglishFlavorText,
} from '@/lib/format.js';

export const dynamic = 'force-dynamic';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const MAX_STAT = 255;

async function getSpecies(name) {
  return apiJson(`/api/v2/pokemon-species/${encodeURIComponent(name)}/`);
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await getSpecies(name);
  return { title: species ? (englishName(species.names) ?? humanize(species.name)) : 'Not found' };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to.length > 0 && (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionNode key={child.species.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Assemble the moves data for the selected version group. */
async function buildMoves(pokemon, requestedGame, typeLabels) {
  const versionGroupUrls = new Map();
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      versionGroupUrls.set(detail.version_group.name, detail.version_group.url);
    }
  }
  const versionGroupRecords = await Promise.all(
    [...versionGroupUrls.values()].map((url) => apiJson(apiPath(url))),
  );
  const games = versionGroupRecords
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((r) => ({ name: r.name, label: humanize(r.name) }));
  if (games.length === 0) return { games, selected: null, tables: [] };

  const selected = (games.find((g) => g.name === requestedGame) ?? games[games.length - 1]).name;

  // Group move entries by learn method for the selected version group, deduplicated.
  const byMethod = new Map(); // method -> Map(move name -> { level, url })
  for (const move of pokemon.moves) {
    for (const detail of move.version_group_details) {
      if (detail.version_group.name !== selected) continue;
      const method = detail.move_learn_method.name;
      if (!byMethod.has(method)) byMethod.set(method, new Map());
      const entries = byMethod.get(method);
      const existing = entries.get(move.move.name);
      if (!existing || detail.level_learned_at < existing.level) {
        entries.set(move.move.name, { level: detail.level_learned_at, url: move.move.url });
      }
    }
  }

  // Fetch the move records needed for the tables.
  const entriesByName = new Map();
  for (const entries of byMethod.values()) {
    for (const [name, entry] of entries) entriesByName.set(name, entry);
  }
  const records = await Promise.all(
    [...entriesByName.values()].map((entry) => apiJson(apiPath(entry.url))),
  );
  const recordByName = new Map(
    [...entriesByName.keys()].map((name, i) => [name, records[i]]),
  );

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return a.localeCompare(b);
  });

  const tables = methods.map((method) => {
    const hasLevel = method === 'level-up';
    const rows = [...byMethod.get(method).entries()].map(([name, entry]) => {
      const record = recordByName.get(name);
      const typeName = record.type?.name;
      return {
        moveName: record.name,
        moveLabel: englishName(record.names) ?? humanize(record.name),
        typeName,
        typeLabel: typeLabels.get(typeName) ?? humanize(typeName),
        category: humanize(record.damage_class?.name ?? ''),
        power: record.power,
        accuracy: record.accuracy,
        pp: record.pp,
        level: hasLevel ? entry.level : null,
      };
    });
    rows.sort((a, b) => {
      if (hasLevel && a.level !== b.level) return a.level - b.level;
      return a.moveLabel.localeCompare(b.moveLabel);
    });
    return { method, label: humanize(method), hasLevel, rows };
  });

  return { games, selected, tables };
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const sp = await searchParams;
  const species = await getSpecies(name);
  if (!species) notFound();

  const defaultVariety =
    species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const [pokemon, chain, typeLabels] = await Promise.all([
    apiJson(apiPath(defaultVariety.pokemon.url)),
    apiJson(apiPath(species.evolution_chain.url)),
    getTypeLabels(),
  ]);

  const displayName = englishName(species.names) ?? humanize(species.name);
  const genus = species.genera?.find((g) => g.language?.name === 'en')?.genus;
  const flavorText = latestEnglishFlavorText(species.flavor_text_entries);
  const artwork = pokemon.sprites?.other?.['official-artwork']?.front_default;
  const stats = pokemon.stats.map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const moves = await buildMoves(pokemon, sp.game, typeLabels);

  return (
    <>
      <div className="surface summary">
        <div className="artwork">
          {artwork && <img src={artwork} alt={displayName} width={288} height={288} />}
        </div>
        <div>
          <p className="dex">{dexNumber(species.id)}</p>
          <h1>{displayName}</h1>
          {genus && <p className="genus">{genus}</p>}
          <div className="types">
            {pokemon.types.map((t) => (
              <TypeBadge
                key={t.type.name}
                name={t.type.name}
                label={typeLabels.get(t.type.name) ?? humanize(t.type.name)}
                href={`/types/${t.type.name}`}
              />
            ))}
          </div>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
        </div>
        {flavorText && <p className="flavor">{flavorText}</p>}
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td className="stat-value">{s.value}</td>
                <td>
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (s.value / MAX_STAT) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-value">{total}</td>
              <td>
                <div className="stat-track">
                  <div
                    className="stat-fill"
                    style={{ width: `${Math.min(100, (total / (MAX_STAT * 3)) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`}>{humanize(a.ability.name)}</Link>
              {a.is_hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul className="plain-list">
          <EvolutionNode node={chain.chain} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        <MovesSection
          games={moves.games}
          selected={moves.selected}
          tables={moves.tables}
        />
      </Section>
    </>
  );
}
