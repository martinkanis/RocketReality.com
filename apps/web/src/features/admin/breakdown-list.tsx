import type { BreakdownRow } from './stats'

interface BreakdownListProps {
  rows: BreakdownRow[]
}

/** Horizontální rozpad počtů — jeden odstín, šířka pruhu = podíl na maximu. */
export function BreakdownList({ rows }: BreakdownListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Zatím žádná data.</p>
  }
  const maxCount = Math.max(...rows.map((row) => row.count))
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
            <span>{row.label}</span>
            <span className="font-medium text-heading">{row.count}</span>
          </div>
          <div className="h-2 rounded-full bg-brand-50">
            <div
              className="h-2 rounded-full bg-brand-500"
              style={{ width: `${Math.max((row.count / maxCount) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
