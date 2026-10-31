import { Component, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Cards } from './cards';
import { CardData } from './dex.service';
import { HomeData } from './resolvers';
import { PokeApiService } from './poke-api.service';
import { routeDataSignal } from './route-data';

const PAGE_SIZE = 48;

@Component({
  selector: 'app-home',
  imports: [RouterLink, Cards],
  template: `
    <h1>Pokémon</h1>

    <form class="filters" (submit)="$event.preventDefault()">
      <div class="field">
        <label for="search">Search</label>
        <input
          id="search"
          type="search"
          autocomplete="off"
          [value]="q()"
          (input)="onSearch($event)"
        />
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" (change)="onType($event)">
          <option value="" [selected]="type() === ''">All types</option>
          @for (option of data().typeOptions; track option.name) {
            <option [value]="option.name" [selected]="type() === option.name">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
      <div class="field">
        <label for="generation">Generation</label>
        <select id="generation" (change)="onGeneration($event)">
          <option value="" [selected]="generation() === ''">All generations</option>
          @for (option of data().generationOptions; track option.name) {
            <option [value]="option.name" [selected]="generation() === option.name">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
    </form>

    <p class="count">{{ filtered().length }} Pokémon</p>

    @if (filtered().length === 0) {
      <p>No Pokémon found</p>
    } @else {
      <app-cards [cards]="pageCards()" />
      <p class="pagination">
        <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
        @if (currentPage() > 1) {
          <a [routerLink]="[]" [queryParams]="pageParams(currentPage() - 1)">Previous page</a>
        }
        @if (currentPage() < totalPages()) {
          <a [routerLink]="[]" [queryParams]="pageParams(currentPage() + 1)">Next page</a>
        }
      </p>
    }
  `,
})
export class Home {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PokeApiService);

  readonly data = routeDataSignal<HomeData>('home');
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly q = computed(() => this.query().get('q') ?? '');
  readonly type = computed(() => this.query().get('type') ?? '');
  readonly generation = computed(() => this.query().get('generation') ?? '');
  readonly page = computed(() => {
    const n = parseInt(this.query().get('page') ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  readonly filtered = computed(() => {
    const q = this.q().toLowerCase();
    const type = this.type();
    const generation = this.generation();
    return this.data().entries.filter(
      (entry) =>
        (!q || entry.label.toLowerCase().includes(q)) &&
        (!type || entry.types.some((t) => t.name === type)) &&
        (!generation || entry.generation === generation),
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  readonly pageCards = computed<CardData[]>(() =>
    this.filtered()
      .slice((this.currentPage() - 1) * PAGE_SIZE, this.currentPage() * PAGE_SIZE)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        label: entry.label,
        sprite: this.api.spriteUrl(entry.id),
        types: entry.types,
      })),
  );

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(Title).setTitle('Pokédex');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.updateFilters({ q: value }, true), 250);
  }

  onType(event: Event): void {
    this.updateFilters({ type: (event.target as HTMLSelectElement).value });
  }

  onGeneration(event: Event): void {
    this.updateFilters({ generation: (event.target as HTMLSelectElement).value });
  }

  pageParams(page: number): Record<string, string | number> {
    return this.params({ page });
  }

  private updateFilters(
    patch: { q?: string; type?: string; generation?: string },
    replaceUrl = false,
  ): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.params({ ...patch, page: 1 }),
      replaceUrl,
    });
  }

  /** Query params with empty/default values omitted. */
  private params(patch: { q?: string; type?: string; generation?: string; page?: number }) {
    const q = patch.q ?? this.q();
    const type = patch.type ?? this.type();
    const generation = patch.generation ?? this.generation();
    const page = patch.page ?? this.page();
    const params: Record<string, string | number> = {};
    if (q) params['q'] = q;
    if (type) params['type'] = type;
    if (generation) params['generation'] = generation;
    if (page > 1) params['page'] = page;
    return params;
  }
}
