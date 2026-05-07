import { useState } from 'react'
import { ImagePlus, Loader2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']
const UNIT_TYPES = ['kg', 'package', 'piece', 'liter']

export default function ProductForm({ product, supplierId, onSave, onCancel }) {
  const existingImageUrl = product?.image_url
    ? supabase.storage.from('product-images').getPublicUrl(product.image_url).data?.publicUrl
    : null

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || '',
    price: product?.price || '',
    unit_type: product?.unit_type || 'kg',
    stock_quantity: product?.stock_quantity || 0,
    discount_percentage: product?.discount_percentage || '',
    delivery_fee: product?.delivery_fee || '',
    is_active: product?.is_active ?? true,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(existingImageUrl)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.category) { setError('Please select a category'); return }
    setLoading(true)
    setError('')
    try {
      let imageUrl = product?.image_url || null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${supplierId}/${Date.now()}.${ext}`
        const { data: upload, error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { upsert: true })
        if (uploadErr) throw uploadErr
        imageUrl = upload.path
      }

      const productData = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null,
        delivery_fee: form.delivery_fee ? parseFloat(form.delivery_fee) : null,
        supplier_id: supplierId,
        image_url: imageUrl,
      }

      let result
      if (product?.id) {
        const { data, error } = await supabase.from('products').update(productData).eq('id', product.id).select().single()
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single()
        if (error) throw error
        result = data
      }
      onSave(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Image upload — top, full width */}
      <div className="px-6 pt-2 pb-4">
        <input type="file" accept="image/*" className="hidden" id="product-image" onChange={handleImageChange} />
        <label htmlFor="product-image" className="block cursor-pointer">
          {imagePreview ? (
            <div className="relative h-48 rounded-xl overflow-hidden group">
              <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <ImagePlus className="w-5 h-5" /> Change Photo
                </div>
              </div>
            </div>
          ) : (
            <div className="h-40 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <ImagePlus className="w-8 h-8 text-slate-300" />
              <span className="text-sm text-slate-400 font-medium">+ Upload Image</span>
            </div>
          )}
        </label>
      </div>

      <div className="px-6 space-y-4 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name</label>
          <input
            required
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            placeholder="e.g. Premium Lamb Chops"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
            placeholder="Describe your product..."
          />
        </div>

        {/* Price + Delivery Fee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Price (€)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={e => update('price', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Delivery Fee (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.delivery_fee}
              onChange={e => update('delivery_fee', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Unit + Discount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
            <select
              required
              value={form.unit_type}
              onChange={e => update('unit_type', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white"
            >
              {UNIT_TYPES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.discount_percentage}
              onChange={e => update('discount_percentage', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Category chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => update('category', cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.category === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* In Stock */}
        <button
          type="button"
          onClick={() => update('is_active', !form.is_active)}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
            form.is_active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
            form.is_active ? 'bg-emerald-600' : 'bg-slate-200'
          }`}>
            {form.is_active && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="font-semibold text-slate-900 text-sm">Product In Stock</span>
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving...' : (product ? 'Save Changes' : 'Add Product')}
        </button>
      </div>
    </form>
  )
}
