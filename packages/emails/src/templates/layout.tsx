import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { CSSProperties, ReactNode } from 'react'

/** Barvy jednotného vizuálu Rocket Nemovitosti. */
export const emailColors = {
  emerald: '#1a433e',
  gold: '#cfb17b',
  cream: '#f6f3ed',
  white: '#ffffff',
  textBody: '#33403d',
  textMuted: '#8a8a83',
} as const

const bodyStyle: CSSProperties = {
  backgroundColor: emailColors.cream,
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '32px 16px',
}

const containerStyle: CSSProperties = {
  backgroundColor: emailColors.white,
  borderRadius: '8px',
  borderTop: `4px solid ${emailColors.gold}`,
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px 40px',
}

const brandStyle: CSSProperties = {
  color: emailColors.emerald,
  fontSize: '18px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  margin: '0 0 24px',
}

const headingStyle: CSSProperties = {
  color: emailColors.emerald,
  fontSize: '22px',
  lineHeight: '30px',
  margin: '0 0 16px',
}

const footerHrStyle: CSSProperties = {
  borderColor: emailColors.cream,
  margin: '32px 0 16px',
}

const footerStyle: CSSProperties = {
  color: emailColors.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  margin: 0,
}

export const paragraphStyle: CSSProperties = {
  color: emailColors.textBody,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

export const mutedTextStyle: CSSProperties = {
  color: emailColors.textMuted,
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 8px',
}

export const buttonSectionStyle: CSSProperties = {
  margin: '24px 0',
  textAlign: 'center',
}

export const buttonStyle: CSSProperties = {
  backgroundColor: emailColors.emerald,
  borderRadius: '6px',
  color: emailColors.white,
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
}

export const linkStyle: CSSProperties = {
  color: emailColors.emerald,
  textDecoration: 'underline',
  textDecorationColor: emailColors.gold,
}

export const accentTextStyle: CSSProperties = {
  color: emailColors.gold,
  fontSize: '15px',
  fontWeight: 700,
  margin: '4px 0',
}

interface EmailLayoutProps {
  preview: string
  heading: string
  children: ReactNode
}

/** Společná kostra všech e-mailů — hlavička, nadpis a patička Rocket Nemovitosti. */
export function EmailLayout({ preview, heading, children }: EmailLayoutProps) {
  return (
    <Html lang="cs">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={brandStyle}>Rocket Nemovitosti</Text>
          <Heading as="h1" style={headingStyle}>
            {heading}
          </Heading>
          {children}
          <Hr style={footerHrStyle} />
          <Text style={footerStyle}>
            © {new Date().getFullYear()} Rocket Nemovitosti — český realitní portál
            <br />
            Tento e-mail byl odeslán automaticky, neodpovídejte na něj prosím.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
