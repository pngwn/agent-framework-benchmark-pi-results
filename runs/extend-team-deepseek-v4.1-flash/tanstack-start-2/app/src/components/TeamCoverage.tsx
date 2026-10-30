import type { CardData, TypeRef } from '../lib/types'

export interface TypeCoverageRelations {
  double: string[]
  half: string[]
  none: string[]
}

interface CoverageRow {
  label: string
  weak: number
  resistant: number
}

export function TeamCoverage({
  members,
  types,
  relations,
}: {
  members: CardData[]
  types: TypeRef[]
  relations: Record<string, TypeCoverageRelations>
}) {
  const rows: CoverageRow[] = types.map((type) => {
    const relation = relations[type.name]
    let weak = 0
    let resistant = 0
    for (const member of members) {
      let multiplier = 1
      for (const defending of member.types ?? []) {
        if (relation.double.includes(defending)) multiplier *= 2
        else if (relation.half.includes(defending)) multiplier *= 0.5
        else if (relation.none.includes(defending)) multiplier *= 0
      }
      if (multiplier > 1) weak += 1
      else if (multiplier < 1) resistant += 1
    }
    return { label: type.label, weak, resistant }
  })

  return (
    <div className="table-scroll">
      <table className="coverage-table">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Weak</th>
            <th scope="col">Resistant</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.weak}</td>
              <td>{row.resistant}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
