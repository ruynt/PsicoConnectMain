// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/confirm-email") ||
    pathname.startsWith("/api/forgot-password") ||
    pathname.startsWith("/api/reset-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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