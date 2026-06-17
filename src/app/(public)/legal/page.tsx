import Link from "next/link";
import { legalBlocks } from "@/lib/legal/legalContent";
import LegalHashScroller from "./LegalHashScroller";
import LegalTabs from "@/components/legal/LegalTabs";
import styles from "./legal.module.css";

const legalHubLinks = [
  {
    id: "termos",
    title: "Termos de Uso",
    description:
      "Regras de acesso, responsabilidades dos usuários e limites de uso da plataforma.",
    href: "/termos-de-uso",
    icon: "fa-solid fa-file-contract",
  },
  {
    id: "privacidade",
    title: "Política de Privacidade",
    description:
      "Tratamento de dados pessoais, dados sensíveis, segurança e uso do Google Calendar.",
    href: "/politica-de-privacidade",
    icon: "fa-solid fa-user-shield",
  },
  {
    id: "exclusao-dados",
    title: "Exclusão de Dados",
    description:
      "Como solicitar exclusão de conta, dados pessoais e desconexão do Google Calendar.",
    href: "/exclusao-de-dados",
    icon: "fa-solid fa-user-slash",
  },
  {
    id: "dados-sensiveis",
    title: "Dados Sensíveis",
    description:
      "Consentimento para tratamento de dados relacionados à saúde mental e acompanhamento psicológico.",
    href: "#dados-sensiveis",
    icon: "fa-solid fa-lock",
  },
  {
    id: "ia",
    title: "Uso da Inteligência Artificial",
    description:
      "Limites do PsicoBot, necessidade de revisão profissional e uso responsável da IA.",
    href: "#ia",
    icon: "fa-solid fa-brain",
  },
];

export const metadata = {
  title: "Termos e Privacidade | PsicoConnect",
  description:
    "Termos de uso, política de privacidade, uso de inteligência artificial e consentimento de dados sensíveis do PsicoConnect.",
};

export default function LegalPage() {
  return (
    <main className={styles.legalPage}>
      <LegalHashScroller />

      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <Link href="/" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Voltar
          </Link>

          <div className={styles.heroCard}>
            <span className={styles.badge}>Documentos legais</span>

            <h1>Termos, Privacidade e Consentimentos</h1>

            <p>
              Consulte os documentos legais do PsicoConnect, incluindo
              termos de uso, política de privacidade, exclusão de dados,
              consentimento para dados sensíveis e limites da inteligência
              artificial.
            </p>

            <span className={styles.updated}>
              Última atualização: Junho de 2026
            </span>
          </div>
        </div>
      </section>

      <section className={styles.legalTabsSection} aria-label="Navegação principal da área legal">
        <div className={styles.legalTabsInner}>
          <LegalTabs active="central" />
        </div>
      </section>


      <section className={styles.hubSection} aria-label="Central legal">
        <div className={styles.hubInner}>
          <div className={styles.hubHeader}>
            <span className={styles.badge}>Central legal</span>
            <h2>Documentos principais</h2>
            <p>
              Estes links ficam separados para facilitar a revisão do Google,
              o acesso dos usuários e a consulta durante o cadastro.
            </p>
          </div>

          <div className={styles.hubGrid}>
            {legalHubLinks.map((item) => (
              <Link
                key={item.id}
                id={`atalho-${item.id}`}
                href={item.href}
                className={styles.hubCard}
              >
                <span className={styles.hubIcon}>
                  <i className={item.icon} aria-hidden="true" />
                </span>

                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.contentSection}>
        <div className={styles.contentInner}>
          <aside className={styles.navigationCard}>
            <h2>Nesta página</h2>

            <nav
              className={styles.navigationList}
              aria-label="Documentos legais"
            >
              {legalBlocks.map((block) => (
                <a key={block.id} href={`#${block.id}`}>
                  {block.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className={styles.documentsList}>
            {legalBlocks.map((block, index) => (
              <section
                key={block.id}
                id={block.id}
                className={styles.documentCard}
              >
                <header className={styles.documentHeader}>
                  <span className={styles.documentNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className={styles.documentTitleGroup}>
                    <h2>{block.title}</h2>
                    <p>{block.summary}</p>
                  </div>
                </header>

                <div className={styles.documentSections}>
                  {block.content.map((section) => (
                    <article key={section.heading} className={styles.textBlock}>
                      <h3>{section.heading}</h3>

                      {section.paragraphs?.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}

                      {section.items && (
                        <ul>
                          {section.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}