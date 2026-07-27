import { sendMail } from './mailer'
import { renderTemplate } from './render'
import {
  ContactMessageEmail,
  type ContactMessageEmailProps,
} from './templates/contact-message-email'
import {
  ListingExpiringEmail,
  type ListingExpiringEmailProps,
} from './templates/listing-expiring-email'
import { PasswordResetEmail, type PasswordResetEmailProps } from './templates/password-reset-email'
import { VerificationEmail, type VerificationEmailProps } from './templates/verification-email'
import {
  WatchdogDigestEmail,
  type WatchdogDigestEmailProps,
} from './templates/watchdog-digest-email'

export { sendMail, type SendMailParams } from './mailer'
export type { WatchdogListingItem } from './templates/watchdog-digest-email'

export interface SendVerificationEmailParams extends VerificationEmailProps {
  to: string
}

export async function sendVerificationEmail(params: SendVerificationEmailParams): Promise<void> {
  const { to, ...props } = params
  const { html, text } = await renderTemplate(VerificationEmail(props))
  await sendMail({ to, subject: 'Potvrďte svou e-mailovou adresu', html, text })
}

export interface SendPasswordResetEmailParams extends PasswordResetEmailProps {
  to: string
}

export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void> {
  const { to, ...props } = params
  const { html, text } = await renderTemplate(PasswordResetEmail(props))
  await sendMail({ to, subject: 'Obnovení hesla k účtu Rocket Nemovitosti', html, text })
}

export interface SendWatchdogDigestParams extends WatchdogDigestEmailProps {
  to: string
}

export async function sendWatchdogDigest(params: SendWatchdogDigestParams): Promise<void> {
  const { to, ...props } = params
  const { html, text } = await renderTemplate(WatchdogDigestEmail(props))
  await sendMail({
    to,
    subject: `Nové nemovitosti pro vaše hledání „${props.searchName}“`,
    html,
    text,
  })
}

export interface SendContactMessageNotificationParams extends ContactMessageEmailProps {
  to: string
}

export async function sendContactMessageNotification(
  params: SendContactMessageNotificationParams,
): Promise<void> {
  const { to, ...props } = params
  const { html, text } = await renderTemplate(ContactMessageEmail(props))
  await sendMail({ to, subject: `Nový dotaz k inzerátu „${props.listingTitle}“`, html, text })
}

export interface SendListingExpiringEmailParams extends ListingExpiringEmailProps {
  to: string
}

export async function sendListingExpiringEmail(
  params: SendListingExpiringEmailParams,
): Promise<void> {
  const { to, ...props } = params
  const { html, text } = await renderTemplate(ListingExpiringEmail(props))
  await sendMail({ to, subject: `Váš inzerát „${props.listingTitle}“ brzy vyprší`, html, text })
}
