import type { Metadata } from 'next'
import { MortgageCalculator } from './mortgage-calculator'

export function generateMetadata(): Metadata {
  return {
    title: 'Hypoteční kalkulačka — spočítejte si splátku hypotéky',
    description:
      'Orientační výpočet měsíční splátky hypotéky podle ceny nemovitosti, vlastních zdrojů, úrokové sazby a doby splácení.',
  }
}

export default function MortgageCalculatorPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold">Hypoteční kalkulačka</h1>
      <p className="mt-4 leading-relaxed">
        Zadejte cenu nemovitosti, vlastní zdroje, úrokovou sazbu a dobu splácení — kalkulačka
        okamžitě spočítá měsíční splátku i celkové náklady úvěru.
      </p>

      <div className="mt-8">
        <MortgageCalculator />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Jak hypotéka funguje</h2>
        <p className="mt-3 leading-relaxed">
          Hypotéka je úvěr zajištěný nemovitostí, kterou kupujete nebo už vlastníte. Banka vám půjčí
          zpravidla 80–90 % hodnoty nemovitosti; zbytek doplácíte z vlastních zdrojů. Úvěr splácíte
          v pravidelných měsíčních anuitních splátkách, které kombinují úrok a úmor jistiny — na
          začátku tvoří většinu splátky úrok, ke konci naopak jistina.
        </p>
        <p className="mt-3 leading-relaxed">
          Výši splátky nejvíc ovlivňuje úroková sazba a doba splácení. Sazba se sjednává na fixační
          období (nejčastěji 3–5 let) a po jeho konci se mění podle aktuální nabídky trhu. Delší
          doba splácení snižuje měsíční splátku, ale výrazně zvyšuje celkově zaplacené úroky —
          vyplatí se proto hledat rovnováhu mezi únosnou splátkou a celkovou cenou úvěru.
        </p>
        <p className="mt-3 leading-relaxed">
          Před žádostí o hypotéku banka posuzuje vaši bonitu: příjmy, výdaje, stávající závazky i
          hodnotu zastavované nemovitosti. Vyplatí se porovnat nabídky více bank — rozdíl i pár
          desetin procenta na sazbě znamená za celou dobu splácení desítky až stovky tisíc korun.
          Náš výpočet je orientační a nenahrazuje konkrétní nabídku banky ani finanční poradenství.
        </p>
      </section>
    </div>
  )
}
