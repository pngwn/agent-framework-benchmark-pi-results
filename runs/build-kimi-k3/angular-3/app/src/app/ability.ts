import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn } from '@angular/router';
import { map } from 'rxjs';
import { AbilityRecord, PokeApi } from './api';
import { DexData } from './dex-data';
import { NotFoundView, applyNotFound } from './not-found';
import { PokemonCard } from './pokemon-card';
import { englishName, humanize, idFromUrl } from './util';

export interface AbilityLearner {
  id: number;
  name: string;
  hidden: boolean;
}

export interface AbilityVM {
  title: string;
  effect: string;
  learners: AbilityLearner[];
}

export const abilityResolver: ResolveFn<AbilityVM | null> = async (route) => {
  const api = inject(PokeApi);
  const dex = inject(DexData);
  const name = route.paramMap.get('name') ?? '';

  const ability = await api
    .get<AbilityRecord>(`ability/${encodeURIComponent(name)}`)
    .catch(() => null);
  if (!ability) return null;

  const species = await dex.speciesList();
  const speciesById = new Map(species.map((s) => [s.id, s]));

  // Map Pokémon to their species and leave out alternate forms.
  const byId = new Map<number, AbilityLearner>();
  for (const entry of ability.pokemon ?? []) {
    const id = idFromUrl(entry.pokemon.url);
    if (id >= 10000) continue;
    const speciesEntry = speciesById.get(id);
    if (!speciesEntry) continue;
    const existing = byId.get(id);
    if (existing) existing.hidden = existing.hidden || entry.is_hidden;
    else byId.set(id, { id, name: speciesEntry.name, hidden: entry.is_hidden });
  }
  const learners = [...byId.values()].sort((a, b) => a.id - b.id);

  return {
    title: englishName(ability.names) ?? humanize(ability.name),
    effect:
      ability.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect ?? '—',
    learners,
  };
};

@Component({
  selector: 'app-ability-page',
  imports: [PokemonCard, NotFoundView],
  templateUrl: './ability.html',
})
export class AbilityPage {
  protected readonly humanize = humanize;

  protected readonly vm = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['vm'] as AbilityVM | null)),
    { requireSync: true },
  );

  constructor() {
    const vm = this.vm();
    const title = inject(Title);
    if (vm) title.setTitle(`${vm.title} – Pokédex`);
    else applyNotFound(title);
  }
}
