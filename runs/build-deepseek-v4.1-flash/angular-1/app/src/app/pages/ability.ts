import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AbilityRecord, PokeApi, SpeciesEntry } from '../core/pokeapi';
import { englishName, humanize, idFromUrl, isAlternateForm } from '../core/util';
import { NotFoundContent } from '../shared/not-found-content';
import { PokemonCardVM, PokemonGrid } from '../shared/pokemon-grid';

interface AbilityPokemonVM {
  count: number;
  cards: PokemonCardVM[];
}

@Component({
  selector: 'app-ability-page',
  imports: [NotFoundContent, PokemonGrid],
  template: `
    @if (notFound()) {
      <app-not-found-content />
    } @else if (ability(); as data) {
      <main class="page">
        <h1>{{ data.name }}</h1>

        <section class="panel" aria-labelledby="effect-heading">
          <h2 id="effect-heading">Effect</h2>
          <p>{{ data.effect }}</p>
        </section>

        <section class="panel" aria-labelledby="pokemon-heading">
          <h2 id="pokemon-heading">Pokémon</h2>
          @if (pokemon(); as pokemon) {
            <p class="result-count">{{ pokemon.count }} Pokémon</p>
            <ul class="pokemon-grid" app-pokemon-grid [cards]="pokemon.cards"></ul>
          }
        </section>
      </main>
    } @else {
      <main class="page"><p class="loading">Loading…</p></main>
    }
  `,
})
export class AbilityPage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly notFound = signal(false);
  protected readonly ability = signal<{ name: string; effect: string } | null>(null);
  protected readonly pokemon = signal<AbilityPokemonVM | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (name) void this.load(name);
    });
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.ability.set(null);
    this.pokemon.set(null);

    try {
      const [record, speciesIndex] = await Promise.all([
        this.api.getAbility(name),
        this.api.getSpeciesIndex(),
      ]);
      const displayName = englishName(record.names, record.name);
      const effect =
        record.effect_entries.find((entry) => entry.language.name === 'en')?.short_effect ??
        '—';

      this.ability.set({ name: displayName, effect });
      this.pokemon.set(this.buildPokemon(record, speciesIndex));
      this.title.setTitle(`${displayName} – Pokédex`);
    } catch {
      this.notFound.set(true);
      this.title.setTitle('Not found – Pokédex');
    }
  }

  private buildPokemon(
    ability: AbilityRecord,
    speciesIndex: SpeciesEntry[],
  ): AbilityPokemonVM {
    const byId = new Map(speciesIndex.map((entry) => [entry.id, entry]));
    const hiddenById = new Map<number, boolean>();

    for (const entry of ability.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id === null || isAlternateForm(id) || !byId.has(id)) continue;
      hiddenById.set(id, (hiddenById.get(id) ?? false) || entry.is_hidden);
    }

    const cards = [...hiddenById.keys()]
      .sort((a, b) => a - b)
      .map((id): PokemonCardVM => {
        const species = byId.get(id)!;
        return {
          id,
          name: species.name,
          displayName: humanize(species.name),
          sprite: this.api.spriteUrl(id),
          hidden: hiddenById.get(id) ?? false,
        };
      });

    return { count: cards.length, cards };
  }
}
