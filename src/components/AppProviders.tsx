"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

function AuthGuard({ children }: PropsWithChildren) {
  const { data: session, status } = useSession();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  const isLandingPage = pathname === "/";
  const isPublicPage = isAuthPage || isLandingPage;

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isPsychologist = userRole === "PSYCHOLOGIST";
  const isPatient = userRole === "PATIENT";

  const homePath = isPsychologist ? "/dashboard" : "/patient";

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !isPublicPage) {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && (isAuthPage || isLandingPage)) {
      const redirectPath =
        userRole === "PSYCHOLOGIST" ? "/dashboard" : "/patient";

      router.push(redirectPath);
    }
  }, [status, isPublicPage, isAuthPage, isLandingPage, userRole, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-semibold text-blue-800">Carregando...</div>
      </div>
    );
  }

  if (isPublicPage && status === "unauthenticated") {
    return <>{children}</>;
  }

  if (!isPublicPage && status === "authenticated") {
    const isActive = (path: string) => pathname === path;

    return (
      <>
        {isSidebarVisible && (
          <div
            className="overlay"
            onClick={() => setIsSidebarVisible(false)}
          ></div>
        )}

        <div className="chat-container">
          <nav
            className={`sidebar ${isSidebarVisible ? "sidebar-visible" : ""}`}
          >
            <div className="sidebar-header">
              <div className="logo">
                <img src="/logo.png" alt="Logo PsicoConnect" />
              </div>
              <h1>
                Psico
                <br />
                Connect
              </h1>
            </div>

            <div className="sidebar-nav">
              <Link
                href={homePath}
                className={isActive(homePath) ? "active" : ""}
              >
                <i className="fa-solid fa-home"></i> Início
              </Link>

              {isPsychologist && (
                <Link
                  href="/agenda"
                  className={isActive("/agenda") ? "active" : ""}
                >
                  <i className="fa-solid fa-calendar-days"></i> Agenda
                </Link>
              )}

              {isPsychologist && (
                <Link
                  href="/pacientes"
                  className={isActive("/pacientes") ? "active" : ""}
                >
                  <i className="fa-solid fa-users"></i> Pacientes
                </Link>
              )}

              {isPatient && (
                <Link
                  href="/minhas-consultas"
                  className={isActive("/minhas-consultas") ? "active" : ""}
                >
                  <i className="fa-solid fa-calendar-alt"></i> Minhas Consultas
                </Link>
              )}

              <Link href="#" className={isActive("/conteudos") ? "active" : ""}>
                <i className="fa-solid fa-book-open"></i> Conteúdos
              </Link>

              <Link href="/chat" className={isActive("/chat") ? "active" : ""}>
                <i className="fa-solid fa-comments"></i> Chat
              </Link>
            </div>

            <div className="sidebar-footer">
              <button onClick={() => signOut({ callbackUrl: "/login" })}>
                <i className="fa-solid fa-sign-out-alt"></i> Sair
              </button>
            </div>
          </nav>

          <main className="chat-main-wrapper">
            <button
              className="menu-toggle-button"
              onClick={() => setIsSidebarVisible(true)}
            >
              <i className="fa-solid fa-bars"></i>
            </button>

            {children}
          </main>
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-lg font-semibold text-blue-800">Carregando...</div>
    </div>
  );
}

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <AuthGuard>{children}</AuthGuard>
    </SessionProvider>
  );
}
