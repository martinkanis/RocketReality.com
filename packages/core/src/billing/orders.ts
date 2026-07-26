import { loadEnv, type ProductDefinition } from '@rocket/config'
import { getDb, orderItems, orders, payments, products } from '@rocket/db'
import type { OrderItemType } from '@rocket/shared'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { NullPaymentProvider, type CheckoutResult, type PaymentProviderPort } from './payment-provider'

export class ProductNotFoundError extends Error {
  constructor(code: string) {
    super(`Produkt '${code}' neexistuje nebo není aktivní`)
  }
}

const ORDER_ITEM_TYPE_BY_PRODUCT: Record<string, OrderItemType> = {
  publikace_30d: 'publikace',
  prodlouzeni_30d: 'prodlouzeni',
  top_7d: 'topovani',
}

function resolveProvider(): PaymentProviderPort {
  const env = loadEnv()
  if (env.PAYMENTS_PROVIDER === 'stripe') {
    // Stripe provider se doplní při zapnutí monetizace (V3) — do té doby je to chyba konfigurace.
    throw new Error('StripePaymentProvider zatím není implementován — nastav PAYMENTS_PROVIDER=free')
  }
  return new NullPaymentProvider()
}

export interface PlaceOrderInput {
  userId: string
  agencyId: string | null
  listingId: string
  productCode: string
  returnUrl: string
}

export interface PlaceOrderResult {
  orderId: string
  checkout: CheckoutResult
  product: ProductDefinition
}

/**
 * Každá zpoplatnitelná akce (publikace, prodloužení, topování) jde přes objednávku,
 * i když je v V1 zdarma — zapnutí Stripe pak nemění žádný fulfillment kód.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const db = getDb()
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.code, input.productCode))
    .limit(1)
  if (!product || !product.isActive) {
    throw new ProductNotFoundError(input.productCode)
  }
  const itemType = ORDER_ITEM_TYPE_BY_PRODUCT[input.productCode]
  if (!itemType) {
    throw new ProductNotFoundError(input.productCode)
  }

  const provider = resolveProvider()
  const orderNumber = `RR-${new Date().getFullYear()}-${uuidv7().slice(-8)}`

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        number: orderNumber,
        userId: input.userId,
        agencyId: input.agencyId,
        totalAmount: product.price,
        currency: product.currency,
      })
      .returning({ id: orders.id })
    if (!order) throw new Error('Objednávku se nepodařilo založit')

    await tx.insert(orderItems).values({
      orderId: order.id,
      type: itemType,
      productId: product.id,
      listingId: input.listingId,
      unitPrice: product.price,
    })

    const checkout = await provider.createCheckout({
      orderId: order.id,
      amount: product.price,
      currency: product.currency,
      description: product.name,
      returnUrl: input.returnUrl,
    })

    await tx.insert(payments).values({
      orderId: order.id,
      provider: provider.name,
      status:
        checkout.status === 'paid' ? 'succeeded' : checkout.status === 'failed' ? 'failed' : 'pending',
      amount: product.price,
      currency: product.currency,
      idempotencyKey: uuidv7(),
      errorCode: checkout.status === 'failed' ? checkout.errorCode : null,
      confirmedAt: checkout.status === 'paid' ? new Date() : null,
    })

    await tx
      .update(orders)
      .set(
        checkout.status === 'paid'
          ? { status: 'paid', paidAt: new Date() }
          : checkout.status === 'failed'
            ? { status: 'cancelled' }
            : { status: 'pending_payment' },
      )
      .where(eq(orders.id, order.id))

    return { orderId: order.id, checkout }
  })

  return {
    ...result,
    product: {
      code: product.code,
      name: product.name,
      priceCzk: product.price,
      durationDays: product.durationDays,
    },
  }
}
