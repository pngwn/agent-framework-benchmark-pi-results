import type { Metadata } from 'next';
import Link from 'next/link';
import MovesSection, { type GameOption, type MoveRow, type MovesTable } from '@/components/MovesSection';
import NotFoundContent from '@/components/NotFoundContent';
import Section from '@/components/Section';
import TypeBadge from '@/components/TypeBadge';
import {
  getEvolutionChain,
  getMove,
  getPokemon,
  getSpecies,
  getVersionGroup,
  mapLimit,
  officialArtworkUrl,
  type EvolutionNode,
} from '@/lib/api';
import {
  MOVE_METHOD_ORDER,
  STAT_LABELS,
  dexNumber,
  displayValue,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const species = await getSpecies(name);
  return { title: species ? englishName(species.names, species.name) : 'Not found' };
}

function EvolutionTree({ node }: { node: EvolutionNode }) {
  return (
    <ul className="evolution-list">
      <li>
        <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
        {node.evolves_to.length > 0 ? (
          <ul>
            {node.evolves_to.map((child) => (
              <EvolutionBranch key={child.species.name} node={child} />
            ))}
          </ul>
        ) : null}
      </li>
    </ul>
  );
}

function EvolutionBranch({ node }: { node: EvolutionNode }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`}>{humanize(node.species.name)}</Link>
      {node.evolves_to.length > 0 ? (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionBranch key={child.species.name} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function compareDefaultRows(a: MoveRow, b: MoveRow, levelFirst: boolean): number {
  if (levelFirst) {
    const aLevel = a.level ?? Number.MAX_SAFE_INTEGER;
    const bLevel = b.level ?? Number.MAX_SAFE_INTEGER;
    if (aLevel !== bLevel) return aLevel - bLevel;
  }
  return a.moveName.localeCompare(b.moveName, 'en');
}

export default async function PokemonPage({ params, searchParams }: PageProps) {
  const [{ name }, query] = await Promise.all([params, searchParams]);
  const species = await getSpecies(name);
  if (!species) return <NotFoundContent />;

  const pokemon = await getPokemon(species.id);
  if (!pokemon) return <NotFoundContent />;

  const chainId = idFromUrl(species.evolution_chain?.url);
  const chain = chainId === null ? null : await getEvolutionChain(chainId);

  const gameNames = Array.from(
    new Set(
      pokemon.moves.flatMap((move) =>
        move.version_group_details.map((detail) => detail.version_group.name),
      ),
    ),
  );

  const versionGroupRecords = await mapLimit(gameNames, 8, (gameName) => getVersionGroup(gameName));
  const games: GameOption[] = versionGroupRecords
    .filter((record): record is NonNullable<typeof record> => record !== null)
    .map((record) => ({ name: record.name, label: humanize(record.name), order: record.order }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'en'));

  const requestedGame = first(query.game);
  const selectedGame = games.some((game) => game.name === requestedGame)
    ? requestedGame
    : (games[games.length - 1]?.name ?? '');

  const pendingRows: {
    method: string;
    level: number | null;
    moveSlug: string;
  }[] = [];
  const seenRows = new Set<string>();

  for (const move of pokemon.moves) {
    const details = move.version_group_details.filter(
      (detail) => detail.version_group.name === selectedGame,
    );
    for (const detail of details) {
      const method = detail.move_learn_method.name;
      const level = method === 'level-up' ? detail.level_learned_at : null;
      const key = `${method}|${move.move.name}|${level ?? ''}`;
      if (seenRows.has(key)) continue;
      seenRows.add(key);
      pendingRows.push({ method, level, moveSlug: move.move.name });
    }
  }

  const uniqueMoves = Array.from(new Set(pendingRows.map((row) => row.moveSlug)));
  const moveRecords = await mapLimit(uniqueMoves, 12, (moveName) => getMove(moveName));
  const moveByName = new Map(
    moveRecords
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .map((record) => [record.name, record]),
  );

  const rowsByMethod = new Map<string, MoveRow[]>();
  for (const pending of pendingRows) {
    const move = moveByName.get(pending.moveSlug);
    if (!move) continue;
    const typeName = move.type?.name ?? 'unknown';
    const row: MoveRow = {
      level: pending.level,
      moveSlug: move.name,
      moveName: englishName(move.names, move.name),
      typeName,
      typeLabel: humanize(typeName),
      category: move.damage_class ? humanize(move.damage_class.name) : '—',
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    };
    const rows = rowsByMethod.get(pending.method) ?? [];
    rows.push(row);
    rowsByMethod.set(pending.method, rows);
  }

  const otherMethods = Array.from(rowsByMethod.keys())
    .filter((method) => !MOVE_METHOD_ORDER.includes(method))
    .sort((a, b) => a.localeCompare(b, 'en'));
  const methodOrder = [...MOVE_METHOD_ORDER, ...otherMethods];

  const tables: MovesTable[] = methodOrder
    .filter((method) => (rowsByMethod.get(method)?.length ?? 0) > 0)
    .map((method) => ({
      method,
      label: humanize(method),
      rows: [...(rowsByMethod.get(method) ?? [])].sort((a, b) =>
        compareDefaultRows(a, b, method === 'level-up'),
      ),
    }));

  const english = englishName(species.names, species.name);
  const genus = species.genera?.find((entry) => entry.language?.name === 'en')?.genus ?? '—';
  const flavor = latestEnglishFlavor(species.flavor_text_entries);
  const artwork = officialArtworkUrl(pokemon);
  const orderedTypes = [...pokemon.types].sort((a, b) => a.slot - b.slot);
  const orderedAbilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);
  const stats = [...pokemon.stats];
  const total = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

  return (
    <>
      <div className="pokemon-hero">
        <div className="artwork-box">
          {artwork ? <img className="artwork" src={artwork} alt={english} width={288} height={288} /> : null}
        </div>

        <div className="hero-info">
          <p className="hero-dex">{dexNumber(species.id)}</p>
          <h1>{english}</h1>
          <p className="genus">{genus}</p>

          <div className="type-badges hero-types">
            {orderedTypes.map((entry) => (
              <TypeBadge
                key={entry.type.name}
                name={entry.type.name}
                label={humanize(entry.type.name)}
                link
              />
            ))}
          </div>

          <dl className="summary-dl">
            <div className="summary-pair">
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div className="summary-pair">
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>

          {flavor ? <p className="flavor-text">{flavor}</p> : null}
        </div>
      </div>

      <Section id="base-stats" title="Base stats">
        <table className="stats-table">
          <tbody>
            {stats.map((stat) => {
              const label = STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name);
              return (
                <tr key={stat.stat.name}>
                  <th scope="row">{label}</th>
                  <td className="stats-value">{stat.base_stat}</td>
                  <td className="stats-bar-cell">
                    <div className="stat-track">
                      <div
                        className="stat-fill"
                        style={{ width: `${Math.min(100, (stat.base_stat / 255) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <th scope="row">Total</th>
              <td className="stats-value">{total}</td>
              <td className="stats-bar-cell" />
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="plain-list">
          {orderedAbilities.map((entry) => (
            <li key={`${entry.ability.name}-${entry.slot}`}>
              <Link href={`/abilities/${entry.ability.name}`}>{humanize(entry.ability.name)}</Link>
              {entry.is_hidden ? ' (hidden)' : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {chain ? <EvolutionTree node={chain.chain} /> : null}
      </Section>

      <Section id="moves" title="Moves">
        <MovesSection
          speciesSlug={species.name}
          games={games}
          selectedGame={selectedGame}
          tables={tables}
        />
      </Section>
    </>
  );
}
