"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

type SessionUserWithRoleAndCrp = {
  role?: string;
  crpVerificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

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


const menuIconStyle = {
  width: "42px",
  minWidth: "42px",
  marginRight: "16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  flexShrink: 0,
} as const;

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
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isLandingPage = pathname === "/";
  const isVerificationPage = pathname.startsWith("/aguardando-verificacao");
  const isPublicPage = isAuthPage || isLandingPage;

  const shouldRedirectAuthenticatedUser =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    isLandingPage;

  const sessionUser = session?.user as SessionUserWithRoleAndCrp | undefined;
  const userRole = sessionUser?.role;
  const crpVerificationStatus = sessionUser?.crpVerificationStatus;

  const isAdmin = userRole === "ADMIN";
  const isPsychologist = userRole === "PSYCHOLOGIST";
  const isPatient = userRole === "PATIENT";

  const shouldBlockPsychologistByCrp =
    isPsychologist && crpVerificationStatus !== "APPROVED";

  const homePath = isAdmin ? "/admin" : isPsychologist ? "/dashboard" : "/patient";

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !isPublicPage) {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && shouldRedirectAuthenticatedUser) {
      let redirectPath = "/patient";

      if (isAdmin) {
        redirectPath = "/admin";
      } else if (isPsychologist) {
        redirectPath = shouldBlockPsychologistByCrp
          ? "/aguardando-verificacao"
          : "/dashboard";
      }

      setIsNavigating(true);
      router.push(redirectPath);
      return;
    }

    if (
      status === "authenticated" &&
      shouldBlockPsychologistByCrp &&
      !isVerificationPage
    ) {
      setIsNavigating(true);
      router.push("/aguardando-verificacao");
      return;
    }

    if (
      status === "authenticated" &&
      isVerificationPage &&
      isPsychologist &&
      crpVerificationStatus === "APPROVED"
    ) {
      setIsNavigating(true);
      router.push("/dashboard");
    }
  }, [
    status,
    isPublicPage,
    shouldRedirectAuthenticatedUser,
    isAdmin,
    isPsychologist,
    shouldBlockPsychologistByCrp,
    isVerificationPage,
    crpVerificationStatus,
    router,
  ]);

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

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (isVerificationPage && status === "authenticated") {
    return <>{children}</>;
  }

  if (status === "authenticated") {
    const isActive = (path: string) =>
      pathname === path || pathname.startsWith(`${path}/`);

    return (
      <>
        <style jsx global>{`
          .sidebar .sidebar-nav a,
          .sidebar .sidebar-footer button {
            position: relative;
          }

          .menu-toggle-button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            line-height: 1 !important;
            padding: 0 !important;
          }

          .menu-toggle-button i {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 1em !important;
            height: 1em !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .menu-toggle-button i::before {
            display: block !important;
            line-height: 1 !important;
            margin: 0 !important;
          }

          .sidebar .sidebar-nav a:hover,
          .sidebar .sidebar-nav a.active,
          .sidebar .sidebar-nav a.active:hover {
            background: #001e5e !important;
            background-color: #001e5e !important;
            color: #ffffff !important;
          }

          .sidebar .sidebar-nav a.active::before {
            content: "";
            position: absolute;
            left: 0;
            top: 13px;
            bottom: 13px;
            width: 4px;
            border-radius: 0 999px 999px 0;
            background: #ffffff;
          }
        `}</style>

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
            <div
              className="sidebar-header"
              style={{
                transform: "scale(0.9)",
                transformOrigin: "left center",
                marginLeft: "10px",
              }}
            >
              <Link
                href={homePath}
                onClick={() => handleMenuNavigation(homePath)}
                title="Ir para o início"
                aria-label="Ir para a página inicial do PsicoConnect"
                style={{
                  display: "contents",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div className="logo">
                  <img src="/logo.png" alt="Logo PsicoConnect" />
                </div>
                <h1>
                  Psico
                  <br />
                  Connect
                </h1>
              </Link>
            </div>

            <div className="sidebar-nav">
              {isAdmin ? (
                <>
                  <Link
                    href="/admin"
                    title="Ir para Administração"
                    onClick={() => handleMenuNavigation("/admin")}
                    className={pathname === "/admin" ? "active" : ""}
                  >
                    <i className="fa-solid fa-user-shield" style={menuIconStyle}></i> Administração
                  </Link>

                  <Link
                    href="/admin/usuarios"
                    title="Gerenciar usuários"
                    onClick={() => handleMenuNavigation("/admin/usuarios")}
                    className={isActive("/admin/usuarios") ? "active" : ""}
                  >
                    <i className="fa-solid fa-users-gear" style={menuIconStyle}></i> Usuários
                  </Link>

                  <Link
                    href="/chat"
                    title="Abrir PsicoBot"
                    onClick={() => handleMenuNavigation("/chat")}
                    className={isActive("/chat") ? "active" : ""}
                  >
                    <PsicoBotMenuIcon /> PsicoBot
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={homePath}
                    title="Ir para o início"
                    onClick={() => handleMenuNavigation(homePath)}
                    className={isActive(homePath) ? "active" : ""}
                  >
                    <i className="fa-solid fa-home" style={menuIconStyle}></i> Início
                  </Link>

                  {(isPsychologist || isPatient) && (
                    <Link
                      href="/perfil"
                      title="Abrir perfil"
                      onClick={() => handleMenuNavigation("/perfil")}
                      className={isActive("/perfil") ? "active" : ""}
                    >
                      <i className="fa-solid fa-user" style={menuIconStyle}></i> Perfil
                    </Link>
                  )}

                  {isPsychologist && !shouldBlockPsychologistByCrp && (
                    <Link
                      href="/agenda"
                      title="Abrir agenda"
                      onClick={() => handleMenuNavigation("/agenda")}
                      className={isActive("/agenda") ? "active" : ""}
                    >
                      <i className="fa-solid fa-calendar-days" style={menuIconStyle}></i> Agenda
                    </Link>
                  )}

                  {isPsychologist && !shouldBlockPsychologistByCrp && (
                    <Link
                      href="/pacientes"
                      title="Abrir pacientes"
                      onClick={() => handleMenuNavigation("/pacientes")}
                      className={isActive("/pacientes") ? "active" : ""}
                    >
                      <i className="fa-solid fa-users" style={menuIconStyle}></i> Pacientes
                    </Link>
                  )}

                  {isPatient && (
                    <Link
                      href="/meus-psicologos"
                      title="Ver psicólogos vinculados"
                      onClick={() => handleMenuNavigation("/meus-psicologos")}
                      className={isActive("/meus-psicologos") ? "active" : ""}
                    >
                      <i className="fa-solid fa-user-doctor" style={menuIconStyle}></i> Psicólogos
                    </Link>
                  )}

                  {isPatient && (
                    <Link
                      href="/minhas-consultas"
                      title="Ver minhas consultas"
                      onClick={() => handleMenuNavigation("/minhas-consultas")}
                      className={isActive("/minhas-consultas") ? "active" : ""}
                    >
                      <i className="fa-solid fa-calendar-alt" style={menuIconStyle}></i> Minhas Consultas
                    </Link>
                  )}

                  {isPatient && (
                    <Link
                      href="/tarefas-materiais"
                      title="Ver tarefas e materiais"
                      onClick={() => handleMenuNavigation("/tarefas-materiais")}
                      className={isActive("/tarefas-materiais") ? "active" : ""}
                    >
                      <i className="fa-solid fa-list-check" style={menuIconStyle}></i> Tarefas e materiais
                    </Link>
                  )}

                  {isPatient && (
                    <Link
                      href="/mensagens"
                      title="Abrir mensagens"
                      onClick={() => handleMenuNavigation("/mensagens")}
                      className={isActive("/mensagens") ? "active" : ""}
                    >
                      <i className="fa-solid fa-comments" style={menuIconStyle}></i> Mensagens
                    </Link>
                  )}

                  <Link
                    href="/orientacoes"
                    title="Abrir orientações"
                    onClick={() => handleMenuNavigation("/orientacoes")}
                    className={isActive("/orientacoes") ? "active" : ""}
                  >
                    <i className="fa-solid fa-book-open" style={menuIconStyle}></i> Orientações
                  </Link>

                  <Link
                    href="/chat"
                    title="Abrir PsicoBot"
                    onClick={() => handleMenuNavigation("/chat")}
                    className={isActive("/chat") ? "active" : ""}
                  >
                    <PsicoBotMenuIcon /> PsicoBot
                  </Link>
                </>
              )}
            </div>

            <div className="sidebar-footer">
              <button
                title="Sair da conta"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <i className="fa-solid fa-sign-out-alt" style={menuIconStyle}></i> Sair
              </button>
            </div>
          </nav>

          <main className="chat-main-wrapper">
            <button
              className="menu-toggle-button"
              title="Abrir menu"
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
