import { AttackType, CoverageRow, TeamMember } from './models';

/** A team holds at most six species. */
export const MAX_TEAM_SIZE = 6;

/** Keeps the first occurrence of each species, in order, up to the team size. */
export function normalizeTeam(names: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
    if (unique.size >= MAX_TEAM_SIZE) break;
  }
  return [...unique];
}

/**
 * Type coverage: for every attacking type, count the team members that take more or
 * less than normal damage. Damage is the product of the multipliers for each of the
 * member's types.
 */
export function coverageRows(attackTypes: AttackType[], members: TeamMember[]): CoverageRow[] {
  return attackTypes.map((attack) => {
    let weak = 0;
    let resistant = 0;
    for (const member of members) {
      let multiplier = 1;
      for (const type of member.types) {
        if (attack.doubleDamageTo.includes(type.name)) multiplier *= 2;
        else if (attack.halfDamageTo.includes(type.name)) multiplier *= 0.5;
        else if (attack.noDamageTo.includes(type.name)) multiplier *= 0;
      }
      if (multiplier > 1) weak++;
      else if (multiplier < 1) resistant++;
    }
    return { type: { name: attack.name, label: attack.label }, weak, resistant };
  });
}
