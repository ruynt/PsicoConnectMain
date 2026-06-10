import Link from "next/link";
import { legalBlocks } from "@/lib/legal/legalContent";
import styles from "../legal/legal.module.css";

function getBlock(id: string) {
  const block = legalBlocks.find((item) => item.id === id);

  if (!block) {
    throw new Error(`Documento legal não encontrado: ${id}`);
  }

  return block;
}

function DocumentContent({ blockId }: { blockId: string }) {
  const block = getBlock(blockId);

  return (
    <section id={block.id} className={styles.documentCard}>
      <header className={styles.documentHeader}>
        <span className={styles.documentNumber}>01</span>

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
  );
}

export const metadata = {
  title: "Política de Privacidade | PsicoConnect",
  description:
    "Como o PsicoConnect coleta, utiliza, armazena, protege e compartilha dados pessoais, incluindo dados do Google Calendar.",
};

export default function LegalDocumentPage() {
  return (
    <main className={styles.legalPage}>
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>
          <Link href="/" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Voltar para o início
          </Link>

          <div className={styles.heroCard}>
            <span className={styles.badge}>Política de Privacidade</span>

            <h1>Política de Privacidade</h1>

            <p>Como o PsicoConnect coleta, utiliza, armazena, protege e compartilha dados pessoais, incluindo o uso da integração com Google Calendar.</p>

            <span className={styles.updated}>
              Última atualização: Junho de 2026
            </span>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.singleDocumentInner}>
          <div className={styles.documentActions}>
                <Link href="/termos-de-uso">Termos de Uso</Link>
                <Link href="/exclusao-de-dados">Exclusão de Dados</Link>
                <Link href="/legal#dados-sensiveis">Dados sensíveis</Link>
                <Link href="/legal">Central legal</Link>
          </div>

          <DocumentContent blockId="privacidade" />
        </div>
      </section>
    </main>
  );
}
