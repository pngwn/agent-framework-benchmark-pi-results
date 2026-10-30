import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiError, PokeApi } from '../../core/poke-api';
import { NamedRef, PokemonType, SpeciesListItem } from '../../core/models';
import { englishName, humanize, idFromUrl } from '../../core/format';
import { PokemonCard } from '../../shared/pokemon-card';
import { NotFoundContent } from '../../shared/not-found-content';

interface RelationGroup {
  term: string;
  types: { name: string; label: string }[];
}

interface TypePokemon {
  species: SpeciesListItem;
}

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCard, NotFoundContent],
  templateUrl: './type.html',
  styleUrl: './type.css',
})
export class TypePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly typeRecord = signal<PokemonType | null>(null);
  readonly pokemon = signal<TypePokemon[]>([]);
  readonly moves = signal<{ name: string; label: string }[]>([]);
  readonly notFound = signal(false);
  private typeLabels = new Map<string, string>();

  readonly name = computed(() => {
    const record = this.typeRecord();
    return record ? englishName(record.names, record.name) : '';
  });

  readonly relations = computed<RelationGroup[]>(() => {
    const record = this.typeRecord();
    if (!record) return [];
    const groups: { term: string; key: keyof PokemonType['damage_relations'] }[] = [
      { term: 'Super effective against', key: 'double_damage_to' },
      { term: 'Not very effective against', key: 'half_damage_to' },
      { term: 'No effect against', key: 'no_damage_to' },
      { term: 'Weak to', key: 'double_damage_from' },
      { term: 'Resists', key: 'half_damage_from' },
      { term: 'Immune to', key: 'no_damage_from' },
    ];
    return groups.map(({ term, key }) => ({
      term,
      types: record.damage_relations[key].map((ref: NamedRef) => ({
        name: ref.name,
        label: this.typeLabel(ref.name),
      })),
    }));
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (!name) {
        this.markNotFound();
        return;
      }
      this.load(name);
    });
  }

  typeLabel(name: string): string {
    return this.typeLabels.get(name) ?? humanize(name);
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.typeRecord.set(null);
    try {
      const [record, speciesById, typeInfo] = await Promise.all([
        this.api.type(name),
        this.api.speciesById(),
        this.api.typeInfo(),
      ]);
      this.typeLabels = new Map(typeInfo.map((type) => [type.name, type.label]));
      this.typeRecord.set(record);
      this.title.setTitle(`${englishName(record.names, record.name)} – Pokédex`);

      const byId = new Map<number, TypePokemon>();
      for (const entry of record.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id === null || id > 10000 || byId.has(id)) continue;
        const species = speciesById.get(id);
        if (species) byId.set(id, { species });
      }
      this.pokemon.set([...byId.values()].sort((a, b) => a.species.id - b.species.id));

      const seenMoves = new Set<string>();
      const moves = record.moves
        .filter((move) => {
          if (seenMoves.has(move.name)) return false;
          seenMoves.add(move.name);
          return true;
        })
        .map((move) => ({ name: move.name, label: humanize(move.name) }))
        .sort((a, b) => a.label.localeCompare(b.label));
      this.moves.set(moves);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) this.markNotFound();
      else throw error;
    }
  }

  private markNotFound(): void {
    this.notFound.set(true);
    this.title.setTitle('Not found – Pokédex');
  }
}
