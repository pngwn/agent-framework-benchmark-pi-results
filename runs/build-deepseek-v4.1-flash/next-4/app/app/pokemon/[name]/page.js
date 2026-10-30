import Link from 'next/link';
import { notFound } from 'next/navigation';

import MovesSection from '@/components/MovesSection';
import { apiGet, mapLimit } from '@/lib/api';
import {
  getMove,
  getPokemon,
  getSpecies,
  getTypeLabelMap,
  getVersionGroup,
  spriteUrl,
} from '@/lib/data';
import {
  dexNumber,
  englishName,
  formatMetric,
  humanize,
  latestEnglishFlavorText,
  statLabel,
} from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function firstString(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const species = await getSpecies(name);
  if (!species) return { title: 'Not found' };
  return { title: englishName(species, humanize(species.name)) };
}

function EvolutionNode({ node }) {
  if (!node?.species) return null;
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to?.length ? (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionNode node={child} key={child.species.name} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function methodOrder(method) {
  const preferred = ['level-up', 'machine', 'egg', 'tutor'];
  const index = preferred.indexOf(method);
  return index === -1 ? preferred.length : index;
}

async function buildMoveTables(pokemon) {
  const details = [];
  for (const moveEntry of pokemon?.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      if (!detail?.version_group?.name || !detail?.move_learn_method?.name) continue;
      details.push({
        moveName: moveEntry.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
        game: detail.version_group.name,
      });
    }
  }

  const gameNames = [...new Set(details.map((entry) => entry.game))];
  const gameResources = await mapLimit(gameNames, 20, (game) => getVersionGroup(game));
  const games = gameNames
    .map((game, index) => ({
      name: game,
      label: humanize(game),
      order: gameResources[index]?.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  return { details, games };
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const query = await searchParams;
  const species = await getSpecies(name);
  if (!species) notFound();

  const defaultVariety =
    species.varieties?.find((variety) => variety.is_default) ?? species.varieties?.[0] ?? null;
  const pokemon =
    (defaultVariety ? await getPokemon(defaultVariety.pokemon.name) : null) ??
    (await getPokemon(species.id));

  const [typeLabels, evolutionChain] = await Promise.all([
    getTypeLabelMap(),
    species.evolution_chain?.url ? apiGet(species.evolution_chain.url) : Promise.resolve(null),
  ]);

  const english = englishName(species, humanize(species.name));
  const genus =
    species.genera?.find((entry) => entry?.language?.name === 'en')?.genus ?? '—';
  const flavor = latestEnglishFlavorText(species.flavor_text_entries) || '—';
  const types = [...(pokemon?.types ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      name: entry.type.name,
      label: typeLabels.get(entry.type.name) ?? humanize(entry.type.name),
    }));

  const artwork =
    pokemon?.sprites?.other?.['official-artwork']?.front_default ??
    pokemon?.sprites?.other?.home?.front_default ??
    pokemon?.sprites?.front_default ??
    spriteUrl(species.id);

  const stats = (pokemon?.stats ?? []).map((entry) => ({
    name: entry.stat.name,
    label: statLabel(entry.stat.name),
    value: entry.base_stat,
  }));
  const statTotal = stats.reduce((sum, stat) => sum + stat.value, 0);

  const abilities = [...(pokemon?.abilities ?? [])].sort((a, b) => a.slot - b.slot);

  const { details, games } = await buildMoveTables(pokemon);
  const requestedGame = firstString(query.game);
  const selectedGame =
    games.find((game) => game.name === requestedGame) ?? games[games.length - 1] ?? null;

  const seenMoves = new Set();
  const selectedDetails = details.filter((entry) => {
    if (!selectedGame || entry.game !== selectedGame.name) return false;
    const key = `${entry.method}:${entry.moveName}`;
    if (seenMoves.has(key)) return false;
    seenMoves.add(key);
    return true;
  });

  const moveNames = [...new Set(selectedDetails.map((entry) => entry.moveName))];
  const moveResources = await mapLimit(moveNames, 25, (moveName) => getMove(moveName));
  const moveMap = new Map(moveNames.map((moveName, index) => [moveName, moveResources[index]]));

  const methods = [...new Set(selectedDetails.map((entry) => entry.method))].sort((a, b) => {
    const difference = methodOrder(a) - methodOrder(b);
    return difference !== 0 ? difference : a.localeCompare(b);
  });

  const tables = methods.map((method) => {
    const rows = selectedDetails
      .filter((entry) => entry.method === method)
      .map((entry) => {
        const move = moveMap.get(entry.moveName);
        const typeName = move?.type?.name ?? 'unknown';
        return {
          level: entry.level,
          moveName: entry.moveName,
          moveLabel: englishName(move, humanize(entry.moveName)),
          typeName,
          typeLabel: typeLabels.get(typeName) ?? humanize(typeName),
          category: move?.damage_class?.name ? humanize(move.damage_class.name) : null,
          power: move?.power ?? null,
          accuracy: move?.accuracy ?? null,
          pp: move?.pp ?? null,
        };
      });
    return { method, label: humanize(method), rows };
  });

  return (
    <>
      <div className="pokemonSummary">
        <img className="artwork" src={artwork} alt={english} />
        <div className="summaryDetails">
          <p className="dexNumber">{dexNumber(species.id)}</p>
          <h1>{english}</h1>
          <p className="genus">{genus}</p>
          <div className="typeList typeListLeft">
            {types.map((type) => (
              <Link className="typeBadge" data-type={type.name} href={`/types/${type.name}`} key={type.name}>
                {type.label}
              </Link>
            ))}
          </div>
          <dl className="metrics">
            <div>
              <dt>Height</dt>
              <dd>{formatMetric(pokemon?.height, 'm')}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{formatMetric(pokemon?.weight, 'kg')}</dd>
            </div>
          </dl>
          <p className="flavorText">{flavor}</p>
        </div>
      </div>

      <section className="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading">Base stats</h2>
        <table className="statsTable">
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="statValue">{stat.value}</td>
                <td className="statBarCell">
                  <div className="statTrack">
                    <div className="statBar" style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            <tr className="total">
              <th scope="row">Total</th>
              <td className="statValue">{statTotal}</td>
              <td className="statBarCell">
                <div className="statTrack">
                  <div className="statBar" style={{ width: `${Math.min(100, (statTotal / 1530) * 100)}%` }} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="abilities-heading">
        <h2 id="abilities-heading">Abilities</h2>
        <ul className="plainList">
          {abilities.map((entry) => (
            <li key={`${entry.slot}-${entry.ability.name}`}>
              <Link href={`/abilities/${entry.ability.name}`}>{humanize(entry.ability.name)}</Link>
              {entry.is_hidden ? <span className="hiddenNote"> (hidden)</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="evolution-heading">
        <h2 id="evolution-heading">Evolution</h2>
        {evolutionChain?.chain ? (
          <ul className="evolutionTree">
            <EvolutionNode node={evolutionChain.chain} />
          </ul>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      <MovesSection
        speciesName={species.name}
        games={games}
        selectedGame={selectedGame?.name ?? ''}
        tables={tables}
      />
    </>
  );
}
