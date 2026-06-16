import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PsicoConnect",
    short_name: "PsicoConnect",
    description:
      "Plataforma web para apoio à prática psicológica, com agenda, acompanhamento de pacientes, materiais, mensagens e assistente inteligente.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#1c4bb3",
    categories: ["health", "productivity", "education"],
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Entrar",
        short_name: "Entrar",
        description: "Acessar sua conta no PsicoConnect",
        url: "/login",
        icons: [{ src: "/icon.png", sizes: "512x512" }],
      },
      {
        name: "Mensagens",
        short_name: "Mensagens",
        description: "Abrir mensagens",
        url: "/mensagens",
        icons: [{ src: "/icon.png", sizes: "512x512" }],
      },
      {
        name: "Agenda",
        short_name: "Agenda",
        description: "Abrir agenda",
        url: "/agenda",
        icons: [{ src: "/icon.png", sizes: "512x512" }],
      },
    ],
  };
}
