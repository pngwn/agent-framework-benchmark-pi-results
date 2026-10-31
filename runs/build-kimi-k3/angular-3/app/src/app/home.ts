import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DexData, SpeciesEntry } from './dex-data';
import { CardType, PokemonCard } from './pokemon-card';
import { englishName, humanize, idFromUrl } from './util';

export interface HomeData {
  species: SpeciesEntry[];
  /** The 18 types, in API order. */
  types: CardType[];
  /** The 9 generations, in API order. */
  generations: { name: string; en: string }[];
  /** Species id -> the types of its default Pokémon, in slot order. */
  typesBySpeciesId: Record<number, CardType[]>;
  /** Species id -> the generation it was introduced in. */
  generationBySpeciesId: Record<number, string>;
}

export const homeResolver: ResolveFn<HomeData> = async () => {
  const dex = inject(DexData);
  const [species, types, generations] = await Promise.all([
    dex.speciesList(),
    dex.mainTypes(),
    dex.generations(),
  ]);

  const typesBySpeciesId: Record<number, CardType[]> = {};
  for (const type of types) {
    const en = englishName(type.names) ?? humanize(type.name);
    for (const entry of type.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id >= 10000) continue; // alternate forms are out of scope
      const slots = (typesBySpeciesId[id] ??= []);
      slots[entry.slot - 1] = { name: type.name, en };
    }
  }
  for (const key of Object.keys(typesBySpeciesId)) {
    typesBySpeciesId[Number(key)] = typesBySpeciesId[Number(key)].filter(Boolean);
  }

  const generationBySpeciesId: Record<number, string> = {};
  for (const generation of generations) {
    for (const ref of generation.pokemon_species) {
      generationBySpeciesId[idFromUrl(ref.url)] = generation.name;
    }
  }

  return {
    species,
    types: types.map((type) => ({
      name: type.name,
      en: englishName(type.names) ?? humanize(type.name),
    })),
    generations: generations.map((generation) => ({
      name: generation.name,
      en: englishName(generation.names) ?? humanize(generation.name),
    })),
    typesBySpeciesId,
    generationBySpeciesId,
  };
};

const PAGE_SIZE = 48;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, PokemonCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly humanize = humanize;

  protected readonly data = toSignal(this.route.data.pipe(map((d) => d['vm'] as HomeData)), {
    requireSync: true,
  });

  protected readonly filters = toSignal(
    this.route.queryParamMap.pipe(
      map(
        (params): Filters => ({
          q: params.get('q') ?? '',
          type: params.get('type') ?? '',
          generation: params.get('generation') ?? '',
          page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
        }),
      ),
    ),
    { requireSync: true },
  );

  protected readonly filtered = computed(() => {
    const data = this.data();
    const { q, type, generation } = this.filters();
    const needle = q.trim().toLowerCase();
    return data.species.filter((species) => {
      if (needle && !humanize(species.name).toLowerCase().includes(needle)) return false;
      if (type && !(data.typesBySpeciesId[species.id] ?? []).some((t) => t.name === type))
        return false;
      if (generation && data.generationBySpeciesId[species.id] !== generation) return false;
      return true;
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );
  protected readonly page = computed(() => Math.min(this.filters().page, this.totalPages()));
  protected readonly pageItems = computed(() =>
    this.filtered().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE),
  );

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly typeSelect = viewChild<ElementRef<HTMLSelectElement>>('typeSelect');
  private readonly generationSelect = viewChild<ElementRef<HTMLSelectElement>>('generationSelect');
  /** Initial search text, rendered into the input. Later updates go through the DOM. */
  protected readonly initialQuery = this.route.snapshot.queryParamMap.get('q') ?? '';

  constructor() {
    inject(Title).setTitle('Pokédex');
    // Keep the search box in sync when the URL changes without typing
    // (e.g. browser back/forward). While typing, the input is already correct.
    this.route.queryParamMap.subscribe((params) => {
      const input = this.searchInput()?.nativeElement;
      const q = params.get('q') ?? '';
      if (input && input.value !== q) input.value = q;
      const typeSelect = this.typeSelect()?.nativeElement;
      const type = params.get('type') ?? '';
      if (typeSelect && typeSelect.value !== type) typeSelect.value = type;
      const generationSelect = this.generationSelect()?.nativeElement;
      const generation = params.get('generation') ?? '';
      if (generationSelect && generationSelect.value !== generation)
        generationSelect.value = generation;
    });
  }

  protected cardTypes(id: number): CardType[] {
    return this.data().typesBySpeciesId[id] ?? [];
  }

  protected onSearch(event: Event): void {
    this.updateFilters({ q: (event.target as HTMLInputElement).value });
  }

  protected onType(event: Event): void {
    this.updateFilters({ type: (event.target as HTMLSelectElement).value });
  }

  protected onGeneration(event: Event): void {
    this.updateFilters({ generation: (event.target as HTMLSelectElement).value });
  }

  /** Changing a filter updates the URL and goes back to page 1. */
  private updateFilters(patch: Partial<Pick<Filters, 'q' | 'type' | 'generation'>>): void {
    const merged = { ...this.filters(), ...patch };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: merged.q || null,
        type: merged.type || null,
        generation: merged.generation || null,
        page: null,
      },
    });
  }

  protected pageQuery(page: number): Record<string, string | number | null> {
    const { q, type, generation } = this.filters();
    return {
      q: q || null,
      type: type || null,
      generation: generation || null,
      page: page > 1 ? page : null,
    };
  }
}
