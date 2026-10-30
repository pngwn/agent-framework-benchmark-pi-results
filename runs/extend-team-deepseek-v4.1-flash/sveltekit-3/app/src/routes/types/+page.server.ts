import { getTypeList } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ types: await getTypeList() });
