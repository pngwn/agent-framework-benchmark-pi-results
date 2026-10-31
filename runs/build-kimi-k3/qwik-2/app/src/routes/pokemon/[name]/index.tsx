import { component$ } from '@builder.io/qwik';
import { routeLoader$, useLocation, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { MoveTable, type MoveRow } from '~/components/move-table';
import { NotFound } from '~/components/not-found';
import { Section } from '~/components/section';
import { TypeBadge } from '~/components/type-badge';
import { api, apiOrNull, spriteUrl } from '~/lib/api';
import { getTypeList, getVersionGroups } from '~/lib/data';
import {
  dexNumber,
  EM_DASH,
  englishGenus,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
  showMissing,
} from '~/lib/format';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface EvoNode {
  name: string;
  human: string;
  children: EvoNode[];
}

function mapEvoNode(node: any): EvoNode {
  return {
    name: node.species.name as string,
    human: humanize(node.species.name as string),
    children: ((node.evolves_to as any[]) ?? []).map(mapEvoNode),
  };
}

export const usePokemon = routeLoader$(async (ev) => {
  const name = decodeURIComponent(ev.params.name).toLowerCase();
  const species = await apiOrNull(`/pokemon-species/${encodeURIComponent(name)}/`);
  if (!species) {
    ev.status(404);
    return null;
  }

  const variety =
    (species.varieties as any[]).find((v) => v.is_default) ?? species.varieties[0];
  const pokemonId = idFromUrl(variety.pokemon.url);

  const [pokemon, typeList, versionGroups, chain] = await Promise.all([
    api(`/pokemon/${pokemonId}/`),
    getTypeList(),
    getVersionGroups(),
    species.evolution_chain?.url
      ? apiOrNull(`/evolution-chain/${idFromUrl(species.evolution_chain.url)}/`)
      : Promise.resolve(null),
  ]);
  if (!pokemon) {
    ev.status(404);
    return null;
  }

  const typeEnglish = new Map(typeList.map((t) => [t.name, t.english]));

  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const orderOf = new Map(versionGroups.map((v) => [v.name, v.order]));
  const gameNames = new Set<string>();
  for (const m of pokemon.moves as any[]) {
    for (const d of m.version_group_details as any[]) gameNames.add(d.version_group.name);
  }
  const games = [...gameNames]
    .sort((a, b) => (orderOf.get(a) ?? 0) - (orderOf.get(b) ?? 0))
    .map((n) => ({ name: n, human: humanize(n) }));

  const requested = ev.query.get('game');
  const selectedGame =
    requested && games.some((g) => g.name === requested)
      ? requested
      : games.length
        ? games[games.length - 1].name
        : null;

  // Moves for the selected version group, grouped by learn method.
  const learnEntries: { move: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves as any[]) {
    for (const d of m.version_group_details as any[]) {
      if (d.version_group.name !== selectedGame) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learnEntries.push({
        move: m.move.name,
        method: d.move_learn_method.name,
        level: d.level_learned_at,
      });
    }
  }

  const moveNames = [...new Set(learnEntries.map((e) => e.move))];
  const moveRecords = await Promise.all(moveNames.map((n) => api(`/move/${encodeURIComponent(n)}/`)));
  const moveByName = new Map(moveRecords.map((r) => [r.name as string, r]));

  const byMethod = new Map<string, MoveRow[]>();
  for (const e of learnEntries) {
    const rec = moveByName.get(e.move);
    if (!rec) continue;
    const row: MoveRow = {
      level: e.level,
      moveName: e.move,
      moveEnglish: englishName(rec.names, e.move),
      typeName: rec.type.name,
      typeEnglish: typeEnglish.get(rec.type.name) ?? humanize(rec.type.name),
      category: humanize(rec.damage_class.name),
      power: rec.power,
      accuracy: rec.accuracy,
      pp: rec.pp,
    };
    let rows = byMethod.get(e.method);
    if (!rows) byMethod.set(e.method, (rows = []));
    rows.push(row);
  }

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables = methods.map((method) => {
    const rows = byMethod.get(method)!;
    if (method === 'level-up') {
      rows.sort(
        (a, b) => (a.level ?? 0) - (b.level ?? 0) || a.moveEnglish.localeCompare(b.moveEnglish),
      );
    } else {
      rows.sort((a, b) => a.moveEnglish.localeCompare(b.moveEnglish));
    }
    return {
      method,
      caption: humanize(method),
      hasLevel: method === 'level-up',
      rows,
    };
  });

  const stats = (pokemon.stats as any[]).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    speciesName: species.name as string,
    english: englishName(species.names, species.name),
    dexNumber: species.id as number,
    genus: englishGenus(species.genera),
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    types: (pokemon.types as any[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({
        name: t.type.name as string,
        english: typeEnglish.get(t.type.name) ?? humanize(t.type.name),
      })),
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.front_default ??
      spriteUrl(pokemon.id),
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: (pokemon.abilities as any[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({
        name: a.ability.name as string,
        human: humanize(a.ability.name),
        hidden: a.is_hidden as boolean,
      })),
    evolution: chain?.chain ? mapEvoNode(chain.chain) : null,
    games,
    selectedGame,
    tables,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemon);
  return {
    title: data ? `${data.english} – Pokédex` : 'Not found – Pokédex',
  };
};

const EvolutionTree = component$<{ node: EvoNode }>(({ node }) => (
  <li>
    <a href={`/pokemon/${node.name}`}>{node.human}</a>
    {node.children.length > 0 && (
      <ul>
        {node.children.map((child) => (
          <EvolutionTree key={child.name} node={child} />
        ))}
      </ul>
    )}
  </li>
));

export default component$(() => {
  const data = usePokemon().value;
  const loc = useLocation();
  const nav = useNavigate();

  if (!data) return <NotFound />;

  return (
    <>
      <div class="pokemon-hero section-flush">
        <img class="artwork" src={data.artwork} alt={data.english} width={288} height={288} />
        <div class="pokemon-hero-info">
          <span class="dex-number">{dexNumber(data.dexNumber)}</span>
          <h1>{data.english}</h1>
          {data.genus && <p class="genus">{data.genus}</p>}
          <p class="type-list-inline">
            {data.types.map((t) => (
              <TypeBadge key={t.name} name={t.name} english={t.english} link />
            ))}
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{data.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{data.weight}</dd>
            </div>
          </dl>
          {data.flavorText && <p class="flavor">{data.flavorText}</p>}
        </div>
      </div>

      <Section headingId="stats-heading" title="Base stats">
        <table class="stats-table">
          <tbody>
            {data.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td class="stat-bar-cell">
                  <div class="stat-bar-track">
                    <div
                      class="stat-bar"
                      style={`width: ${Math.min(100, (s.value / 255) * 100)}%`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            <tr class="stat-total">
              <th scope="row">Total</th>
              <td class="stat-value">{data.total}</td>
              <td class="stat-bar-cell">
                <div class="stat-bar-track">
                  <div
                    class="stat-bar"
                    style={`width: ${Math.min(100, (data.total / 540) * 100)}%`}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section headingId="abilities-heading" title="Abilities">
        <ul class="plain-list">
          {data.abilities.map((a) => (
            <li key={a.name}>
              <a href={`/abilities/${a.name}`}>{a.human}</a>
              {a.hidden && ' (hidden)'}
            </li>
          ))}
        </ul>
      </Section>

      <Section headingId="evolution-heading" title="Evolution">
        {data.evolution ? (
          <ul class="plain-list evolution-tree">
            <EvolutionTree node={data.evolution} />
          </ul>
        ) : (
          <p>{EM_DASH}</p>
        )}
      </Section>

      <Section id="moves" headingId="moves-heading" title="Moves">
        {data.games.length > 0 && (
          <div class="control game-picker">
            <label for="game-select">Game</label>
            <select
              id="game-select"
              onChange$={async (_, el) => {
                await nav(`${loc.url.pathname}?game=${encodeURIComponent(el.value)}`);
              }}
            >
              {data.games.map((g) => (
                <option key={g.name} value={g.name} selected={g.name === data.selectedGame}>
                  {g.human}
                </option>
              ))}
            </select>
          </div>
        )}
        {data.tables.map((t) => (
          <MoveTable key={t.method} caption={t.caption} hasLevel={t.hasLevel} rows={t.rows} />
        ))}
      </Section>
    </>
  );
});
