import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, CheckCircle, Package, ArrowLeft, FileText, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import AddToCartModal from '../../components/store/AddToCartModal'
import toast from 'react-hot-toast'

const INITIAL_LIMIT = 6

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function SupplierProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [supplier, setSupplier] = useState(null)
  const [products, setProducts] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    const [{ data: sp }, { data: prods }, { data: certs }] = await Promise.all([
      supabase.from('supplier_profiles').select('*').eq('id', id).single(),
      supabase.from('products').select('*').eq('supplier_id', id).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('halal_certificates').select('*').eq('supplier_id', id).eq('status', 'approved'),
    ])
    setSupplier(sp)
    setProducts(prods || [])
    setCertificates(certs || [])
    setLoading(false)
  }

  async function viewCert(cert) {
    const win = window.open('about:blank', '_blank')
    const { data, error } = await supabase.storage.from('halal-certificates').createSignedUrl(cert.file_url, 300)
    if (data?.signedUrl) {
      win.location.href = data.signedUrl
    } else {
      win?.close()
      toast.error(error?.message || 'Could not open certificate')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-slate-400 mb-4">Supplier not found</p>
          <button onClick={() => navigate('/suppliers')} className="text-emerald-600 font-semibold hover:underline">Browse all suppliers</button>
        </div>
      </div>
    )
  }

  const isHalalCertified = certificates.length > 0 || supplier.is_verified
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filteredProducts = activeCategory ? products.filter(p => p.category === activeCategory) : products
  const visibleProducts = showAll ? filteredProducts : filteredProducts.slice(0, INITIAL_LIMIT)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Banner */}
        <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden mb-8">
          {supplier.avatar_url ? (
            <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-emerald-900" />
          )}
          <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
            <h1 className="text-3xl font-bold">{supplier.business_name}</h1>
            <p className="flex items-center gap-2 text-sm opacity-90 mt-1 flex-wrap">
              {supplier.city && (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>{supplier.city}</span>
                  {isHalalCertified && <span>•</span>}
                </>
              )}
              {isHalalCertified && (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Halal Certified</span>
                </>
              )}
              {supplier.rating > 0 && (
                <span className="text-amber-300 ml-1">★ {Number(supplier.rating).toFixed(1)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Products — 2/3 width */}
          <div className="md:col-span-2">
            {/* Header + See All */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-900">Products</h2>
              {filteredProducts.length > INITIAL_LIMIT && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                >
                  {showAll ? 'Show Less' : `See All (${filteredProducts.length})`}
                </button>
              )}
            </div>

            {/* Category chips — iOS style, text only, filterable */}
            {uniqueCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setShowAll(false) }}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                      activeCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No products listed yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleProducts.map(product => {
                  const imgUrl = getProductImageUrl(product.image_url)
                  return (
                    <div
                      key={product.id}
                      onClick={() => profile?.role === 'restaurant_owner' && setSelectedProduct(product)}
                      className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 cursor-pointer hover:border-emerald-500 transition-colors"
                    >
                      <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {imgUrl ? (
                          <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900">{product.name}</h4>
                        <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                          €{Number(product.price).toFixed(2)} / {product.unit_type}
                        </p>
                        {profile?.role === 'restaurant_owner' && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedProduct(product) }}
                            className="mt-2 text-xs bg-slate-900 text-white px-3 py-1 rounded-full hover:bg-emerald-600 transition-colors"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Inline expand link at bottom too */}
            {filteredProducts.length > INITIAL_LIMIT && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="mt-4 w-full py-2.5 text-sm text-emerald-600 font-semibold border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                {showAll ? 'Show Less' : `See All ${filteredProducts.length} Products`}
              </button>
            )}
          </div>

          {/* Sidebar — 1/3 width */}
          <div className="space-y-4">
            {/* About + Certifications in one card with dividers */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* About */}
              <div className="p-5">
                <h3 className="font-bold text-slate-900 mb-2">About</h3>
                {supplier.description ? (
                  <p className="text-sm text-slate-600 leading-relaxed">{supplier.description}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No description provided</p>
                )}
                {supplier.category && (
                  <span className="inline-block mt-3 text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    {supplier.category}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-100" />

              {/* Certifications */}
              <div className="p-5">
                <h3 className="font-bold text-slate-900 mb-3">Certifications</h3>
                {certificates.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No certificates available</p>
                ) : (
                  <div className="space-y-2">
                    {certificates.map(cert => (
                      <div key={cert.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-emerald-900 truncate">{cert.file_name || 'Halal Certificate'}</p>
                          <p className="text-xs text-emerald-700">Verified {new Date(cert.uploaded_at || cert.created_at).getFullYear()}</p>
                        </div>
                        <button onClick={() => viewCert(cert)} className="text-emerald-600 hover:text-emerald-700 flex-shrink-0">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            {profile?.role === 'restaurant_owner' ? (
              <button
                onClick={() => navigate('/store')}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                Browse Products
              </button>
            ) : !profile ? (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                Order from this Supplier
              </button>
            ) : null}
          </div>
        </div>
      </main>

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <Footer />
    </div>
  )
}
