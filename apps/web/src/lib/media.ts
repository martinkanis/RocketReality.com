import { loadEnv } from '@rocket/config'

/** Veřejná URL objektu ve storage (MinIO v dev, S3/CDN v produkci). */
export function mediaUrl(storageKey: string): string {
  return `${loadEnv().S3_PUBLIC_URL}/${storageKey}`
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
