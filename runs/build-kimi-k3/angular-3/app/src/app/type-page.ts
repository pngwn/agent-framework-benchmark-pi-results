import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PokeApi, TypeRecord } from './api';
import { DexData } from './dex-data';
import { NotFoundView, applyNotFound } from './not-found';
import { PokemonCard } from './pokemon-card';
import { englishName, humanize, idFromUrl } from './util';

export interface TypeVM {
  title: string;
  relations: { term: string; types: { name: string; en: string }[] }[];
  pokemon: { id: number; name: string }[];
  moves: { name: string; label: string }[];
}

const RELATION_TERMS: { term: string; key: keyof TypeRecord['damage_relations'] }[] = [
  { term: 'Super effective against', key: 'double_damage_to' },
  { term: 'Not very effective against', key: 'half_damage_to' },
  { term: 'No effect against', key: 'no_damage_to' },
  { term: 'Weak to', key: 'double_damage_from' },
  { term: 'Resists', key: 'half_damage_from' },
  { term: 'Immune to', key: 'no_damage_from' },
];

export const typeResolver: ResolveFn<TypeVM | null> = async (route) => {
  const api = inject(PokeApi);
  const dex = inject(DexData);
  const name = route.paramMap.get('name') ?? '';

  const type = await api.get<TypeRecord>(`type/${encodeURIComponent(name)}`).catch(() => null);
  if (!type) return null;

  const [typeNames, species] = await Promise.all([dex.typeNames(), dex.speciesList()]);
  const speciesById = new Map(species.map((s) => [s.id, s]));

  const typeName = (refName: string) => typeNames.get(refName) ?? humanize(refName);

  // Map Pokémon to their species and leave out alternate forms.
  const seen = new Set<number>();
  const pokemon: { id: number; name: string }[] = [];
  for (const entry of type.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (id >= 10000 || seen.has(id)) continue;
    const speciesEntry = speciesById.get(id);
    if (!speciesEntry) continue;
    seen.add(id);
    pokemon.push({ id, name: speciesEntry.name });
  }
  pokemon.sort((a, b) => a.id - b.id);

  return {
    title: englishName(type.names) ?? humanize(type.name),
    relations: RELATION_TERMS.map(({ term, key }) => ({
      term,
      types: (type.damage_relations?.[key] ?? []).map((ref) => ({
        name: ref.name,
        en: typeName(ref.name),
      })),
    })),
    pokemon,
    moves: (type.moves ?? [])
      .map((ref) => ({ name: ref.name, label: humanize(ref.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
};

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCard, NotFoundView],
  templateUrl: './type-page.html',
  styleUrl: './type-page.css',
})
export class TypePage {
  protected readonly humanize = humanize;

  protected readonly vm = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['vm'] as TypeVM | null)),
    { requireSync: true },
  );

  constructor() {
    const vm = this.vm();
    const title = inject(Title);
    if (vm) title.setTitle(`${vm.title} – Pokédex`);
    else applyNotFound(title);
  }
}
