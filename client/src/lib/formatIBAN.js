export function formatIBAN(iban) {
  if (!iban) return ''
  return iban.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()
}

export function handleIBANInput(value) {
  const raw = value.replace(/\s/g, '').toUpperCase().slice(0, 34)
  return raw.replace(/(.{4})/g, '$1 ').trim()
}
