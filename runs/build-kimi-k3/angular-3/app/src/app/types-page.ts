import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ResolveFn, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DexData } from './dex-data';
import { englishName, humanize } from './util';

export interface TypesVM {
  types: { name: string; en: string }[];
}

export const typesResolver: ResolveFn<TypesVM> = async () => {
  const dex = inject(DexData);
  const types = await dex.mainTypes();
  return {
    types: types.map((type) => ({
      name: type.name,
      en: englishName(type.names) ?? humanize(type.name),
    })),
  };
};

@Component({
  selector: 'app-types-page',
  imports: [RouterLink],
  templateUrl: './types-page.html',
  styleUrl: './types-page.css',
})
export class TypesPage {
  protected readonly vm = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['vm'] as TypesVM)),
    { requireSync: true },
  );

  constructor() {
    inject(Title).setTitle('Types – Pokédex');
  }
}
