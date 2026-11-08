// Mirrors supabase/functions/_shared/postage.ts — keep them in step.
export const POSTAGE_FIRST = 373;
export const POSTAGE_EXTRA = 169;
export const FREE_POSTAGE_FROM = 5000;

export function postageFor(tees: number, subtotal: number): number {
  if (tees <= 0 || subtotal >= FREE_POSTAGE_FROM) return 0;
  return POSTAGE_FIRST + POSTAGE_EXTRA * (tees - 1);
}
