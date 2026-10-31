import { apiJson, isNotFound } from '../api';
import { navigate } from '../nav';
import { getTypeNameMap, getVersionGroups } from '../data';
import { section, typeBadge } from '../components';
import { DASH, enName, esc, humanize, latestEnFlavor, num, dexNumber } from '../util';
import { renderNotFound } from './notFound';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

interface MoveRow {
  level: number | null;
  move: string; // English name
  moveApi: string;
  type: string; // English name
  typeApi: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

type SortCol = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';

function compareValues(a: unknown, b: unknown, dir: number): number {
  const na = a === null || a === undefined;
  const nb = b === null || b === undefined;
  if (na && nb) return 0;
  if (na) return 1; // missing values sort last in both directions
  if (nb) return -1;
  const r =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b), 'en');
  return dir * r;
}

function evolutionNode(node: any): string {
  const name: string = node.species?.name ?? '';
  const kids: any[] = node.evolves_to ?? [];
  const childList = kids.length ? `<ul>${kids.map(evolutionNode).join('')}</ul>` : '';
  return `<li><a href="/pokemon/${esc(name)}">${esc(humanize(name))}</a>${childList}</li>`;
}

export async function renderPokemon(root: HTMLElement, name: string, params: URLSearchParams): Promise<void> {
  let species: any;
  try {
    species = await apiJson(`/pokemon-species/${encodeURIComponent(name)}`);
  } catch (e) {
    if (isNotFound(e)) return renderNotFound(root);
    throw e;
  }

  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, chain, typeNames] = await Promise.all([
    apiJson(variety.pokemon.url),
    species.evolution_chain ? apiJson(species.evolution_chain.url) : Promise.resolve(null),
    getTypeNameMap(),
  ]);

  const title = enName(species);
  document.title = `${title} – Pokédex`;

  const genus = species.genera?.find((g: any) => g?.language?.name === 'en')?.genus ?? '';
  const flavor = latestEnFlavor(species.flavor_text_entries) ?? DASH;
  const artwork: string | null =
    pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null;
  const types: any[] = [...(pokemon.types ?? [])].sort((a, b) => a.slot - b.slot);

  // --- Summary -------------------------------------------------------------
  const hero = `
    <div class="hero">
      <div class="panel hero-art-card">
        ${artwork ? `<img class="hero-art" src="${esc(artwork)}" alt="${esc(title)}" />` : ''}
      </div>
      <div class="hero-info">
        <p class="hero-dex">${dexNumber(species.id)}</p>
        <h1>${esc(title)}</h1>
        <p class="genus">${esc(genus)}</p>
        <p class="hero-types">
          ${types.map((t) => typeBadge({ name: t.type.name, en: typeNames.get(t.type.name) ?? humanize(t.type.name) }, true)).join('')}
        </p>
        <dl class="facts">
          <div><dt>Height</dt><dd>${(pokemon.height / 10).toFixed(1)} m</dd></div>
          <div><dt>Weight</dt><dd>${(pokemon.weight / 10).toFixed(1)} kg</dd></div>
        </dl>
        <p class="flavor">${esc(flavor)}</p>
      </div>
    </div>`;

  // --- Base stats -----------------------------------------------------------
  const stats: any[] = pokemon.stats ?? [];
  const total = stats.reduce((sum, s) => sum + (s.base_stat ?? 0), 0);
  const statRow = (label: string, value: number, max: number) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `<tr>
      <th scope="row">${esc(label)}</th>
      <td class="stat-val">${value}</td>
      <td class="stat-bar"><span class="bar" aria-hidden="true"><span class="bar-fill" style="width: ${pct}%"></span></span></td>
    </tr>`;
  };
  const statsSection = section(
    'Base stats',
    `<table class="stats"><tbody>
      ${stats.map((s) => statRow(STAT_LABELS[s.stat?.name] ?? humanize(s.stat?.name ?? ''), s.base_stat, 255)).join('')}
      ${statRow('Total', total, 255 * 6)}
    </tbody></table>`,
  );

  // --- Abilities ------------------------------------------------------------
  const abilities: any[] = [...(pokemon.abilities ?? [])].sort((a, b) => a.slot - b.slot);
  const abilitiesSection = section(
    'Abilities',
    `<ul>${abilities
      .map(
        (a) =>
          `<li><a href="/abilities/${esc(a.ability.name)}">${esc(humanize(a.ability.name))}</a>${a.is_hidden ? ' (hidden)' : ''}</li>`,
      )
      .join('')}</ul>`,
  );

  // --- Evolution --------------------------------------------------------------
  const evolutionSection = section(
    'Evolution',
    chain?.chain ? `<ul class="evolution">${evolutionNode(chain.chain)}</ul>` : `<p>${DASH}</p>`,
  );

  // --- Moves ------------------------------------------------------------------
  const movesSection = await movesSectionHtml(pokemon, params);

  root.innerHTML = hero + statsSection + abilitiesSection + evolutionSection + movesSection;

  wireMovesSection(root);
}

async function movesSectionHtml(pokemon: any, params: URLSearchParams): Promise<string> {
  // Version groups in which this Pokémon learns moves, ordered by their `order`.
  const vgNames = [
    ...new Set<string>(
      (pokemon.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group.name as string),
      ),
    ),
  ];
  if (!vgNames.length) {
    return `<section class="panel card-section" id="moves" aria-labelledby="moves-heading"><h2 id="moves-heading">Moves</h2><p>${DASH}</p></section>`;
  }
  const vgs = await getVersionGroups(vgNames);
  const orderOf = new Map(vgs.map((v) => [v.name, v.order ?? 0]));
  const games = vgNames.sort((a, b) => (orderOf.get(a) ?? 0) - (orderOf.get(b) ?? 0));

  const requested = params.get('game') ?? '';
  const game = games.includes(requested) ? requested : games[games.length - 1];

  // Group moves by learn method for the selected version group.
  const byMethod = new Map<string, Map<string, number>>(); // method -> move name -> lowest level
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== game) continue;
      const method: string = d.move_learn_method.name;
      let mm = byMethod.get(method);
      if (!mm) byMethod.set(method, (mm = new Map()));
      const cur = mm.get(m.move.name);
      mm.set(m.move.name, cur === undefined ? d.level_learned_at : Math.min(cur, d.level_learned_at));
    }
  }

  // Fetch the move records for display details.
  const moveNames = [...new Set([...byMethod.values()].flatMap((mm) => [...mm.keys()]))];
  const records = new Map<string, any>(
    await Promise.all(moveNames.map(async (n) => [n, await apiJson(`/move/${encodeURIComponent(n)}`)] as const)),
  );
  const typeNames = await getTypeNameMap();

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? METHOD_ORDER.length : ia) - (ib === -1 ? METHOD_ORDER.length : ib);
    return humanize(a).localeCompare(humanize(b), 'en');
  });

  const tables = methods
    .map((method) => {
      const mm = byMethod.get(method)!;
      const hasLevel = method === 'level-up';
      const rows: MoveRow[] = [...mm.entries()].map(([moveApi, level]) => {
        const rec = records.get(moveApi) ?? {};
        const typeApi: string = rec.type?.name ?? '';
        return {
          level,
          move: enName(rec),
          moveApi,
          type: typeApi ? (typeNames.get(typeApi) ?? humanize(typeApi)) : DASH,
          typeApi,
          category: rec.damage_class?.name ? humanize(rec.damage_class.name) : DASH,
          power: rec.power ?? null,
          accuracy: rec.accuracy ?? null,
          pp: rec.pp ?? null,
        };
      });
      // Default order: Level Up by level then name, other tables by name.
      rows.sort((a, b) =>
        hasLevel
          ? compareValues(a.level, b.level, 1) || compareValues(a.move, b.move, 1)
          : compareValues(a.move, b.move, 1),
      );
      return moveTable(method, rows, hasLevel);
    })
    .join('');

  return `
    <section class="panel card-section moves-section" id="moves" aria-labelledby="moves-heading">
      <h2 id="moves-heading">Moves</h2>
      <div class="game-control">
        <label for="moves-game">Game</label>
        <select id="moves-game">
          ${games.map((g) => `<option value="${esc(g)}"${g === game ? ' selected' : ''}>${esc(humanize(g))}</option>`).join('')}
        </select>
      </div>
      ${tables}
    </section>`;
}

function moveTable(method: string, rows: MoveRow[], hasLevel: boolean): string {
  const cols: { key: SortCol; label: string; numeric?: boolean }[] = [
    ...(hasLevel ? [{ key: 'level' as SortCol, label: 'Level', numeric: true }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power', numeric: true },
    { key: 'accuracy', label: 'Accuracy', numeric: true },
    { key: 'pp', label: 'PP', numeric: true },
  ];
  return `
    <table class="moves-table" data-method="${esc(method)}" data-has-level="${hasLevel}">
      <caption>${esc(humanize(method))}</caption>
      <thead><tr>
        ${cols.map((c) => `<th scope="col" data-col="${c.key}"><button type="button">${c.label}</button></th>`).join('')}
      </tr></thead>
      <tbody>${rows.map((r) => moveRowHtml(r, hasLevel)).join('')}</tbody>
    </table>`;
}

function moveRowHtml(r: MoveRow, hasLevel: boolean): string {
  return `<tr>
    ${hasLevel ? `<td class="num">${r.level === null ? DASH : r.level}</td>` : ''}
    <td><a href="/moves/${esc(r.moveApi)}">${esc(r.move)}</a></td>
    <td>${r.typeApi ? typeBadge({ name: r.typeApi, en: r.type }, true) : esc(r.type)}</td>
    <td>${esc(r.category)}</td>
    <td class="num">${num(r.power)}</td>
    <td class="num">${num(r.accuracy)}</td>
    <td class="num">${num(r.pp)}</td>
  </tr>`;
}

/** Attach game-switching and column-sorting behavior to the moves section. */
function wireMovesSection(root: HTMLElement): void {
  const sectionEl = root.querySelector<HTMLElement>('.moves-section');
  if (!sectionEl) return;

  const gameSelect = sectionEl.querySelector<HTMLSelectElement>('#moves-game');
  gameSelect?.addEventListener('change', () => {
    const url = new URL(window.location.href);
    const last = gameSelect.options[gameSelect.options.length - 1]?.value;
    if (gameSelect.value === last) url.searchParams.delete('game');
    else url.searchParams.set('game', gameSelect.value);
    navigate(url.pathname + url.search + url.hash);
  });

  for (const table of sectionEl.querySelectorAll<HTMLTableElement>('table.moves-table')) {
    const hasLevel = table.dataset.hasLevel === 'true';
    // Snapshot row data from the rendered DOM.
    const rows: MoveRow[] = [...table.tBodies[0].rows].map((tr) => {
      const cells = [...tr.cells].map((td) => td.textContent?.trim() ?? '');
      const off = hasLevel ? 1 : 0;
      const toNum = (s: string) => (s === DASH || s === '' ? null : Number(s));
      return {
        level: hasLevel ? toNum(cells[0]) : null,
        move: cells[off],
        moveApi: (tr.cells[off].querySelector('a')?.getAttribute('href') ?? '').replace(/^\/moves\//, ''),
        type: cells[off + 1],
        typeApi: (tr.cells[off + 1].querySelector('a')?.getAttribute('href') ?? '').replace(/^\/types\//, ''),
        category: cells[off + 2],
        power: toNum(cells[off + 3]),
        accuracy: toNum(cells[off + 4]),
        pp: toNum(cells[off + 5]),
      };
    });
    const headers = [...table.tHead!.rows[0].cells] as HTMLElement[];
    let sortCol: SortCol | null = null;
    let sortDir = 1;

    table.tHead!.addEventListener('click', (e) => {
      const th = (e.target as HTMLElement).closest('th');
      if (!th) return;
      const col = th.dataset.col as SortCol;
      if (!col) return;
      if (sortCol === col) sortDir = -sortDir;
      else {
        sortCol = col;
        sortDir = 1;
      }
      const col2 = sortCol as SortCol;
      const sorted = [...rows].sort(
        (a, b) => compareValues(a[col2], b[col2], sortDir) || compareValues(a.move, b.move, 1),
      );
      table.tBodies[0].innerHTML = sorted.map((r) => moveRowHtml(r, hasLevel)).join('');
      for (const h of headers) {
        if (h === th) h.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
        else h.removeAttribute('aria-sort');
      }
    });
  }
}
