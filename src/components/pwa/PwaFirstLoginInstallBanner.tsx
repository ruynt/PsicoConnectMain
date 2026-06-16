"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { usePwaInstall } from "./PwaInstallProvider";

type SessionUserWithEmail = {
  email?: string | null;
};

function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname === "/legal" ||
    pathname === "/termos-de-uso" ||
    pathname === "/politica-de-privacidade" ||
    pathname === "/exclusao-de-dados"
  );
}

export default function PwaFirstLoginInstallBanner() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { installApp, isInstalled } = usePwaInstall();
  const [visibleForStorageKey, setVisibleForStorageKey] = useState<string | null>(null);

  const userEmail = (session?.user as SessionUserWithEmail | undefined)?.email;

  const storageKey = useMemo(() => {
    const userKey = userEmail ? userEmail.toLowerCase() : "anonymous";
    return `psicoconnect:pwa-first-login-banner:${userKey}`;
  }, [userEmail]);

  const canShowBanner =
    status === "authenticated" && !isInstalled && !isPublicAuthPath(pathname);

  useEffect(() => {
    if (!canShowBanner) return;

    const alreadyHandled = window.localStorage.getItem(storageKey);

    if (alreadyHandled) return;

    const timeout = window.setTimeout(() => {
      setVisibleForStorageKey(storageKey);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [canShowBanner, storageKey]);

  function dismissBanner() {
    window.localStorage.setItem(storageKey, "dismissed");
    setVisibleForStorageKey(null);
  }

  async function handleInstall() {
    window.localStorage.setItem(storageKey, "install-clicked");
    setVisibleForStorageKey(null);
    await installApp();
  }

  const visible = canShowBanner && visibleForStorageKey === storageKey;

  if (!visible) return null;

  return (
    <section
      className="pwa-first-login-banner"
      aria-label="Instalar PsicoConnect como aplicativo"
    >
      <div className="pwa-first-login-icon" aria-hidden="true">
        <i className="fa-solid fa-mobile-screen-button"></i>
      </div>

      <div className="pwa-first-login-content">
        <strong>Instale o PsicoConnect</strong>
        <p>Adicione o PsicoConnect à tela inicial.</p>
      </div>

      <div className="pwa-first-login-actions">
        <button type="button" className="pwa-first-login-secondary" onClick={dismissBanner}>
          Agora não
        </button>
        <button type="button" className="pwa-first-login-primary" onClick={handleInstall}>
          Instalar
        </button>
      </div>
    </section>
  );
}
