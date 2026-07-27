'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from './types'

interface WizardStepperProps {
  currentStep: number
  onStepSelect: (step: number) => void
}

/** Stepper průvodce: hotové kroky emerald, aktivní gold, budoucí muted. */
export function WizardStepper({ currentStep, onStepSelect }: WizardStepperProps) {
  return (
    <ol className="flex items-start gap-1 sm:gap-2">
      {WIZARD_STEPS.map((step) => {
        const isDone = step.id < currentStep
        const isActive = step.id === currentStep
        return (
          <li key={step.id} className="flex flex-1 flex-col items-center gap-1.5">
            <button
              type="button"
              disabled={!isDone}
              onClick={() => onStepSelect(step.id)}
              aria-label={`Krok ${step.id}: ${step.title}`}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                isDone && 'cursor-pointer bg-brand-500 text-white hover:bg-brand-600',
                isActive && 'bg-accent text-accent-foreground',
                !isDone && !isActive && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="size-4" /> : step.id}
            </button>
            <span
              className={cn(
                'hidden text-center text-xs sm:block',
                isActive ? 'font-medium text-heading' : 'text-muted-foreground',
              )}
            >
              {step.title}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
