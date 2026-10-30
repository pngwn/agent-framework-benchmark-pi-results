import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi, SpeciesEntry, TypeRecord } from '../core/pokeapi';
import { englishName, humanize, idFromUrl, isAlternateForm, parsePage } from '../core/util';
import { PokemonCardVM, PokemonGrid } from '../shared/pokemon-grid';

const PAGE_SIZE = 48;

interface QueryState {
  q: string | null;
  type: string | null;
  generation: string | null;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonGrid],
  template: `
    <main class="page">
      <h1>Pokémon</h1>

      <div class="filters">
        <div class="field">
          <label for="search-input">Search</label>
          <input
            id="search-input"
            type="search"
            autocomplete="off"
            [value]="q()"
            (input)="onSearchInput($event)"
          />
        </div>
        <div class="field">
          <label for="type-select">Type</label>
          <select id="type-select" [value]="typeFilter()" (change)="onTypeChange($event)">
            <option value="" [selected]="typeFilter() === ''">All types</option>
            @for (typeName of typeNames(); track typeName) {
              <option [value]="typeName" [selected]="typeFilter() === typeName">{{ humanize(typeName) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="generation-select">Generation</label>
          <select id="generation-select" [value]="generationFilter()" (change)="onGenerationChange($event)">
            <option value="" [selected]="generationFilter() === ''">All generations</option>
            @for (generation of generationOptions(); track generation.name) {
              <option [value]="generation.name" [selected]="generationFilter() === generation.name">{{ generation.label }}</option>
            }
          </select>
        </div>
      </div>

      @if (loaded()) {
        <p class="result-count">{{ filteredSpecies().length }} Pokémon</p>

        @if (filteredSpecies().length > 0) {
          <ul class="pokemon-grid" app-pokemon-grid [cards]="cards()"></ul>
        } @else {
          <p class="empty-state">No Pokémon found</p>
        }

        <nav class="pagination" aria-label="Pagination">
          <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
          @if (currentPage() > 1) {
            <a [routerLink]="['/']" [queryParams]="pageQuery(currentPage() - 1)">Previous page</a>
          }
          @if (currentPage() < totalPages()) {
            <a [routerLink]="['/']" [queryParams]="pageQuery(currentPage() + 1)">Next page</a>
          }
        </nav>
      } @else {
        <p class="loading">Loading…</p>
      }
    </main>
  `,
})
export class HomePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  protected readonly humanize = humanize;

  private readonly species = signal<SpeciesEntry[]>([]);
  private readonly typeIds = signal<Set<number> | null>(null);
  private readonly generationIds = signal<Set<number> | null>(null);
  protected readonly typeNames = signal<string[]>([]);
  protected readonly generationOptions = signal<{ name: string; label: string }[]>([]);
  protected readonly loaded = signal(false);
  protected readonly cards = signal<PokemonCardVM[]>([]);

  protected readonly q = signal('');
  protected readonly typeFilter = signal('');
  protected readonly generationFilter = signal('');
  protected readonly page = signal(1);

  protected readonly filteredSpecies = computed(() => {
    const query = this.q().trim().toLowerCase();
    const type = this.typeFilter();
    const generation = this.generationFilter();
    const typeIds = this.typeIds();
    const generationIds = this.generationIds();

    return this.species().filter((entry) => {
      if (query && !humanize(entry.name).toLowerCase().includes(query)) return false;
      if (type && (!typeIds || !typeIds.has(entry.id))) return false;
      if (generation && (!generationIds || !generationIds.has(entry.id))) return false;
      return true;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSpecies().length / PAGE_SIZE)),
  );

  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  private readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredSpecies().slice(start, start + PAGE_SIZE);
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private cardRequest = 0;
  private typeRequest = 0;
  private generationRequest = 0;

  constructor() {
    this.title.setTitle('Pokédex');

    const params = this.route.snapshot.queryParamMap;
    this.q.set(params.get('q') ?? '');
    this.typeFilter.set(params.get('type') ?? '');
    this.generationFilter.set(params.get('generation') ?? '');
    this.page.set(parsePage(params.get('page')));

    void this.loadInitialData();

    this.route.queryParamMap.subscribe((queryParams) => {
      const searchBox = document.getElementById('search-input');
      const searchIsFocused = searchBox === document.activeElement;
      const query = queryParams.get('q') ?? '';
      if (!searchIsFocused && query !== this.q()) this.q.set(query);

      const type = queryParams.get('type') ?? '';
      if (type !== this.typeFilter()) this.typeFilter.set(type);

      const generation = queryParams.get('generation') ?? '';
      if (generation !== this.generationFilter()) this.generationFilter.set(generation);

      const page = parsePage(queryParams.get('page'));
      if (page !== this.page()) this.page.set(page);
    });

    effect(() => {
      void this.loadTypeFilter(this.typeFilter());
    });

    effect(() => {
      void this.loadGenerationFilter(this.generationFilter());
    });

    effect(() => {
      void this.loadCards(this.pageItems());
    });
  }

  private async loadInitialData(): Promise<void> {
    try {
      const [species, typeIndex, generationIndex] = await Promise.all([
        this.api.getSpeciesIndex(),
        this.api.getList('type'),
        this.api.getList('generation'),
      ]);

      this.species.set(species);
      this.typeNames.set(
        typeIndex
          .filter((entry) => !['stellar', 'unknown', 'shadow'].includes(entry.name))
          .map((entry) => entry.name),
      );
      const generationRecords = await Promise.all(
        generationIndex.map((entry) => this.api.getGeneration(entry.name)),
      );
      this.generationOptions.set(
        generationRecords
          .map((record) => ({
            name: record.name,
            label: englishName(record.names, record.name),
            id: record.id,
          }))
          .sort((a, b) => a.id - b.id)
          .map((record) => ({ name: record.name, label: record.label })),
      );
      this.loaded.set(true);
    } catch {
      this.species.set([]);
      this.loaded.set(true);
    }
  }

  private async loadTypeFilter(type: string): Promise<void> {
    const request = ++this.typeRequest;
    if (!type) {
      this.typeIds.set(null);
      return;
    }
    try {
      const record: TypeRecord = await this.api.getType(type);
      if (request !== this.typeRequest) return;
      const ids = new Set<number>();
      for (const entry of record.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id !== null && !isAlternateForm(id)) ids.add(id);
      }
      this.typeIds.set(ids);
    } catch {
      if (request === this.typeRequest) this.typeIds.set(new Set());
    }
  }

  private async loadGenerationFilter(generation: string): Promise<void> {
    const request = ++this.generationRequest;
    if (!generation) {
      this.generationIds.set(null);
      return;
    }
    try {
      const record = await this.api.getGeneration(generation);
      if (request !== this.generationRequest) return;
      const ids = new Set<number>();
      for (const entry of record.pokemon_species) {
        const id = idFromUrl(entry.url);
        if (id !== null && !isAlternateForm(id)) ids.add(id);
      }
      this.generationIds.set(ids);
    } catch {
      if (request === this.generationRequest) this.generationIds.set(new Set());
    }
  }

  private async loadCards(entries: SpeciesEntry[]): Promise<void> {
    const request = ++this.cardRequest;
    if (entries.length === 0) {
      this.cards.set([]);
      return;
    }

    const cards = await Promise.all(
      entries.map(async (entry): Promise<PokemonCardVM> => {
        const base: PokemonCardVM = {
          id: entry.id,
          name: entry.name,
          displayName: humanize(entry.name),
          sprite: this.api.spriteUrl(entry.id),
        };
        try {
          const pokemon = await this.api.getPokemon(entry.id);
          return {
            ...base,
            sprite: this.api.absoluteUrl(pokemon.sprites.front_default) ?? base.sprite,
            types: [...pokemon.types]
              .sort((a, b) => a.slot - b.slot)
              .map((slot) => ({ name: slot.type.name, label: humanize(slot.type.name) })),
          };
        } catch {
          return base;
        }
      }),
    );

    if (request === this.cardRequest) this.cards.set(cards);
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.q.set(value);
    this.page.set(1);

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.navigateToFilters(true);
    }, 200);
  }

  protected onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    void this.navigateToFilters(false);
  }

  protected onGenerationChange(event: Event): void {
    this.generationFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    void this.navigateToFilters(false);
  }

  private navigateToFilters(replaceUrl: boolean): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.filterQuery(),
      replaceUrl,
    });
  }

  protected pageQuery(page: number): Record<string, string | number | null> {
    return { ...this.filterQuery(), page: page > 1 ? page : null };
  }

  private filterQuery(): QueryState {
    const query = this.q().trim();
    return {
      q: query.length > 0 ? query : null,
      type: this.typeFilter() || null,
      generation: this.generationFilter() || null,
    };
  }
}
