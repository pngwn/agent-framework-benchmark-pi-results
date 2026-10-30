import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { buildPokemonPage } from '../../lib/api.js';
import { dexNumber, englishGenus, humanize, latestEnglishFlavor, valueOrDash } from '../../lib/text.js';
import { evolutionList, section, statsTable, typeLink } from '../../lib/view.js';
import { document } from '../../document.js';

function moveTable(table) {
  const isLevelUp = table.method === 'level-up';
  const columns = [
    ...(isLevelUp ? [{ key: 'level', label: 'Level' }] : []),
    { key: 'move', label: 'Move' },
    { key: 'type', label: 'Type' },
    { key: 'category', label: 'Category' },
    { key: 'power', label: 'Power' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'pp', label: 'PP' },
  ];
  return html`
    <table class="moves-table" data-sortable>
      <caption>${table.title}</caption>
      <thead>
        <tr>
          ${columns.map(
            (column) => html`
              <th scope="col" data-sort-key=${column.key}>
                <button type="button" class="sort-button">${column.label}</button>
              </th>
            `,
          )}
        </tr>
      </thead>
      <tbody>
        ${table.rows.map(
          (row) => html`
            <tr>
              ${isLevelUp ? html`<td class="level-cell">${row.level}</td>` : ''}
              <td>
                <a href="/moves/${row.name}">${row.english}</a>
              </td>
              <td>
                <a class="type-link type-${row.typeName}" href="/types/${row.typeName}">${row.typeEnglish}</a>
              </td>
              <td>${row.category}</td>
              <td class="numeric">${valueOrDash(row.power)}</td>
              <td class="numeric">${valueOrDash(row.accuracy)}</td>
              <td class="numeric">${valueOrDash(row.pp)}</td>
            </tr>
          `,
        )}
      </tbody>
    </table>
  `;
}

function notFoundPage() {
  return html`
    <main class="page">
      <h1>Not found</h1>
      <p><a href="/">Back to Pokédex</a></p>
    </main>
  `;
}

export default defineRoute({
  handler: async ({ params, url }) => {
    if (url.hostname === 'gracile-static') return { found: false };
    try {
      const data = await buildPokemonPage(params.name, url.searchParams.get('game') ?? '');
      return { data, found: true };
    } catch (error) {
      if (error.status === 404) return { found: false };
      throw error;
    }
  },

  document: (context) =>
    document({
      ...context,
      title: context.props.found ? `${context.props.data.englishName} – Pokédex` : 'Not found – Pokédex',
    }),

  template: ({ props }) => {
    if (!props.found) return notFoundPage();
    const data = props.data;
    const species = data.species;
    const pokemon = data.pokemon;
    const artwork =
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.front_default ??
      '';
    const flavor = latestEnglishFlavor(species.flavor_text_entries) ?? '—';
    const abilities = (pokemon.abilities ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot);

    return html`
      <main class="page pokemon-page">
        <div class="pokemon-summary">
          <div class="artwork-wrap">
            <img class="artwork" src=${artwork} alt=${data.englishName} />
          </div>
          <div class="summary-body">
            <p class="dex-line">${dexNumber(species.id)}</p>
            <h1>${data.englishName}</h1>
            <p class="genus-line">${englishGenus(species)}</p>
            <ul class="type-list">
              ${(pokemon.types ?? [])
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((entry) => html`<li>${typeLink(entry.type, data.typeByApiName)}</li>`)}
            </ul>
            <dl class="measurements">
              <div>
                <dt>Height</dt>
                <dd>${(pokemon.height / 10).toFixed(1)} m</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>${(pokemon.weight / 10).toFixed(1)} kg</dd>
              </div>
            </dl>
            <p class="flavor-text">${flavor}</p>
          </div>
        </div>

        ${section('stats-heading', 'Base stats', statsTable(pokemon.stats ?? []))}

        ${section(
          'abilities-heading',
          'Abilities',
          html`
            <ul class="link-list">
              ${abilities.map(
                (entry) => html`
                  <li>
                    <a href="/abilities/${entry.ability.name}">${humanize(entry.ability.name)}</a>
                    ${entry.is_hidden ? html`<span class="hidden-note">(hidden)</span>` : ''}
                  </li>
                `,
              )}
            </ul>
          `,
        )}

        ${section('evolution-heading', 'Evolution', evolutionList(data.evolutionChain))}

        <section id="moves" class="panel moves-panel" aria-labelledby="moves-heading">
          <h2 id="moves-heading">Moves</h2>
          <div class="game-field">
            <label for="pokemon-game">Game</label>
            <select
              id="pokemon-game"
              data-game-select
              data-default-game=${data.defaultGame?.name ?? ''}
            >
              ${data.games.map(
                (game) => html`<option value=${game.name} ?selected=${data.selectedGame?.name === game.name}>
                  ${game.english}
                </option>`,
              )}
            </select>
          </div>
          ${data.moveTables.map((table) => moveTable(table))}
        </section>
      </main>
    `;
  },
});
