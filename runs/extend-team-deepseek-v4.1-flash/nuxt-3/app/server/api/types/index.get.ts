export default defineEventHandler(() =>
  withNotFound(async () => {
    const types = await allTypes();
    return types.map((t) => ({ name: t.name, label: englishName(t) }));
  }),
);
