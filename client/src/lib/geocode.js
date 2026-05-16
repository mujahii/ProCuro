export async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'de,en' } }
  )
  if (!res.ok) return null
  return res.json()
}

export async function forwardGeocode(query) {
  if (!query) return null
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'de,en' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0] || null
}
