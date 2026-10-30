import { Component, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PokedexData, AbilityRecord } from '../core/pokedex-data';
import { PokeApi } from '../core/poke-api';
import {
  englishName,
  englishText,
  humanize,
  idFromUrl,
} from '../core/helpers';
import { PokemonCard } from '../shared/pokemon-card';
import { NotFound } from '../shared/not-found';

interface AbilityPageData {
  ability: AbilityRecord;
  label: string;
  effect: string;
  pokemon: { id: number; name: string; displayName: string; hidden: boolean }[];
}

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCard, NotFound],
  template: `
    @if (data.hasValue()) {
      <h1 class="page-title">{{ data.value().label }}</h1>

      <section class="section-card" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ data.value().effect }}</p>
      </section>

      <section class="section-card" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="results-count">{{ data.value().pokemon.length }} Pokémon</p>
        <ul class="card-grid">
          @for (entry of data.value().pokemon; track entry.id) {
            <li
              app-pokemon-card
              [id]="entry.id"
              [speciesName]="entry.name"
              [displayName]="entry.displayName"
              [spriteUrl]="spriteUrl(entry.id)"
              [hiddenAbility]="entry.hidden"
            ></li>
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
export class AbilityPage {
  private readonly pokedex = inject(PokedexData);
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  readonly name = input.required<string>();

  protected readonly spriteUrl = (id: number) => this.api.spriteUrl(id);

  protected readonly data = resource({
    params: () => ({ name: this.name() }),
    loader: async ({ params }): Promise<AbilityPageData> => {
      const [ability, species] = await Promise.all([
        this.pokedex.getAbility(params.name),
        this.pokedex.getAllSpecies(),
      ]);
      const speciesById = new Map(species.map((entry) => [entry.id, entry]));
      const hiddenById = new Map<number, boolean>();
      for (const entry of ability.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id > 10_000 || !speciesById.has(id)) continue;
        hiddenById.set(id, (hiddenById.get(id) ?? false) || entry.is_hidden);
      }
      const pokemon = [...hiddenById.entries()]
        .map(([id, hidden]) => {
          const entry = speciesById.get(id)!;
          return { id, name: entry.name, displayName: humanize(entry.name), hidden };
        })
        .sort((a, b) => a.id - b.id);

      return {
        ability,
        label: englishName(ability.names, ability.name),
        effect: englishText(ability.effect_entries)?.short_effect ?? '—',
        pokemon,
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
