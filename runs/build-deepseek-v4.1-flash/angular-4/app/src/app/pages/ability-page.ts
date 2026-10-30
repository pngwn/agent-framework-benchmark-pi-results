import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import { englishName, englishShortEffect, idFromUrl } from '../core/format';
import type { Ability, SpeciesRef } from '../core/models';
import { NotFoundComponent } from '../shared/not-found';
import { PokemonCardComponent } from '../shared/pokemon-card';

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCardComponent, NotFoundComponent],
  templateUrl: './ability-page.html',
  styleUrl: './ability-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbilityPage {
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly ability = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('name') ?? ''),
      switchMap((name) =>
        name ? this.api.optional<Ability>(`/ability/${name}/`) : of(null),
      ),
    ),
  );

  protected readonly species = toSignal(this.catalog.species$, { initialValue: null });

  private readonly speciesById = computed(() => {
    const map = new Map<number, SpeciesRef>();
    for (const entry of this.species() ?? []) map.set(idFromUrl(entry.url), entry);
    return map;
  });

  protected readonly displayName = computed(() => {
    const ability = this.ability();
    return ability ? englishName(ability.names, ability.name) : 'Not found';
  });

  protected readonly effectText = computed(() => {
    const ability = this.ability();
    return ability ? englishShortEffect(ability.effect_entries) ?? '—' : '—';
  });

  protected readonly pokemon = computed(() => {
    const ability = this.ability();
    if (!ability) return [];
    const seen = new Set<number>();
    return ability.pokemon
      .map((entry) => ({
        id: idFromUrl(entry.pokemon.url),
        hidden: entry.is_hidden,
      }))
      .filter((entry) => {
        if (entry.id > 10000 || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .map((entry) => ({
        ...entry,
        name: this.speciesById().get(entry.id)?.name ?? '',
      }))
      .filter((entry) => entry.name)
      .sort((a, b) => a.id - b.id);
  });

  constructor() {
    effect(() => {
      const ability = this.ability();
      if (ability === undefined) return;
      this.title.setTitle(
        ability ? `${this.displayName()} – Pokédex` : 'Not found – Pokédex',
      );
    });
  }
}
