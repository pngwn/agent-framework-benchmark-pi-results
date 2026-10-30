import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import { englishName, humanize, idFromUrl } from '../core/format';
import type { NamedRef, SpeciesRef, TypeDetail } from '../core/models';
import { NotFoundComponent } from '../shared/not-found';
import { PokemonCardComponent } from '../shared/pokemon-card';

interface RelationRow {
  term: string;
  types: NamedRef[];
}

@Component({
  selector: 'app-type-page',
  imports: [RouterLink, PokemonCardComponent, NotFoundComponent],
  templateUrl: './type-page.html',
  styleUrl: './type-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypePage {
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly type = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('name') ?? ''),
      switchMap((name) =>
        name ? this.api.optional<TypeDetail>(`/type/${name}/`) : of(null),
      ),
    ),
  );

  protected readonly species = toSignal(this.catalog.species$, { initialValue: null });

  private readonly speciesById = computed(() => {
    const map = new Map<number, SpeciesRef>();
    for (const species of this.species() ?? []) map.set(idFromUrl(species.url), species);
    return map;
  });

  protected readonly titleText = computed(() => {
    const type = this.type();
    return type ? englishName(type.names, type.name) : 'Not found';
  });

  protected readonly relations = computed<RelationRow[]>(() => {
    const type = this.type();
    if (!type) return [];
    return [
      { term: 'Super effective against', types: type.damage_relations.double_damage_to },
      { term: 'Not very effective against', types: type.damage_relations.half_damage_to },
      { term: 'No effect against', types: type.damage_relations.no_damage_to },
      { term: 'Weak to', types: type.damage_relations.double_damage_from },
      { term: 'Resists', types: type.damage_relations.half_damage_from },
      { term: 'Immune to', types: type.damage_relations.no_damage_from },
    ];
  });

  protected readonly pokemon = computed(() => {
    const type = this.type();
    if (!type) return [];
    const seen = new Set<number>();
    return type.pokemon
      .map((entry) => ({ id: idFromUrl(entry.pokemon.url), url: entry.pokemon.url }))
      .filter((entry) => {
        if (entry.id > 10000 || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .map((entry) => ({
        id: entry.id,
        name: this.speciesById().get(entry.id)?.name ?? entry.url,
      }))
      .sort((a, b) => a.id - b.id);
  });

  protected readonly moves = computed(() => {
    const type = this.type();
    if (!type) return [];
    return [...type.moves]
      .map((move) => ({ name: move.name, displayName: humanize(move.name) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  constructor() {
    effect(() => {
      const type = this.type();
      if (type === undefined) return;
      this.title.setTitle(
        type ? `${this.titleText()} – Pokédex` : 'Not found – Pokédex',
      );
    });
  }

  protected relationLabel(type: NamedRef): string {
    return humanize(type.name);
  }
}
