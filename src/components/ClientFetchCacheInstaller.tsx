"use client";

import { installClientFetchCache } from "@/lib/client-fetch-cache";

if (typeof window !== "undefined") {
  installClientFetchCache();
}

export default function ClientFetchCacheInstaller() {
  return null;
}
