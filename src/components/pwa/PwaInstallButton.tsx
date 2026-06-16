"use client";

import { ComponentPropsWithoutRef } from "react";
import { usePwaInstall } from "./PwaInstallProvider";

type PwaInstallButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "footer" | "sidebar" | "primary";
  label?: string;
  hideWhenInstalled?: boolean;
};

export default function PwaInstallButton({
  variant = "primary",
  label = "Instalar app",
  hideWhenInstalled = true,
  className = "",
  type = "button",
  onClick,
  ...props
}: PwaInstallButtonProps) {
  const { installApp, isInstalled } = usePwaInstall();

  if (hideWhenInstalled && isInstalled) {
    return null;
  }

  const classes = ["pwa-install-button", `pwa-install-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      onClick={async (event) => {
        onClick?.(event);

        if (event.defaultPrevented) return;
        await installApp();
      }}
    >
      <i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
      <span>{label}</span>
    </button>
  );
}
