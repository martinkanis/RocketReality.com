import {
  sendContactMessageNotification,
  sendListingExpiringEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWatchdogDigest,
  type SendContactMessageNotificationParams,
  type SendListingExpiringEmailParams,
  type SendPasswordResetEmailParams,
  type SendVerificationEmailParams,
  type SendWatchdogDigestParams,
} from '@rocket/emails'
import { defineJob } from './define-job'

export type SendEmailPayload =
  | { kind: 'verification'; data: SendVerificationEmailParams }
  | { kind: 'password-reset'; data: SendPasswordResetEmailParams }
  | { kind: 'watchdog-digest'; data: SendWatchdogDigestParams }
  | { kind: 'contact-message'; data: SendContactMessageNotificationParams }
  | { kind: 'listing-expiring'; data: SendListingExpiringEmailParams }

/** Odeslání transakčního e-mailu — payload rozlišuje druh e-mailu diskriminovanou unií. */
export const sendEmailJob = defineJob<SendEmailPayload>({
  name: 'email.send',
  handler: async (payload) => {
    switch (payload.kind) {
      case 'verification':
        await sendVerificationEmail(payload.data)
        break
      case 'password-reset':
        await sendPasswordResetEmail(payload.data)
        break
      case 'watchdog-digest':
        await sendWatchdogDigest(payload.data)
        break
      case 'contact-message':
        await sendContactMessageNotification(payload.data)
        break
      case 'listing-expiring':
        await sendListingExpiringEmail(payload.data)
        break
      default: {
        const unknownPayload: never = payload
        throw new Error(`Neznámý druh e-mailu: ${JSON.stringify(unknownPayload)}`)
      }
    }
  },
})
