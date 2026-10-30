import { api } from '../api';
import { cardsForPokemon, englishEffect, englishName, humanize, latestFlavorText, mainTypes, typeLabel, typeLabels } from '../data';
import { CardList, Count, Dash, Section, TypeBadge, orDash } from './components';

export async function loadMove(name: string) {
  const move = await api(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [labels, cards] = await Promise.all([typeLabels(), cardsForPokemon(move.learned_by_pokemon ?? [])]);
  return { move, labels, cards };
}

export const MovePage = ({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadMove>>> }) => {
  const { move, labels, cards } = data;
  const effect = englishEffect(move.effect_entries, move.effect_chance) || latestFlavorText(move.flavor_text_entries) || Dash;
  return (
    <>
      <h1>{englishName(move)}</h1>
      <dl class="panel summary">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={{ name: move.type.name, label: typeLabel(labels, move.type.name) }} link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : Dash}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <Count n={cards.length} />
        {cards.length > 0 && <CardList cards={cards} />}
      </Section>
    </>
  );
};

export async function loadAbility(name: string) {
  const ability = await api(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  const cards = await cardsForPokemon(
    ((ability.pokemon ?? []) as any[]).map((p) => ({ url: p.pokemon.url as string, hidden: Boolean(p.is_hidden) })),
    (p) => (p.hidden ? 'Hidden ability' : undefined),
  );
  return { ability, cards };
}

export const AbilityPage = ({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadAbility>>> }) => {
  const { ability, cards } = data;
  const effect = englishEffect(ability.effect_entries) || latestFlavorText(ability.flavor_text_entries) || Dash;
  return (
    <>
      <h1>{englishName(ability)}</h1>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={cards.length} />
        {cards.length > 0 && <CardList cards={cards} />}
      </Section>
    </>
  );
};

export const TypesPage = ({ types }: { types: Awaited<ReturnType<typeof mainTypes>> }) => (
  <>
    <h1>Types</h1>
    <ul class="type-grid">
      {types.map((t) => (
        <li>
          <a class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
            {t.label}
          </a>
        </li>
      ))}
    </ul>
  </>
);

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export async function loadType(name: string) {
  const type = await api(`type/${encodeURIComponent(name.toLowerCase())}`);
  if (!type) return null;
  const [labels, cards] = await Promise.all([typeLabels(), cardsForPokemon((type.pokemon ?? []).map((p: any) => p.pokemon))]);
  const moves = ((type.moves ?? []) as { name: string }[])
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { type, labels, cards, moves };
}

export const TypePage = ({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadType>>> }) => {
  const { type, labels, cards, moves } = data;
  return (
    <>
      <h1>{englishName(type)}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {RELATIONS.map(([term, key]) => {
            const related = (type.damage_relations?.[key] ?? []) as { name: string }[];
            return (
              <div>
                <dt>{term}</dt>
                <dd>
                  {related.length
                    ? related.map((t) => <TypeBadge type={{ name: t.name, label: typeLabel(labels, t.name) }} link />)
                    : 'None'}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={cards.length} />
        {cards.length > 0 && <CardList cards={cards} />}
      </Section>
      <Section id="type-moves" title="Moves">
        <Count n={moves.length} noun="moves" />
        {moves.length > 0 && (
          <ul class="move-columns">
            {moves.map((m) => (
              <li>
                <a href={`/moves/${m.name}`}>{m.label}</a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
};
