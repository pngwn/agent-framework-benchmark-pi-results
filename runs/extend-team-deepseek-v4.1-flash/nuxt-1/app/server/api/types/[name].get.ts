const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export default defineEventHandler((event) =>
  withNotFound(async () => {
    const name = getRouterParam(event, 'name')!;
    const labels = await typeLabels();
    if (!labels[name.toLowerCase()]) throw new NotFound(name);
    const type = await api(`type/${encodeURIComponent(name.toLowerCase())}`);
    const pokemon = await cardsFor(type.pokemon.map((p: any) => p.pokemon));
    return {
      name: type.name,
      label: englishName(type),
      relations: RELATIONS.map(([label, key]) => ({
        label,
        types: (type.damage_relations[key] as { name: string }[])
          .filter((t) => labels[t.name])
          .map((t) => ({ name: t.name, label: labels[t.name] })),
      })),
      pokemon,
      moves: (type.moves as { name: string }[])
        .map((m) => ({ name: m.name, label: humanize(m.name) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }),
);
