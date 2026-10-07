import React, { useState, useEffect } from 'react';
import { ShoppingBag, Shirt, Info, ArrowRight, Minus, Plus, X, Lightbulb } from 'lucide-react';
import { CheckoutButton } from './components/CheckoutButton';
import { SuggestModal } from './components/SuggestModal';
import { ProductCard, formatPrice, type Product } from './components/ProductCard';
import { supabase } from './lib/supabase';
import { useSwipe } from './lib/useSwipe';

const CART_KEY = 'slop-bag-v1';

function loadSavedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Partial<CartItem>[]).filter(
          (i): i is CartItem => Array.isArray(i?.product?.images) && !!i.size && (i.quantity ?? 0) > 0,
        ) : [];
  } catch {
    return [];
  }
}

interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToBag: (product: Product, size: string) => void;
}

function ProductModal({ product, onClose, onAddToBag }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const imageCount = product.images.length;
  const swipe = useSwipe(
    () => setImageIndex((i) => (i + 1) % imageCount),
    () => setImageIndex((i) => (i - 1 + imageCount) % imageCount),
  );
  const sizes = product.sizes?.length ? product.sizes : ['s', 'm', 'l', 'xl'];

  const handleAdd = () => {
    if (selectedSize) {
      onAddToBag(product, selectedSize);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-stone-50 max-w-2xl w-full max-h-[calc(100dvh-2rem)] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="md:w-1/2 aspect-[4/3] md:aspect-auto shrink-0 overflow-hidden bg-stone-100 relative group touch-pan-y select-none"
          {...(imageCount > 1 ? swipe.handlers : {})}
        >
          <img
            src={product.images[imageIndex]}
            alt={`${product.name} - view ${imageIndex + 1}`}
            draggable={false}
            className="w-full h-full object-cover transition-transform"
          />
          {product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === imageIndex ? 'bg-stone-50 w-6' : 'bg-stone-50/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="md:w-1/2 p-8 flex flex-col justify-between relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">slop</p>
            <h2 className="text-2xl font-light mb-6 lowercase">{product.name}</h2>

            <div className="mb-8">
              <p className="text-sm font-medium mb-3 lowercase">size</p>
              <div className={`grid gap-2 ${sizes.length > 4 ? 'grid-cols-6' : 'grid-cols-4'}`}>
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 text-sm font-medium border transition-colors lowercase ${
                      selectedSize === size
                        ? 'border-black bg-black text-white'
                        : 'border-stone-300 hover:border-stone-500 bg-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500 lowercase">price</span>
              <span className="text-lg font-medium">{formatPrice(product.price)}</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={!selectedSize}
              className={`w-full py-3 text-sm font-medium transition-all lowercase ${
                selectedSize
                  ? 'minimal-button-full'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {selectedSize ? 'add to bag' : 'select a size'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentSection, setCurrentSection] = useState('hero');
  const [cart, setCart] = useState<CartItem[]>(loadSavedCart);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setCurrentSection('thanks');
      setCart([]);
    } else if (urlParams.get('cancelled') === 'true') {
      setCurrentSection('payment');
      setNotice('checkout cancelled — your bag is still here.');
    }
    if (urlParams.toString()) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable — bag just won't persist */
    }
  }, [cart]);

  // Keep bag items in sync with live product data (price/photo changes, removed products).
  useEffect(() => {
    if (productsLoading) return;
    setCart((current) =>
      current
        .map((item) => {
          const live = products.find((p) => p.id === item.product.id);
          return live ? { ...item, product: live } : null;
        })
        .filter((item): item is CartItem => item !== null),
    );
  }, [products, productsLoading]);

  const loadProducts = async () => {
    setProductsLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    setProducts(data || []);
    setProductsLoading(false);
  };

  const addToBag = (product: Product, size: string) => {
    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && item.size === size
    );
    if (existingIndex >= 0) {
      setCart(cart.map((item, i) => (i === existingIndex ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item)));
    } else {
      setCart([...cart, { product, size, quantity: 1 }]);
    }
    setCurrentSection('payment');
  };

  const updateQuantity = (index: number, change: number) => {
    setCart(
      cart
        .map((item, i) => (i === index ? { ...item, quantity: Math.min(item.quantity + change, 10) } : item))
        .filter((item) => item.quantity > 0),
    );
  };


  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  const checkoutItems = cart.map((item) => ({
    product_id: item.product.id,
    size: item.size,
    quantity: item.quantity,
  }));


  return (
    <div className="min-h-screen bg-stone-50 text-gray-900 relative overflow-hidden">
      {currentSection === 'hero' && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="diagonal-circle circle-1"></div>
          <div className="diagonal-circle circle-2"></div>
          <div className="diagonal-circle circle-3"></div>
          <div className="diagonal-circle circle-4"></div>
          <div className="diagonal-dot dot-1"></div>
          <div className="diagonal-dot dot-2"></div>
          <div className="diagonal-dot dot-3"></div>
          <div className="diagonal-dot dot-4"></div>
          <div className="diagonal-dot dot-5"></div>
          <div className="diagonal-dot dot-6"></div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setCurrentSection('hero')}
              className="text-2xl font-light tracking-wide hover:opacity-70 transition-opacity lowercase"
            >
              slop
            </button>
            <div className="flex items-center space-x-6 sm:space-x-8">
              <button
                aria-label="shop"
                onClick={() => setCurrentSection('shop')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
              >
                <Shirt className="w-4 h-4" />
                <span className="hidden sm:inline">shop</span>
              </button>
              <button
                aria-label="about"
                onClick={() => setCurrentSection('about')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">about</span>
              </button>
              <button
                aria-label="suggest your slop"
                onClick={() => setSuggestOpen(true)}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">suggest</span>
              </button>
              <button
                aria-label="bag"
                onClick={() => setCurrentSection('payment')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 relative lowercase"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">bag</span>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {suggestOpen && <SuggestModal onClose={() => setSuggestOpen(false)} />}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToBag={addToBag}
        />
      )}

      {/* Hero Section */}
      {currentSection === 'hero' && (
        <section className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-center max-w-2xl mx-auto px-6">
            <h1 className="text-6xl md:text-8xl font-extralight tracking-wider mb-8 lowercase">
              slop
            </h1>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed lowercase">
              premium heavyweight cotton tshirts.<br />
              nothing more.
            </p>
            <button
              onClick={() => setCurrentSection('shop')}
              className="minimal-button flex items-center space-x-2 mx-auto lowercase"
            >
              <span>shop now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* Shop Section */}
      {currentSection === 'shop' && (
        <section className="min-h-screen pt-24 px-6 pb-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-3 lowercase">shop</h2>
              <p className="text-gray-500 text-sm lowercase">
                {productsLoading ? 'loading...' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'} available`}
              </p>
            </div>

            {productsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-gray-600 lowercase">loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 lowercase">no products available</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}

            <div className="text-center mt-24 border-t border-stone-200 pt-16">
              <p className="text-sm text-gray-500 mb-6 lowercase">got an idea for the next one?</p>
              <button
                onClick={() => setSuggestOpen(true)}
                className="minimal-button flex items-center space-x-2 mx-auto lowercase"
              >
                <Lightbulb className="w-4 h-4" />
                <span>suggest your slop</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {currentSection === 'about' && (
        <section className="min-h-screen pt-24 px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-4 lowercase">slop shop</h2>
            </div>

            <ul className="text-center text-lg text-gray-600 leading-loose lowercase">
              <li>black tees.</li>
              <li>heavyweight 300 gram cotton.</li>
              <li>premium quality, screen printed.</li>
            </ul>
          </div>
        </section>
      )}


      {/* Bag Section */}
      {currentSection === 'payment' && (
        <section className="min-h-screen pt-24 px-6 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4 lowercase">bag</h2>
            </div>

            {notice && (
              <p className="text-sm text-gray-600 text-center mb-8 lowercase">{notice}</p>
            )}

            {cart.length > 0 && (
              <div className="border border-stone-300 bg-white p-6 mb-8">
                <h3 className="text-xs font-medium uppercase tracking-widest mb-6 text-gray-400">order summary</h3>
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-4 border-b border-stone-100 last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-stone-100 overflow-hidden shrink-0">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium lowercase">{item.product.name}</p>
                        <p className="text-xs text-gray-500 lowercase">size {item.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="w-6 h-6 border border-stone-300 bg-white flex items-center justify-center hover:border-stone-500 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="w-6 h-6 border border-stone-300 bg-white flex items-center justify-center hover:border-stone-500 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{formatPrice(item.quantity * item.product.price)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-6">
                  <span className="text-xs font-medium uppercase tracking-widest text-gray-400">total</span>
                  <span className="text-lg font-medium">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-8">
                <CheckoutButton
                  items={checkoutItems}
                  className="w-full py-4 text-sm font-medium minimal-button-full lowercase"
                >
                  checkout — {formatPrice(totalPrice)}
                </CheckoutButton>
                <p className="text-xs text-gray-400 text-center mt-3 lowercase">
                  secure payment by stripe. got a discount code? add it at checkout.
                </p>
              </div>
            )}

            {cart.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-8 lowercase">your bag is empty</p>
                <button
                  onClick={() => setCurrentSection('shop')}
                  className="minimal-button lowercase"
                >
                  continue shopping
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Thanks Section */}
      {currentSection === 'thanks' && (
        <section className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-center max-w-2xl mx-auto px-6">
            <h1 className="text-6xl md:text-8xl font-extralight tracking-wider mb-8 lowercase">
              thanks.
            </h1>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed lowercase">
              your order has been placed.<br />
              a receipt is on its way to your inbox.
            </p>
            <button
              onClick={() => setCurrentSection('shop')}
              className="minimal-button lowercase"
            >
              continue shopping
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
