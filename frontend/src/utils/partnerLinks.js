// Partner-site opener with HTTPS -> HTTP fallback.
//
// Bokashoka / Cinemabazar sometimes fail over HTTPS (expired cert, TLS
// misconfig, ISP block). Plain HTTPS links then look "dead". This helper
// probes HTTPS first; if it is unreachable/broken it opens the HTTP
// version instead, so users still get into the site.

const CACHE_PREFIX = 'partner-proto:';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PROBE_TIMEOUT_MS = 3500;

export function toHttpUrl(url) {
  return String(url || '').replace(/^https:/i, 'http:');
}

function readCache(host) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + host);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.proto || !parsed.at) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + host);
      return null;
    }
    return parsed.proto; // 'https' | 'http'
  } catch {
    return null;
  }
}

function writeCache(host, proto) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + host, JSON.stringify({ proto, at: Date.now() }));
  } catch {
    /* Storage may be blocked; probing just runs again. */
  }
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return String(url || '');
  }
}

async function httpsReachable(httpsUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // `no-cors` avoids CORS preflight; an opaque response still means the
    // TLS handshake + server worked. Cert errors / DNS / timeout reject.
    await fetch(httpsUrl, {
      method: 'GET',
      mode: 'no-cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolvePartnerUrl(httpsUrl) {
  const httpUrl = toHttpUrl(httpsUrl);
  const host = hostOf(httpsUrl);
  const cached = readCache(host);
  if (cached === 'http') return httpUrl;
  if (cached === 'https') return httpsUrl;

  const ok = await httpsReachable(httpsUrl);
  writeCache(host, ok ? 'https' : 'http');
  return ok ? httpsUrl : httpUrl;
}

// Click handler for <a> tags. Keeps the href as HTTPS (right-click /
// copy-link still works) but left-click probes first and falls back to HTTP.
// Must be called synchronously from onClick so the popup blocker allows it.
export function openPartnerUrl(event, httpsUrl) {
  // Let ctrl/cmd/middle-click behave natively (new-tab shortcuts).
  if (event && (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1)) {
    return;
  }
  if (event) event.preventDefault();

  const httpUrl = toHttpUrl(httpsUrl);
  const host = hostOf(httpsUrl);
  const cached = readCache(host);

  const navigate = (win, url) => {
    if (win && !win.closed) {
      try {
        win.location.href = url;
      } catch {
        win.location = url;
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Cached verdict -> open immediately, no blank-tab flash.
  if (cached === 'https' || cached === 'http') {
    navigate(null, cached === 'https' ? httpsUrl : httpUrl);
    return;
  }

  // Open a placeholder synchronously to survive popup blockers, then
  // steer it to the working protocol once the probe finishes.
  const win = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (!win) {
    // Popup blocked: fall back to same-tab navigation via probe.
    resolvePartnerUrl(httpsUrl).then((url) => {
      window.location.href = url;
    });
    return;
  }

  resolvePartnerUrl(httpsUrl).then((url) => navigate(win, url));
}
