export function fmtPhone(p) {
  if (!p || p.includes(' ')) return p
  if (p.startsWith('+49') && p.length > 3) return `+49 ${p.slice(3, 6)} ${p.slice(6)}`
  return p
}
