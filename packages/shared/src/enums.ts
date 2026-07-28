/**
 * Centrální číselníky domény. Jediný zdroj pravdy pro DB enumy (Drizzle),
 * zod validace, UI labely i SEO slugy. Hodnoty jsou stabilní identifikátory —
 * nikdy je neměnit, jen přidávat.
 */

export const TRANSACTION_TYPES = ['prodej', 'pronajem', 'drazba'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]
export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  prodej: 'Prodej',
  pronajem: 'Pronájem',
  drazba: 'Dražba',
}

export const DISPOSITIONS = [
  '1+kk',
  '1+1',
  '2+kk',
  '2+1',
  '3+kk',
  '3+1',
  '4+kk',
  '4+1',
  '5+kk',
  '5+1',
  '6+',
  'atypicky',
  'pokoj',
] as const
export type Disposition = (typeof DISPOSITIONS)[number]
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  '1+kk': '1+kk',
  '1+1': '1+1',
  '2+kk': '2+kk',
  '2+1': '2+1',
  '3+kk': '3+kk',
  '3+1': '3+1',
  '4+kk': '4+kk',
  '4+1': '4+1',
  '5+kk': '5+kk',
  '5+1': '5+1',
  '6+': '6 pokojů a více',
  atypicky: 'Atypický',
  pokoj: 'Pokoj',
}

export const OWNERSHIP_TYPES = ['osobni', 'druzstevni', 'statni_obecni'] as const
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number]
export const OWNERSHIP_LABELS: Record<OwnershipType, string> = {
  osobni: 'Osobní',
  druzstevni: 'Družstevní',
  statni_obecni: 'Státní / obecní',
}

export const BUILDING_TYPES = [
  'cihlova',
  'panelova',
  'drevostavba',
  'skeletova',
  'montovana',
  'smisena',
  'kamenna',
  'jina',
] as const
export type BuildingType = (typeof BUILDING_TYPES)[number]
export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  cihlova: 'Cihlová',
  panelova: 'Panelová',
  drevostavba: 'Dřevostavba',
  skeletova: 'Skeletová',
  montovana: 'Montovaná',
  smisena: 'Smíšená',
  kamenna: 'Kamenná',
  jina: 'Jiná',
}

export const BUILDING_CONDITIONS = [
  'novostavba',
  'velmi_dobry',
  'dobry',
  'spatny',
  've_vystavbe',
  'projekt',
  'pred_rekonstrukci',
  'v_rekonstrukci',
  'po_rekonstrukci',
  'k_demolici',
] as const
export type BuildingCondition = (typeof BUILDING_CONDITIONS)[number]
export const BUILDING_CONDITION_LABELS: Record<BuildingCondition, string> = {
  novostavba: 'Novostavba',
  velmi_dobry: 'Velmi dobrý',
  dobry: 'Dobrý',
  spatny: 'Špatný',
  ve_vystavbe: 'Ve výstavbě',
  projekt: 'Projekt',
  pred_rekonstrukci: 'Před rekonstrukcí',
  v_rekonstrukci: 'V rekonstrukci',
  po_rekonstrukci: 'Po rekonstrukci',
  k_demolici: 'K demolici',
}

export const ENERGY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type EnergyLabel = (typeof ENERGY_LABELS)[number]

export const FURNISHING_TYPES = ['zarizeno', 'castecne_zarizeno', 'nezarizeno'] as const
export type FurnishingType = (typeof FURNISHING_TYPES)[number]
export const FURNISHING_LABELS: Record<FurnishingType, string> = {
  zarizeno: 'Zařízeno',
  castecne_zarizeno: 'Částečně zařízeno',
  nezarizeno: 'Nezařízeno',
}

export const PRICE_UNITS = [
  'celkem',
  'za_m2',
  'za_mesic',
  'za_m2_mesic',
  'za_m2_rok',
  'dohodou',
] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  celkem: 'celkem',
  za_m2: 'za m²',
  za_mesic: 'za měsíc',
  za_m2_mesic: 'za m²/měsíc',
  za_m2_rok: 'za m²/rok',
  dohodou: 'dohodou',
}

export const CURRENCIES = ['CZK', 'EUR'] as const
export type Currency = (typeof CURRENCIES)[number]

export const LISTING_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'paused',
  'expired',
  'archived',
  'rejected',
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Koncept',
  pending_review: 'Čeká na schválení',
  active: 'Aktivní',
  paused: 'Pozastaveno',
  expired: 'Expirováno',
  archived: 'Archivováno',
  rejected: 'Zamítnuto',
}

/**
 * Jak dlouho po archivaci zůstává prodaná/pronajatá nabídka veřejně dohledatelná
 * v archivu. Než naroste základna aktivních inzerátů, dává archiv návštěvníkům
 * představu o cenách v lokalitě.
 */
export const ARCHIVE_VISIBILITY_DAYS = 90

/** Důvody archivace, po kterých inzerát zůstává v archivu — stažené nabídky tam nepatří. */
export const PUBLIC_ARCHIVE_REASONS = ['prodano', 'pronajato'] as const

export const ARCHIVE_REASONS = ['prodano', 'pronajato', 'stazeno_inzerentem', 'jine'] as const
export type ArchiveReason = (typeof ARCHIVE_REASONS)[number]
export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  prodano: 'Prodáno',
  pronajato: 'Pronajato',
  stazeno_inzerentem: 'Staženo inzerentem',
  jine: 'Jiné',
}

export const ADDRESS_VISIBILITIES = ['presna', 'ulice', 'obec'] as const
export type AddressVisibility = (typeof ADDRESS_VISIBILITIES)[number]
export const ADDRESS_VISIBILITY_LABELS: Record<AddressVisibility, string> = {
  presna: 'Přesná adresa',
  ulice: 'Jen ulice',
  obec: 'Jen obec',
}

export const ORIENTATIONS = [
  'sever',
  'jih',
  'vychod',
  'zapad',
  'severovychod',
  'jihovychod',
  'severozapad',
  'jihozapad',
] as const
export type Orientation = (typeof ORIENTATIONS)[number]
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  sever: 'Sever',
  jih: 'Jih',
  vychod: 'Východ',
  zapad: 'Západ',
  severovychod: 'Severovýchod',
  jihovychod: 'Jihovýchod',
  severozapad: 'Severozápad',
  jihozapad: 'Jihozápad',
}

export const KRAJE = [
  'praha',
  'stredocesky',
  'jihocesky',
  'plzensky',
  'karlovarsky',
  'ustecky',
  'liberecky',
  'kralovehradecky',
  'pardubicky',
  'vysocina',
  'jihomoravsky',
  'olomoucky',
  'zlinsky',
  'moravskoslezsky',
] as const
export type Kraj = (typeof KRAJE)[number]
export const KRAJ_LABELS: Record<Kraj, string> = {
  praha: 'Hlavní město Praha',
  stredocesky: 'Středočeský kraj',
  jihocesky: 'Jihočeský kraj',
  plzensky: 'Plzeňský kraj',
  karlovarsky: 'Karlovarský kraj',
  ustecky: 'Ústecký kraj',
  liberecky: 'Liberecký kraj',
  kralovehradecky: 'Královéhradecký kraj',
  pardubicky: 'Pardubický kraj',
  vysocina: 'Kraj Vysočina',
  jihomoravsky: 'Jihomoravský kraj',
  olomoucky: 'Olomoucký kraj',
  zlinsky: 'Zlínský kraj',
  moravskoslezsky: 'Moravskoslezský kraj',
}

export const ACCOUNT_TYPES = ['soukromnik', 'profesional'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  soukromnik: 'Soukromá osoba',
  profesional: 'Realitní profesionál',
}

export const AGENCY_ROLES = ['owner', 'admin', 'makler'] as const
export type AgencyRole = (typeof AGENCY_ROLES)[number]
export const AGENCY_ROLE_LABELS: Record<AgencyRole, string> = {
  owner: 'Majitel',
  admin: 'Správce',
  makler: 'Makléř',
}

export const MEDIA_KINDS = ['foto', 'pudorys', 'dokument'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const ORDER_ITEM_TYPES = ['publikace', 'prodlouzeni', 'topovani'] as const
export type OrderItemType = (typeof ORDER_ITEM_TYPES)[number]

export const ORDER_STATUSES = [
  'created',
  'pending_payment',
  'paid',
  'cancelled',
  'refunded',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_PROVIDERS = ['free', 'stripe'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const SAVED_SEARCH_FREQUENCIES = ['okamzite', 'denne', 'tydne'] as const
export type SavedSearchFrequency = (typeof SAVED_SEARCH_FREQUENCIES)[number]
export const SAVED_SEARCH_FREQUENCY_LABELS: Record<SavedSearchFrequency, string> = {
  okamzite: 'Okamžitě',
  denne: 'Jednou denně',
  tydne: 'Jednou týdně',
}

export const MESSAGE_STATUSES = ['new', 'read', 'replied', 'spam'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const MODERATION_REASONS = [
  'duplicita',
  'zakazany_obsah',
  'spatna_kategorie',
  'podezreni_na_podvod',
  'nekvalitni_obsah',
  'spatna_cena',
  'jine',
] as const
export type ModerationReason = (typeof MODERATION_REASONS)[number]
export const MODERATION_REASON_LABELS: Record<ModerationReason, string> = {
  duplicita: 'Duplicitní inzerát',
  zakazany_obsah: 'Zakázaný obsah',
  spatna_kategorie: 'Špatně zvolená kategorie',
  podezreni_na_podvod: 'Podezření na podvod',
  nekvalitni_obsah: 'Nekvalitní obsah',
  spatna_cena: 'Chybná cena',
  jine: 'Jiný důvod',
}

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const NOTIFICATION_TYPES = [
  'hlidaci_pes',
  'zlevneni',
  'konci_platnost',
  'nova_zprava',
  'odpoved_na_recenzi',
  'moderace_vysledek',
  'system',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATION_CHANNELS = ['email', 'in_app'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
