// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const hasUpstashEnv = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = hasUpstashEnv ? Redis.fromEnv() : null;

const rateLimiters = redis
  ? {
      login: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "10 m"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:login",
      }),

      signup: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:signup",
      }),

      password: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:password",
      }),

      resendEmail: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:resend-email",
      }),

      chat: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:chat",
      }),

      upload: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:upload",
      }),

      aiSummary: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:ai-summary",
      }),

      mutation: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, "1 m"),
        analytics: true,
        prefix: "psicoconnect:ratelimit:mutation",
      }),
    }
  : null;

type RateLimiterName =
  | "login"
  | "signup"
  | "password"
  | "resendEmail"
  | "chat"
  | "upload"
  | "aiSummary"
  | "mutation";

type RateLimitConfig = {
  name: RateLimiterName;
  publicName: string;
  limit: number;
  windowMs: number;
};

type InMemoryRateLimitBucket = {
  count: number;
  reset: number;
};

const inMemoryRateLimitBuckets = new Map<string, InMemoryRateLimitBucket>();

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

function isApiMutationMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function getRateLimiter(pathname: string, method: string): RateLimitConfig | null {
  const normalizedMethod = method.toUpperCase();

  if (
    normalizedMethod === "POST" &&
    (pathname.startsWith("/api/auth/callback/credentials") ||
      pathname.startsWith("/api/auth/signin"))
  ) {
    return {
      name: "login",
      publicName: "login",
      limit: 10,
      windowMs: 10 * 60 * 1000,
    };
  }

  if (normalizedMethod === "POST" && pathname.startsWith("/api/signup")) {
    return {
      name: "signup",
      publicName: "signup",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    };
  }

  if (
    normalizedMethod === "POST" &&
    (pathname.startsWith("/api/forgot-password") ||
      pathname.startsWith("/api/reset-password"))
  ) {
    return {
      name: "password",
      publicName: "password",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    };
  }

  if (
    normalizedMethod === "POST" &&
    pathname.startsWith("/api/auth/resend-verification")
  ) {
    return {
      name: "resendEmail",
      publicName: "resend-email",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    };
  }

  if (
    normalizedMethod === "POST" &&
    (pathname.startsWith("/api/chat") || pathname.startsWith("/api/psicobot"))
  ) {
    return {
      name: "chat",
      publicName: "chat",
      limit: 30,
      windowMs: 60 * 1000,
    };
  }

  if (
    normalizedMethod === "POST" &&
    pathname.startsWith("/api/profile/upload-image")
  ) {
    return {
      name: "upload",
      publicName: "upload",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    };
  }

  if (
    normalizedMethod === "POST" &&
    pathname.includes("/generate-summary")
  ) {
    return {
      name: "aiSummary",
      publicName: "ai-summary",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    };
  }

  if (pathname.startsWith("/api/") && isApiMutationMethod(normalizedMethod)) {
    return {
      name: "mutation",
      publicName: "api-mutation",
      limit: 120,
      windowMs: 60 * 1000,
    };
  }

  return null;
}

function clearExpiredInMemoryRateLimitBuckets(now: number) {
  if (inMemoryRateLimitBuckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of inMemoryRateLimitBuckets.entries()) {
    if (bucket.reset <= now) {
      inMemoryRateLimitBuckets.delete(key);
    }
  }
}

function applyInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  clearExpiredInMemoryRateLimitBuckets(now);

  const currentBucket = inMemoryRateLimitBuckets.get(key);

  if (!currentBucket || currentBucket.reset <= now) {
    const reset = now + windowMs;

    inMemoryRateLimitBuckets.set(key, {
      count: 1,
      reset,
    });

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset,
    };
  }

  currentBucket.count += 1;
  inMemoryRateLimitBuckets.set(key, currentBucket);

  return {
    success: currentBucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - currentBucket.count),
    reset: currentBucket.reset,
  };
}

async function applyRateLimit(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rateLimitConfig = getRateLimiter(pathname, req.method);

  if (!rateLimitConfig) {
    return {
      response: null,
      headers: null,
    };
  }

  const ip = getClientIp(req);
  const key = `${rateLimitConfig.publicName}:${ip}`;
  const provider = rateLimiters ? "upstash" : "memory";

  const rateLimitResult = rateLimiters
    ? await rateLimiters[rateLimitConfig.name].limit(key)
    : applyInMemoryRateLimit(
        key,
        rateLimitConfig.limit,
        rateLimitConfig.windowMs,
      );

  const retryAfter = Math.max(
    1,
    Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
  );

  const headers = {
    "X-RateLimit-Limit": String(rateLimitResult.limit),
    "X-RateLimit-Remaining": String(rateLimitResult.remaining),
    "X-RateLimit-Reset": String(rateLimitResult.reset),
    "X-RateLimit-Policy": rateLimitConfig.publicName,
    "X-RateLimit-Provider": provider,
  };

  if (rateLimitResult.success) {
    return {
      response: null,
      headers,
    };
  }

  return {
    response: NextResponse.json(
      {
        error:
          "Muitas solicitações em pouco tempo. Aguarde um momento e tente novamente.",
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(retryAfter),
        },
      },
    ),
    headers,
  };
}

function withRateLimitHeaders(
  response: NextResponse,
  headers: Record<string, string> | null,
) {
  if (!headers) {
    return response;
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/og-psicoconnect.png" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/manifest.webmanifest" ||
    pathname.includes(".")
  );
}

function shouldRedirectToHttps(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host") || "";

  if (!forwardedProto || forwardedProto !== "http") {
    return false;
  }

  return !host.startsWith("localhost") && !host.startsWith("127.0.0.1");
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/legal" ||
    pathname.startsWith("/legal/") ||
    pathname === "/termos-de-uso" ||
    pathname === "/politica-de-privacidade" ||
    pathname === "/exclusao-de-dados" ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/signup") ||
    pathname.startsWith("/api/confirm-email") ||
    pathname.startsWith("/api/forgot-password") ||
    pathname.startsWith("/api/reset-password")
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (shouldRedirectToHttps(req)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";

    return NextResponse.redirect(url, 308);
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const rateLimitResult = await applyRateLimit(req);

  if (rateLimitResult.response) {
    return rateLimitResult.response;
  }

  if (isPublicPath(pathname)) {
    return withRateLimitHeaders(NextResponse.next(), rateLimitResult.headers);
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role;

  // Área administrativa: somente ADMIN
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    if (role === "PSYCHOLOGIST") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (role === "PATIENT") {
      return NextResponse.redirect(new URL("/patient", req.url));
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Área do psicólogo: somente PSYCHOLOGIST
  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/agenda") ||
      pathname.startsWith("/pacientes")) &&
    role !== "PSYCHOLOGIST"
  ) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.redirect(new URL("/patient", req.url));
  }

  // Área do paciente: somente PATIENT
  if (
    (pathname.startsWith("/patient") ||
      pathname.startsWith("/minhas-consultas") ||
      pathname.startsWith("/tarefas-materiais") ||
      pathname.startsWith("/mensagens")) &&
    role !== "PATIENT"
  ) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return withRateLimitHeaders(NextResponse.next(), rateLimitResult.headers);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
