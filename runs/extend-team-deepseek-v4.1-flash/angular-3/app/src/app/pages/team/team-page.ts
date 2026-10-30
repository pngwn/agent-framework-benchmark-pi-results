import { PLATFORM_ID, Component, effect, inject, input, linkedSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageData } from '../../data/page-data';
import { TeamStore } from '../../data/team-store';
import { humanize } from '../../shared/format';
import { TeamVM } from '../../shared/models';
import { PokemonCard } from '../../shared/pokemon-card';

const EMPTY_TEAM: TeamVM = { members: [], coverage: [] };

@Component({
  selector: 'app-team-page',
  imports: [RouterLink, PokemonCard],
  template: `
    <h1 class="page-title">Team</h1>
    <p class="count">{{ team.size() }} of 6</p>

    @if (!team.size()) {
      <div class="panel team-empty">
        <p>Your team is empty</p>
        <p><a routerLink="/">Browse Pokémon</a></p>
      </div>
    } @else {
      <ul class="card-grid team-list">
        @for (member of vm().members; track member.id) {
          <li>
            <app-pokemon-card [id]="member.id" [name]="member.name" [types]="member.types" />
            <button type="button" class="button team-list__remove" (click)="remove(member.name)">
              Remove {{ name(member.name) }}
            </button>
          </li>
        }
      </ul>

      @if (vm().coverage.length) {
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
                @for (row of vm().coverage; track row.type.name) {
                  <tr>
                    <th scope="row">{{ row.type.label }}</th>
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly team = inject(TeamStore);
  protected readonly initialVm = input.required<TeamVM>({ alias: 'vm' });
  protected readonly vm = linkedSignal(() => this.initialVm());
  protected readonly name = humanize;

  private loadId = 0;

  constructor() {
    if (!this.isBrowser) return;
    effect(() => {
      const names = this.team.names();
      if (!this.matches(names, this.vm())) void this.load(names);
    });
  }

  protected remove(name: string): void {
    this.team.remove(name);
  }

  private matches(names: string[], vm: TeamVM): boolean {
    return names.length === vm.members.length && names.every((name, i) => vm.members[i]?.name === name);
  }

  private async load(names: string[]): Promise<void> {
    const id = ++this.loadId;
    if (!names.length) {
      this.vm.set(EMPTY_TEAM);
      return;
    }
    const query = names.map((name) => `names=${encodeURIComponent(name)}`).join('&');
    const data = await this.pageData.load<TeamVM>(`/team?${query}`);
    if (id === this.loadId) this.vm.set(data ?? EMPTY_TEAM);
  }
}
