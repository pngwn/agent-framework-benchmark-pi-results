export default defineEventHandler((event) =>
  withNotFound(async () => {
    const name = getRouterParam(event, 'name')!;
    const [move, labels] = await Promise.all([api(`move/${encodeURIComponent(name.toLowerCase())}`), typeLabels()]);
    const effect =
      move.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ||
      latestFlavorText(move.flavor_text_entries) ||
      null;
    return {
      name: move.name,
      label: englishName(move),
      type: { name: move.type.name, label: labels[move.type.name] ?? humanize(move.type.name) },
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      effect,
      learnedBy: await cardsFor(move.learned_by_pokemon),
    };
  }),
);
