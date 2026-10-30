import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiError, PokeApi } from '../../core/poke-api';
import { Ability, SpeciesListItem } from '../../core/models';
import { englishName, idFromUrl } from '../../core/format';
import { PokemonCard } from '../../shared/pokemon-card';
import { NotFoundContent } from '../../shared/not-found-content';

interface AbilityPokemon {
  species: SpeciesListItem;
  hidden: boolean;
}

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCard, NotFoundContent],
  templateUrl: './ability.html',
  styleUrl: './ability.css',
})
export class AbilityPage {
  private readonly api = inject(PokeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);

  readonly ability = signal<Ability | null>(null);
  readonly pokemon = signal<AbilityPokemon[]>([]);
  readonly notFound = signal(false);

  readonly name = computed(() => {
    const ability = this.ability();
    return ability ? englishName(ability.names, ability.name) : '';
  });

  readonly effect = computed(() => {
    const ability = this.ability();
    const english = ability?.effect_entries.find((entry) => entry.language?.name === 'en');
    return english?.short_effect || '—';
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

  private async load(name: string): Promise<void> {
    this.notFound.set(false);
    this.ability.set(null);
    try {
      const [ability, speciesById] = await Promise.all([this.api.ability(name), this.api.speciesById()]);
      this.ability.set(ability);
      this.title.setTitle(`${englishName(ability.names, ability.name)} – Pokédex`);

      const byId = new Map<number, AbilityPokemon>();
      for (const entry of ability.pokemon) {
        const id = idFromUrl(entry.pokemon.url);
        if (id === null || id > 10000) continue;
        const species = speciesById.get(id);
        if (!species) continue;
        const existing = byId.get(id);
        if (existing) existing.hidden ||= entry.is_hidden;
        else byId.set(id, { species, hidden: entry.is_hidden });
      }
      this.pokemon.set([...byId.values()].sort((a, b) => a.species.id - b.species.id));
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
