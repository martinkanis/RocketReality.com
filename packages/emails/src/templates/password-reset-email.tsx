import { Button, Link, Section, Text } from '@react-email/components'
import {
  buttonSectionStyle,
  buttonStyle,
  EmailLayout,
  linkStyle,
  mutedTextStyle,
  paragraphStyle,
} from './layout'

export interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
}

export function PasswordResetEmail({ userName, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Nastavte si nové heslo ke svému účtu RocketReality."
      heading="Obnovení hesla"
    >
      <Text style={paragraphStyle}>Dobrý den, {userName},</Text>
      <Text style={paragraphStyle}>
        obdrželi jsme žádost o obnovení hesla k vašemu účtu na RocketReality. Nové heslo si
        nastavíte kliknutím na tlačítko níže.
      </Text>
      <Section style={buttonSectionStyle}>
        <Button href={resetUrl} style={buttonStyle}>
          Nastavit nové heslo
        </Button>
      </Section>
      <Text style={mutedTextStyle}>
        Pokud tlačítko nefunguje, otevřete v prohlížeči tento odkaz:{' '}
        <Link href={resetUrl} style={linkStyle}>
          {resetUrl}
        </Link>
      </Text>
      <Text style={mutedTextStyle}>
        Pokud jste o obnovení hesla nežádali, tento e-mail ignorujte — vaše heslo zůstává beze
        změny.
      </Text>
    </EmailLayout>
  )
}
