import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import {
  displayValue,
  englishName,
  englishShortEffect,
  humanize,
  idFromUrl,
  latestEnglishFlavor,
} from '../core/format';
import type { Move, SpeciesRef } from '../core/models';
import { NotFoundComponent } from '../shared/not-found';
import { PokemonCardComponent } from '../shared/pokemon-card';

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, PokemonCardComponent, NotFoundComponent],
  templateUrl: './move-page.html',
  styleUrl: './move-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovePage {
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  protected readonly move = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('name') ?? ''),
      switchMap((name) => (name ? this.api.optional<Move>(`/move/${name}/`) : of(null))),
    ),
  );

  protected readonly species = toSignal(this.catalog.species$, { initialValue: null });

  private readonly speciesById = computed(() => {
    const map = new Map<number, SpeciesRef>();
    for (const entry of this.species() ?? []) map.set(idFromUrl(entry.url), entry);
    return map;
  });

  protected readonly displayName = computed(() => {
    const move = this.move();
    return move ? englishName(move.names, move.name) : 'Not found';
  });

  protected readonly effectText = computed(() => {
    const move = this.move();
    if (!move) return '—';
    return (
      englishShortEffect(move.effect_entries) ??
      latestEnglishFlavor(move.flavor_text_entries) ??
      '—'
    );
  });

  protected readonly learnedBy = computed(() => {
    const move = this.move();
    if (!move) return [];
    const seen = new Set<number>();
    return move.learned_by_pokemon
      .map((entry) => idFromUrl(entry.url))
      .filter((id) => {
        if (id > 10000 || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => ({
        id,
        name: this.speciesById().get(id)?.name ?? '',
      }))
      .filter((entry) => entry.name)
      .sort((a, b) => a.id - b.id);
  });

  constructor() {
    effect(() => {
      const move = this.move();
      if (move === undefined) return;
      this.title.setTitle(
        move ? `${this.displayName()} – Pokédex` : 'Not found – Pokédex',
      );
    });
  }

  protected formatStat(value: number | null): string {
    return displayValue(value);
  }

  protected categoryLabel(move: Move): string {
    return humanize(move.damage_class.name);
  }

  protected typeLabel(move: Move): string {
    return humanize(move.type.name);
  }
}
