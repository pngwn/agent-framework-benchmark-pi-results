import { escapeHtml, humanize, englishName, latestEnglishFlavor, showValue } from '../shared/format.js';
import { cardListHtml } from '../shared/cards.js';
import { api, globals, toSpecies, MEDIA_BASE } from '../api.js';

export async function movePage(name) {
  const move = await api(`/move/${encodeURIComponent(name)}`);
  if (!move) return null;
  const g = await globals();

  const en = englishName(move, move.name);
  const effect =
    move.effect_entries?.find((e) => e.language?.name === 'en')?.short_effect ??
    latestEnglishFlavor(move.flavor_text_entries) ??
    '—';

  const species = toSpecies(move.learned_by_pokemon ?? [], g.speciesNameById);

  const typeName = move.type?.name ?? '';
  const body = `
<h1>${escapeHtml(en)}</h1>
<div class="panel detail-panel">
  <dl class="facts facts-row">
    <div class="fact"><dt>Type</dt><dd>${
      typeName
        ? `<a href="/types/${escapeHtml(typeName)}"><span class="type-badge type-${escapeHtml(typeName)}">${escapeHtml(g.typeEn[typeName] ?? humanize(typeName))}</span></a>`
        : '—'
    }</dd></div>
    <div class="fact"><dt>Category</dt><dd>${escapeHtml(humanize(move.damage_class?.name ?? '—'))}</dd></div>
    <div class="fact"><dt>Power</dt><dd>${showValue(move.power)}</dd></div>
    <div class="fact"><dt>Accuracy</dt><dd>${showValue(move.accuracy)}</dd></div>
    <div class="fact"><dt>PP</dt><dd>${showValue(move.pp)}</dd></div>
  </dl>
</div>

<section class="panel" aria-labelledby="effect-heading">
  <h2 id="effect-heading">Effect</h2>
  <p>${escapeHtml(effect)}</p>
</section>

<section class="panel" aria-labelledby="learned-heading">
  <h2 id="learned-heading">Learned by</h2>
  <p class="result-count">${species.length} Pokémon</p>
  ${cardListHtml(species, { mediaBase: MEDIA_BASE })}
</section>`;

  return { title: `${en} – Pokédex`, h1: en, body };
}
