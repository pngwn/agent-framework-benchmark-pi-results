import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamStore } from '../../data/team-store';
import { humanize } from '../../shared/format';
import { TeamMember, TeamVM } from '../../shared/models';
import { PokemonCard } from '../../shared/pokemon-card';
import { coverageRows, MAX_TEAM_SIZE } from '../../shared/team';

@Component({
  selector: 'app-team-page',
  imports: [RouterLink, PokemonCard],
  templateUrl: './team-page.html',
})
export default class TeamPage {
  private readonly team = inject(TeamStore);

  readonly vm = input.required<TeamVM>();

  protected readonly max = MAX_TEAM_SIZE;

  protected readonly members = computed(() => {
    const byName = new Map(this.vm().members.map((member) => [member.name, member] as const));
    return this.team
      .names()
      .map((name) => byName.get(name))
      .filter((member): member is TeamMember => member !== undefined);
  });

  protected readonly coverage = computed(() => coverageRows(this.vm().attackTypes, this.members()));

  protected readonly humanize = humanize;

  protected remove(name: string): void {
    this.team.remove(name);
  }
}
