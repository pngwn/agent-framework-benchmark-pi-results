import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchJson, getMove, getSpecies, getTypeLabels, getVersionGroup } from 'lib/api';
import { MISSING, dexNumber, enGenus, enName, humanize, latestEnFlavor } from 'lib/format';
import { Section } from 'components/Section';
import { TypeBadgeLink } from 'components/TypeBadge';
import GameSelect from './GameSelect';
import MovesTable from './MovesTable';

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

async function loadPokemonPage(name) {
  const species = await getSpecies(name);
  if (!species) return null;
  const variety = (species.varieties ?? []).find((v) => v.is_default) ?? species.varieties?.[0];
  if (!variety) return null;
  const pokemon = await fetchJson(variety.pokemon.url);
  if (!pokemon) return null;
  return { species, pokemon };
}

async function buildMovesSection(pokemon, gameParam, typeLabel) {
  // Group this Pokémon's move entries by version group.
  const byVersionGroup = new Map();
  for (const moveEntry of pokemon.moves ?? []) {
    for (const detail of moveEntry.version_group_details ?? []) {
      const vg = detail.version_group.name;
      let list = byVersionGroup.get(vg);
      if (!list) byVersionGroup.set(vg, (list = []));
      list.push({
        move: moveEntry.move.name,
        method: detail.move_learn_method.name,
        level: detail.level_learned_at,
      });
    }
  }
  if (byVersionGroup.size === 0) return { options: [], selected: null, tables: [] };

  // Order the version groups by their `order` field.
  const versionGroups = await Promise.all(
    [...byVersionGroup.keys()].map(async (name) => ({
      name,
      order: (await getVersionGroup(name))?.order ?? 0,
    })),
  );
  versionGroups.sort((a, b) => a.order - b.order);
  const options = versionGroups.map((v) => ({ name: v.name, label: humanize(v.name) }));

  const selected = byVersionGroup.has(gameParam) ? gameParam : versionGroups[versionGroups.length - 1].name;
  const entries = byVersionGroup.get(selected);

  // Fetch the move records for the selected version group.
  const moveNames = [...new Set(entries.map((e) => e.move))];
  const records = new Map(await Promise.all(moveNames.map(async (n) => [n, await getMove(n)])));

  const methods = [...new Set(entries.map((e) => e.method))].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    }
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods.map((method) => {
    const hasLevel = method === 'level-up';
    const rows = entries
      .filter((e) => e.method === method)
      .map((e) => {
        const record = records.get(e.move);
        const typeName = record?.type?.name ?? null;
        return {
          level: e.level,
          move: record ? enName(record.names, record.name) : humanize(e.move),
          moveHref: `/moves/${e.move}`,
          type: typeName ? typeLabel(typeName) : MISSING,
          typeKey: typeName,
          typeHref: typeName ? `/types/${typeName}` : null,
          category: record?.damage_class?.name ? humanize(record.damage_class.name) : MISSING,
          power: record?.power ?? null,
          accuracy: record?.accuracy ?? null,
          pp: record?.pp ?? null,
        };
      });
    rows.sort((a, b) => {
      if (hasLevel && a.level !== b.level) return a.level - b.level;
      return a.move.localeCompare(b.move);
    });
    return { key: method, caption: humanize(method), hasLevel, rows };
  });

  return { options, selected, tables };
}

function EvolutionNode({ node }) {
  return (
    <li>
      <Link href={`/pokemon/${node.species.name}`} prefetch={false}>
        {humanize(node.species.name)}
      </Link>
      {node.evolves_to?.length > 0 && (
        <ul>
          {node.evolves_to.map((child) => (
            <EvolutionNode key={child.species.name} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const data = await loadPokemonPage(name);
  return { title: data ? enName(data.species.names, data.species.name) : 'Not found' };
}

export default async function PokemonPage({ params, searchParams }) {
  const { name } = await params;
  const sp = await searchParams;
  const data = await loadPokemonPage(name);
  if (!data) notFound();
  const { species, pokemon } = data;

  const typeLabels = await getTypeLabels();
  const typeLabel = (n) => typeLabels.get(n) ?? humanize(n);

  const displayName = enName(species.names, species.name);
  const genus = enGenus(species.genera);
  const flavor = latestEnFlavor(species.flavor_text_entries);
  const types = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);
  const artwork =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;

  const stats = (pokemon.stats ?? []).map((s) => ({
    key: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));
  const statTotal = stats.reduce((sum, s) => sum + s.value, 0);

  const abilities = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);

  const chain = species.evolution_chain?.url ? await fetchJson(species.evolution_chain.url) : null;

  const gameParam = typeof sp?.game === 'string' ? sp.game : '';
  const moves = await buildMovesSection(pokemon, gameParam, typeLabel);

  return (
    <>
      <div className="summary">
        <div className="summary-artwork">
          {artwork && <img src={artwork} alt={displayName} width={288} height={288} />}
        </div>
        <div className="summary-info">
          <p className="summary-dex">{dexNumber(species.id)}</p>
          <h1 className="summary-title">{displayName}</h1>
          <p className="summary-genus">{genus}</p>
          <p className="badges">
            {types.map((t) => (
              <TypeBadgeLink key={t.type.name} name={t.type.name} label={typeLabel(t.type.name)} />
            ))}
          </p>
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
              <tr key={s.key}>
                <th scope="row">{s.label}</th>
                <td className="stat-num">{s.value}</td>
                <td className="stat-bar">
                  <span className="track">
                    <span className="fill" style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td className="stat-num">{statTotal}</td>
              <td className="stat-bar">
                <span className="track">
                  <span className="fill" style={{ width: `${Math.min(100, (statTotal / 720) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul className="ability-list">
          {abilities.map((a) => (
            <li key={a.ability.name}>
              <Link href={`/abilities/${a.ability.name}`} prefetch={false}>
                {humanize(a.ability.name)}
              </Link>
              {a.is_hidden ? ' (hidden)' : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        {chain?.chain ? (
          <ul className="evo-tree">
            <EvolutionNode node={chain.chain} />
          </ul>
        ) : (
          <p>{MISSING}</p>
        )}
      </Section>

      <Section id="moves" title="Moves">
        {moves.options.length > 0 ? (
          <>
            <GameSelect options={moves.options} selected={moves.selected} />
            {moves.tables.map((table) => (
              <MovesTable key={table.key} table={table} />
            ))}
          </>
        ) : (
          <p>No moves</p>
        )}
      </Section>
    </>
  );
}
