/**
 * Adresa fotky. Míří na vlastní routu, která objekt načte z úložiště
 * s přihlašovacími údaji — Garage neumí anonymní přístup, takže přímý
 * odkaz do bucketu by v prohlížeči skončil chybou.
 */
export function mediaUrl(storageKey: string): string {
  const path = storageKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/api/media/${path}`
}

interface MediaVariants {
  thumb?: string
  card?: string
  detail?: string
}

/** URL varianty fotky s fallbackem na originál. */
export function mediaVariantUrl(
  storageKey: string,
  variants: unknown,
  variant: keyof MediaVariants,
): string {
  if (variants && typeof variants === 'object') {
    const key = (variants as MediaVariants)[variant]
    if (typeof key === 'string') return mediaUrl(key)
  }
  return mediaUrl(storageKey)
}
