import { Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TeamStore } from '../../data/team-store';
import { dexNumber } from '../../shared/format';
import { PokemonVM } from '../../shared/models';
import { TypeBadge } from '../../shared/type-badge';
import NotFound from '../not-found/not-found';
import { EvolutionTree } from './evolution-tree';
import { MoveTable } from './move-table';

/** Base stats above this value fill the whole bar. */
const STAT_MAX = 255;

@Component({
  selector: 'app-pokemon-page',
  imports: [RouterLink, NgOptimizedImage, TypeBadge, NotFound, EvolutionTree, MoveTable],
  templateUrl: './pokemon-page.html',
})
export default class PokemonPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly team = inject(TeamStore);

  readonly vm = input.required<PokemonVM | null>();

  protected readonly number = computed(() => dexNumber(this.vm()?.id ?? 0));
  protected readonly onTeam = computed(() => {
    const name = this.vm()?.name;
    return name ? this.team.has(name) : false;
  });
  protected readonly teamFull = computed(() => this.team.full() && !this.onTeam());
  protected readonly height = computed(() => `${((this.vm()?.height ?? 0) / 10).toFixed(1)} m`);
  protected readonly weight = computed(() => `${((this.vm()?.weight ?? 0) / 10).toFixed(1)} kg`);
  protected readonly total = computed(() => (this.vm()?.stats ?? []).reduce((sum, s) => sum + s.value, 0));

  protected barWidth(value: number, max = STAT_MAX): string {
    return `${Math.min(100, (value / max) * 100)}%`;
  }

  protected toggleTeam(): void {
    const name = this.vm()?.name;
    if (name) this.team.toggle(name);
  }

  protected selectGame(game: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game },
      queryParamsHandling: 'merge',
      preserveFragment: true,
    });
  }
}
