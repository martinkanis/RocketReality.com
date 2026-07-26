import { Button, Link, Section, Text } from '@react-email/components'
import {
  buttonSectionStyle,
  buttonStyle,
  EmailLayout,
  linkStyle,
  mutedTextStyle,
  paragraphStyle,
} from './layout'

export interface ListingExpiringEmailProps {
  listingTitle: string
  listingUrl: string
  /** Konec platnosti inzerátu jako ISO řetězec — přežije serializaci ve frontě. */
  validUntil: string
  renewUrl: string
}

const expirationDateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function ListingExpiringEmail({
  listingTitle,
  listingUrl,
  validUntil,
  renewUrl,
}: ListingExpiringEmailProps) {
  const formattedValidUntil = expirationDateFormatter.format(new Date(validUntil))
  return (
    <EmailLayout
      preview={`Platnost inzerátu „${listingTitle}“ skončí ${formattedValidUntil}.`}
      heading="Váš inzerát brzy vyprší"
    >
      <Text style={paragraphStyle}>
        Platnost vašeho inzerátu{' '}
        <Link href={listingUrl} style={linkStyle}>
          {listingTitle}
        </Link>{' '}
        skončí <strong>{formattedValidUntil}</strong>. Po tomto datu se inzerát přestane zobrazovat
        zájemcům.
      </Text>
      <Section style={buttonSectionStyle}>
        <Button href={renewUrl} style={buttonStyle}>
          Prodloužit inzerát
        </Button>
      </Section>
      <Text style={mutedTextStyle}>
        Pokud už je nemovitost prodaná nebo pronajatá, nemusíte dělat nic — inzerát se po vypršení
        platnosti skryje automaticky.
      </Text>
    </EmailLayout>
  )
}
