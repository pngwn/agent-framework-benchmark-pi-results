// Everything the home page needs to filter and paginate all species on the client.
export default defineEventHandler(() =>
  withNotFound(async () => {
    const [species, types, generationList] = await Promise.all([
      apiList('pokemon-species'),
      allTypes(),
      apiList('generation'),
    ]);
    const generations = await Promise.all(generationList.map((g) => api(g.url)));

    const typesBySpecies = new Map<number, { slot: number; name: string }[]>();
    for (const type of types) {
      for (const { slot, pokemon } of type.pokemon) {
        const id = idFromUrl(pokemon.url);
        if (id >= 10000) continue;
        if (!typesBySpecies.has(id)) typesBySpecies.set(id, []);
        typesBySpecies.get(id)!.push({ slot, name: type.name });
      }
    }
    const generationBySpecies = new Map<number, string>();
    for (const gen of generations) {
      for (const s of gen.pokemon_species) generationBySpecies.set(idFromUrl(s.url), gen.name);
    }

    return {
      types: types.map((t) => ({ name: t.name, label: englishName(t) })),
      generations: generations.map((g) => ({ name: g.name, label: englishName(g) })),
      species: species
        .map((s) => {
          const id = idFromUrl(s.url);
          return {
            id,
            name: s.name,
            types: (typesBySpecies.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
            generation: generationBySpecies.get(id) ?? null,
          };
        })
        .sort((a, b) => a.id - b.id),
    };
  }),
);
