import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MoveRecord, PokeApi } from './api';
import { DexData, SpeciesEntry } from './dex-data';
import { NotFoundView, applyNotFound } from './not-found';
import { PokemonCard } from './pokemon-card';
import { englishName, humanize, idFromUrl, latestEnglishFlavor } from './util';

export interface MoveVM {
  title: string;
  typeName: string;
  typeEn: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string;
  learners: SpeciesEntry[];
}

export const moveResolver: ResolveFn<MoveVM | null> = async (route) => {
  const api = inject(PokeApi);
  const dex = inject(DexData);
  const name = route.paramMap.get('name') ?? '';

  const move = await api.get<MoveRecord>(`move/${encodeURIComponent(name)}`).catch(() => null);
  if (!move) return null;

  const [typeNames, species] = await Promise.all([dex.typeNames(), dex.speciesList()]);
  const speciesById = new Map(species.map((s) => [s.id, s]));

  // Map Pokémon to their species and leave out alternate forms.
  const seen = new Set<number>();
  const learners: SpeciesEntry[] = [];
  for (const ref of move.learned_by_pokemon ?? []) {
    const id = idFromUrl(ref.url);
    if (id >= 10000 || seen.has(id)) continue;
    const entry = speciesById.get(id);
    if (!entry) continue;
    seen.add(id);
    learners.push(entry);
  }
  learners.sort((a, b) => a.id - b.id);

  return {
    title: englishName(move.names) ?? humanize(move.name),
    typeName: move.type?.name ?? '',
    typeEn:
      (move.type && typeNames.get(move.type.name)) ??
      (move.type ? humanize(move.type.name) : '—'),
    category: move.damage_class ? humanize(move.damage_class.name) : '—',
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect:
      move.effect_entries?.find((entry) => entry.language?.name === 'en')?.short_effect ??
      latestEnglishFlavor(move.flavor_text_entries) ??
      '—',
    learners,
  };
};

@Component({
  selector: 'app-move-page',
  imports: [RouterLink, PokemonCard, NotFoundView],
  templateUrl: './move.html',
})
export class MovePage {
  protected readonly humanize = humanize;

  protected readonly vm = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['vm'] as MoveVM | null)),
    { requireSync: true },
  );

  constructor() {
    const vm = this.vm();
    const title = inject(Title);
    if (vm) title.setTitle(`${vm.title} – Pokédex`);
    else applyNotFound(title);
  }

  protected display(value: number | null): string {
    return value === null ? '—' : String(value);
  }
}
