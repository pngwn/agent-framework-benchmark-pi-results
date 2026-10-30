import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Document titles are `<h1 text> – Pokédex`. Pages whose heading comes from API data
 * resolve a view model with a `title`; a missing view model means the page is not found.
 */
@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const data = route.data;
    let heading: string | undefined;
    if (data['notFound'] || ('vm' in data && data['vm'] === null)) heading = 'Not found';
    else heading = (data['vm'] as { title?: string } | undefined)?.title ?? this.buildTitle(snapshot);
    this.title.setTitle(heading ? `${heading} – Pokédex` : 'Pokédex');
  }
}
