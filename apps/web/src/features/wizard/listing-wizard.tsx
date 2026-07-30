'use client'

import { CATEGORY_BYTY_ID } from '@rocket/shared'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { saveDraft, submitListing } from './actions'
import { StepCategory } from './steps/step-category'
import { StepDescription } from './steps/step-description'
import { StepLocation } from './steps/step-location'
import { StepParameters } from './steps/step-parameters'
import { StepPhotos } from './steps/step-photos'
import { StepPrice } from './steps/step-price'
import {
  CATEGORY_POZEMKY_ID,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  WIZARD_STEPS,
  buildTitleSuggestion,
  createEmptyWizardData,
  parseOptionalNumber,
  toDraftPayload,
} from './types'
import type { MunicipalityOption, PhotoItem, SubmitErrorItem, WizardData } from './types'
import { WizardStepper } from './wizard-stepper'

const LAST_STEP = WIZARD_STEPS.length

interface ListingWizardProps {
  municipalities: MunicipalityOption[]
  initialListingId: string | null
  initialData: WizardData | null
  initialPhotos: PhotoItem[]
  initialStatus: 'draft' | 'rejected' | null
  rejectedReason: string | null
}

/** Klientská validace kroku před pokračováním — definitivní kontrola běží na serveru. */
function getStepBlocker(step: number, data: WizardData): string | null {
  switch (step) {
    case 1:
      if (!data.transaction) return 'Vyberte typ nabídky'
      if (!data.categoryMainId) return 'Vyberte kategorii nemovitosti'
      if (data.categoryMainId === CATEGORY_BYTY_ID && !data.disposition) {
        return 'Vyberte dispozici bytu'
      }
      return null
    case 2:
      return data.municipalityId ? null : 'Vyberte obec'
    case 3: {
      if (data.categoryMainId === CATEGORY_POZEMKY_ID) {
        return parseOptionalNumber(data.areaLand) ? null : 'Vyplňte plochu pozemku'
      }
      return parseOptionalNumber(data.areaUsable) ? null : 'Vyplňte užitnou plochu'
    }
    case 4: {
      if (!data.title.trim()) return 'Vyplňte titulek inzerátu'
      if (data.title.length > MAX_TITLE_LENGTH) {
        return `Titulek smí mít nejvýše ${MAX_TITLE_LENGTH} znaků`
      }
      const descriptionLength = data.description.trim().length
      if (descriptionLength < MIN_DESCRIPTION_LENGTH) {
        return `Popis musí mít alespoň ${MIN_DESCRIPTION_LENGTH} znaků (${descriptionLength}/${MIN_DESCRIPTION_LENGTH})`
      }
      return null
    }
    case LAST_STEP:
      if (!data.priceHidden && !parseOptionalNumber(data.priceAmount)) {
        return 'Vyplňte cenu, nebo zaškrtněte „Nezveřejňovat cenu"'
      }
      return null
    default:
      return null
  }
}

export function ListingWizard({
  municipalities,
  initialListingId,
  initialData,
  initialPhotos,
  initialStatus,
  rejectedReason,
}: ListingWizardProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(() => initialData ?? createEmptyWizardData())
  const [listingId, setListingId] = useState(initialListingId)
  const [photos, setPhotos] = useState(initialPhotos)
  const [isSaving, setIsSaving] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [submitErrors, setSubmitErrors] = useState<SubmitErrorItem[]>([])

  const municipality = municipalities.find((m) => m.id === data.municipalityId) ?? null

  function updateData(patch: Partial<WizardData>): void {
    setData((current) => ({ ...current, ...patch }))
    setStepError(null)
  }

  /** Autosave konceptu — vrací ID inzerátu (null, dokud není vybraná obec). */
  async function persistDraft(): Promise<{ saved: boolean; listingId: string | null }> {
    setIsSaving(true)
    try {
      const result = await saveDraft(listingId, toDraftPayload(data))
      if (!result.ok) {
        setStepError(result.error)
        return { saved: false, listingId }
      }
      if (result.listingId) setListingId(result.listingId)
      return { saved: true, listingId: result.listingId }
    } catch {
      setStepError('Uložení konceptu se nepodařilo, zkuste to prosím znovu.')
      return { saved: false, listingId }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleContinue(): Promise<void> {
    const blocker = getStepBlocker(step, data)
    if (blocker) {
      setStepError(blocker)
      return
    }
    const { saved } = await persistDraft()
    if (!saved) return
    if (step === 3 && !data.titleEdited) {
      const title = buildTitleSuggestion(data, municipality?.name ?? '')
      setData((current) => (current.titleEdited ? current : { ...current, title }))
    }
    setStep(step + 1)
    setStepError(null)
  }

  function handleBack(): void {
    if (step > 1) {
      setStep(step - 1)
      setStepError(null)
    }
  }

  async function handleSubmit(): Promise<void> {
    const blocker = getStepBlocker(step, data)
    if (blocker) {
      setStepError(blocker)
      return
    }
    setSubmitErrors([])
    const { saved, listingId: savedListingId } = await persistDraft()
    if (!saved) return
    if (!savedListingId) {
      setStepError('Koncept se nepodařilo uložit, zkuste to prosím znovu.')
      return
    }
    setIsSaving(true)
    try {
      const result = await submitListing(savedListingId)
      // Při úspěchu server přesměruje — sem se dostaneme jen s validačními chybami
      if (result && !result.ok) setSubmitErrors(result.errors)
    } catch {
      setStepError('Odeslání se nepodařilo, zkuste to prosím znovu.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {initialStatus === 'rejected' && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-bg p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Tento inzerát byl při moderaci zamítnut
            {rejectedReason ? `: ${rejectedReason}` : ''}. Po úpravě ho můžete znovu odeslat ke
            schválení.
          </span>
        </div>
      )}
      {initialStatus === 'draft' && step === 1 && (
        <p className="rounded-md bg-info-bg px-3 py-2.5 text-sm text-info">
          Pokračujete v rozpracovaném konceptu.
        </p>
      )}

      <WizardStepper currentStep={step} onStepSelect={setStep} />

      <Card>
        <CardContent>
          {step === 1 && <StepCategory data={data} onChange={updateData} />}
          {step === 2 && (
            <StepLocation data={data} onChange={updateData} municipalities={municipalities} />
          )}
          {step === 3 && <StepParameters data={data} onChange={updateData} />}
          {step === 4 && <StepDescription data={data} onChange={updateData} />}
          {step === 5 && (
            <StepPhotos
              listingId={listingId}
              photos={photos}
              onPhotosChange={setPhotos}
            />
          )}
          {step === LAST_STEP && (
            <StepPrice
              data={data}
              onChange={updateData}
              municipalityName={municipality?.name ?? null}
              photoCount={photos.length}
              submitErrors={submitErrors}
            />
          )}
        </CardContent>
      </Card>

      {stepError && <p className="text-sm text-destructive">{stepError}</p>}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSaving}>
          Zpět
        </Button>
        {step < LAST_STEP ? (
          <Button onClick={handleContinue} disabled={isSaving}>
            {isSaving ? 'Ukládám…' : 'Pokračovat'}
          </Button>
        ) : (
          <Button variant="accent" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Odesílám…' : 'Odeslat ke schválení'}
          </Button>
        )}
      </div>
    </div>
  )
}
