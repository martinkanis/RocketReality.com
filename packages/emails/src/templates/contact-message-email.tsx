import { Link, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'
import { emailColors, EmailLayout, linkStyle, mutedTextStyle, paragraphStyle } from './layout'

export interface ContactMessageEmailProps {
  listingTitle: string
  listingUrl: string
  senderName: string
  senderEmail: string
  senderPhone?: string
  message: string
}

const messageBoxStyle: CSSProperties = {
  backgroundColor: emailColors.cream,
  borderLeft: `3px solid ${emailColors.gold}`,
  borderRadius: '4px',
  margin: '16px 0',
  padding: '16px 20px',
}

const messageTextStyle: CSSProperties = {
  color: emailColors.textBody,
  fontSize: '15px',
  lineHeight: '24px',
  margin: 0,
  whiteSpace: 'pre-wrap',
}

export function ContactMessageEmail({
  listingTitle,
  listingUrl,
  senderName,
  senderEmail,
  senderPhone,
  message,
}: ContactMessageEmailProps) {
  return (
    <EmailLayout
      preview={`${senderName} se ptá na inzerát „${listingTitle}“.`}
      heading="Nový dotaz k vašemu inzerátu"
    >
      <Text style={paragraphStyle}>
        K vašemu inzerátu{' '}
        <Link href={listingUrl} style={linkStyle}>
          {listingTitle}
        </Link>{' '}
        přišel nový dotaz.
      </Text>
      <Section style={messageBoxStyle}>
        <Text style={messageTextStyle}>{message}</Text>
      </Section>
      <Text style={paragraphStyle}>
        <strong>{senderName}</strong>
        <br />
        E-mail:{' '}
        <Link href={`mailto:${senderEmail}`} style={linkStyle}>
          {senderEmail}
        </Link>
        {senderPhone ? (
          <>
            <br />
            Telefon:{' '}
            <Link href={`tel:${senderPhone}`} style={linkStyle}>
              {senderPhone}
            </Link>
          </>
        ) : null}
      </Text>
      <Text style={mutedTextStyle}>
        Odpovězte zájemci přímo na jeho e-mailovou adresu, ať mu odpověď dorazí co nejdřív.
      </Text>
    </EmailLayout>
  )
}
