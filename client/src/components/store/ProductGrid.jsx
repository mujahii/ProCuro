import ProductCard from './ProductCard'
import { SkeletonCard } from '../ui/Skeleton'

export default function ProductGrid({ products, loading, hasMore, onLoadMore, onAddToCart }) {
  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!loading && products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-gray-500 font-semibold">No products found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map(product => (
          <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary px-8 text-sm"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
