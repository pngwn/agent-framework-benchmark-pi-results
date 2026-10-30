interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: { name: string; label: string }[];
}

function damageMultiplier(attacking: any, defending: string): number {
  if (attacking.damage_relations.double_damage_to.some((t: any) => t.name === defending)) return 2;
  if (attacking.damage_relations.half_damage_to.some((t: any) => t.name === defending)) return 0.5;
  if (attacking.damage_relations.no_damage_to.some((t: any) => t.name === defending)) return 0;
  return 1;
}

export default defineEventHandler((event) =>
  withNotFound(async () => {
    const query = getQuery(event);
    const requested = String(query.names ?? '')
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    const names = [...new Set(requested)].slice(0, 6);

    const [typeRecords, labels, speciesRecords] = await Promise.all([
      allTypes(),
      typeLabels(),
      Promise.all(
        names.map(async (name) => {
          try {
            return await api(`pokemon-species/${encodeURIComponent(name)}`);
          } catch (err) {
            if (err instanceof NotFound) return null;
            throw err;
          }
        }),
      ),
    ]);

    const members = (
      await Promise.all(
        speciesRecords.map(async (species): Promise<TeamMember | null> => {
          if (!species) return null;
          const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
          if (!variety) return null;
          const pokemon = await api(variety.pokemon.url);
          return {
            id: species.id,
            name: species.name,
            sprite: spriteUrl(species.id),
            types: pokemon.types
              .slice()
              .sort((a: any, b: any) => a.slot - b.slot)
              .map((t: any) => ({
                name: t.type.name,
                label: labels[t.type.name] ?? humanize(t.type.name),
              })),
          };
        }),
      )
    ).filter((member): member is TeamMember => member !== null);

    const coverage = typeRecords.map((type) => {
      let weak = 0;
      let resistant = 0;
      for (const member of members) {
        const multiplier = member.types.reduce(
          (product, t) => product * damageMultiplier(type, t.name),
          1,
        );
        if (multiplier > 1) weak++;
        else if (multiplier < 1) resistant++;
      }
      return { name: type.name, label: englishName(type), weak, resistant };
    });

    return { members, coverage };
  }),
);
