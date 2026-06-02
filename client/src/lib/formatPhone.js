// Format a stored phone string for display.
// "+4915560608671" → "+49 155 60608671"
export function formatPhone(raw) {
  if (!raw) return ''
  const stripped = raw.replace(/\s+/g, '')
  if (stripped.startsWith('+49')) {
    const rest = stripped.slice(3)
    if (!rest) return '+49'
    const net = rest.slice(0, 3)
    const sub = rest.slice(3)
    return sub ? `+49 ${net} ${sub}` : `+49 ${net}`
  }
  const local = stripped.match(/^(0\d{3,4})(\d+)$/)
  if (local) return `${local[1]} ${local[2]}`
  return raw
}
