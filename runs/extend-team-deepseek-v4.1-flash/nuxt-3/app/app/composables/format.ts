export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const orDash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function usePageTitle(title: MaybeRefOrGetter<string | undefined>) {
  useHead({
    title: () => {
      const t = toValue(title);
      return t ? `${t} – Pokédex` : 'Pokédex';
    },
  });
}

/** Fetch page data from our server API; a missing resource becomes the Not found page. */
export async function usePageData<T>(url: () => string, key: () => string) {
  const { data, error } = await useFetch<T>(url, { key: key() });
  if (error.value || !data.value) {
    throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Not found', fatal: true });
  }
  return data as Ref<T>;
}
