import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, CheckCircle, Package, ArrowLeft, FileText, Eye, Flag, MessageSquare, Phone, ExternalLink, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import AddToCartModal from '../../components/store/AddToCartModal'
import ReportModal from '../../components/ui/ReportModal'
import toast from 'react-hot-toast'

const INITIAL_LIMIT = 6

function fmtPhone(p) {
  if (!p || p.includes(' ')) return p
  if (p.startsWith('+49') && p.length > 3) return `+49 ${p.slice(3, 6)} ${p.slice(6)}`
  return p
}

function getProductImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data?.publicUrl || null
}

export default function SupplierProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [supplier, setSupplier] = useState(null)
  const [products, setProducts] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [avatarLightbox, setAvatarLightbox] = useState(false)

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
    if (sp?.user_id) {
      const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', sp.user_id)
      setAddresses(addrs || [])
    }
    setLoading(false)
  }

  async function viewCert(cert) {
    if (!user) {
      toast.error('Please log in to view this certificate')
      navigate('/login')
      return
    }
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
      <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-slate-400 mb-4">Supplier not found</p>
          <button onClick={() => navigate('/suppliers')} className="text-midnight font-semibold hover:underline">Browse all suppliers</button>
        </div>
      </div>
    )
  }

  const isHalalCertified = certificates.length > 0 || supplier.is_verified
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const filteredProducts = activeCategory ? products.filter(p => p.category === activeCategory) : products
  const visibleProducts = showAll ? filteredProducts : filteredProducts.slice(0, INITIAL_LIMIT)

  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {profile?.role === 'restaurant_owner' && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
              <Flag className="w-4 h-4" /> Report Supplier
            </button>
          )}
        </div>

        {/* Banner */}
        <div className="relative h-56 bg-midnight rounded-xl overflow-hidden mb-8">
          {supplier.avatar_url ? (
            <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-midnight to-herb" />
          )}
          {/* Scrim: transparent at top → dark at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Clickable avatar circle */}
          {supplier.avatar_url && (
            <button
              onClick={() => setAvatarLightbox(true)}
              className="absolute top-4 right-4 w-14 h-14 rounded-full border-2 border-white/80 overflow-hidden shadow-lg hover:scale-105 transition-transform"
              title="View photo"
            >
              <img src={supplier.avatar_url} alt="" className="w-full h-full object-cover" />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h1 className="text-2xl font-black leading-tight">{supplier.business_name}</h1>
            <div className="flex items-center gap-2 text-sm mt-1.5 flex-wrap">
              {supplier.city && (() => {
                const cities = supplier.city.split(',').map(c => c.trim()).filter(Boolean)
                const firstAddr = addresses[0]
                const baseMaps = firstAddr?.latitude && firstAddr?.longitude
                  ? `${firstAddr.latitude},${firstAddr.longitude}`
                  : null
                return (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <MapPin className="w-3.5 h-3.5" />
                    {cities.map((c, i) => (
                      <a
                        key={`${c}-${i}`}
                        href={`https://maps.google.com/?q=${i === 0 && baseMaps ? baseMaps : encodeURIComponent(c)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full text-xs underline-offset-2 hover:underline transition-colors"
                      >
                        {c}
                      </a>
                    ))}
                  </span>
                )
              })()}
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-celeste transition-colors" onClick={e => e.stopPropagation()}>
                  <Phone className="w-3.5 h-3.5" />
                  <span>{fmtPhone(supplier.phone)}</span>
                </a>
              )}
              {isHalalCertified && (
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-herb-light" /> Halal Certified
                </span>
              )}
              {supplier.rating != null && (
                <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-xs">
                  ★ {Number(supplier.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar lightbox */}
        {avatarLightbox && supplier.avatar_url && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setAvatarLightbox(false)}>
            <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <img src={supplier.avatar_url} alt={supplier.business_name} className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {!supplier.is_active && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-sm">This supplier account is currently inactive</p>
              <p className="text-xs text-red-500 mt-0.5">Products from this supplier cannot be added to your cart. Please browse other verified suppliers.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Products — 2/3 width */}
          <div className="md:col-span-2">
            {/* Header + See All */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-slate-900">Products</h2>
              {filteredProducts.length > INITIAL_LIMIT && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="text-sm text-midnight font-semibold hover:text-midnight-dark transition-colors"
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
                        ? 'bg-midnight text-white'
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
                      onClick={() => profile?.role === 'restaurant_owner' && supplier.is_active && setSelectedProduct(product)}
                      className={`bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex gap-4 transition-colors ${profile?.role === 'restaurant_owner' && supplier.is_active ? 'cursor-pointer hover:border-herb' : 'opacity-60'}`}
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
                        <p className="text-sm font-semibold text-midnight mt-0.5">
                          €{Number(product.price).toFixed(2)} / {product.unit_type}
                        </p>
                        {profile?.role === 'restaurant_owner' && supplier.is_active && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedProduct(product) }}
                            className="mt-2 text-xs bg-midnight text-white px-3 py-1 rounded-full hover:bg-midnight transition-colors"
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
                className="mt-4 w-full py-2.5 text-sm text-midnight font-semibold border border-celeste rounded-xl hover:bg-lionsmane transition-colors"
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
                {supplier.category?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(Array.isArray(supplier.category) ? supplier.category : [supplier.category]).map(c => (
                    <span key={c} className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">{c}</span>
                  ))}
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`tel:${supplier.phone}`} className="text-sm text-midnight-dark font-medium hover:underline">{fmtPhone(supplier.phone)}</a>
                </div>
              )}
              {addresses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Locations</p>
                  <div className="space-y-1.5">
                    {addresses.map(addr => {
                      const q = addr.latitude && addr.longitude
                        ? `${addr.latitude},${addr.longitude}`
                        : encodeURIComponent([addr.street, addr.city].filter(Boolean).join(', '))
                      return (
                        <div key={addr.id} className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 flex-1 truncate">{addr.label || addr.city}</span>
                          <a href={`https://maps.google.com/?q=${q}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-midnight flex-shrink-0 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
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
                      <div key={cert.id} className="flex items-center gap-3 p-3 bg-lionsmane rounded-lg border border-celeste">
                        <FileText className="w-5 h-5 text-midnight flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-midnight truncate">{cert.file_name || 'Halal Certificate'}</p>
                          <p className="text-xs text-midnight-dark">Verified {new Date(cert.uploaded_at || cert.created_at).getFullYear()}</p>
                        </div>
                        <button onClick={() => viewCert(cert)} className="text-midnight hover:text-midnight-dark flex-shrink-0">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            {!profile ? (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-midnight text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
              >
                Order from this Supplier
              </button>
            ) : profile.role === 'restaurant_owner' ? (
              <button
                onClick={() => navigate(`/owner/chat?supplier_id=${supplier.id}`)}
                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-900 font-bold rounded-xl hover:border-herb-light hover:text-midnight-dark transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" /> Message Supplier
              </button>
            ) : null}
          </div>
        </div>
      </main>

      {selectedProduct && (
        <AddToCartModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
      {showReportModal && supplier && (
        <ReportModal type="supplier" targetId={supplier.id} targetName={supplier.business_name} onClose={() => setShowReportModal(false)} />
      )}

      <Footer />
    </div>
  )
}
