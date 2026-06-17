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
    }
  : null;

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

function getRateLimiter(pathname: string) {
  if (!rateLimiters) {
    return null;
  }

  if (
    pathname.startsWith("/api/auth/callback/credentials") ||
    pathname.startsWith("/api/auth/signin")
  ) {
    return {
      name: "login",
      limiter: rateLimiters.login,
    };
  }

  if (pathname.startsWith("/api/signup")) {
    return {
      name: "signup",
      limiter: rateLimiters.signup,
    };
  }

  if (
    pathname.startsWith("/api/forgot-password") ||
    pathname.startsWith("/api/reset-password")
  ) {
    return {
      name: "password",
      limiter: rateLimiters.password,
    };
  }

  if (pathname.startsWith("/api/auth/resend-verification")) {
    return {
      name: "resend-email",
      limiter: rateLimiters.resendEmail,
    };
  }

  if (
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/psicobot")
  ) {
    return {
      name: "chat",
      limiter: rateLimiters.chat,
    };
  }

  if (pathname.startsWith("/api/profile/upload-image")) {
    return {
      name: "upload",
      limiter: rateLimiters.upload,
    };
  }

  return null;
}

async function applyRateLimit(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rateLimitConfig = getRateLimiter(pathname);

  if (!rateLimitConfig) {
    return null;
  }

  const ip = getClientIp(req);
  const key = `${rateLimitConfig.name}:${ip}`;
  const { success, limit, remaining, reset } =
    await rateLimitConfig.limiter.limit(key);

  if (success) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return NextResponse.json(
    {
      error:
        "Muitas solicitações em pouco tempo. Aguarde um momento e tente novamente.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
      },
    },
  );
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (shouldRedirectToHttps(req)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";

    return NextResponse.redirect(url, 308);
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const rateLimitResponse = await applyRateLimit(req);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};