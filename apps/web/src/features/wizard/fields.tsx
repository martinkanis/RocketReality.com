'use client'

import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  children: ReactNode
}

export function Field({ id, label, required = false, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

interface NumberFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  required?: boolean
  min?: number
  step?: string
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  required,
  min = 0,
  step = 'any',
}: NumberFieldProps) {
  return (
    <Field id={id} label={label} required={required}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={unit ? 'pr-14' : undefined}
        />
        {unit && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Vyberte',
  required,
}: SelectFieldProps) {
  return (
    <Field id={id} label={label} required={required}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
