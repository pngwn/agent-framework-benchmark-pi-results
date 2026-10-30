/** Version group name -> its `order`. */
export async function versionGroupOrder(): Promise<Map<string, number>> {
  const list = await apiList('version-group');
  const groups = await Promise.all(list.map((g) => api(g.url)));
  return new Map(groups.map((g) => [g.name, g.order]));
}
