import { inject, Signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** A signal holding one resolved route-data value, updated on every navigation. */
export function routeDataSignal<T>(key: string): Signal<T> {
  const route = inject(ActivatedRoute);
  return toSignal(route.data.pipe(map((data) => data[key] as T)), {
    initialValue: route.snapshot.data[key] as T,
  });
}
