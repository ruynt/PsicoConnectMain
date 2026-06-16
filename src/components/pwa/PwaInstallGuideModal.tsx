"use client";

import { PwaPlatform, usePwaInstall } from "./PwaInstallProvider";

function getGuideContent(platform: PwaPlatform) {
  if (platform === "ios-safari") {
    return {
      title: "Adicionar o PsicoConnect à Tela de Início",
      description:
        "No iPhone ou iPad, a instalação é feita pelo menu de compartilhamento do Safari.",
      steps: [
        "Toque no botão Compartilhar do Safari.",
        "Escolha Adicionar à Tela de Início.",
        "Confirme o nome PsicoConnect e toque em Adicionar.",
      ],
    };
  }

  if (platform === "ios-other") {
    return {
      title: "Abra no Safari para instalar",
      description:
        "No iPhone ou iPad, a instalação de PWA funciona pelo Safari.",
      steps: [
        "Abra o PsicoConnect no Safari.",
        "Toque no botão Compartilhar.",
        "Escolha Adicionar à Tela de Início e confirme em Adicionar.",
      ],
    };
  }

  if (platform === "android") {
    return {
      title: "Instalar no Android",
      description:
        "Se o botão automático não aparecer neste navegador, use o menu do próprio navegador.",
      steps: [
        "Abra o PsicoConnect no Chrome ou Edge.",
        "Toque no menu de três pontos.",
        "Escolha Instalar app ou Adicionar à tela inicial.",
      ],
    };
  }

  if (platform === "desktop-safari") {
    return {
      title: "Adicionar no Mac",
      description:
        "No Safari do Mac, o PsicoConnect pode ser adicionado como app pelo menu do navegador.",
      steps: [
        "Abra o PsicoConnect no Safari.",
        "No menu superior, escolha Arquivo.",
        "Clique em Adicionar ao Dock e confirme.",
      ],
    };
  }

  return {
    title: "Instalar o PsicoConnect",
    description:
      "Se o navegador não abriu a instalação automaticamente, use a opção de instalação do próprio navegador.",
    steps: [
      "Abra o PsicoConnect no Chrome, Edge ou navegador compatível.",
      "Procure o ícone de instalação na barra de endereço ou abra o menu de três pontos.",
      "Escolha Instalar PsicoConnect, Instalar app ou Adicionar à tela inicial.",
    ],
  };
}

export default function PwaInstallGuideModal() {
  const { guideOpen, closeInstallGuide, platform } = usePwaInstall();

  if (!guideOpen) return null;

  const content = getGuideContent(platform);

  return (
    <div className="pwa-guide-overlay" role="presentation" onClick={closeInstallGuide}>
      <section
        className="pwa-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-guide-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pwa-guide-close"
          onClick={closeInstallGuide}
          aria-label="Fechar instruções de instalação"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>

        <div className="pwa-guide-icon" aria-hidden="true">
          <i className="fa-solid fa-mobile-screen-button"></i>
        </div>

        <span className="pwa-guide-tag">Instalação do app</span>
        <h2 id="pwa-guide-title">{content.title}</h2>
        <p>{content.description}</p>

        <ol className="pwa-guide-steps">
          {content.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <button type="button" className="pwa-guide-done" onClick={closeInstallGuide}>
          Entendi
        </button>
      </section>
    </div>
  );
}
