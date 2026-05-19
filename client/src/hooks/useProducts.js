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
      // !inner forces an INNER JOIN so products without a matching verified+active
      // supplier profile are excluded at the database level, preventing the
      // client-side filter from wiping the whole result when the join returns null.
      let query = supabase
        .from('products')
        .select('*, supplier:supplier_profiles!inner(id, business_name, city, latitude, longitude, is_verified, is_active)')
        .eq('is_active', true)
        .eq('supplier_profiles.is_verified', true)
        .eq('supplier_profiles.is_active', true)

      if (category && category !== 'All') query = query.eq('category', category)
      if (search) query = query.ilike('name', `%${search}%`)

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      let result = data || []

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
      } else {
        // Default recommended: sort by top sales
        const ids = result.map(p => p.id)
        if (ids.length > 0) {
          const { data: salesData } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .in('product_id', ids)
          const salesMap = {}
          ;(salesData || []).forEach(row => {
            salesMap[row.product_id] = (salesMap[row.product_id] || 0) + row.quantity
          })
          result = result.sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0))
        }
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
