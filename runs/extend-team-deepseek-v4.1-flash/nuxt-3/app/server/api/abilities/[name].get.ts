export default defineEventHandler((event) =>
  withNotFound(async () => {
    const name = getRouterParam(event, 'name')!;
    const ability = await api(`ability/${encodeURIComponent(name.toLowerCase())}`);
    const effect =
      ability.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ||
      latestFlavorText(ability.flavor_text_entries) ||
      null;
    return {
      name: ability.name,
      label: englishName(ability),
      effect,
      pokemon: await cardsFor(ability.pokemon.map((p: any) => ({ ...p.pokemon, hidden: p.is_hidden }))),
    };
  }),
);
