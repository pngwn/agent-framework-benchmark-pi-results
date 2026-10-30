const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

interface ChainNode {
  name: string;
  label: string;
  children: ChainNode[];
}

function toChain(link: any): ChainNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(toChain),
  };
}

export default defineEventHandler((event) =>
  withNotFound(async () => {
    const name = getRouterParam(event, 'name')!.toLowerCase();
    const species = await api(`pokemon-species/${encodeURIComponent(name)}`);
    const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
    if (!variety) throw new NotFound(name);

    const [pokemon, chain, labels, vgOrder] = await Promise.all([
      api(variety.pokemon.url),
      species.evolution_chain ? api(species.evolution_chain.url) : null,
      typeLabels(),
      versionGroupOrder(),
    ]);

    // Moves: fetch each distinct move once, then group learn entries by version group.
    const moveRecords = await Promise.all(pokemon.moves.map((m: any) => api(m.move.url)));
    const moves: Record<string, any> = {};
    for (const move of moveRecords) {
      moves[move.name] = {
        label: englishName(move),
        type: move.type.name,
        category: move.damage_class ? humanize(move.damage_class.name) : null,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
      };
    }
    const learnsets: Record<string, [string, string, number][]> = {};
    for (const m of pokemon.moves) {
      for (const d of m.version_group_details) {
        (learnsets[d.version_group.name] ??= []).push([m.move.name, d.move_learn_method.name, d.level_learned_at]);
      }
    }
    const games = Object.keys(learnsets)
      .sort((a, b) => (vgOrder.get(a) ?? 0) - (vgOrder.get(b) ?? 0))
      .map((g) => ({ name: g, label: humanize(g) }));

    const usedTypes = new Set<string>([
      ...pokemon.types.map((t: any) => t.type.name),
      ...Object.values(moves).map((m: any) => m.type),
    ]);

    return {
      id: species.id,
      name: species.name,
      label: englishName(species),
      genus: species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null,
      flavorText: latestFlavorText(species.flavor_text_entries),
      types: pokemon.types
        .slice()
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => t.type.name),
      typeLabels: Object.fromEntries([...usedTypes].map((t) => [t, labels[t] ?? humanize(t)])),
      artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
      height: pokemon.height,
      weight: pokemon.weight,
      stats: pokemon.stats.map((s: any) => ({
        name: s.stat.name,
        label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
        value: s.base_stat,
      })),
      abilities: pokemon.abilities
        .slice()
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
      evolution: chain ? toChain(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
      games,
      moves,
      learnsets,
    };
  }),
);
