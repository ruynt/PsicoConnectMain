"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaPlatform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "desktop-safari"
  | "desktop"
  | "unknown";

type PwaInstallContextValue = {
  canPromptInstall: boolean;
  isInstalled: boolean;
  platform: PwaPlatform;
  guideOpen: boolean;
  installApp: () => Promise<void>;
  openInstallGuide: () => void;
  closeInstallGuide: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function getIsInstalled() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.location.search.includes("source=pwa") ||
    document.referrer.startsWith("android-app://") ||
    navigatorWithStandalone.standalone === true
  );
}

function getPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "unknown";

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? "";
  const isIpadOnDesktopMode =
    platform.includes("mac") && window.navigator.maxTouchPoints > 1;
  const isIos = /iphone|ipad|ipod/.test(userAgent) || isIpadOnDesktopMode;
  const isAndroid = userAgent.includes("android");
  const isSafari =
    userAgent.includes("safari") &&
    !userAgent.includes("chrome") &&
    !userAgent.includes("crios") &&
    !userAgent.includes("fxios") &&
    !userAgent.includes("edgios");

  if (isIos && isSafari) return "ios-safari";
  if (isIos) return "ios-other";
  if (isAndroid) return "android";
  if (!isIos && isSafari) return "desktop-safari";
  if (userAgent) return "desktop";

  return "unknown";
}

export function PwaInstallProvider({ children }: PropsWithChildren) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");

  useEffect(() => {
    const syncInstalledState = () => {
      setIsInstalled(getIsInstalled());
    };

    const syncPlatformState = () => {
      setPlatform(getPwaPlatform());
    };

    const initialStateTimer = window.setTimeout(() => {
      syncInstalledState();
      syncPlatformState();
    }, 0);

    const canRegisterServiceWorker =
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(window.location.hostname));

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Erro ao registrar o service worker:", error);
      });
    };

    if (canRegisterServiceWorker) {
      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setGuideOpen(false);
      window.localStorage.setItem("psicoconnect:pwa-installed", "true");
    };

    const installModeQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    installModeQuery.addEventListener("change", syncInstalledState);
    window.addEventListener("focus", syncInstalledState);
    window.addEventListener("pageshow", syncInstalledState);
    document.addEventListener("visibilitychange", syncInstalledState);

    return () => {
      window.clearTimeout(initialStateTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      installModeQuery.removeEventListener("change", syncInstalledState);
      window.removeEventListener("focus", syncInstalledState);
      window.removeEventListener("pageshow", syncInstalledState);
      document.removeEventListener("visibilitychange", syncInstalledState);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  const openInstallGuide = useCallback(() => {
    setGuideOpen(true);
  }, []);

  const closeInstallGuide = useCallback(() => {
    setGuideOpen(false);
  }, []);

  const installApp = useCallback(async () => {
    if (isInstalled) return;

    if (!deferredPrompt) {
      setGuideOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem("psicoconnect:pwa-installed", "true");
    }

    setDeferredPrompt(null);
  }, [deferredPrompt, isInstalled]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canPromptInstall: Boolean(deferredPrompt),
      isInstalled,
      platform,
      guideOpen,
      installApp,
      openInstallGuide,
      closeInstallGuide,
    }),
    [
      deferredPrompt,
      isInstalled,
      platform,
      guideOpen,
      installApp,
      openInstallGuide,
      closeInstallGuide,
    ]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaInstall deve ser usado dentro de PwaInstallProvider.");
  }

  return context;
}
