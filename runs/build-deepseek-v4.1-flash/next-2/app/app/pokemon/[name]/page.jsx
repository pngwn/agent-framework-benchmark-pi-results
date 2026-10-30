import Link from 'next/link';
import MovesSection from '@/components/MovesSection';
import NotFound from '@/components/NotFound';
import { TypeBadge } from '@/components/PokemonCard';
import { Section } from '@/components/Section';
import {
  getDefaultPokemon,
  getEvolutionChain,
  getMove,
  getSpecies,
  getTypes,
  getVersionGroups,
  mapLimit,
} from '@/lib/api';
import {
  dexNumber,
  displayValue,
  englishGenus,
  englishName,
  formatDecimal,
  humanize,
  latestEnglishFlavor,
  SPRITE_PLACEHOLDER,
  statLabel,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

function single(value) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await getSpecies(name);
  if (!species) return { title: 'Not found – Pokédex' };
  return { title: `${englishName(species, species.name)} – Pokédex` };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to?.length ? (
        <ul className="evolution-list">
          {node.evolves_to.map((child) => (
            <EvolutionList key={child.species.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function EvolutionList({ node }) {
  return <EvolutionNode node={node} />;
}

const methodRankMap = {
  'level-up': 1,
  machine: 2,
  egg: 3,
  tutor: 4,
};

function methodSort(a, b) {
  const rank = (name) => methodRankMap[name] ?? 100;
  return rank(a) - rank(b) || humanize(a).localeCompare(humanize(b));
}

function buildMoveTables(pokemon, selectedGame, moveRecords, typeData) {
  const detailsByMethod = new Map();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name !== selectedGame) continue;
      const method = detail.move_learn_method?.name ?? 'other';
      if (!detailsByMethod.has(method)) detailsByMethod.set(method, []);
      detailsByMethod.get(method).push({
        moveName: moveEntry.move.name,
        level: detail.level_learned_at ?? 0,
      });
    }
  }

  return [...detailsByMethod.keys()]
    .sort(methodSort)
    .map((method) => {
      const rows = detailsByMethod.get(method).map((detail) => {
        const record = moveRecords.get(detail.moveName);
        const typeName = record?.type?.name ?? '';
        return {
          level: String(detail.level),
          move: record ? englishName(record, record.name) : humanize(detail.moveName),
          moveName: detail.moveName,
          type: typeData.byName.get(typeName)?.english ?? humanize(typeName),
          typeName,
          category: humanize(record?.damage_class?.name ?? '—'),
          power: displayValue(record?.power),
          accuracy: displayValue(record?.accuracy),
          pp: displayValue(record?.pp),
        };
      });
      rows.sort((a, b) => {
        if (method === 'level-up') {
          const levelDifference = Number(a.level) - Number(b.level);
          if (levelDifference !== 0) return levelDifference;
        }
        return a.move.localeCompare(b.move);
      });
      return {
        key: method,
        title: humanize(method),
        hasLevel: method === 'level-up',
        rows,
      };
    });
}

export default async function PokemonPage({ params, searchParams }) {
  const [{ name }, query] = await Promise.all([params, searchParams]);
  const species = await getSpecies(name);
  if (!species) return <NotFound />;

  const pokemon = await getDefaultPokemon(species.id);
  if (!pokemon) return <NotFound />;

  const [evolutionChain, typeData, versionGroups] = await Promise.all([
    getEvolutionChain(species),
    getTypes(),
    getVersionGroups(),
  ]);

  const english = englishName(species, species.name);
  const genus = englishGenus(species);
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const types = (pokemon.types ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.type.name,
      english: typeData.byName.get(entry.type.name)?.english ?? humanize(entry.type.name),
    }));

  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    SPRITE_PLACEHOLDER;

  const stats = pokemon.stats ?? [];
  const total = stats.reduce((sum, entry) => sum + (entry.base_stat ?? 0), 0);

  const abilities = (pokemon.abilities ?? [])
    .slice()
    .sort((a, b) => a.slot - b.slot);

  const usedVersionGroups = new Set();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (detail.version_group?.name) usedVersionGroups.add(detail.version_group.name);
    }
  }
  const games = versionGroups.filter((group) => usedVersionGroups.has(group.name));
  const requestedGame = single(query.game);
  const selectedGame =
    games.find((group) => group.name === requestedGame) ?? games[games.length - 1] ?? null;

  const moveNames = new Set();
  if (selectedGame) {
    for (const moveEntry of pokemon.moves ?? []) {
      for (const detail of moveEntry.version_group_details ?? []) {
        if (detail.version_group?.name === selectedGame.name) {
          moveNames.add(moveEntry.move.name);
        }
      }
    }
  }
  const moveRecords = new Map();
  const uniqueMoveNames = [...moveNames];
  const records = await mapLimit(uniqueMoveNames, 20, (moveName) => getMove(moveName));
  uniqueMoveNames.forEach((moveName, index) => {
    if (records[index]) moveRecords.set(moveName, records[index]);
  });

  const tables = selectedGame
    ? buildMoveTables(pokemon, selectedGame.name, moveRecords, typeData)
    : [];

  return (
    <>
      <div className="pokemon-hero">
        <div className="hero-artwork-card">
          <img className="hero-artwork" src={artwork} alt={english} width="288" height="288" />
        </div>
        <div>
          <div className="dex-number">{dexNumber(species.id)}</div>
          <h1>{english}</h1>
          <p className="genus">{genus}</p>
          <div className="type-row">
            {types.map((type) => (
              <TypeBadge asLink key={type.name} name={type.name}>
                {type.english}
              </TypeBadge>
            ))}
          </div>
          <dl className="inline-facts">
            <div>
              <dt>Height</dt>
              <dd>{formatDecimal(pokemon.height, 'm')}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatDecimal(pokemon.weight, 'kg')}</dd>
            </div>
          </dl>
          {flavor ? <p className="flavor-text">{flavor}</p> : null}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {stats.map((entry) => {
              const value = entry.base_stat ?? 0;
              return (
                <tr key={entry.stat.name}>
                  <th scope="row">{statLabel(entry.stat.name)}</th>
                  <td>
                    <div className="stat-cell">
                      <span className="stat-value">{value}</span>
                      <span className="stat-track" aria-hidden="true">
                        <span
                          className="stat-fill"
                          style={{ width: `${Math.min(100, (value / 180) * 100)}%`, display: 'block' }}
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <th scope="row">Total</th>
              <td>{total}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="simple-list">
          {abilities.map((entry) => (
            <li key={`${entry.ability.name}-${entry.slot}`}>
              <Link href={`/abilities/${entry.ability.name}`}>{humanize(entry.ability.name)}</Link>
              {entry.is_hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {evolutionChain?.chain ? (
          <ul className="evolution-list">
            <EvolutionList node={evolutionChain.chain} />
          </ul>
        ) : null}
      </Section>

      <Section id="moves" title="Moves">
        {selectedGame ? (
          <MovesSection
            games={games}
            selectedGame={selectedGame.name}
            tables={tables}
          />
        ) : (
          <p className="empty-message">No moves found</p>
        )}
      </Section>
    </>
  );
}
