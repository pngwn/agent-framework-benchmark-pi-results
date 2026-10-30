interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  types: { name: string; label: string }[];
  pokemonTypes: string[];
}

export default defineEventHandler((event) =>
  withNotFound(async () => {
    const query = getQuery(event);
    const raw = Array.isArray(query.names) ? query.names.join(',') : String(query.names ?? '');
    const names = [...new Set(raw.split(',').map((name) => name.trim()).filter(Boolean))].slice(0, 6);

    const types = await allTypes();
    const labels = Object.fromEntries(types.map((t) => [t.name, englishName(t)]));

    const members: TeamMember[] = [];
    const seen = new Set<number>();
    for (const name of names) {
      try {
        const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
        if (species.id >= 10000 || seen.has(species.id)) continue;
        const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
        if (!variety) continue;
        const pokemon = await api(variety.pokemon.url);
        const pokemonTypes = pokemon.types
          .slice()
          .sort((a: any, b: any) => a.slot - b.slot)
          .map((t: any) => t.type.name);
        seen.add(species.id);
        members.push({
          id: species.id,
          name: species.name,
          sprite: spriteUrl(species.id),
          types: pokemonTypes.map((name: string) => ({ name, label: labels[name] ?? humanize(name) })),
          pokemonTypes,
        });
      } catch (err) {
        // Ignore a stale team entry whose species no longer exists.
        if (!(err instanceof NotFound)) throw err;
      }
    }

    const coverage = types.map((attacking) => {
      const relations = attacking.damage_relations;
      const isDouble = (name: string) => relations.double_damage_to.some((t: any) => t.name === name);
      const isHalf = (name: string) => relations.half_damage_to.some((t: any) => t.name === name);
      const isNone = (name: string) => relations.no_damage_to.some((t: any) => t.name === name);

      let weak = 0;
      let resistant = 0;
      for (const member of members) {
        const multiplier = member.pokemonTypes.reduce((product, defender) => {
          if (isNone(defender)) return 0;
          if (isDouble(defender)) return product * 2;
          if (isHalf(defender)) return product * 0.5;
          return product;
        }, 1);
        if (multiplier > 1) weak += 1;
        else if (multiplier < 1) resistant += 1;
      }
      return { name: attacking.name, label: englishName(attacking), weak, resistant };
    });

    return {
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        sprite: member.sprite,
        types: member.types,
      })),
      coverage,
    };
  }),
);
