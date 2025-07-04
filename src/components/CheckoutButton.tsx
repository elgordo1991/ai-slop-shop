import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

interface CheckoutButtonProps {
  priceId: string;
  mode: 'payment' | 'subscription';
  quantity?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function CheckoutButton({ 
  priceId, 
  mode, 
  quantity = 1, 
  children, 
  className = '', 
  disabled = false 
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const result = await createCheckoutSession({
        priceId,
        mode,
        quantity,
        successUrl: `${window.location.origin}?success=true`,
        cancelUrl: `${window.location.origin}?cancel=true`,
      });

      const data = result.data as { url?: string; error?: string };

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={`${className} ${
        disabled || loading
          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
          : ''
      }`}
    >
      {loading ? 'processing...' : children}
    </button>
  );
}