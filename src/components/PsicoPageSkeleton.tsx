import type { CSSProperties } from "react";

type PsicoPageSkeletonVariant =
  | "admin"
  | "adminUsers"
  | "agenda"
  | "appointments"
  | "dashboard"
  | "messages"
  | "patientDetail"
  | "patientHome"
  | "patients"
  | "profile"
  | "psychologists"
  | "tasksMaterials"
  | "default";

type PsicoPageSkeletonProps = {
  variant?: PsicoPageSkeletonVariant;
  title?: string;
  subtitle?: string;
  badge?: string;
  compact?: boolean;
};

type SkeletonPreset = {
  badge: string;
  title: string;
  subtitle: string;
  metrics: number;
  sections: number;
};

const presets: Record<PsicoPageSkeletonVariant, SkeletonPreset> = {
  admin: {
    badge: "Administração",
    title: "Carregando painel administrativo",
    subtitle: "Preparando indicadores, cadastros profissionais e solicitações pendentes.",
    metrics: 4,
    sections: 3,
  },
  adminUsers: {
    badge: "Administração",
    title: "Carregando usuários",
    subtitle: "Buscando contas, perfis, filtros e informações cadastrais.",
    metrics: 4,
    sections: 4,
  },
  agenda: {
    badge: "Agenda",
    title: "Carregando agenda",
    subtitle: "Sincronizando consultas, pacientes e informações do calendário.",
    metrics: 4,
    sections: 3,
  },
  appointments: {
    badge: "Consultas",
    title: "Carregando consultas",
    subtitle: "Organizando horários, confirmações e solicitações de cancelamento.",
    metrics: 4,
    sections: 3,
  },
  dashboard: {
    badge: "Central do psicólogo",
    title: "Carregando dashboard",
    subtitle: "Preparando agenda, métricas, tarefas, materiais e registros recentes.",
    metrics: 4,
    sections: 4,
  },
  messages: {
    badge: "Mensagens",
    title: "Carregando mensagens",
    subtitle: "Buscando conversas e atualizando o histórico de comunicação.",
    metrics: 3,
    sections: 3,
  },
  patientDetail: {
    badge: "Paciente",
    title: "Carregando acompanhamento",
    subtitle: "Preparando consultas, anotações, tarefas, materiais e mensagens do paciente.",
    metrics: 4,
    sections: 4,
  },
  patientHome: {
    badge: "Área do paciente",
    title: "Carregando acompanhamento",
    subtitle: "Preparando consultas, checklists, tarefas e materiais enviados pelo profissional.",
    metrics: 5,
    sections: 3,
  },
  patients: {
    badge: "Pacientes",
    title: "Carregando pacientes",
    subtitle: "Buscando vínculos, próximos atendimentos e dados principais dos pacientes.",
    metrics: 4,
    sections: 4,
  },
  profile: {
    badge: "Perfil",
    title: "Carregando perfil",
    subtitle: "Preparando seus dados pessoais, profissionais e informações de contato.",
    metrics: 3,
    sections: 3,
  },
  psychologists: {
    badge: "Psicólogos",
    title: "Carregando psicólogos",
    subtitle: "Buscando profissionais vinculados ao seu acompanhamento.",
    metrics: 3,
    sections: 3,
  },
  tasksMaterials: {
    badge: "Tarefas e materiais",
    title: "Carregando atividades",
    subtitle: "Preparando tarefas terapêuticas e materiais psicoeducativos enviados.",
    metrics: 4,
    sections: 3,
  },
  default: {
    badge: "PsicoConnect",
    title: "Carregando página",
    subtitle: "Preparando as informações da plataforma.",
    metrics: 4,
    sections: 3,
  },
};

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 48px)",
  padding: "36px",
  paddingBottom: "150px",
  borderRadius: "32px",
  overflow: "visible",
  background:
    "radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%), #f8fafc",
};

const cardStyle: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.94)",
  borderRadius: "22px",
  padding: "22px",
  border: "1px solid rgba(226, 232, 240, 0.92)",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
};

function SkeletonBlock({
  width = "100%",
  height,
  radius = "14px",
  variant = "light",
}: {
  width?: string;
  height: string;
  radius?: string;
  variant?: "light" | "blue";
}) {
  return (
    <span
      className={`psico-page-skeleton-block psico-page-skeleton-block--${variant}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function MetricSkeletonCard({ index }: { index: number }) {
  const tones = ["#eff6ff", "#ecfdf5", "#fffbeb", "#f5f3ff", "#fef2f2"];
  const tone = tones[index % tones.length];

  return (
    <div className="psico-page-skeleton-metric" style={cardStyle}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "-24px",
          top: "-24px",
          width: "92px",
          height: "92px",
          borderRadius: "999px",
          backgroundColor: tone,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <SkeletonBlock width="54%" height="13px" radius="999px" />
        <div style={{ height: "12px" }} />
        <SkeletonBlock width="44px" height="34px" radius="12px" />
        <div style={{ height: "14px" }} />
        <SkeletonBlock width="88%" height="12px" radius="999px" />
        <div style={{ height: "8px" }} />
        <SkeletonBlock width="64%" height="12px" radius="999px" />
      </div>
    </div>
  );
}

function SectionSkeletonCard({ index }: { index: number }) {
  return (
    <section className="psico-page-skeleton-section" style={cardStyle}>
      <div className="psico-page-skeleton-section-header">
        <div>
          <SkeletonBlock width={index % 2 === 0 ? "210px" : "250px"} height="28px" />
          <div style={{ height: "10px" }} />
          <SkeletonBlock width="min(420px, 86vw)" height="14px" radius="999px" />
        </div>
        <SkeletonBlock width="104px" height="38px" radius="999px" />
      </div>

      <div className="psico-page-skeleton-list">
        {Array.from({ length: index % 2 === 0 ? 3 : 2 }).map((_, itemIndex) => (
          <div key={`skeleton-section-${index}-${itemIndex}`} className="psico-page-skeleton-list-item">
            <div>
              <SkeletonBlock width={itemIndex % 2 === 0 ? "58%" : "46%"} height="15px" />
              <div style={{ height: "9px" }} />
              <SkeletonBlock width="84%" height="12px" radius="999px" />
              <div style={{ height: "7px" }} />
              <SkeletonBlock width="62%" height="12px" radius="999px" />
            </div>
            <SkeletonBlock width="86px" height="26px" radius="999px" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PsicoPageSkeleton({
  variant = "default",
  title,
  subtitle,
  badge,
  compact = false,
}: PsicoPageSkeletonProps) {
  const preset = presets[variant] || presets.default;
  const finalTitle = title || preset.title;
  const finalSubtitle = subtitle || preset.subtitle;
  const finalBadge = badge || preset.badge;
  const metricsCount = compact ? Math.min(3, preset.metrics) : preset.metrics;
  const sectionsCount = compact ? Math.min(2, preset.sections) : preset.sections;

  return (
    <main
      className={`psico-page-skeleton psico-page-skeleton--${variant}`}
      style={pageStyle}
      aria-busy="true"
      aria-label={finalTitle}
    >
      <section className="psico-page-skeleton-hero">
        <div aria-hidden="true" className="psico-page-skeleton-hero-circle psico-page-skeleton-hero-circle--one" />
        <div aria-hidden="true" className="psico-page-skeleton-hero-circle psico-page-skeleton-hero-circle--two" />

        <div className="psico-page-skeleton-hero-content">
          <SkeletonBlock width="150px" height="30px" radius="999px" variant="blue" />
          <div className="psico-page-skeleton-title" aria-hidden="true">
            {finalTitle}
          </div>
          <p className="psico-page-skeleton-subtitle">{finalSubtitle}</p>
          <span className="psico-page-skeleton-hidden-badge">{finalBadge}</span>
        </div>

        <div className="psico-page-skeleton-hero-actions" aria-hidden="true">
          <SkeletonBlock width="132px" height="42px" radius="14px" variant="blue" />
          <SkeletonBlock width="112px" height="42px" radius="14px" variant="blue" />
        </div>
      </section>

      <div className="psico-page-skeleton-metrics-grid">
        {Array.from({ length: metricsCount }).map((_, index) => (
          <MetricSkeletonCard key={`metric-skeleton-${index}`} index={index} />
        ))}
      </div>

      <div className="psico-page-skeleton-main-grid">
        {Array.from({ length: sectionsCount }).map((_, index) => (
          <SectionSkeletonCard key={`section-skeleton-${index}`} index={index} />
        ))}
      </div>

      <style>{`
        .psico-page-skeleton {
          color: #0f172a;
        }

        .psico-page-skeleton-hero {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 30px;
          margin-bottom: 22px;
          min-height: 196px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 22px;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa);
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.22);
        }

        .psico-page-skeleton-hero-circle {
          position: absolute;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
        }

        .psico-page-skeleton-hero-circle--one {
          right: -80px;
          top: -90px;
          width: 250px;
          height: 250px;
        }

        .psico-page-skeleton-hero-circle--two {
          right: 110px;
          bottom: -120px;
          width: 220px;
          height: 220px;
          background: rgba(255, 255, 255, 0.10);
        }

        .psico-page-skeleton-hero-content,
        .psico-page-skeleton-hero-actions {
          position: relative;
          z-index: 1;
        }

        .psico-page-skeleton-title {
          margin-top: 14px;
          font-size: 42px;
          line-height: 1.06;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.04em;
        }

        .psico-page-skeleton-subtitle {
          margin: 12px 0 0;
          max-width: 760px;
          color: #ffffff;
          font-size: 17px;
          line-height: 1.55;
        }

        .psico-page-skeleton-hidden-badge {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
        }

        .psico-page-skeleton-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .psico-page-skeleton-block {
          display: block;
          max-width: 100%;
          background: linear-gradient(90deg, #e2e8f0, #f8fafc, #e2e8f0);
          background-size: 220% 100%;
          animation: psicoSkeletonPulse 1.15s ease-in-out infinite;
        }

        .psico-page-skeleton-block--blue {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.18),
            rgba(255, 255, 255, 0.34),
            rgba(255, 255, 255, 0.18)
          );
          background-size: 220% 100%;
        }

        .psico-page-skeleton-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .psico-page-skeleton-metric {
          position: relative;
          min-height: 128px;
          overflow: hidden;
        }

        .psico-page-skeleton-main-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }

        .psico-page-skeleton-section {
          min-width: 0;
        }

        .psico-page-skeleton-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .psico-page-skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .psico-page-skeleton-list-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: flex-start;
          gap: 14px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        @keyframes psicoSkeletonPulse {
          0% {
            background-position: 220% 0;
          }
          100% {
            background-position: -220% 0;
          }
        }

        @media (max-width: 1180px) {
          .psico-page-skeleton {
            padding: 28px !important;
            padding-bottom: 130px !important;
          }

          .psico-page-skeleton-metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .psico-page-skeleton-main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        @media (max-width: 900px) {
          .psico-page-skeleton {
            padding: 20px !important;
            padding-bottom: 120px !important;
            border-radius: 24px !important;
          }

          .psico-page-skeleton-hero {
            min-height: 172px;
            padding: 24px;
            border-radius: 24px;
            flex-direction: column;
          }

          .psico-page-skeleton-title {
            font-size: 34px;
          }

          .psico-page-skeleton-subtitle {
            font-size: 15px;
          }

          .psico-page-skeleton-metric {
            min-height: 112px;
            padding: 16px !important;
          }
        }

        @media (max-width: 640px) {
          .psico-page-skeleton {
            padding: 16px !important;
            padding-bottom: 110px !important;
            border-radius: 20px !important;
          }

          .psico-page-skeleton-hero {
            min-height: 142px;
            padding: 18px;
            border-radius: 22px;
            margin-bottom: 16px;
          }

          .psico-page-skeleton-title {
            margin-top: 10px;
            font-size: 27px;
          }

          .psico-page-skeleton-subtitle {
            display: none;
          }

          .psico-page-skeleton-hero-actions {
            display: none;
          }

          .psico-page-skeleton-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 14px;
          }

          .psico-page-skeleton-metric {
            min-height: 84px;
            padding: 10px !important;
            border-radius: 15px !important;
          }

          .psico-page-skeleton-metric .psico-page-skeleton-block:nth-child(n + 4) {
            display: none;
          }

          .psico-page-skeleton-section {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .psico-page-skeleton-section-header {
            display: block;
          }

          .psico-page-skeleton-section-header > .psico-page-skeleton-block {
            display: none;
          }

          .psico-page-skeleton-list-item {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </main>
  );
}
