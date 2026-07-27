import { Button, Link, Section, Text } from '@react-email/components'
import {
  buttonSectionStyle,
  buttonStyle,
  EmailLayout,
  linkStyle,
  mutedTextStyle,
  paragraphStyle,
} from './layout'

export interface VerificationEmailProps {
  userName: string
  verifyUrl: string
}

export function VerificationEmail({ userName, verifyUrl }: VerificationEmailProps) {
  return (
    <EmailLayout
      preview="Dokončete registraci potvrzením své e-mailové adresy."
      heading="Potvrďte svou e-mailovou adresu"
    >
      <Text style={paragraphStyle}>Dobrý den, {userName},</Text>
      <Text style={paragraphStyle}>
        děkujeme za registraci na Rocket Nemovitosti. Pro dokončení registrace prosím potvrďte svou
        e-mailovou adresu kliknutím na tlačítko níže.
      </Text>
      <Section style={buttonSectionStyle}>
        <Button href={verifyUrl} style={buttonStyle}>
          Potvrdit e-mailovou adresu
        </Button>
      </Section>
      <Text style={mutedTextStyle}>
        Pokud tlačítko nefunguje, otevřete v prohlížeči tento odkaz:{' '}
        <Link href={verifyUrl} style={linkStyle}>
          {verifyUrl}
        </Link>
      </Text>
      <Text style={mutedTextStyle}>Pokud jste se neregistrovali, tento e-mail ignorujte.</Text>
    </EmailLayout>
  )
}
