import type { Metadata } from 'next';
import HomeBrowser, { type HomeSpecies } from '@/components/HomeBrowser';
import { frontSpriteUrl, getAllGenerations, getAllSpecies, getAllTypes } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: 'Pokédex' },
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [species, generations, types, params] = await Promise.all([
    getAllSpecies(),
    getAllGenerations(),
    getAllTypes(),
    searchParams,
  ]);

  const speciesIds = new Set(species.map((item) => item.id));

  const generationBySpecies = new Map<number, string>();
  for (const generation of generations) {
    for (const id of generation.speciesIds) generationBySpecies.set(id, generation.name);
  }

  const typesBySpecies = new Map<number, Map<string, { name: string; label: string; slot: number }>>();
  for (const type of types) {
    for (const entry of type.pokemon) {
      if (!speciesIds.has(entry.id)) continue;
      const forSpecies = typesBySpecies.get(entry.id) ?? new Map();
      if (!forSpecies.has(type.name)) {
        forSpecies.set(type.name, { name: type.name, label: type.label, slot: entry.slot });
      }
      typesBySpecies.set(entry.id, forSpecies);
    }
  }

  const items: HomeSpecies[] = species.map((item) => ({
    id: item.id,
    slug: item.name,
    displayName: item.displayName,
    generation: generationBySpecies.get(item.id) ?? '',
    types: Array.from(typesBySpecies.get(item.id)?.values() ?? []).sort((a, b) => a.slot - b.slot),
    spriteUrl: frontSpriteUrl(item.id),
  }));

  const typeOptions = types.map((type) => ({ name: type.name, label: type.label }));
  const generationOptions = generations.map((generation) => ({
    name: generation.name,
    label: generation.label,
  }));

  const requestedType = first(params.type);
  const requestedGeneration = first(params.generation);
  const requestedPage = Number.parseInt(first(params.page), 10);

  return (
    <>
      <h1>Pokémon</h1>
      <HomeBrowser
        species={items}
        types={typeOptions}
        generations={generationOptions}
        initial={{
          q: first(params.q),
          type: typeOptions.some((item) => item.name === requestedType) ? requestedType : '',
          generation: generationOptions.some((item) => item.name === requestedGeneration)
            ? requestedGeneration
            : '',
          page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
        }}
      />
    </>
  );
}
