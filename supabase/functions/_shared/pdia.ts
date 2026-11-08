// Public Domain Image Archive (pdimagearchive.org) — used with their permission.
// Their infinite view reads paged JSON: /api/infinite-viewer/images/<n>.json →
// { images: [{ id, path, width, height, alt }], totalPages }. Images are served from
// images.pdimagearchive.org/<path>?width=<px>. The JSON has no CORS headers, so the
// browser can't read it directly — these helpers run inside our edge functions.

const API = "https://pdimagearchive.org/api/infinite-viewer/images";
const IMG = "https://images.pdimagearchive.org";

// Anything smaller than this on its long edge prints soft on a tee, so skip it.
export const MIN_LONG_EDGE = 1400;

export type PdImage = { id: string; path: string; width: number; height: number; alt: string };

export type RandomSlop = {
  id: string;
  title: string;
  width: number;
  height: number;
  preview_url: string; // ~900px, for the tee mockup
  print_url: string; // full size, for Tapstitch
  source_url: string; // the image's page on PDIA (rights label + credit)
};

// Pages rarely change; keep them for the life of the function instance.
const pageCache = new Map<number, { at: number; images: PdImage[]; totalPages: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

export async function getPage(n: number): Promise<{ images: PdImage[]; totalPages: number }> {
  const hit = pageCache.get(n);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const res = await fetch(`${API}/${n}.json`, {
    headers: { "User-Agent": "slop-shop.xyz random tee (jordan.richards.ta@gmail.com)" },
  });
  if (!res.ok) throw new Error(`PDIA page ${n} → ${res.status}`);
  const body = await res.json();
  const entry = {
    at: Date.now(),
    images: Array.isArray(body?.images) ? (body.images as PdImage[]) : [],
    totalPages: Number(body?.totalPages) || 1,
  };
  pageCache.set(n, entry);
  return entry;
}

const printable = (i: PdImage) =>
  typeof i?.id === "string" && typeof i?.path === "string" && Math.max(i.width, i.height) >= MIN_LONG_EDGE;

const imgUrl = (path: string) => IMG + path.split("/").map(encodeURIComponent).join("/");

export function toSlop(i: PdImage): RandomSlop {
  const url = imgUrl(i.path);
  return {
    id: i.id,
    title: (i.alt || "untitled").trim(),
    width: i.width,
    height: i.height,
    preview_url: `${url}?width=900`,
    print_url: url,
    source_url: `https://pdimagearchive.org/images/${i.id}/`,
  };
}

export async function randomImage(exclude?: string): Promise<RandomSlop> {
  const first = await getPage(1);
  const total = Math.max(1, first.totalPages);
  for (let attempt = 0; attempt < 4; attempt++) {
    const page = attempt === 3 ? first : await getPage(1 + Math.floor(Math.random() * total));
    const pool = page.images.filter((i) => printable(i) && i.id !== exclude);
    if (pool.length) return toSlop(pool[Math.floor(Math.random() * pool.length)]);
  }
  throw new Error("No printable images found");
}

// Re-finds an image by id so checkout never trusts a URL sent by the browser.
export async function findImage(id: string): Promise<RandomSlop | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const first = await getPage(1);
  for (let n = 1; n <= first.totalPages; n++) {
    const page = n === 1 ? first : await getPage(n);
    const hit = page.images.find((i) => i.id === id);
    if (hit) return printable(hit) ? toSlop(hit) : null;
  }
  return null;
}
