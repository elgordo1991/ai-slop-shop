import React, { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface CheckoutLine {
  product_id: string;
  size: string;
  quantity: number;
}

interface CheckoutButtonProps {
  items: CheckoutLine[];
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function CheckoutButton({ items, children, className = '', disabled = false }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        'create-checkout',
        { body: { items } },
      );

      if (error) {
        let message = 'something went wrong starting checkout';
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          if (body?.error) message = body.error;
        }
        throw new Error(message);
      }
      if (!data?.url) throw new Error(data?.error ?? 'something went wrong starting checkout');

      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message.toLowerCase() : 'something went wrong');
      setLoading(false);
    }
  };

  const isDisabled = disabled || loading || items.length === 0;

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : ''}`}
      >
        {loading ? 'taking you to checkout...' : children}
      </button>
      {error && <p className="text-sm text-red-600 mt-3 text-center lowercase">{error}</p>}
    </div>
  );
}
