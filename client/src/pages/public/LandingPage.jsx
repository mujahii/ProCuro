import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, MapPin, ChevronRight, Drumstick, Beef, Leaf, Coffee, Apple, Package, Truck, Shield, Fish, Milk, Flame, Wheat } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const CATEGORIES = [
  { name: 'Meat', icon: Beef },
  { name: 'Poultry', icon: Drumstick },
  { name: 'Seafood', icon: Fish },
  { name: 'Dairy', icon: Milk },
  { name: 'Vegetables', icon: Leaf },
  { name: 'Fruits', icon: Apple },
  { name: 'Bakery', icon: Wheat },
  { name: 'Beverages', icon: Coffee },
  { name: 'Spices', icon: Flame },
  { name: 'Other', icon: Package },
]

const STATS = [
  { number: '500+', label: 'Restaurants' },
  { number: '120+', label: 'Verified Suppliers' },
  { number: '50,000+', label: 'Orders Placed' },
  { number: '4.9★', label: 'Average Rating' },
]

const HOW_IT_WORKS = [
  { icon: Shield, title: 'Create Your Account', desc: 'Sign up as a restaurant owner or supplier in minutes. No hidden fees.' },
  { icon: Package, title: 'Browse & Order', desc: 'Browse verified Halal suppliers and place orders with a single click.' },
  { icon: Truck, title: 'Track Delivery', desc: 'Track your delivery in real-time and manage all orders from one place.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, authUser, role, loading } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    if (loading) return
    if (authUser && !user) {
      // Signed in but no role chosen yet
      navigate('/select-role', { replace: true })
    } else if (user) {
      if (role === 'restaurant_owner') navigate('/owner/store', { replace: true })
      else if (role === 'supplier') navigate('/supplier/dashboard', { replace: true })
      else if (role === 'admin') navigate('/admin/dashboard', { replace: true })
    }
  }, [user, authUser, role, loading])

  useEffect(() => { fetchProducts() }, [selectedCategory])
  useEffect(() => { fetchSuppliers() }, [])

  async function fetchProducts() {
    let q = supabase
      .from('products')
      .select('*, supplier:supplier_profiles(business_name, city, is_visible)')
      .eq('is_active', true)
      .limit(8)
    if (selectedCategory !== 'All') q = q.eq('category', selectedCategory)
    const { data } = await q
    setProducts(data || [])
  }

  async function fetchSuppliers() {
    const { data } = await supabase
      .from('supplier_profiles')
      .select('*')
      .eq('is_visible', true)
      .limit(8)
    setSuppliers(data || [])
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=2000"
          alt="Restaurant kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/80 to-slate-900/80" />
        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-emerald-600/30 border border-emerald-400/40 text-emerald-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            🥩 Halal Certified Suppliers Only
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            The Smarter Way to Stock Your Halal Kitchen
          </h1>
          <p className="text-lg text-slate-200 mb-8 max-w-xl mx-auto">
            Connect with verified Halal suppliers. Order everything your restaurant needs in one place. Track, manage, and optimize — all from ProCuro.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={() => navigate('/register')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg transition-all"
            >
              Start Ordering — It's Free
            </button>
            <button
              onClick={() => navigate('/suppliers')}
              className="border-2 border-white/60 text-white hover:bg-white/10 font-bold px-8 py-4 rounded-xl text-lg transition-all"
            >
              Browse Suppliers
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-200 flex-wrap">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-400" /> GDPR Compliant</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-400" /> Halal Verified Suppliers</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-400" /> No Hidden Fees</span>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(({ number, label }) => (
              <div key={label}>
                <p className="text-3xl font-black text-emerald-600">{number}</p>
                <p className="text-sm text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full space-y-12">

        {/* Category Filter */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Browse by Category</h2>
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {['All', ...CATEGORIES.map(c => c.name)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {selectedCategory !== 'All' ? selectedCategory : 'Featured Products'}
            </h2>
            <button onClick={() => navigate('/login')} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => navigate('/login')}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="relative h-36 bg-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-10 h-10" />
                    </div>
                  )}
                  {!product.in_stock && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500 text-sm">Out of Stock</div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    {product.category}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-slate-900 text-sm leading-tight mb-0.5">{product.name}</h3>
                  <p className="text-xs font-bold text-emerald-700 mb-2">{product.supplier?.business_name}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-slate-900">€{Number(product.price).toFixed(2)}</span>
                      <span className="text-xs text-slate-400 ml-1">/ {product.unit_type}</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors text-lg leading-none">+</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 text-slate-400">No products found. Be the first supplier to list products!</div>
          )}
        </section>

        {/* Verified Suppliers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Our Verified Halal Suppliers</h2>
            <button onClick={() => navigate('/suppliers')} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {suppliers.map(supplier => (
              <div
                key={supplier.id}
                onClick={() => navigate(`/supplier/${supplier.id}`)}
                className="min-w-[200px] cursor-pointer bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden flex items-center justify-center">
                  {supplier.avatar_url ? (
                    <img src={supplier.avatar_url} alt={supplier.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">{supplier.business_name?.[0]}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{supplier.business_name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{supplier.city}</p>
                {supplier.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                    <span>★</span> {Number(supplier.rating).toFixed(1)}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> Halal Certified
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="text-slate-400 text-sm py-4">No verified suppliers yet.</p>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
