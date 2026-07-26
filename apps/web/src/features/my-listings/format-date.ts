const czechDateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

/** Formátuje datum v českém formátu: „26. 7. 2026". */
export function formatCzechDate(date: Date): string {
  return czechDateFormatter.format(date)
}
