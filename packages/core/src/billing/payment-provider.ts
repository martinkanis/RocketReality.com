export interface CheckoutRequest {
  orderId: string
  amount: number
  currency: string
  description: string
  /** Kam vrátit uživatele po platbě. */
  returnUrl: string
}

export type CheckoutResult =
  | { status: 'paid' }
  | { status: 'redirect'; url: string }
  | { status: 'failed'; errorCode: string }

/**
 * Port platební brány. V1 NullPaymentProvider (vše zdarma → okamžitě zaplaceno),
 * zapnutí monetizace = StripePaymentProvider + PAYMENTS_PROVIDER=stripe.
 */
export interface PaymentProviderPort {
  readonly name: 'free' | 'stripe'
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
}

export class NullPaymentProvider implements PaymentProviderPort {
  readonly name = 'free' as const

  createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    if (request.amount > 0) {
      return Promise.resolve({ status: 'failed', errorCode: 'free_provider_nonzero_amount' })
    }
    return Promise.resolve({ status: 'paid' })
  }
}
