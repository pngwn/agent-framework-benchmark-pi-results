import { api } from '../api.js';
import { getSpeciesById } from '../data.js';
import {
  displayValue,
  englishName,
  escapeHtml,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
  setDocumentTitle,
} from '../utils.js';
import { pokemonCard, typeBadge } from '../components.js';

function moveEffect(move) {
  const shortEffect = move.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect;
  if (shortEffect) return shortEffect;
  const flavor = latestEnglishFlavor(move.flavor_text_entries);
  return flavor || '—';
}

export async function renderMovePage(main, name) {
  const [move, speciesById] = await Promise.all([
    api(`move/${encodeURIComponent(name)}`),
    getSpeciesById(),
  ]);

  const heading = englishName(move, humanize(move.name));
  const typeName = move.type?.name;
  const typeLabel = typeName ? humanize(typeName) : '—';
  const category = move.damage_class?.name ? humanize(move.damage_class.name) : '—';

  const learned = [];
  const seen = new Set();
  for (const entry of move.learned_by_pokemon ?? []) {
    const pokemonId = idFromUrl(entry.url);
    if (!Number.isInteger(pokemonId) || pokemonId > 10000) continue;
    const species = speciesById.get(pokemonId);
    if (!species || seen.has(species.id)) continue;
    seen.add(species.id);
    learned.push(species);
  }
  learned.sort((a, b) => a.id - b.id);

  main.innerHTML = `
    <h1>${escapeHtml(heading)}</h1>
    <div class="panel facts-panel">
      <dl class="facts">
        <div class="fact"><dt>Type</dt><dd>${typeName ? typeBadge(typeName, { label: typeLabel, href: `/types/${typeName}` }) : '—'}</dd></div>
        <div class="fact"><dt>Category</dt><dd>${escapeHtml(category)}</dd></div>
        <div class="fact"><dt>Power</dt><dd>${displayValue(move.power)}</dd></div>
        <div class="fact"><dt>Accuracy</dt><dd>${displayValue(move.accuracy)}</dd></div>
        <div class="fact"><dt>PP</dt><dd>${displayValue(move.pp)}</dd></div>
      </dl>
    </div>

    <section class="panel" aria-labelledby="effect-heading">
      <h2 id="effect-heading">Effect</h2>
      <p>${escapeHtml(moveEffect(move))}</p>
    </section>

    <section class="panel" aria-labelledby="learned-heading">
      <h2 id="learned-heading">Learned by</h2>
      <p class="count">${learned.length} Pokémon</p>
      <ul class="card-grid">${learned.map((species) => pokemonCard({
        id: species.id,
        name: species.name,
        sprite: `/media/sprites/pokemon/${species.id}.png`,
      })).join('')}</ul>
    </section>
  `;

  setDocumentTitle(heading);
}
