import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageData } from '../../data/page-data';
import { TEAM_SIZE, TeamStore } from '../../data/team-store';
import { humanize } from '../../shared/format';
import { TeamVM } from '../../shared/models';
import { PokemonCard } from '../../shared/pokemon-card';

@Component({
  selector: 'app-team-page',
  imports: [RouterLink, PokemonCard],
  template: `
    <h1 class="page-title">Team</h1>
    @if (team.ready()) {
      <p class="count">{{ count() }} of {{ size }}</p>
      @if (!count()) {
        <div class="panel team-empty">
          <p>Your team is empty</p>
          <p><a routerLink="/">Browse Pokémon</a></p>
        </div>
      } @else if (vm(); as vm) {
        <ul class="card-grid team-grid">
          @for (member of vm.members; track member.name) {
            <li class="team-member">
              <app-pokemon-card [id]="member.id" [name]="member.name" [types]="member.types" />
              <button type="button" class="button team-member__remove" (click)="remove(member.name)">
                Remove {{ label(member.name) }}
              </button>
            </li>
          }
        </ul>
        <section class="panel" aria-labelledby="coverage-heading">
          <h2 id="coverage-heading">Type coverage</h2>
          <div class="table-scroll">
            <table class="data-table coverage-table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Weak</th>
                  <th scope="col">Resistant</th>
                </tr>
              </thead>
              <tbody>
                @for (row of vm.coverage; track row.name) {
                  <tr>
                    <th scope="row">{{ row.label }}</th>
                    <td>{{ row.weak }}</td>
                    <td>{{ row.resistant }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  `,
})
export default class TeamPage {
  private readonly pageData = inject(PageData);
  protected readonly team = inject(TeamStore);

  protected readonly size = TEAM_SIZE;
  protected readonly count = computed(() => this.team.names().length);
  protected readonly vm = signal<TeamVM | null>(null);

  /** Identifies the latest request, so a slow response can't overwrite a newer one. */
  private requestId = 0;

  constructor() {
    effect(() => {
      if (!this.team.ready()) return;
      const names = this.team.names();
      const requestId = ++this.requestId;
      if (!names.length) {
        this.vm.set(null);
        return;
      }
      const path = `/team?names=${encodeURIComponent(names.join(','))}`;
      void this.pageData.load<TeamVM>(path).then((vm) => {
        if (requestId === this.requestId) this.vm.set(vm);
      });
    });
  }

  protected label(name: string): string {
    return humanize(name);
  }

  protected remove(name: string): void {
    this.team.remove(name);
  }
}
