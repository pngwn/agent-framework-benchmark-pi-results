import {
  apiFetch,
  displayNumber,
  englishName,
  englishShortEffect,
  NotFoundError,
  getSpeciesIndex,
  getTypeCatalog,
  humanize,
  latestEnglishFlavor,
  speciesFromEntries,
  speciesFromPokemonList,
  type AbilityRecord,
  type MoveRecord,
  type TypeRecord,
} from '../api';
import {
  escapeHtml,
  moveHref,
  pokemonCardList,
  typeBadge,
  typeHref,
} from '../components';

function detailRow(term: string, value: string): string {
  return `<div class="detail-row"><dt>${term}</dt><dd>${value}</dd></div>`;
}

export async function renderMovePage(
  main: HTMLElement,
  name: string,
  isActive: () => boolean,
): Promise<void> {
  const [move, species] = await Promise.all([
    apiFetch<MoveRecord>(`move/${encodeURIComponent(name)}`),
    getSpeciesIndex(),
  ]);
  if (!isActive()) return;

  const displayName = englishName(move.names, move.name);
  const effect =
    englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries) ?? '—';
  const learned = speciesFromPokemonList(move.learned_by_pokemon ?? [], species);
  const typeLabel = humanize(move.type?.name ?? 'unknown');

  main.innerHTML = `
    <div class="page move-page">
      <h1>${escapeHtml(displayName)}</h1>
      <div class="panel detail-panel">
        <dl class="detail-list">
          ${detailRow('Type', typeBadge(move.type?.name ?? 'unknown', typeLabel, true))}
          ${detailRow('Category', escapeHtml(humanize(move.damage_class?.name ?? 'unknown')))}
          ${detailRow('Power', escapeHtml(displayNumber(move.power)))}
          ${detailRow('Accuracy', escapeHtml(displayNumber(move.accuracy)))}
          ${detailRow('PP', escapeHtml(displayNumber(move.pp)))}
        </dl>
      </div>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${escapeHtml(effect)}</p>
      </section>
      <section class="panel" aria-labelledby="learned-heading">
        <h2 id="learned-heading">Learned by</h2>
        <p class="count">${learned.length} Pokémon</p>
        ${pokemonCardList(learned)}
      </section>
    </div>`;
  document.title = `${displayName} – Pokédex`;
}

export async function renderAbilityPage(
  main: HTMLElement,
  name: string,
  isActive: () => boolean,
): Promise<void> {
  const [ability, species] = await Promise.all([
    apiFetch<AbilityRecord>(`ability/${encodeURIComponent(name)}`),
    getSpeciesIndex(),
  ]);
  if (!isActive()) return;

  const displayName = englishName(ability.names, ability.name);
  const effect = englishShortEffect(ability.effect_entries) ?? '—';
  const entries = speciesFromEntries(ability.pokemon ?? [], species);

  main.innerHTML = `
    <div class="page ability-page">
      <h1>${escapeHtml(displayName)}</h1>
      <section class="panel" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>${escapeHtml(effect)}</p>
      </section>
      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">${entries.length} Pokémon</p>
        ${pokemonCardList(entries)}
      </section>
    </div>`;
  document.title = `${displayName} – Pokédex`;
}

export async function renderTypeList(main: HTMLElement, isActive: () => boolean): Promise<void> {
  const types = await getTypeCatalog();
  if (!isActive()) return;
  main.innerHTML = `
    <div class="page types-page">
      <h1>Types</h1>
      <ul class="type-grid">
        ${types
          .map(
            (type) =>
              `<li><a class="type-tile type-${escapeHtml(type.name)}" href="${typeHref(type.name)}">${escapeHtml(type.englishName)}</a></li>`,
          )
          .join('')}
      </ul>
    </div>`;
  document.title = 'Types – Pokédex';
}

const RELATION_TERMS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function renderTypePage(
  main: HTMLElement,
  name: string,
  isActive: () => boolean,
): Promise<void> {
  const [types, species] = await Promise.all([getTypeCatalog(), getSpeciesIndex()]);
  if (!isActive()) return;

  const typeInfo = types.find((type) => type.name === name);
  if (!typeInfo) throw new NotFoundError();
  const record: TypeRecord = typeInfo.record;
  const labelFor = (typeName: string): string =>
    types.find((type) => type.name === typeName)?.englishName ?? humanize(typeName);

  const relations = RELATION_TERMS.map(([term, key]) => {
    const related = record.damage_relations?.[key] ?? [];
    const value = related.length
      ? related
          .map((entry) => typeBadge(entry.name, labelFor(entry.name), true))
          .join('')
      : 'None';
    return `<div class="relation"><dt>${term}</dt><dd>${value}</dd></div>`;
  }).join('');

  const pokemon = speciesFromPokemonList(
    (record.pokemon ?? []).map((entry) => entry.pokemon),
    species,
  );

  const moves = [...new Map((record.moves ?? []).map((move) => [move.name, move])).values()]
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  main.innerHTML = `
    <div class="page type-page">
      <h1>${escapeHtml(typeInfo.englishName)}</h1>
      <section class="panel" aria-labelledby="relations-heading">
        <h2 id="relations-heading">Damage relations</h2>
        <dl class="relations-list">${relations}</dl>
      </section>
      <section class="panel" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">${pokemon.length} Pokémon</p>
        ${pokemonCardList(pokemon)}
      </section>
      <section class="panel" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="count">${moves.length} moves</p>
        <ul class="move-links">${moves
          .map((move) => `<li><a href="${moveHref(move.name)}">${escapeHtml(move.label)}</a></li>`)
          .join('')}</ul>
      </section>
    </div>`;
  document.title = `${typeInfo.englishName} – Pokédex`;
}

// Used by the router for a consistent not-found heading.
export function renderNotFound(main: HTMLElement): void {
  main.innerHTML = `
    <div class="page not-found-page">
      <h1>Not found</h1>
      <p><a href="/">Back to the Pokédex</a></p>
    </div>`;
  document.title = 'Not found – Pokédex';
}

