import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import { Inter, Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-montserrat",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://psicoconnect.site"),
  title: {
    default: "PsicoConnect | Apoio à prática psicológica",
    template: "%s | PsicoConnect",
  },
  description:
    "Plataforma web para apoio à prática psicológica, com agenda, acompanhamento de pacientes, materiais, mensagens e assistente inteligente.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/favicon.png",
        type: "image/png",
      },
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "PsicoConnect | Apoio à prática psicológica",
    description:
      "Plataforma web para apoio à prática psicológica, com agenda, acompanhamento de pacientes, materiais, mensagens e assistente inteligente.",
    url: "https://psicoconnect.site",
    siteName: "PsicoConnect",
    images: [
      {
        url: "/og-psicoconnect.png",
        width: 1200,
        height: 1200,
        alt: "PsicoConnect - Plataforma de apoio à prática psicológica",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PsicoConnect | Apoio à prática psicológica",
    description:
      "Plataforma web para apoio à prática psicológica, com agenda, acompanhamento de pacientes, materiais, mensagens e assistente inteligente.",
    images: ["/og-psicoconnect.png"],
  },
  appleWebApp: {
    capable: true,
    title: "PsicoConnect",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${montserrat.variable} ${poppins.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
        />
      </head>

      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}