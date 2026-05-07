import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, CheckCircle, Package, ArrowLeft, FileText, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

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

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    const [{ data: sp }, { data: prods }, { data: certs }] = await Promise.all([
      supabase.from('supplier_profiles').select('*').eq('id', id).single(),
      supabase.from('products').select('*').eq('supplier_id', id).eq('is_active', true).limit(12),
      supabase.from('halal_certificates').select('*').eq('supplier_id', id).eq('status', 'approved'),
    ])
    setSupplier(sp)
    setProducts(prods || [])
    setCertificates(certs || [])
    setLoading(false)
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Hero header */}
        <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden mb-8">
          {supplier.cover_url ? (
            <img src={supplier.cover_url} alt={supplier.business_name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-emerald-900 opacity-80" />
          )}
          <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-full bg-white overflow-hidden flex items-center justify-center border-2 border-white/30 flex-shrink-0">
                {supplier.avatar_url ? (
                  <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{supplier.business_name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-white/80 flex-wrap">
                  {supplier.city && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{supplier.city}</span>
                  )}
                  {certificates.length > 0 && (
                    <span className="flex items-center gap-1 bg-emerald-600/30 border border-emerald-400/30 px-2 py-0.5 rounded-full text-emerald-200 text-xs">
                      <CheckCircle className="w-3 h-3" /> Halal Certified
                    </span>
                  )}
                  {supplier.rating > 0 && (
                    <span className="text-amber-300">★ {Number(supplier.rating).toFixed(1)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Products */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Products</h2>
            {products.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No products listed yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map(product => {
                  const imgUrl = getProductImageUrl(product.image_url)
                  return (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-36 bg-slate-100">
                        {imgUrl ? (
                          <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-10 h-10" />
                          </div>
                        )}
                        {!product.is_active && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-slate-500 font-bold text-sm">Out of Stock</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                        <p className="text-base font-bold text-slate-900 mt-1">€{Number(product.price).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {product.unit_type}</span></p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* About */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-bold text-slate-900 mb-3">About</h3>
              {supplier.description ? (
                <p className="text-sm text-slate-600 leading-relaxed">{supplier.description}</p>
              ) : (
                <p className="text-sm text-slate-400">No description provided</p>
              )}
              {supplier.category && (
                <div className="mt-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{supplier.category}</span>
                </div>
              )}
            </div>

            {/* Halal Certificates */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-bold text-slate-900 mb-3">Certifications</h3>
              {certificates.length === 0 ? (
                <p className="text-sm text-slate-400">No certificates available</p>
              ) : (
                <div className="space-y-2">
                  {certificates.map(cert => (
                    <div key={cert.id} className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-emerald-700 font-medium truncate">{cert.file_name || 'Halal Certificate'}</p>
                          {cert.created_at && (
                            <p className="text-xs text-slate-400">Verified {new Date(cert.created_at).getFullYear()}</p>
                          )}
                        </div>
                      </div>
                      {cert.file_url && (
                        <a href={cert.file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 flex-shrink-0">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA */}
            {profile?.role === 'owner' ? (
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
      <Footer />
    </div>
  )
}
