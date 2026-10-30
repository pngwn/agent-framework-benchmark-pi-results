import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi, ApiError } from '../../core/poke-api';
import { Move, SpeciesListItem } from '../../core/models';
import { englishName, humanize, idFromUrl, latestEnglishFlavor } from '../../core/format';
import { PokemonCard } from '../../shared/pokemon-card';
import { NotFoundContent } from '../../shared/not-found-content';

interface LearnedByEntry {
  species: SpeciesListItem;
}

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, PokemonCard, NotFoundContent],
  templateUrl: './move.html',
  styleUrl: './move.css',
})
export class MovePage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly move = signal<Move | null>(null);
  readonly notFound = signal(false);
  readonly learnedBy = signal<LearnedByEntry[]>([]);
  private typeLabels = new Map<string, string>();

  readonly name = computed(() => {
    const move = this.move();
    return move ? englishName(move.names, move.name) : '';
  });

  readonly effect = computed(() => {
    const move = this.move();
    if (!move) return '';
    const english = move.effect_entries.find((entry) => entry.language?.name === 'en');
    return english?.short_effect || latestEnglishFlavor(move.flavor_text_entries) || '—';
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('name');
      if (!name) {
        this.markNotFound();
        return;
      }
      this.load(name);
    });
  }

  typeLabel(name: string): string {
    return this.typeLabels.get(name) ?? humanize(name);
  }

  powerText(value: number | null): string {
    return value === null || value === undefined ? '—' : String(value);
  }

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.move.set(null);
    try {
      const [move, speciesById, typeInfo] = await Promise.all([
        this.api.move(name),
        this.api.speciesById(),
        this.api.typeInfo(),
      ]);
      this.typeLabels = new Map(typeInfo.map((type) => [type.name, type.label]));
      this.move.set(move);
      this.title.setTitle(`${englishName(move.names, move.name)} – Pokédex`);

      const seen = new Set<number>();
      const entries: LearnedByEntry[] = [];
      for (const ref of move.learned_by_pokemon) {
        const id = idFromUrl(ref.url);
        if (id === null || id > 10000 || seen.has(id)) continue;
        const species = speciesById.get(id);
        if (!species) continue;
        seen.add(id);
        entries.push({ species });
      }
      entries.sort((a, b) => a.species.id - b.species.id);
      this.learnedBy.set(entries);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) this.markNotFound();
      else throw error;
    }
  }

  private markNotFound(): void {
    this.notFound.set(true);
    this.title.setTitle('Not found – Pokédex');
  }
}
