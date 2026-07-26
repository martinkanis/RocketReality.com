import { Column, Img, Link, Row, Section, Text } from '@react-email/components'
import { formatPrice, type PriceParts } from '@rocket/shared'
import type { CSSProperties } from 'react'
import {
  accentTextStyle,
  emailColors,
  EmailLayout,
  linkStyle,
  mutedTextStyle,
  paragraphStyle,
} from './layout'

export interface WatchdogListingItem {
  title: string
  price: PriceParts
  locality: string
  url: string
  imageUrl?: string
}

export interface WatchdogDigestEmailProps {
  searchName: string
  listings: WatchdogListingItem[]
  unsubscribeUrl: string
}

const listingCardStyle: CSSProperties = {
  borderBottom: `1px solid ${emailColors.cream}`,
  padding: '16px 0',
}

const imageColumnStyle: CSSProperties = {
  paddingRight: '16px',
  verticalAlign: 'top',
  width: '120px',
}

const listingImageStyle: CSSProperties = {
  borderRadius: '4px',
  objectFit: 'cover',
}

const listingTitleStyle: CSSProperties = {
  ...linkStyle,
  fontSize: '15px',
  fontWeight: 600,
}

const localityStyle: CSSProperties = {
  color: emailColors.textMuted,
  fontSize: '13px',
  margin: 0,
}

function formatListingCount(count: number): string {
  if (count === 1) return '1 novou nabídku'
  if (count >= 2 && count <= 4) return `${count} nové nabídky`
  return `${count} nových nabídek`
}

export function WatchdogDigestEmail({
  searchName,
  listings,
  unsubscribeUrl,
}: WatchdogDigestEmailProps) {
  return (
    <EmailLayout
      preview={`Hlídací pes „${searchName}“ našel ${formatListingCount(listings.length)}.`}
      heading="Nové nemovitosti pro vaše hledání"
    >
      <Text style={paragraphStyle}>
        Pro vaše uložené hledání „{searchName}“ máme {formatListingCount(listings.length)}:
      </Text>
      {listings.map((listing) => (
        <Section key={listing.url} style={listingCardStyle}>
          <Row>
            {listing.imageUrl ? (
              <Column style={imageColumnStyle}>
                <Img
                  src={listing.imageUrl}
                  alt={listing.title}
                  width={120}
                  height={80}
                  style={listingImageStyle}
                />
              </Column>
            ) : null}
            <Column>
              <Link href={listing.url} style={listingTitleStyle}>
                {listing.title}
              </Link>
              <Text style={accentTextStyle}>{formatPrice(listing.price)}</Text>
              <Text style={localityStyle}>{listing.locality}</Text>
            </Column>
          </Row>
        </Section>
      ))}
      <Text style={{ ...mutedTextStyle, margin: '24px 0 0' }}>
        Nechcete už tato upozornění dostávat?{' '}
        <Link href={unsubscribeUrl} style={linkStyle}>
          Zrušit tohoto hlídacího psa
        </Link>
      </Text>
    </EmailLayout>
  )
}
