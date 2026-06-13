const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Nominatim usage policy: max 1 request/second, must include User-Agent
async function geocodeCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Germany')}&format=json&limit=1&addressdetails=0`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ProCuro/1.0 (support@procuro.com)',
      'Accept-Language': 'de,en',
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data?.[0]) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

exports.handler = async () => {
  try {
    // Fetch all addresses with city but missing coordinates
    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('id, city, postal_code')
      .not('city', 'is', null)
      .is('latitude', null)
      .limit(100)

    if (error) throw error
    if (!addresses?.length) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, geocoded: 0, message: 'No addresses to geocode' }) }
    }

    // Deduplicate by city (geocoding once per unique city is enough)
    const cityMap = {}
    for (const addr of addresses) {
      const key = addr.city.trim().toLowerCase()
      if (!cityMap[key]) cityMap[key] = { city: addr.city.trim(), postal_code: addr.postal_code, ids: [] }
      cityMap[key].ids.push(addr.id)
    }

    let geocoded = 0
    let failed = 0

    for (const entry of Object.values(cityMap)) {
      // Use postal_code + city for best accuracy, fall back to city only
      const query = entry.postal_code
        ? `${entry.postal_code} ${entry.city}`
        : entry.city

      const coords = await geocodeCity(query)

      if (coords) {
        const { error: updateError } = await supabase
          .from('addresses')
          .update({ latitude: coords.lat, longitude: coords.lng })
          .in('id', entry.ids)

        if (updateError) {
          console.error(`[geocode-addresses] update failed for ${entry.city}:`, updateError.message)
          failed++
        } else {
          geocoded += entry.ids.length
        }
      } else {
        console.warn(`[geocode-addresses] no result for "${query}"`)
        failed++
      }

      // Respect Nominatim rate limit: 1 request/second
      await sleep(1100)
    }

    console.log(`[geocode-addresses] done: ${geocoded} updated, ${failed} failed`)
    return { statusCode: 200, body: JSON.stringify({ ok: true, geocoded, failed }) }
  } catch (err) {
    console.error('[geocode-addresses]', err?.message || err)
    return { statusCode: 500, body: JSON.stringify({ error: err?.message || String(err) }) }
  }
}
