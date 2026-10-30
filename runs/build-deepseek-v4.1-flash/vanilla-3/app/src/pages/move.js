import {
  dash,
  englishName,
  getMove,
  getSpeciesMaps,
  humanize,
  hydrateSprites,
  englishShortEffect,
  latestEnglishFlavor,
  parseId,
  speciesCardInfo,
  typeLabelFromRef,
} from '../api.js';
import { el, heading, panel, pokemonCard, pokemonGrid, typeBadge } from '../ui.js';

function effectFor(move) {
  return englishShortEffect(move) ?? latestEnglishFlavor(move) ?? '—';
}

function cardInfosForRefs(refs, maps) {
  const seen = new Set();
  const infos = [];
  for (const ref of refs ?? []) {
    const id = parseId(ref.url);
    if (id === null || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    infos.push(speciesCardInfo(ref, maps));
  }
  return infos.sort((a, b) => a.id - b.id);
}

function detailItem(label, value) {
  return el('div', { class: 'detail-item' }, el('dt', { text: label }), el('dd', {}, value));
}

export async function renderMove(_main, _searchParams, isCurrent, name) {
  let move;
  try {
    move = await getMove(name);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }

  const maps = await getSpeciesMaps();
  if (!isCurrent()) return null;

  const displayName = englishName(move);
  const cards = cardInfosForRefs(move.learned_by_pokemon, maps);
  const type = move.type
    ? typeBadge(move.type.name, typeLabelFromRef(move.type))
    : '—';

  const summary = el(
    'div',
    { class: 'move-summary panel' },
    el(
      'dl',
      { class: 'detail-list' },
      detailItem('Type', type),
      detailItem('Category', dash(move.damage_class ? humanize(move.damage_class.name) : null)),
      detailItem('Power', dash(move.power)),
      detailItem('Accuracy', dash(move.accuracy)),
      detailItem('PP', dash(move.pp)),
    ),
  );

  const effectPanel = panel(
    2,
    'Effect',
    'effect',
    el('p', { class: 'effect-text', text: effectFor(move) }),
  );

  const learnedPanel = panel(
    2,
    'Learned by',
    'learned-by',
    el('p', { class: 'count-text', text: `${cards.length} Pokémon` }),
    pokemonGrid(cards.map((info) => pokemonCard(info))),
  );

  return {
    title: `${displayName} – Pokédex`,
    content: el(
      'div',
      { class: 'move-page' },
      heading(1, displayName),
      summary,
      effectPanel,
      learnedPanel,
    ),
    afterRender: () => hydrateSprites(cards.map((info) => info.id), learnedPanel),
  };
}
