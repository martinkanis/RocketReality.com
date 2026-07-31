/**
 * Rozměry obrázku přečtené z hlavičky souboru. Importní rozhraní musí malé
 * obrázky odmítnout ještě před uložením, a to bez dekódování celé fotky —
 * knihovna na zpracování obrázků žije až ve workeru.
 */

export interface ImageDimensions {
  width: number
  height: number
}

const PNG_IHDR_WIDTH_OFFSET = 16
const GIF_WIDTH_OFFSET = 6

/** Značky SOF nesou rozměry; SOF4, SOF8 a SOF12 mezi ně nepatří. */
function isStartOfFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

function readPngDimensions(body: Buffer): ImageDimensions | null {
  if (body.length < PNG_IHDR_WIDTH_OFFSET + 8) return null
  return {
    width: body.readUInt32BE(PNG_IHDR_WIDTH_OFFSET),
    height: body.readUInt32BE(PNG_IHDR_WIDTH_OFFSET + 4),
  }
}

function readGifDimensions(body: Buffer): ImageDimensions | null {
  if (body.length < GIF_WIDTH_OFFSET + 4) return null
  return {
    width: body.readUInt16LE(GIF_WIDTH_OFFSET),
    height: body.readUInt16LE(GIF_WIDTH_OFFSET + 2),
  }
}

/** JPEG rozměry leží až v segmentu SOF, k němuž se musíme prokousat hlavičkami. */
function readJpegDimensions(body: Buffer): ImageDimensions | null {
  let offset = 2
  while (offset + 9 < body.length) {
    if (body[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = body[offset + 1]!
    if (isStartOfFrameMarker(marker)) {
      return { height: body.readUInt16BE(offset + 5), width: body.readUInt16BE(offset + 7) }
    }
    const segmentLength = body.readUInt16BE(offset + 2)
    if (segmentLength < 2) return null
    offset += 2 + segmentLength
  }
  return null
}

/** Rozměry obrázku, nebo null když je z hlavičky nelze spolehlivě přečíst. */
export function readImageDimensions(body: Buffer, mime: string): ImageDimensions | null {
  const dimensions =
    mime === 'image/png'
      ? readPngDimensions(body)
      : mime === 'image/gif'
        ? readGifDimensions(body)
        : readJpegDimensions(body)

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return null
  return dimensions
}
