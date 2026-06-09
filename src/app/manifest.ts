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
    background_color: "#1c4bb3",
    theme_color: "#1c4bb3",
    icons: [
      {
        src: "/favicon.png?v=8",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/icon.png?v=8",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png?v=8",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}