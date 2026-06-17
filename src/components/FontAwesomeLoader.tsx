"use client";

import { useEffect } from "react";

const FONT_AWESOME_ID = "font-awesome-cdn-stylesheet";
const FONT_AWESOME_HREF =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function FontAwesomeLoader() {
  useEffect(() => {
    if (document.getElementById(FONT_AWESOME_ID)) return;

    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    function loadFontAwesome() {
      if (document.getElementById(FONT_AWESOME_ID)) return;

      const link = document.createElement("link");
      link.id = FONT_AWESOME_ID;
      link.rel = "stylesheet";
      link.href = FONT_AWESOME_HREF;
      link.crossOrigin = "anonymous";

      document.head.appendChild(link);
    }

    const idleWindow = window as WindowWithIdleCallback;

    if (idleWindow.requestIdleCallback) {
      idleCallbackId = idleWindow.requestIdleCallback(loadFontAwesome, {
        timeout: 1500,
      });
    } else {
      timeoutId = window.setTimeout(loadFontAwesome, 900);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (idleCallbackId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, []);

  return null;
}