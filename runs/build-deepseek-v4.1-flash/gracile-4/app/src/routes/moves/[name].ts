import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../../document.js';
import {
  englishName,
  getMove,
  getSpeciesNameMap,
  getTypeNameMap,
  humanize,
  idFromUrl,
  isApiNotFound,
  latestEnglishFlavor,
  mediaSprite,
  normalizeText,
} from '../../lib/api.js';
import { cardGrid, typeLink } from '../../lib/views.js';

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

function displayValue(value: unknown): string | number {
  return value === null || value === undefined || value === '' ? '—' : (value as string | number);
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };

    try {
      const move = await getMove(context.params.name);
      const [typeNames, speciesNames] = await Promise.all([getTypeNameMap(), getSpeciesNameMap()]);

      const heading = englishName(move, move.name);
      const typeInfo = {
        name: move.type.name,
        label: typeNames.get(move.type.name) ?? humanize(move.type.name),
      };

      const shortEffect = normalizeText(
        move.effect_entries?.find((entry: any) => entry.language?.name === 'en')?.short_effect ?? '',
      );
      const effect = shortEffect || latestEnglishFlavor(move.flavor_text_entries) || '—';

      const seen = new Set<number>();
      const items = (move.learned_by_pokemon ?? [])
        .map((entry: any) => idFromUrl(entry.url))
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

      return {
        title: `${heading} – Pokédex`,
        heading,
        type: typeInfo,
        category: move.damage_class ? humanize(move.damage_class.name) : '—',
        power: displayValue(move.power),
        accuracy: displayValue(move.accuracy),
        pp: displayValue(move.pp),
        effect,
        count: items.length,
        items,
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
      <main class="page move-page">
        <h1>${data.heading}</h1>

        <dl class="move-facts panel">
          <div>
            <dt>Type</dt>
            <dd>${typeLink(data.type)}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>${data.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>${data.power}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>${data.accuracy}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>${data.pp}</dd>
          </div>
        </dl>

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>${data.effect}</p>
        </section>

        <section class="panel" aria-labelledby="learned-by-heading">
          <h2 id="learned-by-heading">Learned by</h2>
          <p class="result-count">${data.count} Pokémon</p>
          ${data.items.length ? cardGrid(data.items) : html`<p class="empty-message">No Pokémon found</p>`}
        </section>
      </main>
    `;
  },
});
