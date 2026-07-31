/**
 * Pravidla pro rozpoznání téže nemovitosti nabízené dvakrát — typicky když
 * ji vloží majitel i realitní kancelář, nebo dvě kanceláře současně.
 *
 * Výsledek nikdy nic neodmítá automaticky: novostavby mají opravdu shodné
 * byty v jednom domě, takže poslední slovo má vždy moderátor. Cílem je jen
 * dostat podezřelé dvojice před něj.
 */

/** Do jaké vzdálenosti považujeme dvě nabídky za nabídky na stejném místě. */
const SAME_PLACE_DISTANCE_METERS = 100

/** Jak moc se smí lišit plocha, aby šlo o tutéž nemovitost. */
const AREA_TOLERANCE_RATIO = 0.05

export interface DuplicateSubject {
  areaUsable: number | null
  street: string | null
}

export interface DuplicateCandidate extends DuplicateSubject {
  listingId: string
  /** Vzdálenost od posuzovaného inzerátu; null když ji neumíme spočítat. */
  distanceMeters: number | null
  /** Kandidát má fotku se shodným obsahem — nejsilnější signál. */
  sharesPhoto: boolean
}

export interface DuplicateMatch {
  listingId: string
  reason: string
}

/** Adresa se porovnává bez diakritiky, velikosti písmen a přebytečných mezer. */
function normalizeStreet(street: string | null): string | null {
  if (!street) return null
  const normalized = street
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

function hasSameArea(subject: DuplicateSubject, candidate: DuplicateCandidate): boolean {
  const { areaUsable: subjectArea } = subject
  const { areaUsable: candidateArea } = candidate
  if (!subjectArea || !candidateArea) return false
  const larger = Math.max(subjectArea, candidateArea)
  return Math.abs(subjectArea - candidateArea) / larger <= AREA_TOLERANCE_RATIO
}

function hasSameStreetAddress(subject: DuplicateSubject, candidate: DuplicateCandidate): boolean {
  const subjectStreet = normalizeStreet(subject.street)
  return subjectStreet !== null && subjectStreet === normalizeStreet(candidate.street)
}

function isAtSamePlace(candidate: DuplicateCandidate): boolean {
  return candidate.distanceMeters !== null && candidate.distanceMeters <= SAME_PLACE_DISTANCE_METERS
}

/**
 * Posoudí jednoho kandidáta. Volající už zajistil, že jde o stejnou kategorii,
 * typ nabídky i dispozici — tady se rozhoduje podle polohy, plochy a fotek.
 */
export function evaluateDuplicate(
  subject: DuplicateSubject,
  candidate: DuplicateCandidate,
): DuplicateMatch | null {
  if (candidate.sharesPhoto) {
    return { listingId: candidate.listingId, reason: 'shodná fotografie' }
  }
  if (!hasSameArea(subject, candidate)) return null
  if (hasSameStreetAddress(subject, candidate)) {
    return { listingId: candidate.listingId, reason: 'shodná adresa i plocha' }
  }
  if (isAtSamePlace(candidate)) {
    return { listingId: candidate.listingId, reason: 'shodná poloha i plocha' }
  }
  return null
}

/** Vybere nejsilnější shodu; shodná fotografie má přednost před polohou. */
export function findBestDuplicate(
  subject: DuplicateSubject,
  candidates: DuplicateCandidate[],
): DuplicateMatch | null {
  const matches = candidates
    .map((candidate) => evaluateDuplicate(subject, candidate))
    .filter((match): match is DuplicateMatch => match !== null)

  return matches.find((match) => match.reason === 'shodná fotografie') ?? matches[0] ?? null
}
