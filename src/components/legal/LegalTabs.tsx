import Link from "next/link";
import styles from "@/app/(public)/legal/legal.module.css";

type LegalTabId = "central" | "termos" | "privacidade" | "exclusao";

type LegalTabsProps = {
  active: LegalTabId;
};

const legalTabs: {
  id: LegalTabId;
  label: string;
  href: string;
  icon: string;
}[] = [
  {
    id: "central",
    label: "Central legal",
    href: "/legal",
    icon: "fa-solid fa-gavel",
  },
  {
    id: "termos",
    label: "Termos de Uso",
    href: "/termos-de-uso",
    icon: "fa-solid fa-file-contract",
  },
  {
    id: "privacidade",
    label: "Política de Privacidade",
    href: "/politica-de-privacidade",
    icon: "fa-solid fa-user-shield",
  },
  {
    id: "exclusao",
    label: "Exclusão de Dados",
    href: "/exclusao-de-dados",
    icon: "fa-solid fa-user-slash",
  },
];

export default function LegalTabs({ active }: LegalTabsProps) {
  return (
    <nav className={styles.documentActions} aria-label="Navegação legal">
      {legalTabs.map((tab) => {
        const isActive = tab.id === active;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`${styles.documentActionLink} ${
              isActive ? styles.documentActionLinkActive : ""
            }`}
          >
            <i className={tab.icon} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
