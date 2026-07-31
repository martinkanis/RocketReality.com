import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = { title: 'Jak funguje import inzerátů' }

const RPC_PATH = '/RPC2'
const JSON_IMPORT_PATH = '/api/import/inzeraty'

interface StatusRow {
  code: string
  meaning: string
  action: string
}

/** Návratové kódy, se kterými se při zapojování kanceláře reálně potkáte. */
const STATUS_ROWS: StatusRow[] = [
  {
    code: '200',
    meaning: 'Hotovo.',
    action: 'Nic. Inzerát najdete ve frontě moderace.',
  },
  {
    code: '402',
    meaning: 'Neexistující klient — číslo klienta jsme nenašli.',
    action: 'Ověřte číslo klienta a že přístup není deaktivovaný.',
  },
  {
    code: '407',
    meaning: 'Neplatné přihlášení, vypršelá relace nebo volání bez přihlášení.',
    action:
      'Zkontrolujte heslo i klíč softwaru — vstupují do stejného otisku, takže selhat může kterýkoli z nich.',
  },
  {
    code: '404',
    meaning: 'Inzerát nebo fotka pod zadaným identifikátorem neexistuje.',
    action: 'Fotka se posílá až k dříve vloženému inzerátu, ne současně s ním.',
  },
  {
    code: '410 / 412',
    meaning: 'Fotka je příliš velká (nad 10 MB), nebo menší než 480 × 360 bodů.',
    action: 'Kancelář má poslat větší předlohu — z malé nevznikne použitelný náhled.',
  },
  {
    code: '451',
    meaning: 'Tatáž fotka už u inzerátu je.',
    action: 'Nic, chrání to před opakovaným vkládáním při každé synchronizaci.',
  },
  {
    code: '452',
    meaning: 'Nekompletní data — chybí povinná položka nebo ji neumíme převést.',
    action: 'Text odpovědi říká konkrétní pole. Nejčastěji chybí město nebo dispozice u bytu.',
  },
  {
    code: '476',
    meaning: 'Soubor není JPEG, PNG ani GIF.',
    action: 'Formát poznáváme podle obsahu souboru, ne podle přípony.',
  },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-heading">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  )
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-500">
        {number}
      </span>
      <div>
        <p className="font-medium text-heading">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}

export default function ImportHelpPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-heading">Jak funguje import inzerátů</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Návod pro zapojení realitní kanceláře a pro řešení potíží, když import nedorazí.
      </p>

      <Section title="Proč to takhle je">
        <p>
          Software realitních kanceláří umí exportovat na realitní portály přes rozhraní, které je
          v Česku de facto standardem — kancelář ho potřebuje kvůli velkým portálům. Portál proto
          vystavuje <strong className="text-heading">stejné rozhraní</strong> na adrese{' '}
          <Code>{RPC_PATH}</Code>.
        </p>
        <p>
          Kancelář nás díky tomu přidá jako další cíl exportu pouhou změnou adresy a přihlašovacích
          údajů. Nepotřebuje programátora ani zásah dodavatele svého softwaru — a to je celý smysl:
          čím menší tření při vkládání, tím víc nabídek.
        </p>
        <p className="rounded-md bg-info-bg px-3 py-2 text-info">
          Data k nám posílá software kanceláře. Odnikud nic nestahujeme a do cizích systémů
          nesaháme.
        </p>
      </Section>

      <Section title="Zapojení kanceláře krok za krokem">
        <ol className="flex flex-col gap-3">
          <Step number={1} title="Kancelář si zřídí přístup">
            V <Code>Můj účet → Přístupy pro import</Code> zvolí „Přístup pro váš realitní software“.
            Dostane číslo klienta a heslo — heslo se ukáže jen jednou.
          </Step>
          <Step number={2} title="Zadá klíč svého softwaru">
            Údaj, který identifikuje jejich exportní program. Musí sedět přesně s tím, co program
            posílá, jinak se nepřihlásí. Bývá v nastavení exportu, případně ho zná dodavatel.
          </Step>
          <Step number={3} title="Ve svém softwaru přidá nový cíl exportu">
            Adresa <Code>{RPC_PATH}</Code> na naší doméně, číslo klienta a heslo z prvního kroku.
            Pokud program umí víc cílů, přidá nás jako další — ať nepřijde o export jinam.
          </Step>
          <Step number={4} title="Spustí export">
            Inzeráty i fotky dorazí samy. Průběh uvidíte v{' '}
            <Link href="/admin/importy" className="text-brand-500 hover:text-primary">
              historii importů
            </Link>
            .
          </Step>
        </ol>
      </Section>

      <Section title="Co se s importovaným inzerátem stane">
        <p>
          Jde stejnou cestou jako ručně vložený: založí se jako koncept a rovnou zamíří do{' '}
          <Link href="/admin/moderace" className="text-brand-500 hover:text-primary">
            fronty moderace
          </Link>
          . <strong className="text-heading">Nic se nezveřejní bez schválení.</strong>
        </p>
        <p>
          Opakovaný import téhož inzerátu ho aktualizuje, nevytvoří druhý — inzeráty se párují podle
          identifikátoru, který kancelář používá u sebe. Smazaný inzerát se opětovným importem
          vrátí zpět a projde moderací znovu.
        </p>
        <p>
          Název inzerátu skládáme z parametrů („Prodej bytu 2+kk, 58 m², Brno“), protože rozhraní
          žádný název nepřenáší. Fotky se ukládají stejně jako ty z webu a náhledy k nim dodělá
          worker, takže chvíli po importu ještě nemusí být vidět.
        </p>
        <p>
          Pokud vypadá inzerát jako tatáž nemovitost, jakou už někdo nabízí, dostane ve frontě
          moderace upozornění s odkazem na druhý inzerát. Automaticky se nic nezamítá — v novostavbě
          bývají shodné byty legitimně.
        </p>
      </Section>

      <Section title="Ověření, že rozhraní funguje">
        <p>
          Než budete řešit software kanceláře, ověřte si samotné rozhraní. V repozitáři je
          referenční klient, který odjede celý scénář exportu:
        </p>
        <pre className="overflow-x-auto rounded-md bg-surface-alt p-3 font-mono text-xs">
          {`pnpm import:check -- \\
  --url https://rocketnemovitosti.cz${RPC_PATH} \\
  --client CISLO --password HESLO --software-key KLIC`}
        </pre>
        <p>
          Projde přihlášení, vloží zkušební inzerát, vypíše ho a zase smaže. Zapisuje do databáze té
          instance, na kterou míříte — proti ostrému provozu tedy vznikne skutečný inzerát, ale
          zůstane v moderaci a veřejně se neobjeví. Parametrem <Code>--keep</Code> ho po sobě
          nesmaže, když si ho chcete prohlédnout.
        </p>
        <p>
          Když tenhle test projde a export kanceláře přesto nedorazí, chyba je na jejich straně —
          nejčastěji v klíči softwaru.
        </p>
      </Section>

      <Section title="Návratové kódy">
        <p>
          Rozhraní odpovídá číselným kódem podobně jako HTTP: 2xx znamená v pořádku, vyšší hodnoty
          chybu.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Kód</th>
                <th className="py-2 pr-4">Význam</th>
                <th className="py-2">Co s tím</th>
              </tr>
            </thead>
            <tbody>
              {STATUS_ROWS.map((row) => (
                <tr key={row.code} className="border-b border-border last:border-0 align-top">
                  <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.code}</td>
                  <td className="py-2 pr-4">{row.meaning}</td>
                  <td className="py-2 text-muted-foreground">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Druhá cesta: vlastní napojení přes API klíč">
        <p>
          Kdo si napojení píše sám, nemusí přes rozhraní pro exportní software. Pro ně je jednodušší
          JSON rozhraní <Code>{JSON_IMPORT_PATH}</Code> autorizované API klíčem — popsané ve{' '}
          <Link href="/api-dokumentace" className="text-brand-500 hover:text-primary">
            veřejné dokumentaci API
          </Link>
          .
        </p>
        <p>
          Obě cesty končí na stejném místě: koncept, moderace, publikace. Liší se jen tím, jak data
          dorazí.
        </p>
      </Section>
    </div>
  )
}
