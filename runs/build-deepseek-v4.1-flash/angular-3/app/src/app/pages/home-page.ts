import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PokedexData, SpeciesEntry, TypeEntry } from '../core/pokedex-data';
import { PokeApi } from '../core/poke-api';
import { humanize } from '../core/helpers';
import { CardType, PokemonCard } from '../shared/pokemon-card';
import { NotFound } from '../shared/not-found';

const PAGE_SIZE = 48;

interface HomeCard {
  species: SpeciesEntry;
  spriteUrl: string;
  types: CardType[];
}

interface HomeData {
  types: TypeEntry[];
  generations: { name: string; label: string }[];
  count: number;
  page: number;
  totalPages: number;
  cards: HomeCard[];
}

interface HomeFilters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

@Component({
  selector: 'app-home-page',
  imports: [PokemonCard, NotFound, RouterLink],
  template: `
    @if (view(); as home) {
      <h1 class="page-title">Pokémon</h1>

      <div class="filters">
        <div class="field">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            [value]="q() ?? ''"
            (input)="onSearch($event)"
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label for="type-filter">Type</label>
          <select id="type-filter" (change)="onTypeChange($event)">
            <option value="" [selected]="!type()">All types</option>
            @for (typeOption of home.types; track typeOption.name) {
              <option [value]="typeOption.name" [selected]="typeOption.name === type()">
                {{ typeOption.label }}
              </option>
            }
          </select>
        </div>
        <div class="field">
          <label for="generation-filter">Generation</label>
          <select id="generation-filter" (change)="onGenerationChange($event)">
            <option value="" [selected]="!generation()">All generations</option>
            @for (generationOption of home.generations; track generationOption.name) {
              <option
                [value]="generationOption.name"
                [selected]="generationOption.name === generation()"
              >
                {{ generationOption.label }}
              </option>
            }
          </select>
        </div>
      </div>

      <p class="results-count">{{ home.count }} Pokémon</p>

      @if (home.count === 0) {
        <p class="empty-results">No Pokémon found</p>
      } @else {
        <ul class="card-grid">
          @for (card of home.cards; track card.species.id) {
            <li
              app-pokemon-card
              [id]="card.species.id"
              [speciesName]="card.species.name"
              [displayName]="humanize(card.species.name)"
              [spriteUrl]="card.spriteUrl"
              [types]="card.types"
            ></li>
          }
        </ul>

        <nav class="pagination" aria-label="Pagination">
          @if (home.page > 1) {
            <a routerLink="/" [queryParams]="pageParams(home.page - 1)">Previous page</a>
          }
          <span>Page {{ home.page }} of {{ home.totalPages }}</span>
          @if (home.page < home.totalPages) {
            <a routerLink="/" [queryParams]="pageParams(home.page + 1)">Next page</a>
          }
        </nav>
      }
    } @else if (data.error()) {
      <app-not-found />
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly pokedex = inject(PokedexData);
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  readonly q = input<string | undefined>();
  readonly type = input<string | undefined>();
  readonly generation = input<string | undefined>();
  readonly page = input<string | undefined>();

  protected readonly humanize = humanize;

  private readonly requestedPage = computed(() => {
    const value = Number(this.page());
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  });

  protected readonly view = signal<HomeData | null>(null);

  protected readonly data = resource({
    params: () => ({
      q: (this.q() ?? '').trim(),
      type: this.type() ?? '',
      generation: this.generation() ?? '',
      page: this.requestedPage(),
    }),
    loader: async ({ params }) => {
      const [species, types, generations] = await Promise.all([
        this.pokedex.getAllSpecies(),
        this.pokedex.getAllTypes(),
        this.pokedex.getAllGenerations(),
      ]);

      const typeEntry = types.find((entry) => entry.name === params.type);
      const generationEntry = generations.find((entry) => entry.name === params.generation);
      const search = params.q.toLowerCase();

      const filtered = species.filter((entry) => {
        if (typeEntry && !typeEntry.pokemonSpeciesIds.has(entry.id)) return false;
        if (generationEntry && !generationEntry.speciesIds.has(entry.id)) return false;
        if (search && !humanize(entry.name).toLowerCase().includes(search)) return false;
        return true;
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const page = Math.min(Math.max(1, params.page), totalPages);
      const pageSpecies = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const records = await Promise.all(
        pageSpecies.map((entry) => this.pokedex.getPokemon(entry.id).catch(() => null)),
      );
      const typeLabels = new Map(types.map((entry) => [entry.name, entry.label]));
      const cards = pageSpecies.map((entry, index): HomeCard => {
        const record = records[index];
        const cardTypes = (record?.types ?? [])
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((slot) => ({
            name: slot.type.name,
            label: typeLabels.get(slot.type.name) ?? humanize(slot.type.name),
          }));
        return {
          species: entry,
          spriteUrl: record?.sprites.front_default ?? this.api.spriteUrl(entry.id),
          types: cardTypes,
        };
      });

      return {
        types,
        generations: generations.map((entry) => ({ name: entry.name, label: entry.label })),
        count: filtered.length,
        page,
        totalPages,
        cards,
      } satisfies HomeData;
    },
  });

  constructor() {
    this.title.setTitle('Pokédex');
    effect(() => {
      if (this.data.hasValue()) this.view.set(this.data.value());
    });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.updateFilters({ q: value, page: 1 }, true);
  }

  protected onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateFilters({ type: value, page: 1 });
  }

  protected onGenerationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateFilters({ generation: value, page: 1 });
  }

  protected pageParams(page: number): Record<string, string | number> {
    return this.buildQuery({
      q: this.q() ?? '',
      type: this.type() ?? '',
      generation: this.generation() ?? '',
      page,
    });
  }

  private updateFilters(
    changes: Partial<Pick<HomeFilters, 'q' | 'type' | 'generation' | 'page'>>,
    replace = false,
  ): void {
    const filters: HomeFilters = {
      q: this.q() ?? '',
      type: this.type() ?? '',
      generation: this.generation() ?? '',
      page: this.requestedPage(),
      ...changes,
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQuery(filters),
      replaceUrl: replace,
    });
  }

  private buildQuery(filters: HomeFilters): Record<string, string | number> {
    const query: Record<string, string | number> = {};
    if (filters.q.trim()) query['q'] = filters.q;
    if (filters.type) query['type'] = filters.type;
    if (filters.generation) query['generation'] = filters.generation;
    if (filters.page > 1) query['page'] = filters.page;
    return query;
  }
}
