import type { AttackType, CardData, CoverageRow } from './types'

function multiplier(attack: AttackType, defendingType: string): number {
  if (attack.none.includes(defendingType)) return 0
  if (attack.double.includes(defendingType)) return 2
  if (attack.half.includes(defendingType)) return 0.5
  return 1
}

// One row per attacking type, with the number of team members taking more or less than
// normal damage from it. Dual types multiply their multipliers together.
export function typeCoverage(attackTypes: AttackType[], members: CardData[]): CoverageRow[] {
  return attackTypes.map((attack) => {
    let weak = 0
    let resistant = 0
    for (const member of members) {
      const damage = (member.types ?? []).reduce((product, type) => product * multiplier(attack, type), 1)
      if (damage > 1) weak += 1
      else if (damage < 1) resistant += 1
    }
    return { name: attack.name, label: attack.label, weak, resistant }
  })
}
