import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Spojí Tailwind třídy a vyřeší konflikty (poslední vyhrává). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
