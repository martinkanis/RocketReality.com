'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'

import { cn } from '@/lib/utils'

import 'yet-another-react-lightbox/styles.css'

export interface GalleryImage {
  /** Varianta pro zobrazení v galerii. */
  src: string
  /** Originál pro fullscreen lightbox. */
  fullSrc: string
  alt: string
}

/** Fotogalerie detailu: hlavní carousel (embla) + náhledy, klik otevírá lightbox. */
export function ListingGallery({ images }: { images: GalleryImage[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const syncSelectedIndex = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', syncSelectedIndex)
    return () => {
      emblaApi.off('select', syncSelectedIndex)
    }
  }, [emblaApi, syncSelectedIndex])

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              className="min-w-0 flex-[0_0_100%] cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Zvětšit fotografii ${index + 1} z ${images.length}`}
              onClick={() => setIsLightboxOpen(true)}
            >
              <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Fotografie ${index + 1}`}
              aria-current={index === selectedIndex}
              className={cn(
                'shrink-0 overflow-hidden rounded-sm border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                index === selectedIndex ? 'border-brand-500' : 'border-transparent',
              )}
              onClick={() => emblaApi?.scrollTo(index)}
            >
              <img src={image.src} alt="" className="aspect-[4/3] w-20 object-cover" />
            </button>
          ))}
        </div>
      )}
      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        index={selectedIndex}
        slides={images.map((image) => ({ src: image.fullSrc, alt: image.alt }))}
      />
    </div>
  )
}
