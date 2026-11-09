import { useState } from 'react';
import { Dices, ExternalLink, Check } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { formatPrice, type Product } from './ProductCard';
import { FREE_POSTAGE_FROM } from '../lib/postage';

export interface RandomImage {
  id: string;
  title: string;
  width: number;
  height: number;
  preview_url: string;
  print_url: string;
  source_url: string;
}

const PRICE = 2000; // keep in step with RANDOM_TEE_PRICE in create-checkout
const SIZES = ['s', 'm', 'l', 'xl'];

async function errorMessage(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body?.error) return String(body.error).toLowerCase();
  }
  return fallback;
}

// A random tee as a bag item. It isn't in the products table: create-checkout
// recognises it by design_id and looks the image up again itself.
export function randomProduct(image: RandomImage): Product {
  return {
    id: `random:${image.id}`,
    slug: 'random-slop',
    name: `random slop — ${image.title.toLowerCase()}`,
    stripe_product_id: null,
    price: PRICE,
    currency: 'gbp',
    color: 'black',
    images: [image.preview_url],
    sizes: SIZES,
    design_id: image.id,
  };
}

interface RandomSlopProps {
  onAddToBag: (product: Product, size: string) => void;
  onViewBag: () => void;
}

export function RandomSlop({ onAddToBag, onViewBag }: RandomSlopProps) {
  const [image, setImage] = useState<RandomImage | null>(null);
  const [rolling, setRolling] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [size, setSize] = useState('');
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async () => {
    setRolling(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke<RandomImage>('random-slop', {
      body: { exclude: image?.id },
    });
    if (error || !data?.id) {
      setError(await errorMessage(error, "couldn't find any slop. try again."));
      setRolling(false);
      return;
    }
    // Wait for the picture itself so the tee never shows half-loaded.
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = data.preview_url;
    });
    setLoaded(false);
    setImage(data);
    setAdded(false);
    setRolling(false);
  };

  const add = () => {
    if (!image || !size) return;
    onAddToBag(randomProduct(image), size);
    setAdded(true);
  };

  return (
    <section className="min-h-screen pt-24 px-6 pb-16 relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-light mb-3 lowercase">random slop</h2>
          <p className="text-gray-500 text-sm lowercase">
            one click. one random public-domain image. one black tee.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Tee preview */}
          <div className="relative aspect-square bg-stone-100 overflow-hidden select-none">
            <img src="/random/tee-blank.webp" alt="black tee" className="w-full h-full object-cover" draggable={false} />
            {image && (
              <div className="absolute flex items-center justify-center" style={{ left: '33.5%', top: '23%', width: '33%', height: '39%' }}>
                <img
                  key={image.id}
                  src={image.preview_url}
                  alt={image.title}
                  draggable={false}
                  onLoad={() => setLoaded(true)}
                  className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-95' : 'opacity-0'}`}
                />
              </div>
            )}
            {!image && !rolling && (
              <button
                onClick={roll}
                className="absolute inset-0 flex flex-col items-center justify-center text-stone-200 hover:text-white transition-colors lowercase"
              >
                <Dices className="w-10 h-10 mb-3" />
                <span className="text-sm tracking-wide">roll the slop</span>
              </button>
            )}
            {rolling && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <Dices className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {image ? (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">random slop</p>
                <h3 className="text-2xl font-light mb-2 lowercase">{image.title}</h3>
                <a
                  href={image.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black mb-8 lowercase"
                >
                  via the public domain image archive <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={roll}
                  disabled={rolling}
                  className="minimal-button flex items-center space-x-2 mb-10 lowercase"
                >
                  <Dices className="w-4 h-4" />
                  <span>{rolling ? 'rolling...' : 'roll again'}</span>
                </button>

                <p className="text-sm font-medium mb-3 lowercase">size</p>
                <div className="grid grid-cols-4 gap-2 mb-8">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSize(s); setAdded(false); }}
                      className={`py-2 text-sm font-medium border transition-colors lowercase ${
                        size === s ? 'border-black bg-black text-white' : 'border-stone-300 hover:border-stone-500 bg-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {added ? (
                  <div className="border border-stone-300 bg-white p-4">
                    <p className="flex items-center gap-2 text-sm mb-4 lowercase">
                      <Check className="w-4 h-4" /> added to your bag ({size})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={roll} disabled={rolling} className="minimal-button lowercase">
                        {rolling ? 'rolling...' : 'roll another'}
                      </button>
                      <button onClick={onViewBag} className="py-3 text-sm font-medium minimal-button-full lowercase">
                        view bag
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={add}
                    disabled={!size || rolling}
                    className={`w-full py-4 text-sm font-medium transition-all lowercase ${
                      size && !rolling ? 'minimal-button-full' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {size ? `add to bag — ${formatPrice(PRICE)}` : 'select a size'}
                  </button>
                )}
                <p className="text-xs text-gray-400 text-center mt-3 lowercase">
                  printed on the back, made to order. free uk postage on orders of {formatPrice(FREE_POSTAGE_FROM)} or more.
                </p>
              </>
            ) : (
              <div className="text-center md:text-left">
                <p className="text-gray-600 mb-8 leading-relaxed lowercase">
                  over ten thousand out-of-copyright images.<br />
                  we pick one at random and put it on a tee.<br />
                  don't like it? roll again.
                </p>
                <button onClick={roll} disabled={rolling} className="minimal-button flex items-center space-x-2 mx-auto md:mx-0 lowercase">
                  <Dices className="w-4 h-4" />
                  <span>{rolling ? 'rolling...' : 'roll the slop'}</span>
                </button>
              </div>
            )}
            {error && <p className="text-sm text-red-600 mt-4 lowercase">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
