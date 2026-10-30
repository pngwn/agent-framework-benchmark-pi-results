import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';
import { document } from '../../document.js';
import {
  englishName,
  getAbility,
  getSpeciesNameMap,
  humanize,
  idFromUrl,
  isApiNotFound,
  mediaSprite,
  normalizeText,
} from '../../lib/api.js';
import { cardGrid } from '../../lib/views.js';

function isBuild(context: any): boolean {
  return context.url.hostname === 'gracile-static';
}

export default defineRoute({
  handler: async (context: any) => {
    if (isBuild(context)) return { title: 'Pokédex', build: true };

    try {
      const ability = await getAbility(context.params.name);
      const speciesNames = await getSpeciesNameMap();
      const heading = englishName(ability, ability.name);
      const effect =
        normalizeText(
          ability.effect_entries?.find(
            (entry: any) => entry.language?.name === 'en',
          )?.short_effect ?? '',
        ) || '—';

      const byId = new Map<number, { id: number; name: string; hidden: boolean }>();
      for (const entry of ability.pokemon ?? []) {
        const id = idFromUrl(entry.pokemon?.url);
        if (id === null || id > 10000 || !speciesNames.has(id)) continue;
        const existing = byId.get(id);
        if (existing) existing.hidden = existing.hidden || Boolean(entry.is_hidden);
        else
          byId.set(id, {
            id,
            name: speciesNames.get(id)!,
            hidden: Boolean(entry.is_hidden),
          });
      }

      const items = [...byId.values()]
        .sort((a, b) => a.id - b.id)
        .map((entry) => ({
          ...entry,
          sprite: mediaSprite(entry.id),
        }));

      return {
        title: `${heading} – Pokédex`,
        heading,
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
      <main class="page ability-page">
        <h1>${data.heading}</h1>

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>${data.effect}</p>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          <p class="result-count">${data.count} Pokémon</p>
          ${data.items.length ? cardGrid(data.items) : html`<p class="empty-message">No Pokémon found</p>`}
        </section>
      </main>
    `;
  },
});
