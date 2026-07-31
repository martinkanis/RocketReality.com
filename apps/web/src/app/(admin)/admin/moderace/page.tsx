import { districts, getDb, listings, moderationCases, municipalities, users } from '@rocket/db'
import { formatPrice } from '@rocket/shared'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { ModerationQueueItem } from '@/features/moderation/moderation-queue-item'

export const metadata = { title: 'Moderace inzerátů' }

export default async function ModerationPage() {
  const db = getDb()
  const queue = await db
    .select({
      caseId: moderationCases.id,
      createdAt: moderationCases.createdAt,
      flaggedNote: moderationCases.note,
      listingId: listings.id,
      slug: listings.slug,
      title: listings.title,
      description: listings.description,
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      municipalityName: municipalities.name,
      districtName: districts.name,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(moderationCases)
    .innerJoin(listings, eq(moderationCases.listingId, listings.id))
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    // Smazaný inzerát nemá co schvalovat — jinak by ve frontě zůstal viset.
    .where(and(eq(moderationCases.status, 'pending'), isNull(listings.deletedAt)))
    .orderBy(asc(moderationCases.createdAt))

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-heading">Fronta moderace</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {queue.length === 0
          ? 'Žádné inzeráty nečekají na schválení.'
          : `Na schválení čeká ${queue.length} inzerátů.`}
      </p>
      <div className="flex flex-col gap-4">
        {queue.map((item) => (
          <ModerationQueueItem
            key={item.caseId}
            listingId={item.listingId}
            title={item.title}
            description={item.description}
            price={formatPrice({
              amount: item.priceAmount,
              currency: item.priceCurrency,
              unit: item.priceUnit,
              hidden: item.priceHidden,
            })}
            locality={`${item.municipalityName}, okres ${item.districtName}`}
            owner={`${item.ownerName} (${item.ownerEmail})`}
            submittedAt={item.createdAt.toLocaleString('cs-CZ')}
            flaggedNote={item.flaggedNote}
          />
        ))}
      </div>
    </div>
  )
}
