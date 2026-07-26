import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Podmínky užití',
  description: 'Podmínky užití realitního portálu RocketReality.cz.',
}

export default function PodminkyPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Podmínky užití</h1>
      <p className="mt-4 leading-relaxed">
        Tyto podmínky upravují používání realitního portálu RocketReality.cz. Vytvořením účtu nebo
        vložením inzerátu s nimi vyjadřujete souhlas.
      </p>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Inzerce</h2>
        <p className="mt-3 leading-relaxed">
          Inzerovat lze pouze skutečné nabídky nemovitostí, ke kterým má inzerent oprávnění. Každý
          inzerát prochází moderací — vyhrazujeme si právo odmítnout duplicitní, zavádějící nebo
          jinak závadný obsah.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Ceny služeb</h2>
        <p className="mt-3 leading-relaxed">
          Základní soukromá inzerce je dostupná od 0 Kč. Placené služby (například topování nebo
          prodloužení inzerátu) se řídí ceníkem platným v okamžiku objednávky.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Odpovědnost</h2>
        <p className="mt-3 leading-relaxed">
          Za obsah inzerátů odpovídá inzerent. Provozovatel nenese odpovědnost za správnost údajů v
          inzerátech ani za průběh obchodů uzavřených mezi uživateli.
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Závěrečná ustanovení</h2>
        <p className="mt-3 leading-relaxed">
          Podmínky můžeme upravovat; o podstatných změnách uživatele informujeme předem. Tyto
          podmínky jsou účinné od 1. 1. 2026.
        </p>
      </section>
    </article>
  )
}
