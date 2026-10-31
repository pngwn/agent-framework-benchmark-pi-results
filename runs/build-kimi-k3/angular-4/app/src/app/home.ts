import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HomeData } from './home.resolver';
import { CardEntry } from './pokedex-data';
import { PokemonCards } from './pokemon-cards';
import { humanize } from './util';

const PAGE_SIZE = 48;

/** `/` — the browsable, filterable, paginated list of all Pokémon species. */
@Component({
  imports: [RouterLink, PokemonCards],
  template: `
    <h1>Pokémon</h1>

    <form class="filters" (submit)="$event.preventDefault()">
      <div class="filter-field filter-search">
        <label for="search">Search</label>
        <input
          id="search"
          type="search"
          autocomplete="off"
          [value]="searchText()"
          (input)="onSearch($event)"
        />
      </div>
      <div class="filter-field">
        <label for="type">Type</label>
        <select id="type" (change)="onTypeChange($event)">
          <option value="">All types</option>
          @for (type of data().types; track type.name) {
            <option [value]="type.name" [selected]="type.name === typeFilter()">
              {{ type.english }}
            </option>
          }
        </select>
      </div>
      <div class="filter-field">
        <label for="generation">Generation</label>
        <select id="generation" (change)="onGenerationChange($event)">
          <option value="">All generations</option>
          @for (generation of data().generations; track generation.name) {
            <option [value]="generation.name" [selected]="generation.name === generationFilter()">
              {{ generation.english }}
            </option>
          }
        </select>
      </div>
    </form>

    @if (filtered().length) {
      <p class="result-count">{{ filtered().length }} Pokémon</p>
      <app-pokemon-cards [entries]="pageEntries()" />
      <nav class="pagination" aria-label="Pagination">
        <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
        @if (currentPage() > 1) {
          <a
            [routerLink]="[]"
            [queryParams]="{ page: currentPage() > 2 ? currentPage() - 1 : null }"
            queryParamsHandling="merge"
            >Previous page</a
          >
        }
        @if (currentPage() < totalPages()) {
          <a [routerLink]="[]" [queryParams]="{ page: currentPage() + 1 }" queryParamsHandling="merge"
            >Next page</a
          >
        }
      </nav>
    } @else {
      <p class="result-count">No Pokémon found</p>
    }
  `,
})
export class Home {
  readonly data = input.required<HomeData>();
  readonly q = input<string>();
  readonly type = input<string>();
  readonly generation = input<string>();
  readonly page = input<string>();

  private readonly router = inject(Router);

  protected readonly searchText = signal('');
  private lastRequestedSearch = '';

  constructor() {
    inject(Title).setTitle('Pokédex');
    // Keep the search box in sync when the URL changes from outside
    // (initial load, back/forward navigation).
    effect(() => {
      const fromUrl = this.q() ?? '';
      if (fromUrl !== this.lastRequestedSearch && fromUrl !== this.searchText()) {
        this.searchText.set(fromUrl);
      }
    });
  }

  protected readonly typeFilter = computed(() => this.type() ?? '');
  protected readonly generationFilter = computed(() => this.generation() ?? '');

  protected readonly filtered = computed(() => {
    const { species, pokemonTypes, generationSpecies } = this.data();
    const q = (this.q() ?? '').trim().toLowerCase();
    const type = this.type();
    const generation = this.generation();
    return species.filter((s) => {
      if (q && !humanize(s.name).toLowerCase().includes(q)) return false;
      if (type) {
        const types = pokemonTypes.get(s.id);
        if (!types?.some((t) => t.name === type)) return false;
      }
      if (generation) {
        const members = generationSpecies.get(generation);
        if (!members?.has(s.name)) return false;
      }
      return true;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  protected readonly currentPage = computed(() => {
    const raw = Number.parseInt(this.page() ?? '', 10);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.min(raw, this.totalPages());
  });

  protected readonly pageEntries = computed<CardEntry[]>(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered()
      .slice(start, start + PAGE_SIZE)
      .map((s) => ({
        id: s.id,
        name: s.name,
        types: this.data().pokemonTypes.get(s.id) ?? [],
      }));
  });

  protected onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.lastRequestedSearch = value;
    this.updateFilters({ q: value || null });
  }

  protected onTypeChange(event: Event) {
    this.updateFilters({ type: (event.target as HTMLSelectElement).value || null });
  }

  protected onGenerationChange(event: Event) {
    this.updateFilters({ generation: (event.target as HTMLSelectElement).value || null });
  }

  private updateFilters(params: Record<string, string | null>) {
    void this.router.navigate([], {
      queryParams: { page: null, ...params },
      queryParamsHandling: 'merge',
    });
  }
}
