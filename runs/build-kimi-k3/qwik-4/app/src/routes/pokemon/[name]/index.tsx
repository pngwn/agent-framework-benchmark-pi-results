import { component$ } from '@builder.io/qwik';
import { routeLoader$, useNavigate, type DocumentHead } from '@builder.io/qwik-city';
import { MovesTable, type MoveTableData } from '../../../components/moves-table';
import { NotFoundContent } from '../../../components/not-found';
import { Section } from '../../../components/section';
import { api, mapPool } from '../../../lib/api';
import { API_BASE, getTypes } from '../../../lib/data';
import {
  dexNo as formatDexNo,
  englishName,
  humanize,
  idFromUrl,
  latestEnglishFlavorText,
  mediaUrl,
  spriteUrlForId,
} from '../../../lib/util';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface EvoNodeData {
  name: string;
  label: string;
  children: EvoNodeData[];
}

export const usePokemonData = routeLoader$(async (ev) => {
  const name = ev.params.name.toLowerCase();
  const species = await api(`pokemon-species/${name}`);
  if (!species) {
    ev.status(404);
    return null;
  }

  const defaultVariety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const pokemonId = idFromUrl(defaultVariety.pokemon.url);
  const evoChainId = idFromUrl(species.evolution_chain?.url ?? '');
  const [pokemon, evoChain, typesAll] = await Promise.all([
    api(`pokemon/${pokemonId}`),
    Number.isFinite(evoChainId) ? api(`evolution-chain/${evoChainId}`) : Promise.resolve(null),
    getTypes(),
  ]);
  if (!pokemon) {
    ev.status(404);
    return null;
  }
  const typeLabel = new Map<string, string>(typesAll.map((t) => [t.name, t.label]));

  // Types of the default Pokémon, in slot order.
  const types = [...(pokemon.types ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => ({ name: t.type.name, label: typeLabel.get(t.type.name) ?? humanize(t.type.name) }));

  // Version groups in which this Pokémon learns moves, ordered by `order`.
  const vgNames = new Set<string>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) vgNames.add(d.version_group.name);
  }
  const vgRecords = await mapPool([...vgNames], 8, (n) => api(`version-group/${n}`));
  const games = vgRecords
    .filter(Boolean)
    .map((r: any) => ({ name: r.name as string, label: humanize(r.name), order: r.order as number }))
    .sort((a, b) => a.order - b.order);
  const requestedGame = ev.url.searchParams.get('game');
  const selectedGame = games.find((g) => g.name === requestedGame) ?? games[games.length - 1] ?? null;

  // Moves for the selected version group, grouped by learn method.
  const methods = new Map<string, { level: number; name: string }[]>();
  if (selectedGame) {
    for (const m of pokemon.moves ?? []) {
      for (const d of m.version_group_details ?? []) {
        if (d.version_group.name !== selectedGame.name) continue;
        const method = d.move_learn_method.name as string;
        const arr = methods.get(method) ?? [];
        arr.push({ level: d.level_learned_at ?? 0, name: m.move.name });
        methods.set(method, arr);
      }
    }
  }
  const moveNames = [...new Set([...methods.values()].flat().map((r) => r.name))];
  const moveRecords = await mapPool(moveNames, 16, (n) => api(`move/${n}`));
  const moveByName = new Map<string, any>(moveRecords.filter(Boolean).map((r: any) => [r.name, r]));

  const methodNames = [...methods.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return humanize(a).localeCompare(humanize(b));
  });

  const tables: MoveTableData[] = methodNames.map((method) => {
    const rows = methods.get(method)!.map((e) => {
      const r = moveByName.get(e.name);
      return {
        level: e.level,
        move: e.name,
        moveLabel: englishName(r?.names) ?? humanize(e.name),
        typeName: r?.type?.name ?? '',
        typeLabel: r?.type?.name ? (typeLabel.get(r.type.name) ?? humanize(r.type.name)) : '—',
        category: r?.damage_class?.name ? humanize(r.damage_class.name) : '—',
        power: r?.power ?? null,
        accuracy: r?.accuracy ?? null,
        pp: r?.pp ?? null,
      };
    });
    if (method === 'level-up') {
      rows.sort((a, b) => a.level - b.level || a.moveLabel.localeCompare(b.moveLabel));
    } else {
      rows.sort((a, b) => a.moveLabel.localeCompare(b.moveLabel));
    }
    return { method, label: humanize(method), showLevel: method === 'level-up', rows };
  });

  const toNode = (node: any): EvoNodeData => ({
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(toNode),
  });
  const evolution: EvoNodeData = evoChain?.chain
    ? toNode(evoChain.chain)
    : { name: species.name, label: humanize(species.name), children: [] };

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    base: s.base_stat as number,
  }));
  const total = stats.reduce((sum: number, s: { base: number }) => sum + s.base, 0);

  const abilities = [...(pokemon.abilities ?? [])]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: !!a.is_hidden }));

  const heading = englishName(species.names) ?? humanize(species.name);
  const genus = species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null;
  const flavor = latestEnglishFlavorText(species.flavor_text_entries);
  const artwork =
    mediaUrl(API_BASE, pokemon.sprites?.other?.['official-artwork']?.front_default) ??
    spriteUrlForId(API_BASE, species.id);

  return {
    speciesName: species.name as string,
    heading,
    dex: formatDexNo(species.id),
    genus,
    types,
    artwork,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor,
    stats,
    total,
    abilities,
    evolution,
    games: games.map(({ name: n, label }) => ({ name: n, label })),
    selectedGame: selectedGame?.name ?? '',
    tables,
  };
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemonData);
  return { title: data ? `${data.heading} – Pokédex` : 'Not found – Pokédex' };
};

const EvoNode = component$<{ node: EvoNodeData }>(({ node }) => {
  return (
    <li>
      <a href={`/pokemon/${node.name}`}>{node.label}</a>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <EvoNode key={c.name} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
});

export default component$(() => {
  const data = usePokemonData();
  const nav = useNavigate();
  const d = data.value;
  if (!d) return <NotFoundContent />;

  return (
    <>
      <div class="pokemon-hero">
        <div class="artwork-card">
          <img src={d.artwork} alt={d.heading} width={288} height={288} class="artwork" />
        </div>
        <div class="pokemon-info">
          <p class="dex">{d.dex}</p>
          <h1>{d.heading}</h1>
          {d.genus && <p class="genus">{d.genus}</p>}
          <p class="type-badges">
            {d.types.map((t) => (
              <a key={t.name} class={`type-badge type-${t.name}`} href={`/types/${t.name}`}>
                {t.label}
              </a>
            ))}
          </p>
          <dl class="pairs">
            <div>
              <dt>Height</dt>
              <dd>{d.height}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{d.weight}</dd>
            </div>
          </dl>
          {d.flavor && <p class="flavor">{d.flavor}</p>}
        </div>
      </div>

      <Section title="Base stats" headingId="stats-heading">
        <table class="stats-table">
          <tbody>
            {d.stats.map((s) => (
              <tr key={s.label}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.base}</td>
                <td class="stat-bar-cell">
                  <div class="stat-track">
                    <div class="stat-bar" style={`width: ${Math.min(100, (s.base / 255) * 100)}%`} />
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Total</th>
              <td class="stat-value">{d.total}</td>
              <td class="stat-bar-cell">
                <div class="stat-track">
                  <div class="stat-bar" style={`width: ${Math.min(100, (d.total / 800) * 100)}%`} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities" headingId="abilities-heading">
        <ul class="plain-list">
          {d.abilities.map((a) => (
            <li key={a.name}>
              <a href={`/abilities/${a.name}`}>{a.label}</a>
              {a.hidden && <span class="muted"> (hidden)</span>}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution" headingId="evolution-heading">
        <ul class="evo-tree">
          <EvoNode node={d.evolution} />
        </ul>
      </Section>

      <Section title="Moves" headingId="moves-heading" id="moves">
        {d.games.length > 0 && (
          <div class="control game-control">
            <label for="game-select">Game</label>
            <select
              id="game-select"
              onChange$={(_, el) => {
                nav(`/pokemon/${d.speciesName}?game=${el.value}#moves`);
              }}
            >
              {d.games.map((g) => (
                <option key={g.name} value={g.name} selected={g.name === d.selectedGame}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {d.tables.map((t) => (
          <MovesTable key={t.method} table={t} />
        ))}
      </Section>
    </>
  );
});
