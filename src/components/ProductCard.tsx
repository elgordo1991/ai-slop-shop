import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  color: string;
  images: string[];
  stripe_price_id: string;
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden bg-stone-100 aspect-[3/4] mb-4">
        <img
          src={product.images[currentImageIndex]}
          alt={`${product.name} - view ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {product.images.length > 1 && (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>

            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-50/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-stone-50"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>

            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-50/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-stone-50"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'bg-stone-50 w-6'
                      : 'bg-stone-50/50 hover:bg-stone-50/75'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="bg-stone-50 py-3 px-4 text-center">
            <span className="text-sm font-medium lowercase">select</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium lowercase">{product.name}</p>
          <p className="text-xs text-gray-500 mt-1 lowercase">{product.description}</p>
        </div>
        <span className="text-sm font-medium ml-4 shrink-0">£{(product.price / 100).toFixed(2)}</span>
      </div>
    </div>
  );
}
