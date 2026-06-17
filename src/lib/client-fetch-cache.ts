"use client";

type CachedResponseEntry = {
  bodyText: string;
  createdAt: number;
  headers: [string, string][];
  status: number;
  statusText: string;
};

type WindowWithFetchCache = Window & {
  __psicoOriginalFetch?: typeof window.fetch;
  __psicoFetchCacheInstalled?: boolean;
};

const MAX_CACHE_ENTRIES = 80;
const apiFetchCache = new Map<string, CachedResponseEntry>();
const pendingApiFetches = new Map<string, Promise<CachedResponseEntry | null>>();

function getMethod(input: RequestInfo | URL, init?: RequestInit) {
  const methodFromInit = init?.method;

  if (methodFromInit) {
    return methodFromInit.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function getUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return new URL(input, window.location.origin);
  }

  if (input instanceof URL) {
    return new URL(input.toString(), window.location.origin);
  }

  return new URL(input.url, window.location.origin);
}

function shouldHandleRequest(input: RequestInfo | URL) {
  try {
    const url = getUrl(input);

    return (
      url.origin === window.location.origin &&
      url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/api/auth/")
    );
  } catch {
    return false;
  }
}

function getCacheKey(input: RequestInfo | URL, init?: RequestInit) {
  const url = getUrl(input);
  const method = getMethod(input, init);

  return `${method}:${url.pathname}${url.search}`;
}

function createResponseFromCache(entry: CachedResponseEntry) {
  return new Response(entry.bodyText, {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

function rememberCacheEntry(key: string, entry: CachedResponseEntry) {
  apiFetchCache.set(key, entry);

  if (apiFetchCache.size <= MAX_CACHE_ENTRIES) return;

  const oldestKey = apiFetchCache.keys().next().value;

  if (oldestKey) {
    apiFetchCache.delete(oldestKey);
  }
}

async function cacheSuccessfulResponse(key: string, response: Response) {
  if (!response.ok) return null;

  const bodyText = await response.clone().text();
  const headers: [string, string][] = [];

  response.headers.forEach((value, headerKey) => {
    headers.push([headerKey, value]);
  });

  const entry: CachedResponseEntry = {
    bodyText,
    createdAt: Date.now(),
    headers,
    status: response.status,
    statusText: response.statusText,
  };

  rememberCacheEntry(key, entry);

  return entry;
}

export function clearClientFetchCache() {
  apiFetchCache.clear();
  pendingApiFetches.clear();
}

export function invalidateClientFetchCacheByPrefix(prefix: string) {
  for (const key of apiFetchCache.keys()) {
    if (key.startsWith(prefix)) {
      apiFetchCache.delete(key);
    }
  }

  for (const key of pendingApiFetches.keys()) {
    if (key.startsWith(prefix)) {
      pendingApiFetches.delete(key);
    }
  }
}

export function installClientFetchCache() {
  if (typeof window === "undefined") return;

  const cacheWindow = window as WindowWithFetchCache;

  if (cacheWindow.__psicoFetchCacheInstalled) return;

  const originalFetch = cacheWindow.__psicoOriginalFetch || window.fetch.bind(window);

  cacheWindow.__psicoOriginalFetch = originalFetch;
  cacheWindow.__psicoFetchCacheInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!shouldHandleRequest(input)) {
      return originalFetch(input, init);
    }

    const method = getMethod(input, init);

    if (method !== "GET") {
      const response = await originalFetch(input, init);

      if (response.ok) {
        clearClientFetchCache();
      }

      return response;
    }

    const cacheKey = getCacheKey(input, init);
    const cachedEntry = apiFetchCache.get(cacheKey);

    if (cachedEntry) {
      return createResponseFromCache(cachedEntry);
    }

    const pendingFetch = pendingApiFetches.get(cacheKey);

    if (pendingFetch) {
      const pendingEntry = await pendingFetch;

      if (pendingEntry) {
        return createResponseFromCache(pendingEntry);
      }

      return originalFetch(input, init);
    }

    let resolvePendingFetch: (entry: CachedResponseEntry | null) => void;

    const cachePromise = new Promise<CachedResponseEntry | null>((resolve) => {
      resolvePendingFetch = resolve;
    });

    pendingApiFetches.set(cacheKey, cachePromise);

    try {
      const networkResponse = await originalFetch(input, init);
      const cachedNetworkEntry = await cacheSuccessfulResponse(
        cacheKey,
        networkResponse,
      );

      resolvePendingFetch!(cachedNetworkEntry);

      return networkResponse;
    } catch (error) {
      resolvePendingFetch!(null);
      throw error;
    } finally {
      pendingApiFetches.delete(cacheKey);
    }
  };
}
