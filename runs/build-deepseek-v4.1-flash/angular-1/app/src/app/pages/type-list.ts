import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PokeApi } from '../core/pokeapi';
import { humanize } from '../core/util';

interface TypeLinkVM {
  name: string;
  label: string;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

@Component({
  selector: 'app-type-list-page',
  imports: [RouterLink],
  template: `
    <main class="page">
      <h1>Types</h1>
      <ul class="type-list">
        @for (type of types(); track type.name) {
          <li>
            <a class="type-badge" [attr.data-type]="type.name" [routerLink]="['/types', type.name]">{{
              type.label
            }}</a>
          </li>
        }
      </ul>
    </main>
  `,
})
export class TypeListPage {
  private readonly api = inject(PokeApi);
  private readonly title = inject(Title);

  protected readonly types = signal<TypeLinkVM[]>([]);

  constructor() {
    this.title.setTitle('Types – Pokédex');
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const list = await this.api.getList('type');
      this.types.set(
        list
          .filter((entry) => !EXCLUDED_TYPES.has(entry.name))
          .map((entry) => ({ name: entry.name, label: humanize(entry.name) })),
      );
    } catch {
      this.types.set([]);
    }
  }
}
