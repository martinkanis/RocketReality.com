import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktní údaje portálu RocketNemovitosti.cz — podpora, obchod a provozovatel.',
}

export default function KontaktPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Kontakt</h1>
      <p className="mt-4 leading-relaxed">
        Ať už řešíte inzerát, platbu, nebo technický problém, ozvěte se nám. Odpovídáme obvykle do
        jednoho pracovního dne.
      </p>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Zákaznická podpora</h2>
        <ul className="mt-3 space-y-1 leading-relaxed">
          <li>E-mail: info@prolifereality.cz</li>
          <li>Telefon: +420 800 123 456 (po–pá 9:00–17:00)</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Spolupráce pro realitní kanceláře</h2>
        <p className="mt-3 leading-relaxed">
          Chcete na Rocket Nemovitosti inzerovat celé portfolio? Napište nám na obchod@rocketreality.cz a
          připravíme vám nabídku na míru.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Provozovatel</h2>
        <p className="mt-3 leading-relaxed">
          Rocket Nemovitosti s.r.o.
          <br />
          Náměstí Svatopluka Čecha 516/3, 702 00 Ostrava-Přívoz
          <br />
          IČO: 12345678
        </p>
      </section>
    </article>
  )
}
