import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { loadEnv } from '@rocket/config'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Výdej fotek z úložiště přes aplikaci.
 *
 * Garage (úložiště Rock8) zatím neumí anonymní přístup, takže prohlížeč
 * nemůže sáhnout do bucketu přímo — objekty proto čte server s přihlašovacími
 * údaji a posílá je dál. Zároveň tím odpadá potřeba veřejné adresy úložiště,
 * na které se dřív dalo snadno zapomenout a fotky pak mířily na localhost.
 */

const ALLOWED_PREFIX = 'listings/'
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

let cachedClient: S3Client | null = null

function getS3Client(): S3Client {
  if (cachedClient) return cachedClient
  const env = loadEnv()
  cachedClient = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // Garage (produkce) chce bucket v adrese serveru, MinIO (vývoj) v cestě.
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  })
  return cachedClient
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params
  const storageKey = key.map((segment) => decodeURIComponent(segment)).join('/')

  // Fotky inzerátů jsou jediný veřejný obsah bucketu; cokoli jiného ven nepatří.
  if (!storageKey.startsWith(ALLOWED_PREFIX) || storageKey.includes('..')) {
    return new NextResponse('Nenalezeno', { status: 404 })
  }

  try {
    const env = loadEnv()
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }),
    )
    if (!result.Body) {
      return new NextResponse('Nenalezeno', { status: 404 })
    }

    const body = await result.Body.transformToByteArray()
    return new NextResponse(Buffer.from(body), {
      headers: {
        'Content-Type': result.ContentType ?? 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'Cache-Control': CACHE_CONTROL,
      },
    })
  } catch {
    // Chybějící objekt není chyba hodná logování — fotka se prostě nezobrazí.
    return new NextResponse('Nenalezeno', { status: 404 })
  }
}
