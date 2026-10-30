import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Params, Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PokeApi } from '../../api/pokeapi';
import { CardData } from '../../api/pokeapi.models';
import { HomePageData } from '../../api/page-data.models';
import { dexNumber } from '../../api/format';
import { PokemonCards } from '../../components/pokemon-cards';

const PAGE_SIZE = 48;

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCards],
  templateUrl: './home-page.html',
})
export class HomePage {
  readonly pageData = input<HomePageData | null>(null);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PokeApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly q = signal('');
  readonly typeFilter = signal('');
  readonly generationFilter = signal('');
  readonly page = signal(1);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly types = computed(() => this.pageData()?.types ?? []);
  readonly generations = computed(() => this.pageData()?.generations ?? []);

  readonly filteredSpecies = computed(() => {
    const data = this.pageData();
    if (!data) return [];
    const query = this.q().trim().toLowerCase();
    const type = this.typeFilter();
    const generation = this.generationFilter();

    const generationIds = generation
      ? new Set(data.generationSpeciesIds.get(generation) ?? [])
      : null;
    const typeIds = type ? new Set(data.typeSpeciesIds.get(type) ?? []) : null;

    return data.species.filter(
      (species) =>
        (!query || species.displayName.toLowerCase().includes(query)) &&
        (!typeIds || typeIds.has(species.id)) &&
        (!generationIds || generationIds.has(species.id)),
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSpecies().length / PAGE_SIZE)),
  );

  readonly pageNumber = computed(() => Math.min(Math.max(1, this.page()), this.totalPages()));

  readonly pageCards = computed<CardData[]>(() => {
    const data = this.pageData();
    if (!data) return [];
    const start = (this.pageNumber() - 1) * PAGE_SIZE;
    return this.filteredSpecies()
      .slice(start, start + PAGE_SIZE)
      .map((species) => ({
        id: species.id,
        speciesName: species.name,
        displayName: species.displayName,
        dex: dexNumber(species.id),
        spriteUrl: `${this.api.baseUrl}/media/sprites/pokemon/${species.id}.png`,
        types: data.typeByPokemon.get(species.id) ?? [],
      }));
  });

  constructor() {
    effect(() => {
      const params = this.queryParams();
      const query = params.get('q') ?? '';
      const type = params.get('type') ?? '';
      const generation = params.get('generation') ?? '';
      const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
      untracked(() => {
        if (query !== this.q()) this.q.set(query);
        if (type !== this.typeFilter()) this.typeFilter.set(type);
        if (generation !== this.generationFilter()) this.generationFilter.set(generation);
        if (page !== this.page()) this.page.set(page);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
  }

  onSearchInput(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.navigate(), 200);
  }

  onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.navigate();
  }

  onGenerationChange(event: Event): void {
    this.generationFilter.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.navigate();
  }

  pageParams(target: number): Params {
    const params: Params = {};
    const query = this.q().trim();
    if (query) params['q'] = query;
    if (this.typeFilter()) params['type'] = this.typeFilter();
    if (this.generationFilter()) params['generation'] = this.generationFilter();
    if (target > 1) params['page'] = target;
    return params;
  }

  private navigate(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.pageParams(this.page()),
      replaceUrl: true,
    });
  }
}
