"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

function PsicoLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f8fbff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="psico-simple-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

function PsicoNavigationLoading() {
  return (
    <div className="psico-navigation-loading">
      <div className="psico-simple-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

function PsicoBotMenuIcon() {
  return (
    <img
      src="/psicobot_icon_white.png"
      alt=""
      aria-hidden="true"
      style={{
        width: "42px",
        height: "42px",
        objectFit: "contain",
        marginRight: "16px",
        flexShrink: 0,
      }}
    />
  );
}

function AuthGuard({ children }: PropsWithChildren) {
  const { data: session, status } = useSession();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

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

      setIsNavigating(true);
      router.push(redirectPath);
    }
  }, [status, isPublicPage, isAuthPage, isLandingPage, userRole, router]);

  useEffect(() => {
    setIsNavigating(false);
    setIsSidebarVisible(false);
  }, [pathname]);

  function handleMenuNavigation(path: string) {
    if (pathname !== path) {
      setIsNavigating(true);
    }
  }

  if (status === "loading") {
    return <PsicoLoadingScreen />;
  }

  if (isPublicPage && status === "unauthenticated") {
    return <>{children}</>;
  }

  if (!isPublicPage && status === "authenticated") {
    const isActive = (path: string) =>
      pathname === path || pathname.startsWith(`${path}/`);

    return (
      <>
        {isNavigating && <PsicoNavigationLoading />}

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
                onClick={() => handleMenuNavigation(homePath)}
                className={isActive(homePath) ? "active" : ""}
              >
                <i className="fa-solid fa-home"></i> Início
              </Link>

              {isPsychologist && (
                <Link
                  href="/agenda"
                  onClick={() => handleMenuNavigation("/agenda")}
                  className={isActive("/agenda") ? "active" : ""}
                >
                  <i className="fa-solid fa-calendar-days"></i> Agenda
                </Link>
              )}

              {isPsychologist && (
                <Link
                  href="/pacientes"
                  onClick={() => handleMenuNavigation("/pacientes")}
                  className={isActive("/pacientes") ? "active" : ""}
                >
                  <i className="fa-solid fa-users"></i> Pacientes
                </Link>
              )}

              {isPatient && (
                <Link
                  href="/minhas-consultas"
                  onClick={() => handleMenuNavigation("/minhas-consultas")}
                  className={isActive("/minhas-consultas") ? "active" : ""}
                >
                  <i className="fa-solid fa-calendar-alt"></i> Minhas Consultas
                </Link>
              )}

              {isPatient && (
                <Link
                  href="/tarefas-materiais"
                  onClick={() => handleMenuNavigation("/tarefas-materiais")}
                  className={isActive("/tarefas-materiais") ? "active" : ""}
                >
                  <i className="fa-solid fa-list-check"></i> Tarefas e materiais
                </Link>
              )}

              {isPatient && (
                <Link
                  href="/mensagens"
                  onClick={() => handleMenuNavigation("/mensagens")}
                  className={isActive("/mensagens") ? "active" : ""}
                >
                  <i className="fa-solid fa-comments"></i> Mensagens
                </Link>
              )}

              <Link
                href="/orientacoes"
                onClick={() => handleMenuNavigation("/orientacoes")}
                className={isActive("/orientacoes") ? "active" : ""}
              >
                <i className="fa-solid fa-book-open"></i> Orientações
              </Link>

              <Link
                href="/chat"
                onClick={() => handleMenuNavigation("/chat")}
                className={isActive("/chat") ? "active" : ""}
              >
                <PsicoBotMenuIcon /> PsicoBot
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

  return <PsicoLoadingScreen />;
}

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <AuthGuard>{children}</AuthGuard>
    </SessionProvider>
  );
}
