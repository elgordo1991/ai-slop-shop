// Cookie-free page view tracking. Sends a tiny beacon to the `track` edge function,
// which stores a daily-rotating hashed visitor id — no cookies, no personal data.
const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;

let lastPath = '';
let sentReferrer = false;

export function trackView(path: string) {
  if (!import.meta.env.PROD || !import.meta.env.VITE_SUPABASE_URL) return;
  if (path === lastPath) return; // ignore StrictMode double-runs and repeat renders
  lastPath = path;

  // Only the first view of a visit carries where the visitor came from.
  const referrer = sentReferrer ? '' : document.referrer;
  sentReferrer = true;

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the shop */
  }
}
