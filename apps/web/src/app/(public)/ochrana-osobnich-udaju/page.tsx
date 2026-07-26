import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ochrana osobních údajů',
  description: 'Informace o zpracování osobních údajů na portálu RocketReality.cz (GDPR).',
}

export default function OchranaOsobnichUdajuPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Ochrana osobních údajů</h1>
      <p className="mt-4 leading-relaxed">
        Správcem osobních údajů je RocketReality s.r.o. Osobní údaje zpracováváme v souladu s
        nařízením GDPR a zákonem o zpracování osobních údajů.
      </p>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Jaké údaje zpracováváme</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 leading-relaxed">
          <li>identifikační a kontaktní údaje (jméno, e-mail, telefon),</li>
          <li>údaje o inzerovaných nemovitostech včetně adresy,</li>
          <li>fakturační údaje u placených služeb,</li>
          <li>technické údaje o používání portálu (IP adresa, cookies).</li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Proč údaje zpracováváme</h2>
        <p className="mt-3 leading-relaxed">
          Údaje potřebujeme k provozu portálu: zveřejnění inzerátů, zprostředkování kontaktu mezi
          zájemcem a inzerentem, vyúčtování služeb a zasílání upozornění, která si sami nastavíte
          (například hlídací pes).
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Jak dlouho údaje uchováváme</h2>
        <p className="mt-3 leading-relaxed">
          Údaje uchováváme po dobu existence účtu a dále jen po dobu vyžadovanou právními předpisy
          (například účetní doklady 10 let).
        </p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Vaše práva</h2>
        <p className="mt-3 leading-relaxed">
          Máte právo na přístup ke svým údajům, jejich opravu či výmaz, omezení zpracování,
          přenositelnost a právo vznést námitku. Žádosti vyřizujeme na adrese gdpr@rocketreality.cz.
          Se stížností se můžete obrátit na Úřad pro ochranu osobních údajů.
        </p>
      </section>
    </article>
  )
}
