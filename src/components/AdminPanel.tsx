import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function AdminPanel({ isOpen, onClose, onProductAdded }: AdminPanelProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    color: 'black',
    images: ['', '', ''],
    stripe_price_id: 'price_1RgTl100QL3l2eWUTfMpkxVy',
  });

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.images.every(img => img)) {
      alert('Please fill all fields and provide 3 images');
      return;
    }

    const { error } = await supabase.from('products').insert([
      {
        name: form.name,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        color: form.color,
        images: form.images,
        stripe_price_id: form.stripe_price_id,
        active: true,
      },
    ]);

    if (error) {
      alert('Error adding product: ' + error.message);
    } else {
      setForm({
        name: '',
        description: '',
        price: '',
        color: 'black',
        images: ['', '', ''],
        stripe_price_id: 'price_1RgTl100QL3l2eWUTfMpkxVy',
      });
      setShowForm(false);
      loadProducts();
      onProductAdded();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-stone-50 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-stone-200">
          <h2 className="text-xl font-light lowercase">manage products</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showForm ? (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="mb-6 w-full py-3 border border-black bg-white text-black text-sm font-medium hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2 lowercase"
              >
                <Plus className="w-4 h-4" />
                add new t-shirt
              </button>

              <div className="space-y-3">
                {loading ? (
                  <p className="text-gray-500 text-sm lowercase">loading...</p>
                ) : products.length === 0 ? (
                  <p className="text-gray-500 text-sm lowercase">no products yet</p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 border border-stone-200 hover:border-stone-400 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm lowercase">{product.name}</p>
                          <p className="text-xs text-gray-500 lowercase">{product.description}</p>
                          <div className="flex gap-2 mt-2 text-xs text-gray-500">
                            <span className="lowercase">£{(product.price / 100).toFixed(2)}</span>
                            <span className="lowercase">•</span>
                            <span className="capitalize">{product.color}</span>
                            <span className="lowercase">•</span>
                            <span className="lowercase">{product.images.length} images</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 uppercase text-gray-500">name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                  placeholder="e.g., slop logo tee"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 uppercase text-gray-500">description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                  placeholder="e.g., Core backpiece logo on heavyweight cotton"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase text-gray-500">price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                    placeholder="20.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase text-gray-500">color</label>
                  <select
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                  >
                    <option value="black">Black</option>
                    <option value="white">White</option>
                    <option value="grey">Grey</option>
                    <option value="navy">Navy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 uppercase text-gray-500">stripe price id</label>
                <input
                  type="text"
                  value={form.stripe_price_id}
                  onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                  placeholder="price_1..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 uppercase text-gray-500">image urls (3 required)</label>
                <div className="space-y-2">
                  {form.images.map((img, idx) => (
                    <input
                      key={idx}
                      type="url"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...form.images];
                        newImages[idx] = e.target.value;
                        setForm({ ...form, images: newImages });
                      }}
                      className="w-full px-3 py-2 border border-stone-300 focus:border-black outline-none text-sm"
                      placeholder={`Image ${idx + 1} URL`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-black text-white text-sm font-medium hover:opacity-90 transition-opacity lowercase"
                >
                  add product
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-stone-300 text-sm font-medium hover:border-stone-400 transition-colors lowercase"
                >
                  cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
