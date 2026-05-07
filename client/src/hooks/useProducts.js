import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { haversineKm } from '../lib/haversine'

const PAGE_SIZE = 20

export function useProducts({ category, search, sortBy, userLat, userLng, city } = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setPage(0)
    setProducts([])
    setHasMore(true)
  }, [category, search, sortBy, userLat, userLng, city])

  useEffect(() => {
    fetchProducts()
  }, [page, category, search, city])

  async function fetchProducts() {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*, supplier:supplier_profiles(id, business_name, city, latitude, longitude, is_verified)')
        .eq('is_active', true)

      if (category && category !== 'All') query = query.eq('category', category)
      if (search) query = query.ilike('name', `%${search}%`)
      if (city) query = query.eq('supplier.city', city)

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      let result = (data || []).filter(p => p.supplier?.is_verified === true)

      if (sortBy === 'nearest' && userLat && userLng) {
        result = result.sort((a, b) => {
          const da = a.supplier?.latitude
            ? haversineKm(userLat, userLng, a.supplier.latitude, a.supplier.longitude)
            : Infinity
          const db = b.supplier?.latitude
            ? haversineKm(userLat, userLng, b.supplier.latitude, b.supplier.longitude)
            : Infinity
          return da - db
        })
      } else if (sortBy === 'price_asc') {
        result = result.sort((a, b) => a.price - b.price)
      } else if (sortBy === 'price_desc') {
        result = result.sort((a, b) => b.price - a.price)
      }

      setProducts(prev => page === 0 ? result : [...prev, ...result])
      setHasMore(result.length === PAGE_SIZE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { products, loading, error, hasMore, loadMore: () => setPage(p => p + 1) }
}
