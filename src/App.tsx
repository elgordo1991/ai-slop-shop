import React, { useState, useEffect } from 'react';
import { ShoppingBag, Shirt, Info, ArrowRight, Check, Minus, Plus, User, LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AuthModal } from './components/auth/AuthModal';
import { PurchaseHistory } from './components/PurchaseHistory';
import { CheckoutButton } from './components/CheckoutButton';
import { products } from './stripe-config';

interface CartItem {
  size: string;
  color: string;
  quantity: number;
}

function App() {
  const [user, loading] = useAuthState(auth);
  const [currentSection, setCurrentSection] = useState('hero');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check for success parameter on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setCurrentSection('thanks');
      setCart([]);
      setSelectedSize('');
      setSelectedColor('');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const sizes = ['s', 'm', 'l', 'xl'];
  const colors = [
    { name: 'black', value: 'black', class: 'bg-black' },
    { name: 'white', value: 'white', class: 'bg-white border border-gray-200' }
  ];

  const addToBag = () => {
    if (selectedSize && selectedColor) {
      const existingItem = cart.find(item => item.size === selectedSize && item.color === selectedColor);
      if (existingItem) {
        setCart(cart.map(item =>
          item.size === selectedSize && item.color === selectedColor
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setCart([...cart, { size: selectedSize, color: selectedColor, quantity: 1 }]);
      }
      setCurrentSection('payment');
    }
  };

  const updateQuantity = (index: number, change: number) => {
    const newCart = [...cart];
    newCart[index].quantity += change;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = totalItems * 20;

  // Get the t-shirt product for checkout
  const tshirtProduct = products.find(p => p.name === 't-shirt');

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 lowercase">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-gray-900 relative overflow-hidden">
      {/* Minimalist Animated Background Elements - Only on Hero */}
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
              
              {/* Auth Section */}
              {user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentSection('account')}
                    className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
                  >
                    <User className="w-4 h-4" />
                    <span>account</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center space-x-2 lowercase"
                >
                  <User className="w-4 h-4" />
                  <span>sign in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          // Refresh the page or update state as needed
        }}
      />

      {/* Hero Section */}
      {currentSection === 'hero' && (
        <section className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-center max-w-2xl mx-auto px-6">
            <h1 className="text-6xl md:text-8xl font-extralight tracking-wider mb-8 lowercase">
              slop
            </h1>
            <p className="text-lg text-gray-600 mb-12 leading-relaxed lowercase">
              one-of-one t-shirts.<br />
              ai generated art.<br />
              no previews.
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
        <section className="min-h-screen pt-24 px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-4 lowercase">
                ai generated t-shirt
              </h2>
              <p className="text-gray-600 lowercase">£20 · no previews · unique design</p>
            </div>

            <div className="grid md:grid-cols-2 gap-16">
              {/* Size Selection */}
              <div>
                <h3 className="text-lg font-medium mb-6 lowercase">size</h3>
                <div className="grid grid-cols-4 gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`aspect-square border text-sm font-medium transition-colors lowercase ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-stone-300 hover:border-stone-400 bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <h3 className="text-lg font-medium mb-6 lowercase">base color</h3>
                <div className="space-y-3">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-full p-4 border text-left transition-colors flex items-center space-x-4 lowercase bg-white ${
                        selectedColor === color.value
                          ? 'border-black'
                          : 'border-stone-300 hover:border-stone-400'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${color.class}`}></div>
                      <span className="text-sm font-medium">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-stone-200">
              <button
                onClick={addToBag}
                disabled={!selectedSize || !selectedColor}
                className={`w-full py-4 text-sm font-medium transition-all lowercase ${
                  selectedSize && selectedColor
                    ? 'minimal-button-full'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                add to bag — £20
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
              <h2 className="text-4xl font-light mb-4 lowercase">
                the concept
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <h3 className="text-xl font-medium mb-4 lowercase">no previews</h3>
                <p className="text-gray-600 leading-relaxed mb-8 lowercase">
                  every t-shirt is a complete surprise. our ai generates unique designs that you'll only see when your package arrives.
                </p>

                <h3 className="text-xl font-medium mb-4 lowercase">artistic process</h3>
                <p className="text-gray-600 leading-relaxed lowercase">
                  each design is created using advanced ai technology, producing abstract and surreal artwork printed directly onto premium cotton.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-4 lowercase">one-time purchase</h3>
                <p className="text-gray-600 leading-relaxed mb-8 lowercase">
                  £20 per t-shirt. no subscriptions, no commitments. buy as many or as few as you want, whenever you want.
                </p>

                <h3 className="text-xl font-medium mb-4 lowercase">quality</h3>
                <p className="text-gray-600 leading-relaxed lowercase">
                  high-quality cotton t-shirts with durable printing. while the design is a mystery, the shirt quality isn't.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Account Section */}
      {currentSection === 'account' && user && (
        <section className="min-h-screen pt-24 px-6 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4 lowercase">
                account
              </h2>
              <p className="text-gray-600 lowercase">{user.email}</p>
            </div>

            <div className="space-y-8">
              <PurchaseHistory />
            </div>
          </div>
        </section>
      )}

      {/* Payment Section */}
      {currentSection === 'payment' && (
        <section className="min-h-screen pt-24 px-6 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4 lowercase">
                checkout
              </h2>
            </div>

            {cart.length > 0 && (
              <div className="border border-stone-300 bg-white p-6 mb-8">
                <h3 className="text-lg font-medium mb-6 lowercase">order summary</h3>
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-4 border-b border-stone-200 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium lowercase">ai generated t-shirt</p>
                      <p className="text-sm text-gray-600 lowercase">{item.size} · {item.color}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="w-6 h-6 border border-stone-300 bg-white flex items-center justify-center hover:border-stone-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="w-6 h-6 border border-stone-300 bg-white flex items-center justify-center hover:border-stone-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium w-16 text-right">£{item.quantity * 20}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-6">
                  <span className="text-lg font-medium lowercase">total</span>
                  <span className="text-lg font-medium">£{totalPrice}</span>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-8">
                {user ? (
                  tshirtProduct ? (
                    <CheckoutButton
                      priceId={tshirtProduct.priceId}
                      mode={tshirtProduct.mode}
                      quantity={totalItems}
                      className="w-full py-4 text-sm font-medium minimal-button-full lowercase"
                    >
                      purchase now — £{totalPrice}
                    </CheckoutButton>
                  ) : (
                    <button
                      disabled
                      className="w-full py-4 text-sm font-medium bg-stone-200 text-stone-400 cursor-not-allowed lowercase"
                    >
                      product not available
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full py-4 text-sm font-medium minimal-button-full lowercase"
                  >
                    sign in to purchase
                  </button>
                )}
              </div>
            )}

            {cart.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-600 mb-8 lowercase">your bag is empty</p>
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
              expect your surprise t-shirt soon.
            </p>
            <button
              onClick={() => setCurrentSection('account')}
              className="minimal-button lowercase"
            >
              view account
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;