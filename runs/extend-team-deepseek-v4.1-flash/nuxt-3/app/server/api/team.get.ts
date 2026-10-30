const MAX_TEAM_SIZE = 6;

interface DamageRelations {
  double_damage_to: { name: string }[];
  half_damage_to: { name: string }[];
  no_damage_to: { name: string }[];
}

function multiplier(type: { damage_relations: DamageRelations }, defendingType: string): number {
  const relations = type.damage_relations;
  if (relations.no_damage_to.some((t) => t.name === defendingType)) return 0;
  if (relations.double_damage_to.some((t) => t.name === defendingType)) return 2;
  if (relations.half_damage_to.some((t) => t.name === defendingType)) return 0.5;
  return 1;
}

export default defineEventHandler((event) =>
  withNotFound(async () => {
    const query = getQuery(event).names;
    const raw = Array.isArray(query) ? query.join(',') : String(query ?? '');
    const names = [...new Set(raw.split(',').map((n) => n.trim()).filter(Boolean))].slice(0, MAX_TEAM_SIZE);

    const [types, members] = await Promise.all([
      allTypes(),
      Promise.all(
        names.map(async (name) => {
          const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
          const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
          if (!variety) throw new NotFound(name);
          const pokemon = await api(variety.pokemon.url);
          return {
            id: species.id as number,
            name: species.name as string,
            sprite: spriteUrl(species.id),
            pokemonTypes: (pokemon.types as any[])
              .slice()
              .sort((a, b) => a.slot - b.slot)
              .map((t) => t.type.name as string),
          };
        }),
      ),
    ]);

    const labels = Object.fromEntries(types.map((t) => [t.name, englishName(t)]));

    const coverage = types.map((type) => {
      let weak = 0;
      let resistant = 0;
      for (const member of members) {
        const damage = member.pokemonTypes.reduce((product, t) => product * multiplier(type, t), 1);
        if (damage > 1) weak++;
        else if (damage < 1) resistant++;
      }
      return { name: type.name, label: labels[type.name], weak, resistant };
    });

    return {
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        sprite: member.sprite,
        types: member.pokemonTypes.map((t) => ({ name: t, label: labels[t] ?? humanize(t) })),
      })),
      coverage,
    };
  }),
);
