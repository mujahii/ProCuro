import { useState } from 'react'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['Meat', 'Poultry', 'Seafood', 'Dairy', 'Beverages', 'Vegetables', 'Fruits', 'Spices', 'Bakery', 'Other']
const UNIT_TYPES = ['kg', 'package', 'piece', 'liter']

export default function ProductForm({ product, supplierId, onSave, onCancel }) {
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
  const [imagePreview, setImagePreview] = useState(product?.image_url ? null : null)
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
        stock_quantity: parseInt(form.stock_quantity),
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Product Name *</label>
          <input required value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="Halal Lamb Shoulder" />
        </div>
        <div>
          <label className="label">Category *</label>
          <select required value={form.category} onChange={e => update('category', e.target.value)} className="input">
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Price (€) *</label>
          <input type="number" required min="0.01" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} className="input" placeholder="12.99" />
        </div>
        <div>
          <label className="label">Unit Type *</label>
          <select required value={form.unit_type} onChange={e => update('unit_type', e.target.value)} className="input">
            {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Stock Quantity</label>
          <input type="number" min="0" value={form.stock_quantity} onChange={e => update('stock_quantity', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Discount % <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="number" min="0" max="100" step="0.1" value={form.discount_percentage} onChange={e => update('discount_percentage', e.target.value)} className="input" placeholder="e.g. 10" />
          {form.discount_percentage > 0 && form.price > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              Discounted price: €{(form.price * (1 - form.discount_percentage / 100)).toFixed(2)}
            </p>
          )}
        </div>
        <div>
          <label className="label">Delivery Fee (€) <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="number" min="0" step="0.01" value={form.delivery_fee} onChange={e => update('delivery_fee', e.target.value)} className="input" placeholder="e.g. 5.00" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">In Stock (visible in store)</label>
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea value={form.description} onChange={e => update('description', e.target.value)} className="input h-20 resize-none" placeholder="Describe your product..." />
      </div>

      <div>
        <label className="label">Product Image</label>
        <div className="flex items-start gap-4">
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
          )}
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-primary transition-colors">
            <input type="file" accept="image/*" className="hidden" id="product-image" onChange={handleImageChange} />
            <label htmlFor="product-image" className="cursor-pointer flex flex-col items-center gap-2">
              {imageFile ? (
                <>
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <span className="text-xs text-primary font-medium">{imageFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-300" />
                  <span className="text-xs text-gray-500">Upload image (max 10MB)</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (product ? 'Update Product' : 'Add Product')}
        </button>
      </div>
    </form>
  )
}
