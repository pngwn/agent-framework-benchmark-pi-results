import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, type Params } from '@angular/router';
import { map } from 'rxjs';
import { CatalogService } from '../core/catalog.service';
import { humanize, idFromUrl } from '../core/format';
import { PokemonCardComponent, type CardType } from '../shared/pokemon-card';

const PAGE_SIZE = 48;

interface HomeQuery {
  search: string;
  type: string;
  generation: string;
  page: number;
}

interface CardView {
  id: number;
  name: string;
  types: { name: string; displayName: string; slot: number }[];
}

function parseQuery(params: Map<string, string> | null): HomeQuery {
  const page = Number.parseInt(params?.get('page') ?? '1', 10);
  return {
    search: params?.get('q') ?? '',
    type: params?.get('type') ?? '',
    generation: params?.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, PokemonCardComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly catalogService = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  protected readonly catalog = toSignal(this.catalogService.catalog$, {
    initialValue: null,
  });
  protected readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => parseQuery(params as unknown as Map<string, string>)),
    ),
    { initialValue: { search: '', type: '', generation: '', page: 1 } },
  );

  protected readonly filtered = computed(() => {
    const catalog = this.catalog();
    const query = this.query();
    if (!catalog) return [] as CardView[];

    const term = query.search.trim().toLowerCase();
    const typeExists = !query.type || catalog.typeByName.has(query.type);
    const generationExists =
      !query.generation ||
      catalog.generationsInfo.some((generation) => generation.name === query.generation);

    if (!typeExists || !generationExists) return [] as CardView[];

    return catalog.species
      .map((species) => {
        const id = idFromUrl(species.url);
        return {
          id,
          name: species.name,
          types: catalog.typeByPokemonId.get(id) ?? [],
        };
      })
      .filter((card) => {
        if (term && !humanize(card.name).toLowerCase().includes(term)) return false;
        if (
          query.type &&
          !card.types.some((type) => type.name === query.type)
        ) {
          return false;
        }
        if (
          query.generation &&
          catalog.generationBySpeciesId.get(card.id) !== query.generation
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.id - b.id);
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  protected readonly currentPage = computed(() =>
    Math.min(Math.max(this.query().page, 1), this.totalPages()),
  );

  protected readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly hasResults = computed(() => this.filtered().length > 0);

  constructor() {
    this.title.setTitle('Pokédex');
  }

  protected typeBadges(types: { name: string; displayName: string; slot: number }[]): CardType[] {
    return types.map((type) => ({ name: type.name, displayName: type.displayName }));
  }

  protected pageLink(page: number): Params {
    const query = this.query();
    return {
      q: query.search || null,
      type: query.type || null,
      generation: query.generation || null,
      page: page > 1 ? page : null,
    };
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.navigateWithFilters({ q: value || null });
  }

  protected onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.navigateWithFilters({ type: value || null });
  }

  protected onGenerationChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.navigateWithFilters({ generation: value || null });
  }

  private navigateWithFilters(change: Params): void {
    const query = this.query();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: query.search || null,
        type: query.type || null,
        generation: query.generation || null,
        page: null,
        ...change,
      },
      replaceUrl: true,
    });
  }
}
