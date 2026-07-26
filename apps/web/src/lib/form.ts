/** Bezpečné čtení textového pole z FormData (File a null → prázdný řetězec). */
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}
