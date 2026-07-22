export interface GeoLocation {
  country: string | null;
  city: string | null;
}

const EMPTY: GeoLocation = { country: null, city: null };
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
const LOOKUP_TIMEOUT_MS = 1500;

const cache = new Map<string, { value: GeoLocation; expiresAt: number }>();

function isPrivateAddress(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}

export function clientIp(headers: Record<string, unknown>, socketIp?: string): string | null {
  const forwarded = headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = typeof raw === 'string' ? raw.split(',')[0]?.trim() : undefined;
  const ip = first || socketIp || null;
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

export function headerCountry(headers: Record<string, unknown>): string | null {
  for (const key of ['cf-ipcountry', 'x-vercel-ip-country', 'x-appengine-country']) {
    const value = headers[key];
    if (typeof value === 'string' && value.length === 2 && value !== 'XX') {
      return value.toUpperCase();
    }
  }
  return null;
}

async function fetchLocation(ip: string): Promise<GeoLocation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,city`,
      { signal: controller.signal },
    );
    if (!res.ok) return EMPTY;
    const body = (await res.json()) as { status?: string; countryCode?: string; city?: string };
    if (body.status !== 'success') return EMPTY;
    return { country: body.countryCode ?? null, city: body.city ?? null };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

export async function locate(ip: string | null): Promise<GeoLocation> {
  if (!ip || isPrivateAddress(ip)) return EMPTY;

  const hit = cache.get(ip);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await fetchLocation(ip);

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(ip, { value, expiresAt: Date.now() + CACHE_TTL_MS });

  return value;
}
