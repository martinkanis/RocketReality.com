import { Badge } from '@/components/ui/badge'

interface RewardHistoryRow {
  id: string
  iban: string
  amountCzk: number
  status: string
  listingTitle: string
  note: string | null
  paidAt: string | null
}

export function RewardHistoryTable({ rows }: { rows: RewardHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Zatím žádná historie.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Inzerát</th>
            <th className="px-4 py-3">IBAN</th>
            <th className="px-4 py-3">Částka</th>
            <th className="px-4 py-3">Stav</th>
            <th className="px-4 py-3">Vyplaceno</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="max-w-72 truncate px-4 py-3">{row.listingTitle}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.iban}</td>
              <td className="px-4 py-3">{row.amountCzk} Kč</td>
              <td className="px-4 py-3">
                {row.status === 'paid' ? (
                  <Badge variant="success">Vyplaceno</Badge>
                ) : (
                  <Badge variant="destructive">Zamítnuto</Badge>
                )}
              </td>
              <td className="px-4 py-3">{row.paidAt ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
