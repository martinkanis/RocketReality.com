import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { loadEnv } from '@rocket/config'
import {
  UnknownRpcMethodError,
  XmlRpcParseError,
  handleImportRpcCall,
  parseMethodCall,
  serializeFault,
  serializeMethodResponse,
  type ImportPhotoStoragePort,
} from '@rocket/core'
import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api.import.rpc')

/** Strop na velikost požadavku — musí pokrýt fotku zakódovanou v base64. */
const MAX_REQUEST_BYTES = 16 * 1024 * 1024

const XML_CONTENT_TYPE = 'text/xml; charset=utf-8'

/** Chybové kódy XML-RPC faultu — vyhrazené pro chyby protokolu, ne pro chyby dat. */
const FAULT_MALFORMED_REQUEST = -32700
const FAULT_UNKNOWN_METHOD = -32601
const FAULT_INTERNAL_ERROR = -32500

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    const env = loadEnv()
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // Garage (produkce) chce bucket v adrese serveru, MinIO (vývoj) v cestě.
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    })
  }
  return s3Client
}

/** Originál se uloží do stejného úložiště jako fotky z webu; varianty dodělá worker. */
const photoStorage: ImportPhotoStoragePort = {
  async upload({ storageKey, body, contentType }) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: loadEnv().S3_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    )
  },
}

function xmlResponse(body: string): NextResponse {
  return new NextResponse(body, { headers: { 'content-type': XML_CONTENT_TYPE } })
}

/**
 * Importní XML-RPC rozhraní pro exportní software realitních kanceláří.
 * Přijímá stejné metody a struktury jako běžné portálové importy, takže
 * kancelář nás přidá jako další cíl exportu bez zásahu do svého softwaru.
 * Data se zpracují stejnou cestou jako JSON import — koncept jde do moderace.
 */
export async function POST(request: NextRequest) {
  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isInteger(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return xmlResponse(serializeFault(FAULT_MALFORMED_REQUEST, 'Požadavek je příliš velký'))
  }

  const body = await request.text()
  if (Buffer.byteLength(body, 'utf8') > MAX_REQUEST_BYTES) {
    return xmlResponse(serializeFault(FAULT_MALFORMED_REQUEST, 'Požadavek je příliš velký'))
  }

  try {
    const call = parseMethodCall(body)
    return xmlResponse(serializeMethodResponse(await handleImportRpcCall(call, { photoStorage })))
  } catch (error) {
    if (error instanceof XmlRpcParseError) {
      return xmlResponse(serializeFault(FAULT_MALFORMED_REQUEST, error.message))
    }
    if (error instanceof UnknownRpcMethodError) {
      return xmlResponse(serializeFault(FAULT_UNKNOWN_METHOD, error.message))
    }
    logger.error({ err: error }, 'Volání importního XML-RPC rozhraní selhalo')
    return xmlResponse(serializeFault(FAULT_INTERNAL_ERROR, 'Požadavek se nepodařilo zpracovat'))
  }
}
