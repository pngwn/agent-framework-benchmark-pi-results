import { apiJson, isNotFound } from '../api';
import { getTypeRecord, speciesFromPokemonRefs } from '../data';
import { cardList, pokemonCard, section, typeBadge } from '../components';
import { DASH, enName, enShortEffect, esc, humanize, latestEnFlavor, num } from '../util';
import { renderNotFound } from './notFound';

export async function renderMove(root: HTMLElement, name: string): Promise<void> {
  let move: any;
  try {
    move = await apiJson(`/move/${encodeURIComponent(name)}`);
  } catch (e) {
    if (isNotFound(e)) return renderNotFound(root);
    throw e;
  }

  const [typeRecord, learners] = await Promise.all([
    move.type ? getTypeRecord(move.type.name).catch(() => null) : Promise.resolve(null),
    speciesFromPokemonRefs(move.learned_by_pokemon ?? []),
  ]);

  const title = enName(move);
  document.title = `${title} – Pokédex`;

  const typeName: string = move.type?.name ?? '';
  const typeEn = typeRecord ? enName(typeRecord) : humanize(typeName);
  const effect = enShortEffect(move) ?? latestEnFlavor(move.flavor_text_entries) ?? DASH;

  root.innerHTML =
    `<h1>${esc(title)}</h1>` +
    `<div class="panel">
      <dl class="facts">
        <div><dt>Type</dt><dd>${typeName ? typeBadge({ name: typeName, en: typeEn }, true) : DASH}</dd></div>
        <div><dt>Category</dt><dd>${move.damage_class ? esc(humanize(move.damage_class.name)) : DASH}</dd></div>
        <div><dt>Power</dt><dd>${num(move.power)}</dd></div>
        <div><dt>Accuracy</dt><dd>${num(move.accuracy)}</dd></div>
        <div><dt>PP</dt><dd>${num(move.pp)}</dd></div>
      </dl>
    </div>` +
    section('Effect', `<p>${esc(effect)}</p>`) +
    section(
      'Learned by',
      `<p class="count">${learners.length} Pokémon</p>` +
        (learners.length ? cardList(learners.map((sp) => pokemonCard(sp))) : `<p>${DASH}</p>`),
    );
}
