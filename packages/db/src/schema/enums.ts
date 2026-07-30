import { pgEnum } from 'drizzle-orm/pg-core'
import {
  ACCOUNT_TYPES,
  ADDRESS_VISIBILITIES,
  AGENCY_ROLES,
  ARCHIVE_REASONS,
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  CURRENCIES,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_TYPES,
  KRAJE,
  LISTING_STATUSES,
  MEDIA_KINDS,
  MESSAGE_STATUSES,
  MODERATION_REASONS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  ORDER_ITEM_TYPES,
  ORDER_STATUSES,
  ORIENTATIONS,
  OWNERSHIP_TYPES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PRICE_UNITS,
  REVIEW_STATUSES,
  SAVED_SEARCH_FREQUENCIES,
  TRANSACTION_TYPES,
} from '@rocket/shared'

export const transactionTypeEnum = pgEnum('transaction_type', TRANSACTION_TYPES)
export const dispositionEnum = pgEnum('disposition', DISPOSITIONS)
export const ownershipTypeEnum = pgEnum('ownership_type', OWNERSHIP_TYPES)
export const buildingTypeEnum = pgEnum('building_type', BUILDING_TYPES)
export const buildingConditionEnum = pgEnum('building_condition', BUILDING_CONDITIONS)
export const energyLabelEnum = pgEnum('energy_label', ENERGY_LABELS)
export const furnishingTypeEnum = pgEnum('furnishing_type', FURNISHING_TYPES)
export const priceUnitEnum = pgEnum('price_unit', PRICE_UNITS)
export const currencyEnum = pgEnum('currency', CURRENCIES)
export const listingStatusEnum = pgEnum('listing_status', LISTING_STATUSES)
export const archiveReasonEnum = pgEnum('archive_reason', ARCHIVE_REASONS)
export const addressVisibilityEnum = pgEnum('address_visibility', ADDRESS_VISIBILITIES)
export const orientationEnum = pgEnum('orientation', ORIENTATIONS)
export const krajEnum = pgEnum('kraj', KRAJE)
export const accountTypeEnum = pgEnum('account_type', ACCOUNT_TYPES)
export const agencyRoleEnum = pgEnum('agency_role', AGENCY_ROLES)
export const agencyStatusEnum = pgEnum('agency_status', ['active', 'suspended'])
export const mediaKindEnum = pgEnum('media_kind', MEDIA_KINDS)
export const orderItemTypeEnum = pgEnum('order_item_type', ORDER_ITEM_TYPES)
export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES)
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES)
export const paymentProviderEnum = pgEnum('payment_provider', PAYMENT_PROVIDERS)
export const savedSearchFrequencyEnum = pgEnum('saved_search_frequency', SAVED_SEARCH_FREQUENCIES)
export const messageStatusEnum = pgEnum('message_status', MESSAGE_STATUSES)
export const moderationReasonEnum = pgEnum('moderation_reason', MODERATION_REASONS)
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'rejected'])
export const reviewStatusEnum = pgEnum('review_status', REVIEW_STATUSES)
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES)
export const notificationChannelEnum = pgEnum('notification_channel', NOTIFICATION_CHANNELS)
export const notificationStatusEnum = pgEnum('notification_status', ['queued', 'sent', 'failed'])
export const listingSourceEnum = pgEnum('listing_source', ['manual', 'import'])
export const importFeedTypeEnum = pgEnum('import_feed_type', ['api_push', 'xml_feed', 'xml_rpc'])
export const importJobStatusEnum = pgEnum('import_job_status', [
  'pending',
  'running',
  'done',
  'partial',
  'failed',
])
export const boostTypeEnum = pgEnum('boost_type', ['top'])
