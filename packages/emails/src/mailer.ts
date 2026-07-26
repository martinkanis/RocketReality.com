import nodemailer, { type Transporter } from 'nodemailer'
import { loadEnv } from '@rocket/config'

const SMTP_IMPLICIT_TLS_PORT = 465

export interface SendMailParams {
  to: string
  subject: string
  html: string
  text?: string
}

let cachedTransport: Transporter | null = null

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport
  const env = loadEnv()
  cachedTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === SMTP_IMPLICIT_TLS_PORT,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  })
  return cachedTransport
}

/** Odešle e-mail přes SMTP. Chybu propaguje s kontextem — o retry rozhoduje volající (fronta). */
export async function sendMail({ to, subject, html, text }: SendMailParams): Promise<void> {
  const env = loadEnv()
  try {
    await getTransport().sendMail({ from: env.MAIL_FROM, to, subject, html, text })
  } catch (error) {
    throw new Error(`Odeslání e-mailu „${subject}“ na adresu ${to} selhalo`, { cause: error })
  }
}
