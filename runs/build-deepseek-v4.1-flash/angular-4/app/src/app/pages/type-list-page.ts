import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog.service';

@Component({
  selector: 'app-type-list-page',
  imports: [RouterLink],
  templateUrl: './type-list-page.html',
  styleUrl: './type-list-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeListPage {
  private readonly catalog = inject(CatalogService);
  private readonly title = inject(Title);

  protected readonly types = toSignal(this.catalog.types$, { initialValue: null });

  constructor() {
    this.title.setTitle('Types – Pokédex');
  }
}
