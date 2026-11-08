// UK postage charged at checkout. Mirrors src/lib/postage.ts — keep them in step.
// Based on what Tapstitch charges us: 1 tee £3.73, 2 tees £5.42 (≈ £1.69 per extra tee).
// Orders of £50 or more (before discount codes) ship free.
export const POSTAGE_FIRST = 373;
export const POSTAGE_EXTRA = 169;
export const FREE_POSTAGE_FROM = 5000;

export function postageFor(tees: number, subtotal: number): number {
  if (tees <= 0 || subtotal >= FREE_POSTAGE_FROM) return 0;
  return POSTAGE_FIRST + POSTAGE_EXTRA * (tees - 1);
}

// Stripe Checkout shipping option for that amount.
export function shippingOption(amount: number) {
  return {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount, currency: "gbp" },
      display_name: amount ? "UK delivery" : "Free UK delivery (orders £50+)",
    },
  };
}
