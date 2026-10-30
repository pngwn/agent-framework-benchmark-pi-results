import { defineRoute } from '@gracile/gracile/route';
import { html, type TemplateResult } from 'lit';
import { document } from '../../document.js';
import {
  englishName,
  getEvolutionChain,
  getMove,
  getPokemonForSpecies,
  getSpecies,
  getTypeNameMap,
  getVersionGroup,
  humanize,
  isApiNotFound,
  latestEnglishFlavor,
  mediaSprite,
} from '../../lib/api.js';
import { typeLink } from '../../lib/views.js';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

function evolutionItems(node: any): TemplateResult {
  const label = humanize(node.species.name);
  return html`
    <li>
      <a href=${`/pokemon/${node.species.name}`}>${label}</a>
      ${node.evolves_to?.length
        ? html`<ul>${node.evolves_to.map((child: any) => evolutionItems(child))}</ul>`
        : html``}
    </li>
  `;
}

function sortableHeader(label: string, type: 'number' | 'text'): TemplateResult {
  return html`
    <th scope="col" aria-sort="none" data-sort-type=${type}>
      <button type="button" data-sort-button>${label}</button>
    </th>
  `;
}

function textCell(value: string, content: unknown = value): TemplateResult {
  return html`<td data-sort-value=${value}>${content}</td>`;
}

function numberCell(value: number | null | undefined): TemplateResult {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return html`<td data-sort-missing>—</td>`;
  }
  return html`<td data-sort-value=${String(value)}>${value}</td>`;
}

function moveTable(method: { name: string; label: string; rows: any[] }): string | any {
  const isLevel = method.name === 'level-up';
  return html`
    <div class="table-scroll">
      <table class="moves-table">
        <caption>${mappingLabel(method.name)}</caption>
        <thead>
          <tr>
            ${isLevel ? levelHeader() : html``}
            ${sortableHeader('Move', 'text')}
            ${sortableHeader('Type', 'text')}
            ${sortableHeader('Category', 'text')}
            ${sortableHeader('Power', 'number')}
            ${sortableHeader('Accuracy', 'number')}
            ${sortableHeader('PP', 'number')}
          </tr>
        </thead>
        <tbody>
          ${method.rows.map(
            (row) => html`
              <tr>
                ${isLevel ? numberCell(row.level) : html``}
                ${textCell(
                  row.moveLabel,
                  html`<a href=${`/moves/${row.moveName}`}>${row.moveLabel}</a>`,
                )}
                ${textCell(
                  row.type.label,
                  typeLink(row.type),
                )}
                ${textCell(row.category, row.category)}
                ${numberCell(row.power)}
                ${numberCell(row.accuracy)}
                ${numberCell(row.pp)}
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

function mappingLabel(name: string): string {
  return name === 'level-up'
    ? 'Level Up'
    : name === 'machine'
      ? 'Machine'
      : name === 'egg'
        ? 'Egg'
        : name === 'tutor'
          ? 'Tutor'
          : humanize(name);
}

function levelHeader(): TemplateResult {
  return sortableHeader('Level', 'number');
}

function methodRank(name: string): number {
  return name === 'level-up' ? 0 : name === 'machine' ? 1 : name === 'egg' ? 2 : name === 'tutor' ? 3 : 4;
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };

    try {
      const speciesName = context.params.name;
      const species = await getSpecies(speciesName);
      const pokemon = await getPokemonForSpecies(species);
      const [typeNames, chain] = await Promise.all([
        getTypeNameMap(),
        species.evolution_chain?.url
          ? getEvolutionChain(species.evolution_chain.url)
          : Promise.resolve(null),
      ]);

      const heading = englishName(species, species.name);
      const genus =
        species.genera?.find((entry: any) => entry.language?.name === 'en')?.genus ?? '—';
      const types = [...(pokemon.types ?? [])]
        .sort((a, b) => a.slot - b.slot)
        .map((entry: any) => ({
          name: entry.type.name,
          label: typeNames.get(entry.type.name) ?? humanize(entry.type.name),
        }));

      const artwork =
        pokemon.sprites?.other?.['official-artwork']?.front_default ??
        pokemon.sprites?.other?.home?.front_default ??
        pokemon.sprites?.front_default ??
        mediaSprite(pokemon.id);

      const stats = (pokemon.stats ?? []).map((entry: any) => ({
        label: STAT_LABELS[entry.stat.name] ?? humanize(entry.stat.name),
        value: entry.base_stat,
      }));
      const statsTotal = stats.reduce((sum: number, stat: any) => sum + stat.value, 0);

      const abilities = [...(pokemon.abilities ?? [])]
        .sort((a, b) => a.slot - b.slot)
        .map((entry: any) => ({
          name: entry.ability.name,
          label: humanize(entry.ability.name),
          hidden: Boolean(entry.is_hidden),
        }));

      const versionGroupNames = new Set<string>();
      for (const moveEntry of pokemon.moves ?? []) {
        for (const detail of moveEntry.version_group_details ?? []) {
          versionGroupNames.add(detail.version_group.name);
        }
      }

      const games = (
        await Promise.all(
          [...versionGroupNames].map(async (name) => {
            const versionGroup = await getVersionGroup(name);
            return {
              name,
              label: humanize(name),
              order: Number(versionGroup.order ?? 0),
            };
          }),
        )
      ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      const requestedGame = context.url.searchParams.get('game');
      const selectedGame =
        games.find((game) => game.name === requestedGame)?.name ?? games.at(-1)?.name ?? null;

      const rawMethods = new Map<string, any[]>();
      if (selectedGame) {
        for (const moveEntry of pokemon.moves ?? []) {
          const details = (moveEntry.version_group_details ?? []).filter(
            (detail: any) => detail.version_group.name === selectedGame,
          );
          for (const detail of details) {
            const method = detail.move_learn_method.name;
            if (!rawMethods.has(method)) rawMethods.set(method, []);
            const key = `${moveEntry.move.name}:${detail.level_learned_at}`;
            const rows = rawMethods.get(method)!;
            if (!rows.some((row) => row.key === key)) {
              rows.push({
                key,
                level: detail.level_learned_at,
                moveName: moveEntry.move.name,
              });
            }
          }
        }
      }

      const allMoveNames = [
        ...new Set(
          [...rawMethods.values()].flat().map((entry) => entry.moveName),
        ),
      ];
      const moveDetails = new Map<string, any>();
      await Promise.all(
        allMoveNames.map(async (name) => {
          moveDetails.set(name, await getMove(name));
        }),
      );

      const methods = [...rawMethods.entries()]
        .map(([name, rows]) => ({
          name,
          label: mappingLabel(name),
          rows: rows.map((row) => {
            const move = moveDetails.get(row.moveName);
            return {
              level: row.level,
              moveName: row.moveName,
              moveLabel: englishName(move, row.moveName),
              type: {
                name: move.type.name,
                label: typeNames.get(move.type.name) ?? humanize(move.type.name),
              },
              category: humanize(move.damage_class?.name ?? ''),
              power: move.power,
              accuracy: move.accuracy,
              pp: move.pp,
            };
          }),
        }))
        .sort(
          (a, b) =>
            methodRank(a.name) - methodRank(b.name) ||
            mappingLabel(a.name).localeCompare(mappingLabel(b.name)),
        );

      for (const method of methods) {
        method.rows.sort((a, b) => {
          if (method.name === 'level-up' && a.level !== b.level) return a.level - b.level;
          return a.moveLabel.localeCompare(b.moveLabel);
        });
      }

      return {
        title: `${heading} – Pokédex`,
        heading,
        genus,
        dex: `#${String(species.id).padStart(4, '0')}`,
        types,
        artwork,
        height: `${(pokemon.height / 10).toFixed(1)} m`,
        weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
        flavor: latestEnglishFlavor(species.flavor_text_entries) || '—',
        stats,
        statsTotal,
        abilities,
        chain: chain?.chain ?? null,
        games,
        selectedGame,
        methods,
      };
    } catch (error) {
      if (isApiNotFound(error)) {
        context.responseInit.status = 404;
        return { title: 'Not found – Pokédex', notFound: true };
      }
      throw error;
    }
  },

  document: (context: any) =>
    document({ ...context, title: context.props?.title ?? 'Pokédex' }),

  template: (context: any) => {
    const data = context.props;
    if (data.notFound) {
      return html`
        <main class="page">
          <h1>Not found</h1>
          <p><a href="/">Back to the Pokédex</a></p>
        </main>
      `;
    }

    return html`
      <main class="page pokemon-page">
        <div class="pokemon-summary panel">
          <div class="artwork-box">
            <img class="artwork" src=${data.artwork} alt=${data.heading} />
          </div>

          <div class="summary-content">
            <div class="dex-number">${data.dex}</div>
            <h1>${data.heading}</h1>
            <p class="genus">${data.genus}</p>

            <div class="type-row">
              ${data.types.map((type: any) => typeLink(type))}
            </div>

            <dl class="measures">
              <div class="measure">
                <dt>Height</dt>
                <dd>${data.height}</dd>
              </div>
              <div class="measure">
                <dt>Weight</dt>
                <dd>${data.weight}</dd>
              </div>
            </dl>

            <p class="flavor-text">${data.flavor}</p>
          </div>
        </div>

        <section class="panel" aria-labelledby="stats-heading">
          <h2 id="stats-heading">Base stats</h2>
          <table class="stats-table">
            <tbody>
              ${data.stats.map(
                (stat: any) => html`
                  <tr>
                    <th scope="row">${stat.label}</th>
                    <td class="stat-value">${stat.value}</td>
                    <td class="stat-bar-cell">
                      <span class="stat-track">
                        <span
                          class="stat-bar"
                          style=${`width: ${Math.min(100, (stat.value / 255) * 100).toFixed(2)}%`}
                        ></span>
                      </span>
                    </td>
                  </tr>
                `,
              )}
              <tr>
                <th scope="row">Total</th>
                <td class="stat-value">${data.statsTotal}</td>
                <td class="stat-bar-cell"></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading">Abilities</h2>
          <ul class="plain-list">
            ${data.abilities.map(
              (ability: any) => html`
                <li>
                  <a href=${`/abilities/${ability.name}`}>${ability.label}</a>
                  ${ability.hidden ? html` <span class="muted">(hidden)</span>` : html``}
                </li>
              `,
            )}
          </ul>
        </section>

        <section class="panel" aria-labelledby="evolution-heading">
          <h2 id="evolution-heading">Evolution</h2>
          ${data.chain
            ? html`<ul class="evolution-list">${evolutionItems(data.chain)}</ul>`
            : html`<p>—</p>`}
        </section>

        <section id="moves" class="panel moves-section" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>

          ${data.games.length
            ? html`
                <div class="game-field">
                  <label for="game-select">Game</label>
                  <select id="game-select" data-game-select>
                    ${data.games.map(
                      (game: any) => html`
                        <option value=${game.name} ?selected=${game.name === data.selectedGame}>
                          ${game.label}
                        </option>
                      `,
                    )}
                  </select>
                </div>
              `
            : html``}

          ${data.methods.map((method: any) => moveTable(method))}
        </section>
      </main>
    `;
  },
});
