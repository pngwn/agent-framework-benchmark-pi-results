import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiError, ApiService, MISSING, englishName, latestEnglishFlavorText } from './api';
import { CatalogService } from './catalog';
import { PokemonCard, PokemonCards } from './pokemon-cards';
import { NotFound } from './not-found';

interface AbilityRecord {
  name: string;
  names: { name: string; language: { name: string } }[];
  effect_entries: { short_effect: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
  pokemon: { is_hidden: boolean; pokemon: { name: string; url: string } }[];
}

@Component({
  selector: 'app-ability',
  imports: [PokemonCards, NotFound],
  template: `
    @if (notFound()) {
      <app-not-found />
    } @else if (ability(); as ability) {
      <h1>{{ enName() }}</h1>
      <section class="section" aria-labelledby="effect-heading">
        <h2 id="effect-heading">Effect</h2>
        <p>{{ effect() }}</p>
      </section>

      <section class="section" aria-labelledby="pokemon-heading">
        <h2 id="pokemon-heading">Pokémon</h2>
        <p class="count">{{ cards().length }} Pokémon</p>
        <app-pokemon-cards [cards]="cards()" />
      </section>
    } @else {
      <p aria-hidden="true">Loading…</p>
    }
  `,
})
export class Ability {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly title = inject(Title);

  protected readonly notFound = signal(false);
  protected readonly ability = signal<AbilityRecord | null>(null);
  protected readonly cards = signal<PokemonCard[]>([]);

  protected readonly enName = computed(() => {
    const a = this.ability();
    return a ? englishName(a.names, a.name) : '';
  });

  protected readonly effect = computed(() => {
    const a = this.ability();
    if (!a) return '';
    const short = a.effect_entries.find((e) => e.language?.name === 'en')?.short_effect;
    return short ?? latestEnglishFlavorText(a.flavor_text_entries) ?? MISSING;
  });

  private token = 0;

  constructor() {
    this.route.paramMap.subscribe((params) => void this.load(params.get('name') ?? ''));
  }

  private async load(name: string): Promise<void> {
    const my = ++this.token;
    this.notFound.set(false);
    this.ability.set(null);
    this.cards.set([]);

    let ability: AbilityRecord;
    try {
      ability = await this.api.get<AbilityRecord>(`ability/${name}`);
    } catch (err) {
      if (my !== this.token) return;
      if (err instanceof ApiError && err.status === 404) {
        this.notFound.set(true);
        this.title.setTitle('Not found – Pokédex');
      }
      return;
    }

    // Map Pokémon to species, keeping the hidden flag; alternate forms are excluded.
    const hiddenBySpecies = new Map<number, boolean>();
    for (const entry of ability.pokemon) {
      const species = await this.catalog.toSpecies(entry.pokemon.url);
      if (!species) continue;
      hiddenBySpecies.set(species.id, (hiddenBySpecies.get(species.id) ?? false) || entry.is_hidden);
    }
    const speciesList = await this.catalog.toSpeciesList(ability.pokemon.map((p) => p.pokemon.url));
    if (my !== this.token) return;

    this.ability.set(ability);
    this.title.setTitle(`${englishName(ability.names, ability.name)} – Pokédex`);
    this.cards.set(
      speciesList.map((s) => ({
        id: s.id,
        name: s.name,
        extra: hiddenBySpecies.get(s.id) ? 'Hidden ability' : undefined,
      })),
    );
  }
}
