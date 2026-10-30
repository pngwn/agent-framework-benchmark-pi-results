import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../../document.js';
import {
  englishName,
  getSpeciesNameMap,
  getType,
  getTypeNameMap,
  humanize,
  idFromUrl,
  isApiNotFound,
  mediaSprite,
} from '../../lib/api.js';
import { cardGrid, typeLink } from '../../lib/views.js';

const RELATION_TERMS: Array<[string, string]> = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };

    try {
      const type = await getType(context.params.name);
      const [typeNames, speciesNames] = await Promise.all([getTypeNameMap(), getSpeciesNameMap()]);
      const heading = englishName(type, type.name);

      const relations = RELATION_TERMS.map(([label, key]) => ({
        label,
        types: (type.damage_relations?.[key] ?? []).map((ref: any) => ({
          name: ref.name,
          label: typeNames.get(ref.name) ?? humanize(ref.name),
        })),
      }));

      const seen = new Set<number>();
      const items = (type.pokemon ?? [])
        .map((entry: any) => idFromUrl(entry.pokemon?.url))
        .filter((id: number | null): id is number => id !== null && id <= 10000)
        .filter((id: number) => {
          if (seen.has(id)) return false;
          seen.add(id);
          return speciesNames.has(id);
        })
        .sort((a: number, b: number) => a - b)
        .map((id: number) => ({
          id,
          name: speciesNames.get(id)!,
          sprite: mediaSprite(id),
        }));

      const moveNames = [
        ...new Set((type.moves ?? []).map((entry: any) => entry.name)),
      ]
        .map((name) => ({ name, label: humanize(name) }))
        .sort((a, b) => a.label.localeCompare(b.label));

      return {
        title: `${heading} – Pokédex`,
        heading,
        relations,
        count: items.length,
        items,
        moves: moveNames,
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
      <main class="page type-page">
        <h1>${data.heading}</h1>

        <section class="panel" aria-labelledby="relations-heading">
          <h2 id="relations-heading">Damage relations</h2>
          <dl class="relations">
            ${data.relations.map(
              (relation: any) => html`
                <div class="relation">
                  <dt>${relation.label}</dt>
                  <dd>
                    ${relation.types.length
                      ? relation.types.map((type: any) => typeLink(type))
                      : 'None'}
                  </dd>
                </div>
              `,
            )}
          </dl>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          <p class="result-count">${data.count} Pokémon</p>
          ${data.items.length ? cardGrid(data.items) : html`<p class="empty-message">No Pokémon found</p>`}
        </section>

        <section class="panel" aria-labelledby="type-moves-heading">
          <h2 id="type-moves-heading">Moves</h2>
          <p class="result-count">${data.moves.length} moves</p>
          <ul class="move-links">
            ${data.moves.map(
              (move: any) => html`
                <li><a href=${`/moves/${move.name}`}>${move.label}</a></li>
              `,
            )}
          </ul>
        </section>
      </main>
    `;
  },
});
