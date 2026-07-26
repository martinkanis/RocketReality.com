/** Převod textu na URL slug bez diakritiky (např. „Světlý byt 2+kk" → "svetly-byt-2-kk"). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Krátký kód ze sekvenčního čísla inzerátu — sufix slugu, zaručuje unikátnost. */
export function encodeBase36(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`encodeBase36 očekává nezáporné celé číslo, dostal: ${value}`)
  }
  if (value === 0) return '0'
  let rest = value
  let out = ''
  while (rest > 0) {
    out = BASE36_ALPHABET[rest % 36] + out
    rest = Math.floor(rest / 36)
  }
  return out
}

/** Slug inzerátu: slugify(title) + base36(seq). Po publikaci se nemění. */
export function buildListingSlug(title: string, seq: number): string {
  const base = slugify(title).slice(0, 80).replace(/-+$/, '')
  return `${base}-${encodeBase36(seq)}`
}

/** Vytáhne base36 kód (seq) z konce slugu inzerátu. */
export function parseListingSlugSeq(slug: string): number | null {
  const lastDash = slug.lastIndexOf('-')
  if (lastDash === -1) return null
  const code = slug.slice(lastDash + 1)
  if (!/^[0-9a-z]+$/.test(code)) return null
  const seq = parseInt(code, 36)
  return Number.isNaN(seq) ? null : seq
}
