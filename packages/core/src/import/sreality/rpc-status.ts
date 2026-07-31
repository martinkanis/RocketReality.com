import type { XmlRpcValue } from './xml-rpc'

/** Návratové kódy importního rozhraní — významy odpovídají HTTP konvenci (2xx = OK). */
export const STATUS = {
  ok: 200,
  unknownClient: 402,
  notFound: 404,
  badSession: 407,
  photoTooLarge: 410,
  photoTooSmall: 412,
  photoOfAnotherAdvert: 450,
  duplicatePhoto: 451,
  incompleteData: 452,
  unsupportedImageFormat: 476,
} as const

/** Chyba nesoucí návratový kód rozhraní; dispatcher ji převede na odpověď. */
export class RpcStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Odpověď rozhraní. Záměrně type alias, ne interface — jen tak je typ
 * přiřaditelný do XmlRpcValue při serializaci.
 */
export type RpcResponse = {
  status: number
  statusMessage: string
  output: XmlRpcValue
}

export function ok(output: XmlRpcValue = {}): RpcResponse {
  return { status: STATUS.ok, statusMessage: 'OK', output }
}
