import { render } from '@react-email/components'
import type { ReactElement } from 'react'

export interface RenderedEmail {
  html: string
  text: string
}

/** Vyrenderuje react-email šablonu do HTML a plaintextové alternativy. */
export async function renderTemplate(component: ReactElement): Promise<RenderedEmail> {
  const html = await render(component)
  const text = await render(component, { plainText: true })
  return { html, text }
}
