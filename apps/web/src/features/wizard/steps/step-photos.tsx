'use client'

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { createUploadUrl, deletePhoto, registerPhoto, updatePhotoOrder } from '../actions'
import { MAX_PHOTOS, MAX_PHOTO_SIZE_BYTES } from '../types'
import type { PhotoItem } from '../types'
import { mediaUrl } from '@/lib/media'

interface StepPhotosProps {
  listingId: string | null
  photos: PhotoItem[]
  onPhotosChange: Dispatch<SetStateAction<PhotoItem[]>>
}

function reindexPositions(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((photo, index) => ({ ...photo, position: index }))
}

export function StepPhotos({ listingId, photos, onPhotosChange }: StepPhotosProps) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])

  async function uploadFile(targetListingId: string, file: File): Promise<void> {
    setUploadingCount((current) => current + 1)
    try {
      const urlResult = await createUploadUrl(targetListingId, file.name, file.type)
      if (!urlResult.ok) {
        setUploadErrors((errors) => [...errors, `${file.name}: ${urlResult.error}`])
        return
      }
      const response = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) {
        setUploadErrors((errors) => [...errors, `${file.name}: nahrání do úložiště selhalo`])
        return
      }
      const registered = await registerPhoto(
        targetListingId,
        urlResult.storageKey,
        file.type,
        file.size,
      )
      if (!registered.ok) {
        setUploadErrors((errors) => [...errors, `${file.name}: ${registered.error}`])
        return
      }
      onPhotosChange((current) => [...current, registered.photo])
    } catch {
      setUploadErrors((errors) => [...errors, `${file.name}: nahrání selhalo`])
    } finally {
      setUploadingCount((current) => current - 1)
    }
  }

  async function handleDrop(accepted: File[], rejections: FileRejection[]): Promise<void> {
    if (!listingId) return
    if (rejections.length > 0) {
      setUploadErrors((errors) => [
        ...errors,
        ...rejections.map(
          (rejection) =>
            `${rejection.file.name}: soubor je příliš velký nebo má nepodporovaný formát`,
        ),
      ])
    }
    const freeSlots = Math.max(0, MAX_PHOTOS - photos.length)
    if (accepted.length > freeSlots) {
      setUploadErrors((errors) => [
        ...errors,
        `Inzerát může mít nejvýše ${MAX_PHOTOS} fotografií — část souborů byla přeskočena`,
      ])
    }
    for (const file of accepted.slice(0, freeSlots)) {
      await uploadFile(listingId, file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejections) => {
      setUploadErrors([])
      void handleDrop(accepted, rejections)
    },
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: MAX_PHOTO_SIZE_BYTES,
    disabled: !listingId,
  })

  async function movePhoto(index: number, delta: -1 | 1): Promise<void> {
    if (!listingId) return
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= photos.length) return
    const reordered = [...photos]
    const moved = reordered[index]
    const neighbor = reordered[targetIndex]
    if (!moved || !neighbor) return
    reordered[index] = neighbor
    reordered[targetIndex] = moved
    const reindexed = reindexPositions(reordered)
    onPhotosChange(reindexed)
    await updatePhotoOrder(
      listingId,
      reindexed.map((photo) => photo.id),
    )
  }

  async function removePhoto(photo: PhotoItem): Promise<void> {
    if (!listingId) return
    const result = await deletePhoto(listingId, photo.id)
    if (!result.ok) {
      setUploadErrors((errors) => [...errors, result.error])
      return
    }
    onPhotosChange((current) => reindexPositions(current.filter((item) => item.id !== photo.id)))
  }

  if (!listingId) {
    return (
      <p className="text-sm text-muted-foreground">
        Fotografie lze nahrát až po vyplnění předchozích kroků.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragActive ? 'border-brand-400 bg-brand-50' : 'border-border hover:bg-muted',
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-heading">
          Přetáhněte sem fotografie, nebo klikněte pro výběr
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG nebo WebP, max 10 MB na soubor, nejvýše {MAX_PHOTOS} fotografií. První fotka
          bude úvodní.
        </p>
      </div>

      {uploadingCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Nahrávám {uploadingCount} {uploadingCount === 1 ? 'soubor' : 'soubory'}…
        </p>
      )}

      {uploadErrors.length > 0 && (
        <ul className="flex flex-col gap-1">
          {uploadErrors.map((error, index) => (
            <li key={index} className="text-sm text-destructive">
              {error}
            </li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="group relative">
              {/* Nahrané originály — deriváty generuje worker až po uploadu */}
              <img
                src={mediaUrl(photo.storageKey)}
                alt={`Fotografie ${index + 1}`}
                className="h-28 w-full rounded-md border border-border object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 rounded-sm bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
                  Úvodní
                </span>
              )}
              <div className="absolute right-1.5 bottom-1.5 flex gap-1">
                <button
                  type="button"
                  aria-label="Posunout doleva"
                  disabled={index === 0}
                  onClick={() => movePhoto(index, -1)}
                  className="rounded-sm bg-surface/90 p-1.5 text-heading transition-colors hover:bg-surface disabled:opacity-40"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Posunout doprava"
                  disabled={index === photos.length - 1}
                  onClick={() => movePhoto(index, 1)}
                  className="rounded-sm bg-surface/90 p-1.5 text-heading transition-colors hover:bg-surface disabled:opacity-40"
                >
                  <ArrowRight className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Smazat fotografii"
                  onClick={() => removePhoto(photo)}
                  className="rounded-sm bg-surface/90 p-1.5 text-destructive transition-colors hover:bg-surface"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
