import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import {
  getEvolutionChain,
  getMove,
  getPokemon,
  getSpecies,
  getTypeLabels,
  getVersionGroup,
  mediaUrl,
  typeInfo,
  type ApiChainLink,
  type ApiPokemon,
} from '@/lib/api';
import { englishGenus, englishName, humanize, idFromUrl, latestFlavorText, dexNumber } from '@/lib/format';
import { MAX_TEAM_SIZE } from '@/lib/team';
import { getTeam } from '@/lib/team-server';
import { Section } from '@/components/section';
import { TeamToggle } from '@/components/team-toggle';
import { TypeBadges } from '@/components/type-badge';
import { GameSelect } from './game-select';
import { MovesTable, type MoveRow } from './moves-table';

type Props = { params: Promise<{ name: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

const loadSpecies = cache(async (name: string) => {
  const species = await getSpecies(decodeURIComponent(name));
  if (!species) return null;
  const defaultVariety = species.varieties.find((v) => v.is_default)?.pokemon;
  const pokemon = await getPokemon(defaultVariety ? idFromUrl(defaultVariety.url) : species.id);
  if (!pokemon) return null;
  return { species, pokemon };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadSpecies((await params).name);
  return { title: data ? englishName(data.species.names, data.species.name) : 'Not found' };
}

export default async function PokemonPage({ params, searchParams }: Props) {
  await connection();
  const [{ name }, query] = await Promise.all([params, searchParams]);
  const data = await loadSpecies(name);
  if (!data) notFound();
  const { species, pokemon } = data;

  const [typeLabels, chain, versionGroups, team] = await Promise.all([
    getTypeLabels(),
    species.evolution_chain ? getEvolutionChain(species.evolution_chain.url) : null,
    versionGroupsFor(pokemon),
    getTeam(),
  ]);

  const title = englishName(species.names, species.name);
  const genus = englishGenus(species.genera);
  const flavor = latestFlavorText(species.flavor_text_entries);
  const artwork = mediaUrl(pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default);
  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeInfo(typeLabels, t.type.name));

  const requestedGame = typeof query.game === 'string' ? query.game : undefined;
  const game = versionGroups.find((g) => g.name === requestedGame) ?? versionGroups.at(-1);
  const moveTables = game ? await movesFor(pokemon, game.name, typeLabels) : [];

  const stats = pokemon.stats.map((s) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat }));
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  const abilities = [...pokemon.abilities].sort((a, b) => a.slot - b.slot);

  return (
    <>
      <div className="summary">
        <div className="artwork">
          {/* eslint-disable-next-line @next/next/no-img-element -- artwork comes from the API server */}
          {artwork && <img src={artwork} alt={title} width={475} height={475} />}
        </div>
        <div className="summary-text">
          <p className="dex-number">{dexNumber(species.id)}</p>
          <h1>{title}</h1>
          {genus && <p className="genus">{genus}</p>}
          <TypeBadges types={types} />
          <TeamToggle name={species.name} inTeam={team.includes(species.name)} full={team.length >= MAX_TEAM_SIZE} />
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
          {flavor && <p className="flavor">{flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table className="stats">
          <tbody>
            {stats.map((s) => (
              <StatRow key={s.label} label={s.label} value={s.value} max={MAX_STAT} />
            ))}
            <StatRow label="Total" value={total} max={MAX_STAT * Math.max(stats.length, 1)} total />
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
        {chain ? (
          <EvolutionTree links={[chain.chain]} />
        ) : (
          <ul>
            <li>
              <Link href={`/pokemon/${species.name}`}>{humanize(species.name)}</Link>
            </li>
          </ul>
        )}
      </Section>

      <Section id="moves" title="Moves">
        {game ? (
          <>
            <GameSelect options={versionGroups.map((g) => ({ value: g.name, label: humanize(g.name) }))} value={game.name} />
            {moveTables.map((t) => (
              <MovesTable key={`${game.name}-${t.method}`} caption={t.caption} showLevel={t.method === 'level-up'} rows={t.rows} />
            ))}
          </>
        ) : (
          <p>—</p>
        )}
      </Section>
    </>
  );
}

function StatRow({ label, value, max, total = false }: { label: string; value: number; max: number; total?: boolean }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <tr className={total ? 'stat-total' : undefined}>
      <th scope="row">{label}</th>
      <td className="stat-value">{value}</td>
      <td className="stat-bar" aria-hidden="true">
        <span className="stat-track">
          <span className="stat-fill" style={{ width: `${percent}%` }} />
        </span>
      </td>
    </tr>
  );
}

function EvolutionTree({ links }: { links: ApiChainLink[] }) {
  return (
    <ul className="evolution">
      {links.map((link) => (
        <li key={link.species.name}>
          <Link href={`/pokemon/${link.species.name}`}>{humanize(link.species.name)}</Link>
          {link.evolves_to.length > 0 && <EvolutionTree links={link.evolves_to} />}
        </li>
      ))}
    </ul>
  );
}

/** Version groups in which the Pokémon learns moves, ordered by the version group's `order`. */
async function versionGroupsFor(pokemon: ApiPokemon) {
  const names = new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)));
  const groups = await Promise.all(
    [...names].map(async (name) => ({ name, order: (await getVersionGroup(name))?.order ?? Number.MAX_SAFE_INTEGER })),
  );
  return groups.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

async function movesFor(pokemon: ApiPokemon, versionGroup: string, typeLabels: Map<string, string>) {
  const entries: { method: string; level: number; move: string }[] = [];
  for (const m of pokemon.moves) {
    const seen = new Set<string>();
    for (const d of m.version_group_details) {
      if (d.version_group.name !== versionGroup) continue;
      const id = `${d.move_learn_method.name}:${d.level_learned_at}`;
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push({ method: d.move_learn_method.name, level: d.level_learned_at, move: m.move.name });
    }
  }

  const moveNames = [...new Set(entries.map((e) => e.move))];
  const moves = new Map(await Promise.all(moveNames.map(async (n) => [n, await getMove(n)] as const)));

  const byMethod = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const move = moves.get(e.move);
    const row: MoveRow = {
      key: `${e.move}-${e.level}`,
      level: e.level,
      name: e.move,
      label: move ? englishName(move.names, move.name) : humanize(e.move),
      type: move ? typeInfo(typeLabels, move.type.name) : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    const rows = byMethod.get(e.method) ?? [];
    rows.push(row);
    byMethod.set(e.method, rows);
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  return [...byMethod.entries()]
    .map(([method, rows]) => ({
      method,
      caption: humanize(method),
      rows: rows.sort((a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.caption.localeCompare(b.caption));
}
