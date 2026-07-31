import { describe, expect, it } from 'vitest'
import { readImageDimensions } from './image-dimensions'

/** Hlavička PNG: podpis, délka a značka IHDR, pak šířka a výška. */
function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24)
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  buffer.writeUInt32BE(13, 8)
  buffer.write('IHDR', 12, 'ascii')
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

/** Hlavička GIF: podpis GIF89a a rozměry v little endian. */
function gifHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(10)
  buffer.write('GIF89a', 0, 'ascii')
  buffer.writeUInt16LE(width, 6)
  buffer.writeUInt16LE(height, 8)
  return buffer
}

/**
 * JPEG se segmentem APP0 před SOF0, aby test ověřil i překonání hlaviček,
 * kterými se parser musí prokousat.
 */
function jpegHeader(width: number, height: number): Buffer {
  const app0 = Buffer.alloc(18)
  app0.writeUInt16BE(0xffe0, 0)
  app0.writeUInt16BE(16, 2)
  app0.write('JFIF', 4, 'ascii')

  const sof0 = Buffer.alloc(11)
  sof0.writeUInt16BE(0xffc0, 0)
  sof0.writeUInt16BE(9, 2)
  sof0.writeUInt8(8, 4)
  sof0.writeUInt16BE(height, 5)
  sof0.writeUInt16BE(width, 7)

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof0])
}

describe('readImageDimensions', () => {
  it('přečte rozměry PNG', () => {
    expect(readImageDimensions(pngHeader(1920, 1080), 'image/png')).toEqual({
      width: 1920,
      height: 1080,
    })
  })

  it('přečte rozměry GIF', () => {
    expect(readImageDimensions(gifHeader(800, 600), 'image/gif')).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('přečte rozměry JPEG i za předchozím segmentem', () => {
    expect(readImageDimensions(jpegHeader(1024, 768), 'image/jpeg')).toEqual({
      width: 1024,
      height: 768,
    })
  })

  it('nepřečte rozměry z uříznuté hlavičky a vrátí null', () => {
    expect(readImageDimensions(pngHeader(100, 100).subarray(0, 12), 'image/png')).toBeNull()
    expect(readImageDimensions(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBeNull()
  })

  it('nulové rozměry považuje za nepřečtené', () => {
    expect(readImageDimensions(pngHeader(0, 0), 'image/png')).toBeNull()
  })
})
