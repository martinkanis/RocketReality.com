import { CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Obsazení nájemníka',
  description:
    'Najdeme vám spolehlivého nájemníka: inzerce, prohlídky, prověření zájemců, nájemní smlouva i předání bytu. Jednorázová provize ve výši jednoho měsíčního nájmu.',
}

/** Jednorázová provize je jeden měsíční nájem, nikdy ale méně než tato částka. */
const MIN_FEE_CZK = 10_000

const SERVICE_STEPS = [
  {
    title: 'Prezentace, inzerce a prohlídky',
    detail: 'Připravíme inzerát, zajistíme fotografie a provedeme zájemce bytem.',
  },
  {
    title: 'Prověření zájemců',
    detail: 'Bonita, bezdlužnost a reference — ať víte, komu byt svěřujete.',
  },
  {
    title: 'Nájemní smlouva a kauce',
    detail: 'Připravíme smlouvu a pohlídáme složení kauce před předáním.',
  },
  {
    title: 'Předávací protokol a předání bytu',
    detail: 'Stav bytu i měřidel zdokumentujeme, ať se máte o co opřít.',
  },
] as const

export default function ObsazeniNajemnikaPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Obsazení nájemníka</h1>
      <p className="mt-4 leading-relaxed">
        Pro majitele, kteří si běžnou správu řeší sami a chtějí jen spolehlivého nájemníka.
        Postaráme se o vše od inzerce po předání bytu — vy podepíšete smlouvu s prověřeným člověkem.
      </p>

      <section className="mt-8 rounded-md border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Cena</h2>
        <p className="mt-2 text-2xl font-semibold text-brand-500">
          Jeden měsíční nájem
          <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
            jednorázová provize, minimálně {MIN_FEE_CZK.toLocaleString('cs-CZ')} Kč
          </span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Platíte až ve chvíli, kdy je byt obsazený a smlouva podepsaná. Žádné průběžné poplatky —
          správa nemovitosti zůstává ve vašich rukou.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Co pro vás zajistíme</h2>
        <ul className="mt-4 space-y-4">
          {SERVICE_STEPS.map((step) => (
            <li key={step.title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden />
              <div>
                <p className="font-medium text-heading">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-md bg-brand-50 p-6">
        <h2 className="text-xl font-semibold">Máte byt k pronájmu?</h2>
        <p className="mt-2 leading-relaxed">
          Napište nám na{' '}
          <a href="mailto:info@prolifereality.cz" className="font-medium text-brand-500">
            info@prolifereality.cz
          </a>{' '}
          nebo zavolejte na +420 800 123 456 (po–pá 9:00–17:00). Ozveme se do jednoho pracovního
          dne.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <a href="mailto:info@prolifereality.cz?subject=Obsazen%C3%AD%20n%C3%A1jemn%C3%ADka">
              Mám zájem o obsazení nájemníka
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/kontakt">Všechny kontakty</Link>
          </Button>
        </div>
      </section>
    </article>
  )
}
