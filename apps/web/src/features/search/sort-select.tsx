'use client'

import { useQueryStates } from 'nuqs'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  SORT_OPTIONS,
  searchFilterParsers,
  searchFilterUrlKeys,
  type SortOption,
} from './query-params'

const SORT_LABELS: Record<SortOption, string> = {
  nejnovejsi: 'Nejnovější',
  nejlevnejsi: 'Nejlevnější',
  nejdrazsi: 'Nejdražší',
}

/** Řazení výsledků — změna se propíše do URL a vyvolá SSR refetch. */
export function SortSelect() {
  const [values, setValues] = useQueryStates(searchFilterParsers, {
    urlKeys: searchFilterUrlKeys,
    shallow: false,
    history: 'push',
  })

  return (
    <Select
      value={values.razeni}
      onValueChange={(selected) => {
        const razeni = SORT_OPTIONS.find((option) => option === selected) ?? 'nejnovejsi'
        void setValues({ razeni, strana: null })
      }}
    >
      <SelectTrigger className="w-40" aria-label="Řazení výsledků">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {SORT_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
