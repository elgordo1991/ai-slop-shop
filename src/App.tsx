import React, { useState, useEffect } from 'react';
import { ShoppingBag, Shirt, Info, ArrowRight, Minus, Plus, X } from 'lucide-react';
import { CheckoutButton } from './components/CheckoutButton';
import { products, type Product } from './stripe-config';

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

  const handleAdd = () => {
    if (selectedSize) {
      onAddToBag(product, selectedSize);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-stone-50 max-w-2xl w-full flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-1/2 aspect-square md:aspect-auto overflow-hidden bg-stone-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
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
            <h2 className="text-2xl font-light mb-2 lowercase">{product.name}</h2>
            <p className="text-sm text-gray-500 mb-6 lowercase">{product.description}</p>

            <div className="mb-8">
              <p className="text-sm font-medium mb-3 lowercase">size</p>
              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map((size) => (
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
              <span className="text-lg font-medium">£{product.price}</span>
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setCurrentSection('thanks');
      setCart([]);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const addToBag = (product: Product, size: string) => {
    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && item.size === size
    );
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, size, quantity: 1 }]);
    }
    setCurrentSection('payment');
  };

  const updateQuantity = (index: number, change: number) => {
    const newCart = [...cart];
    newCart[index].quantity += change;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };


  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  const checkoutPriceId = cart.length > 0 ? cart[0].product.priceId : null;


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
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentSection('shop')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
              >
                <Shirt className="w-4 h-4" />
                <span>shop</span>
              </button>
              <button
                onClick={() => setCurrentSection('about')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
              >
                <Info className="w-4 h-4" />
                <span>about</span>
              </button>
              <button
                onClick={() => setCurrentSection('payment')}
                className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 relative lowercase"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>bag</span>
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
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-3 lowercase">shop</h2>
              <p className="text-gray-500 text-sm lowercase">all pieces — £20</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative overflow-hidden bg-stone-100 aspect-[3/4] mb-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="bg-stone-50 py-3 px-4 text-center">
                        <span className="text-sm font-medium lowercase">select size</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium lowercase">{product.name}</p>
                      <p className="text-xs text-gray-500 mt-1 lowercase">{product.description}</p>
                    </div>
                    <span className="text-sm font-medium ml-4 shrink-0">£{product.price}</span>
                  </div>
                </div>
              ))}
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

            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <h3 className="text-xl font-medium mb-4 lowercase">the brand</h3>
                <p className="text-gray-600 leading-relaxed mb-8 lowercase">
                  simple graphics, understated details, no overthinking.
                </p>

                <h3 className="text-xl font-medium mb-4 lowercase">the fit</h3>
                <p className="text-gray-600 leading-relaxed lowercase">
                  oversized. heavy cotton. made to be worn loose and worn often.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-4 lowercase">colours</h3>
                <p className="text-gray-600 leading-relaxed mb-8 lowercase">
                  black. that's it.
                </p>

                <h3 className="text-xl font-medium mb-4 lowercase">quality</h3>
                <p className="text-gray-600 leading-relaxed lowercase">
                  heavyweight 300gsm cotton. screen printed graphics. built to last.
                </p>
              </div>
            </div>
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

            {cart.length > 0 && (
              <div className="border border-stone-300 bg-white p-6 mb-8">
                <h3 className="text-xs font-medium uppercase tracking-widest mb-6 text-gray-400">order summary</h3>
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-4 border-b border-stone-100 last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-stone-100 overflow-hidden shrink-0">
                        <img
                          src={item.product.image}
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
                      <span className="text-sm font-medium w-16 text-right">£{item.quantity * item.product.price}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-6">
                  <span className="text-xs font-medium uppercase tracking-widest text-gray-400">total</span>
                  <span className="text-lg font-medium">£{totalPrice}</span>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-8">
                {checkoutPriceId ? (
                  <CheckoutButton
                    priceId={checkoutPriceId}
                    mode="payment"
                    quantity={totalItems}
                    className="w-full py-4 text-sm font-medium minimal-button-full lowercase"
                  >
                    purchase now — £{totalPrice}
                  </CheckoutButton>
                ) : (
                  <button disabled className="w-full py-4 text-sm font-medium bg-stone-200 text-stone-400 cursor-not-allowed lowercase">
                    unavailable
                  </button>
                )}
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
              it's on its way.
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
