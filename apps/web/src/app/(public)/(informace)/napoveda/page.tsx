import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nápověda',
  description: 'Odpovědi na nejčastější otázky k inzerci na RocketNemovitosti.cz.',
}

const FAQ_ITEMS = [
  {
    question: 'Jak vložím inzerát?',
    answer:
      'Klikněte na „Vložit inzerát zdarma", vyplňte údaje o nemovitosti, nahrajte fotografie a inzerát odešlete. Po schválení moderací se zobrazí ve výsledcích vyhledávání.',
  },
  {
    question: 'Kolik stojí inzerce?',
    answer:
      'Základní soukromý inzerát vložíte od 0 Kč. Platí se jen volitelné služby, například topování ve výsledcích nebo prodloužení platnosti inzerátu.',
  },
  {
    question: 'Jak inzerát upravím nebo smažu?',
    answer:
      'Po přihlášení najdete všechny své inzeráty ve svém účtu. U každého z nich můžete kdykoli upravit údaje, pozastavit zveřejnění nebo inzerát archivovat.',
  },
  {
    question: 'Co je hlídací pes?',
    answer:
      'Uložené vyhledávání, které vám pošle e-mail, jakmile se objeví nová nabídka odpovídající vašim filtrům. Frekvenci upozornění si nastavíte sami.',
  },
] as const

export default function NapovedaPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Nápověda</h1>
      <p className="mt-4 leading-relaxed">
        Odpovědi na nejčastější otázky. Pokud tu svou nenajdete, napište nám na
        podpora@rocketreality.cz.
      </p>
      <dl className="mt-8 space-y-8">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <dt className="text-xl font-semibold text-heading">{item.question}</dt>
            <dd className="mt-3 leading-relaxed">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
