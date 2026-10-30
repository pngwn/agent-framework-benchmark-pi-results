import { Component, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PokedexData, SpeciesEntry, TypeRecord } from '../core/pokedex-data';
import { PokeApi } from '../core/poke-api';
import { englishName, humanize, idFromUrl } from '../core/helpers';
import { PokemonCard } from '../shared/pokemon-card';
import { NotFound } from '../shared/not-found';

interface TypePageData {
  record: TypeRecord;
  label: string;
  species: { id: number; name: string; displayName: string }[];
  moves: { name: string; label: string }[];
  relations: { label: string; types: { name: string; label: string }[] }[];
}

const RELATION_TERMS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

@Component({
  selector: 'app-type-page',
  imports: [PokemonCard, NotFound, RouterLink],
  template: `
    @if (data.hasValue()) {
      <h1 class="page-title">{{ data.value().label }}</h1>

      <section class="section-card" aria-labelledby="damage-relations-heading">
        <h2 id="damage-relations-heading">Damage relations</h2>
        <dl class="damage-relations">
          @for (relation of data.value().relations; track relation.label) {
            <div class="relation">
              <dt>{{ relation.label }}</dt>
              <dd>
                @if (relation.types.length) {
                  @for (type of relation.types; track type.name) {
                    <a [routerLink]="['/types', type.name]" [class]="'type-badge type-' + type.name">
                      {{ type.label }}
                    </a>
                  }
                } @else {
                  None
                }
              </dd>
            </div>
          }
        </dl>
      </section>

      <section class="section-card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="results-count">{{ data.value().species.length }} Pokémon</p>
        <ul class="card-grid">
          @for (entry of data.value().species; track entry.id) {
            <li
              app-pokemon-card
              [id]="entry.id"
              [speciesName]="entry.name"
              [displayName]="entry.displayName"
              [spriteUrl]="spriteUrl(entry.id)"
            ></li>
          }
        </ul>
      </section>

      <section class="section-card" aria-labelledby="moves-heading">
        <h2 id="moves-heading">Moves</h2>
        <p class="results-count">{{ data.value().moves.length }} moves</p>
        <ul class="link-grid">
          @for (move of data.value().moves; track move.name) {
            <li><a [routerLink]="['/moves', move.name]">{{ move.label }}</a></li>
          }
        </ul>
      </section>
    } @else if (data.error()) {
      <app-not-found />
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
})
export class TypePage {
  private readonly pokedex = inject(PokedexData);
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  readonly name = input.required<string>();

  protected readonly spriteUrl = (id: number) => this.api.spriteUrl(id);

  protected readonly data = resource({
    params: () => ({ name: this.name() }),
    loader: async ({ params }): Promise<TypePageData> => {
      const [record, species, allTypes] = await Promise.all([
        this.pokedex.getType(params.name),
        this.pokedex.getAllSpecies(),
        this.pokedex.getAllTypes(),
      ]);
      const labels = new Map(allTypes.map((entry) => [entry.name, entry.label]));
      const speciesById = new Map(species.map((entry) => [entry.id, entry]));

      const seen = new Set<number>();
      const pokemon: { id: number; name: string; displayName: string }[] = [];
      for (const slot of record.pokemon) {
        const id = idFromUrl(slot.pokemon.url);
        if (id > 10_000 || seen.has(id)) continue;
        const entry = speciesById.get(id);
        if (!entry) continue;
        seen.add(id);
        pokemon.push({ id: entry.id, name: entry.name, displayName: humanize(entry.name) });
      }
      pokemon.sort((a, b) => a.id - b.id);

      const moves = record.moves
        .map((move) => ({ name: move.name, label: humanize(move.name) }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const relations = RELATION_TERMS.map(([label, key]) => ({
        label,
        types: (record.damage_relations[key] ?? []).map((type) => ({
          name: type.name,
          label: labels.get(type.name) ?? humanize(type.name),
        })),
      }));

      return {
        record,
        label: englishName(record.names, record.name),
        species: pokemon,
        moves,
        relations,
      };
    },
  });

  constructor() {
    effect(() => {
      if (this.data.hasValue()) {
        this.title.setTitle(`${this.data.value().label} – Pokédex`);
      }
    });
  }

}
