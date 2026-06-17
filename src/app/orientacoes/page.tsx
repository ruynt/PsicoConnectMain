"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

type UserRole = "PATIENT" | "PSYCHOLOGIST" | "ADMIN" | "GENERAL";

type SessionUserWithRole = {
  role?: string | null;
};

type GuideSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  highlight: string;
  content: string[];
};

type QuickCard = {
  title: string;
  text: string;
  icon: string;
  color: string;
  bg: string;
};

type JourneyStep = {
  step: string;
  title: string;
  text: string;
};

type PageContent = {
  roleLabel: string;
  badge: string;
  heroTitle: string;
  heroDescription: string;
  alertTitle: string;
  alertText: string;
  quickCards: QuickCard[];
  guideIntroTitle: string;
  guideIntroText: string;
  sections: GuideSection[];
  journeyTitle: string;
  journeyText: string;
  journeySteps: JourneyStep[];
  safeUseTitle: string;
  safeUseText: string;
};

const commonSafetySections: GuideSection[] = [
  {
    id: "ia-responsavel",
    title: "Uso responsável da IA",
    subtitle: "A IA apoia a organização, mas não substitui cuidado humano.",
    icon: "fa-solid fa-brain",
    highlight: "IA com cuidado",
    content: [
      "Use o PsicoBot para tirar dúvidas gerais sobre a plataforma, organizar informações e receber explicações iniciais.",
      "As respostas geradas por IA podem conter limitações e precisam ser avaliadas com responsabilidade.",
      "A IA não substitui psicoterapia, avaliação psicológica, orientação clínica individualizada ou decisão profissional.",
      "Em temas sensíveis, priorize sempre o diálogo com o profissional responsável pelo acompanhamento.",
    ],
  },
  {
    id: "privacidade-seguranca",
    title: "Privacidade, segurança e sigilo",
    subtitle: "Cuidados necessários com dados pessoais e informações sensíveis.",
    icon: "fa-solid fa-lock",
    highlight: "Proteção de dados",
    content: [
      "Acesse sua conta apenas em dispositivos confiáveis e evite compartilhar senha ou dados de acesso.",
      "Registre somente informações necessárias para o acompanhamento e mantenha atenção ao preencher campos abertos.",
      "O acesso às informações deve respeitar o vínculo entre paciente e profissional, além das regras de sigilo e proteção de dados.",
      "A plataforma ajuda na organização, mas o uso ético das informações continua sendo uma responsabilidade de todos os envolvidos.",
    ],
  },
  {
    id: "limites-emergencia",
    title: "Limites da plataforma e urgências",
    subtitle: "O PsicoConnect não é um canal de emergência.",
    icon: "fa-solid fa-triangle-exclamation",
    highlight: "Atenção",
    content: [
      "A plataforma não deve ser usada como único meio de comunicação em situações de risco ou sofrimento intenso.",
      "Em caso de urgência, crise, violência, risco imediato ou ideação suicida, procure serviços de emergência, unidade de saúde, rede de apoio ou atendimento presencial.",
      "Mensagens, tarefas e registros na plataforma podem não ser acompanhados em tempo real pelo profissional.",
      "Quando houver dúvida sobre condutas clínicas ou necessidade de suporte imediato, priorize contato direto com os serviços adequados.",
    ],
  },
];

const patientContent: PageContent = {
  roleLabel: "Paciente",
  badge: "Área do paciente",
  heroTitle: "Orientações para usar o PsicoConnect no seu acompanhamento",
  heroDescription:
    "Entenda como acompanhar consultas, responder checklists, visualizar tarefas e materiais, enviar mensagens e usar o PsicoBot de forma segura.",
  alertTitle: "Seu cuidado continua sendo conduzido pelo profissional.",
  alertText:
    "A plataforma organiza informações e facilita o acompanhamento entre sessões, mas não substitui atendimento psicológico, avaliação profissional ou suporte emergencial.",
  quickCards: [
    {
      title: "Consultas",
      text: "Veja seus atendimentos, confirme presença e acompanhe solicitações de cancelamento.",
      icon: "fa-solid fa-calendar-check",
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      title: "Checklists",
      text: "Registre como você chega para a sessão e quais temas deseja abordar.",
      icon: "fa-solid fa-clipboard-check",
      color: "#ca8a04",
      bg: "#fffbeb",
    },
    {
      title: "Tarefas e materiais",
      text: "Acesse atividades e conteúdos enviados pelo profissional entre as sessões.",
      icon: "fa-solid fa-list-check",
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Mensagens e IA",
      text: "Use mensagens e PsicoBot como apoio, sem substituir o acompanhamento humano.",
      icon: "fa-solid fa-comments",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
  ],
  guideIntroTitle: "Guia do paciente",
  guideIntroText:
    "Estas orientações ajudam você a entender cada área da plataforma e usar os recursos com mais segurança durante o acompanhamento.",
  sections: [
    {
      id: "primeiros-passos",
      title: "Primeiros passos",
      subtitle: "Entenda onde encontrar cada recurso da sua área.",
      icon: "fa-solid fa-compass",
      highlight: "Comece por aqui",
      content: [
        "A página Início mostra um resumo do seu acompanhamento, incluindo consultas, tarefas pendentes, materiais e checklists recentes.",
        "Em Minhas Consultas, você acompanha atendimentos futuros, histórico e formulários relacionados às sessões.",
        "Em Tarefas e materiais, ficam reunidas as atividades terapêuticas e conteúdos psicoeducativos enviados pelo profissional.",
        "A área Mensagens permite comunicação organizada com o profissional, respeitando os limites combinados para resposta.",
      ],
    },
    {
      id: "consultas-checklists",
      title: "Consultas e checklists pré-sessão",
      subtitle: "Prepare melhor suas sessões e acompanhe seus atendimentos.",
      icon: "fa-solid fa-calendar-day",
      highlight: "Antes da sessão",
      content: [
        "Confira data, horário e status das consultas agendadas para evitar esquecimentos.",
        "Quando disponível, confirme presença ou solicite cancelamento pelo sistema, explicando o motivo quando necessário.",
        "O checklist pré-sessão ajuda você a registrar humor, ansiedade, sono, acontecimentos importantes e temas que deseja conversar.",
        "Responda com sinceridade e objetividade. O checklist não é uma prova, avaliação de desempenho ou julgamento pessoal.",
      ],
    },
    {
      id: "tarefas-materiais-mensagens",
      title: "Tarefas, materiais e mensagens",
      subtitle: "Acompanhe o que foi combinado entre as sessões.",
      icon: "fa-solid fa-folder-open",
      highlight: "Entre sessões",
      content: [
        "As tarefas terapêuticas são atividades combinadas para apoiar o processo fora do horário da consulta.",
        "Os materiais podem incluir textos, links, orientações e conteúdos psicoeducativos escolhidos pelo profissional.",
        "Ao marcar tarefas como concluídas ou visualizar materiais, você ajuda o profissional a acompanhar sua participação.",
        "As mensagens devem ser usadas para comunicação relacionada ao acompanhamento, sem expectativa de atendimento emergencial em tempo real.",
      ],
    },
    ...commonSafetySections,
  ],
  journeyTitle: "Como sua jornada acontece na plataforma",
  journeyText:
    "O fluxo abaixo resume como o PsicoConnect pode apoiar sua organização antes, durante e depois dos atendimentos.",
  journeySteps: [
    {
      step: "01",
      title: "Consulta agendada",
      text: "O atendimento aparece na sua área com data, horário e informações importantes.",
    },
    {
      step: "02",
      title: "Preparação pré-sessão",
      text: "Você pode responder checklists para registrar como está chegando para a consulta.",
    },
    {
      step: "03",
      title: "Atividades entre sessões",
      text: "Tarefas e materiais ajudam a manter continuidade no acompanhamento.",
    },
    {
      step: "04",
      title: "Acompanhamento contínuo",
      text: "As informações ficam organizadas para facilitar o diálogo com o profissional.",
    },
  ],
  safeUseTitle: "Use a plataforma como apoio ao seu processo",
  safeUseText:
    "O PsicoConnect ajuda na organização, mas as decisões sobre o cuidado devem ser discutidas com o profissional responsável pelo acompanhamento.",
};

const psychologistContent: PageContent = {
  roleLabel: "Psicólogo",
  badge: "Área profissional",
  heroTitle: "Orientações para conduzir acompanhamentos no PsicoConnect",
  heroDescription:
    "Organize agenda, pacientes, checklists, tarefas, materiais, mensagens e recursos de IA com atenção ao sigilo, à ética e à proteção de dados.",
  alertTitle: "A tecnologia apoia, mas a responsabilidade técnica continua sendo profissional.",
  alertText:
    "Use a plataforma como ferramenta de organização e acompanhamento, mantendo julgamento clínico, revisão humana, sigilo profissional e cuidado ético nas decisões.",
  quickCards: [
    {
      title: "Agenda e pacientes",
      text: "Gerencie consultas, vínculos, confirmações e solicitações de cancelamento.",
      icon: "fa-solid fa-user-doctor",
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      title: "Checklists",
      text: "Use respostas pré-sessão para orientar a preparação do atendimento.",
      icon: "fa-solid fa-clipboard-list",
      color: "#ca8a04",
      bg: "#fffbeb",
    },
    {
      title: "Intervenções de apoio",
      text: "Envie tarefas terapêuticas e materiais psicoeducativos com objetivo definido.",
      icon: "fa-solid fa-book-medical",
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Sigilo e IA",
      text: "Use recursos inteligentes com revisão profissional e atenção aos dados sensíveis.",
      icon: "fa-solid fa-lock",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
  ],
  guideIntroTitle: "Guia do psicólogo",
  guideIntroText:
    "Estas orientações reúnem boas práticas para usar o PsicoConnect como apoio à rotina profissional, sem substituir responsabilidade técnica e ética.",
  sections: [
    {
      id: "primeiros-passos",
      title: "Primeiros passos na área profissional",
      subtitle: "Entenda como organizar sua rotina dentro da plataforma.",
      icon: "fa-solid fa-compass",
      highlight: "Comece por aqui",
      content: [
        "O Dashboard reúne indicadores de agenda, pacientes, checklists, tarefas, materiais e pontos de atenção recentes.",
        "A página Pacientes concentra os vínculos ativos e permite acessar detalhes, tarefas, materiais, mensagens, anotações e resumos.",
        "A Agenda ajuda a organizar atendimentos e acompanhar confirmações, cancelamentos e lembretes.",
        "As áreas de Mensagens e PsicoBot devem ser usadas como apoio à organização, sempre com revisão e responsabilidade profissional.",
      ],
    },
    {
      id: "agenda-vinculos",
      title: "Agenda, vínculos e confirmações",
      subtitle: "Mantenha o acompanhamento organizado e rastreável.",
      icon: "fa-solid fa-calendar-check",
      highlight: "Rotina clínica",
      content: [
        "Crie e acompanhe consultas, observando status de confirmação e solicitações de cancelamento realizadas pelo paciente.",
        "Quando houver integração com Google Calendar, confira se os eventos foram registrados corretamente e mantenha a agenda atualizada.",
        "Use os vínculos psicólogo-paciente para restringir o acesso às informações apenas aos usuários relacionados ao acompanhamento.",
        "Revise solicitações de cancelamento com critério e mantenha comunicação clara com o paciente quando houver mudança de horário.",
      ],
    },
    {
      id: "intervencoes-registros",
      title: "Tarefas, materiais, checklists e registros",
      subtitle: "Use os recursos para apoiar o processo entre sessões.",
      icon: "fa-solid fa-notes-medical",
      highlight: "Acompanhamento",
      content: [
        "Os checklists pré-sessão podem ajudar a identificar temas importantes, mas não devem ser interpretados isoladamente.",
        "Tarefas terapêuticas e materiais devem ter objetivo clínico claro, linguagem adequada e relação com o plano de acompanhamento.",
        "Anotações e resumos internos devem ser usados com atenção ao sigilo profissional e à necessidade de registro.",
        "Evite inserir informações excessivas ou desnecessárias em campos abertos, principalmente quando envolver dados sensíveis.",
      ],
    },
    {
      id: "etica-ia",
      title: "PsicoBot, IA e responsabilidade profissional",
      subtitle: "A IA é apoio operacional, não substituição do raciocínio clínico.",
      icon: "fa-solid fa-brain",
      highlight: "Revisão humana",
      content: [
        "Use o PsicoBot para apoio na organização de informações, explicações gerais e recuperação de dados permitidos pelo acesso do usuário.",
        "Não trate respostas da IA como diagnóstico, decisão clínica, prescrição de conduta ou documento psicológico final.",
        "Revise criticamente qualquer conteúdo gerado por IA antes de usar em comunicação, registro ou tomada de decisão.",
        "Mantenha atenção à confidencialidade e ao mínimo necessário ao lidar com informações clínicas e dados pessoais.",
      ],
    },
    {
      id: "sigilo-lgpd",
      title: "Sigilo, LGPD e boas práticas",
      subtitle: "Proteja dados pessoais e informações clínicas.",
      icon: "fa-solid fa-lock",
      highlight: "Segurança",
      content: [
        "Acesse a plataforma apenas por dispositivos confiáveis e evite deixar sessão aberta em computadores compartilhados.",
        "Compartilhe dados e materiais apenas quando houver finalidade relacionada ao acompanhamento e acesso autorizado.",
        "Use linguagem cuidadosa nos registros internos, mantendo pertinência, clareza e respeito à privacidade do paciente.",
        "A tecnologia reduz tarefas operacionais, mas não elimina deveres de sigilo, ética, guarda adequada e responsabilidade profissional.",
      ],
    },
    commonSafetySections[2],
  ],
  journeyTitle: "Fluxo sugerido para o acompanhamento profissional",
  journeyText:
    "Um uso consistente da plataforma ajuda a manter agenda, intervenções e registros mais organizados ao longo do processo.",
  journeySteps: [
    {
      step: "01",
      title: "Vincule e acompanhe pacientes",
      text: "Mantenha os vínculos atualizados para garantir acesso correto às informações.",
    },
    {
      step: "02",
      title: "Organize consultas",
      text: "Registre atendimentos, acompanhe confirmações e revise solicitações de cancelamento.",
    },
    {
      step: "03",
      title: "Envie recursos entre sessões",
      text: "Use tarefas e materiais com objetivo definido e linguagem adequada ao paciente.",
    },
    {
      step: "04",
      title: "Revise dados e registros",
      text: "Utilize checklists, mensagens e anotações como apoio ao raciocínio profissional, não como substitutos dele.",
    },
  ],
  safeUseTitle: "A tecnologia deve fortalecer o vínculo, não substituir a escuta",
  safeUseText:
    "O PsicoConnect apoia a organização do cuidado, mas a escuta clínica, a interpretação dos dados e as decisões profissionais permanecem humanas.",
};

const adminContent: PageContent = {
  roleLabel: "Administrador",
  badge: "Área administrativa",
  heroTitle: "Orientações gerais para administração do PsicoConnect",
  heroDescription:
    "Acompanhe usuários, verificações profissionais, segurança de acesso e uso responsável dos recursos da plataforma.",
  alertTitle: "A administração deve priorizar segurança, clareza e responsabilidade.",
  alertText:
    "As ações administrativas impactam o acesso de pacientes e profissionais. Revise dados com cuidado e mantenha atenção à proteção das informações.",
  quickCards: [
    {
      title: "Usuários",
      text: "Acompanhe contas, papéis e situações de acesso.",
      icon: "fa-solid fa-users-gear",
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      title: "Verificações",
      text: "Analise cadastros profissionais pendentes com critério.",
      icon: "fa-solid fa-id-card-clip",
      color: "#ca8a04",
      bg: "#fffbeb",
    },
    {
      title: "Segurança",
      text: "Mantenha atenção a acessos, permissões e dados sensíveis.",
      icon: "fa-solid fa-shield-halved",
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      title: "Suporte",
      text: "Oriente usuários sobre limites, privacidade e uso correto.",
      icon: "fa-solid fa-circle-question",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
  ],
  guideIntroTitle: "Guia administrativo",
  guideIntroText:
    "Estas orientações apoiam a gestão responsável de usuários, verificações e permissões dentro do sistema.",
  sections: [
    {
      id: "primeiros-passos",
      title: "Visão geral administrativa",
      subtitle: "Entenda as principais responsabilidades da área admin.",
      icon: "fa-solid fa-compass",
      highlight: "Administração",
      content: [
        "A área administrativa permite acompanhar usuários e situações de cadastro na plataforma.",
        "Verificações profissionais devem ser analisadas com atenção aos dados enviados e aos critérios definidos pelo projeto.",
        "Alterações de acesso devem ser feitas com cuidado, pois podem afetar pacientes e profissionais vinculados.",
        "Em caso de dúvida, priorize a segurança da informação e a rastreabilidade das ações.",
      ],
    },
    {
      id: "usuarios-permissoes",
      title: "Usuários, papéis e permissões",
      subtitle: "Cuide para que cada pessoa tenha acesso adequado.",
      icon: "fa-solid fa-user-shield",
      highlight: "Controle de acesso",
      content: [
        "Pacientes, psicólogos e administradores possuem permissões diferentes dentro da plataforma.",
        "Evite conceder acesso administrativo sem necessidade real e orientação adequada.",
        "Acompanhe usuários com e-mail não verificado ou cadastro profissional em análise.",
        "Quando houver inconsistência, oriente o usuário a corrigir os dados antes de liberar funcionalidades sensíveis.",
      ],
    },
    ...commonSafetySections,
  ],
  journeyTitle: "Fluxo de gestão recomendado",
  journeyText:
    "Uma administração cuidadosa mantém a plataforma mais segura para pacientes e profissionais.",
  journeySteps: [
    {
      step: "01",
      title: "Verifique cadastros",
      text: "Analise informações profissionais e pendências antes de liberar recursos sensíveis.",
    },
    {
      step: "02",
      title: "Acompanhe usuários",
      text: "Observe contas criadas, e-mails verificados e papéis definidos no sistema.",
    },
    {
      step: "03",
      title: "Priorize segurança",
      text: "Evite alterações desnecessárias em permissões e mantenha atenção a dados sensíveis.",
    },
    {
      step: "04",
      title: "Oriente o uso correto",
      text: "Reforce limites da plataforma, uso responsável da IA e canais adequados de suporte.",
    },
  ],
  safeUseTitle: "A gestão da plataforma também faz parte da segurança",
  safeUseText:
    "O cuidado com permissões, verificações e orientações reduz riscos e melhora a experiência dos usuários.",
};

const generalContent: PageContent = {
  ...patientContent,
  roleLabel: "Geral",
  badge: "Central de orientação",
  heroTitle: "Orientações para um uso seguro e consciente",
  heroDescription:
    "Entenda os recursos do PsicoConnect e os cuidados necessários para usar consultas, tarefas, materiais, mensagens e IA com responsabilidade.",
};

const pageContentByRole: Record<UserRole, PageContent> = {
  PATIENT: patientContent,
  PSYCHOLOGIST: psychologistContent,
  ADMIN: adminContent,
  GENERAL: generalContent,
};

function getRoleFromSession(role: string | null | undefined): UserRole {
  if (role === "PATIENT") return "PATIENT";
  if (role === "PSYCHOLOGIST") return "PSYCHOLOGIST";
  if (role === "ADMIN") return "ADMIN";
  return "GENERAL";
}

export default function OrientacoesPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as SessionUserWithRole | undefined;
  const userRole = getRoleFromSession(sessionUser?.role);
  const pageContent = pageContentByRole[userRole];
  const guideSections = useMemo(() => pageContent.sections, [pageContent]);
  const [selectedSectionId, setSelectedSectionId] = useState("primeiros-passos");
  const firstSectionId = guideSections[0]?.id || "primeiros-passos";
  const activeSectionId = guideSections.some(
    (section) => section.id === selectedSectionId,
  )
    ? selectedSectionId
    : firstSectionId;

  const activeSection = useMemo(() => {
    return (
      guideSections.find((section) => section.id === activeSectionId) ||
      guideSections[0]
    );
  }, [activeSectionId, guideSections]);

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    paddingBottom: "240px",
    backgroundColor: "#f8fafc",
    borderRadius: "32px",
    overflow: "visible",
  };

  const glassCardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: "26px",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
  } as const;

  const miniCardStyle = {
    ...glassCardStyle,
    padding: "22px",
  };

  return (
    <div className="orientacoes-page" style={pageStyle}>
      <section
        className="orientacoes-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "28px",
          padding: "30px",
          marginBottom: "26px",
          color: "#ffffff",
          background:
            "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
          boxShadow: "0 12px 30px rgba(37, 99, 235, 0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "280px",
            height: "280px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            right: "-90px",
            top: "-110px",
          }}
        />

        <div
          style={{
            position: "absolute",
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            right: "190px",
            bottom: "-120px",
          }}
        />

        <div
          className="orientacoes-hero-grid"
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "28px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              className="orientacoes-hero-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                borderRadius: "999px",
                padding: "8px 14px",
                marginBottom: "18px",
                fontSize: "13px",
                fontWeight: 900,
                color: "#dbeafe",
              }}
            >
              <i className="fa-solid fa-book-open"></i>
              {pageContent.badge}
            </div>

            <h1
              className="orientacoes-hero-title"
              style={{
                fontSize: "46px",
                lineHeight: 1.02,
                fontWeight: 950,
                marginBottom: "14px",
                letterSpacing: "-0.04em",
              }}
            >
              {pageContent.heroTitle}
            </h1>

            <p
              className="orientacoes-hero-description"
              style={{
                fontSize: "18px",
                color: "#dbeafe",
                lineHeight: 1.65,
                maxWidth: "820px",
                margin: 0,
              }}
            >
              {pageContent.heroDescription}
            </p>
          </div>

          <div
            className="orientacoes-hero-alert"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: "28px",
              padding: "24px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                fontWeight: 900,
                color: "#bfdbfe",
                marginBottom: "12px",
              }}
            >
              Importante
            </p>

            <p
              style={{
                fontSize: "24px",
                fontWeight: 950,
                lineHeight: 1.18,
                marginBottom: "14px",
              }}
            >
              {pageContent.alertTitle}
            </p>

            <p
              style={{
                color: "#dbeafe",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {pageContent.alertText}
            </p>
          </div>
        </div>
      </section>

      <section
        className="orientacoes-quick-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "26px",
        }}
      >
        {pageContent.quickCards.map((item) => (
          <div key={item.title} className="orientacoes-quick-card" style={miniCardStyle}>
            <div
              className="orientacoes-quick-icon"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "16px",
                backgroundColor: item.bg,
                color: item.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                marginBottom: "16px",
              }}
            >
              <i className={item.icon}></i>
            </div>

            <h2
              style={{
                color: "#111827",
                fontSize: "18px",
                fontWeight: 950,
                marginBottom: "8px",
              }}
            >
              {item.title}
            </h2>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.55,
                margin: 0,
                fontSize: "14px",
              }}
            >
              {item.text}
            </p>
          </div>
        ))}
      </section>

      <section
        className="orientacoes-guide-card"
        style={{
          ...glassCardStyle,
          padding: "26px",
          marginBottom: "26px",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.3fr",
          gap: "24px",
        }}
      >
        <div className="orientacoes-guide-menu">
          <p
            style={{
              color: "#2563eb",
              fontWeight: 950,
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            {pageContent.roleLabel}
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "30px",
              lineHeight: 1.1,
              fontWeight: 950,
              marginBottom: "12px",
              letterSpacing: "-0.03em",
            }}
          >
            {pageContent.guideIntroTitle}
          </h2>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.65,
              marginBottom: "20px",
            }}
          >
            {pageContent.guideIntroText}
          </p>

          <div
            className="orientacoes-guide-buttons"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {guideSections.map((section) => {
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  className="orientacoes-guide-button"
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  style={{
                    width: "100%",
                    border: isActive
                      ? "1px solid #2563eb"
                      : "1px solid #e5e7eb",
                    backgroundColor: isActive ? "#eff6ff" : "#ffffff",
                    borderRadius: "18px",
                    padding: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    boxShadow: isActive
                      ? "0 8px 18px rgba(37, 99, 235, 0.10)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "14px",
                      backgroundColor: isActive ? "#2563eb" : "#f3f4f6",
                      color: isActive ? "#ffffff" : "#4b5563",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i className={section.icon}></i>
                  </div>

                  <div>
                    <p
                      style={{
                        color: "#111827",
                        fontWeight: 950,
                        margin: 0,
                        fontSize: "14px",
                      }}
                    >
                      {section.title}
                    </p>

                    <p
                      style={{
                        color: "#6b7280",
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: 1.4,
                      }}
                    >
                      {section.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {activeSection && (
          <div
            className="orientacoes-guide-content"
            style={{
              borderRadius: "28px",
              padding: "28px",
              backgroundColor: "#f8fbff",
              border: "1px solid #bfdbfe",
              minHeight: "100%",
            }}
          >
            <div
              className="orientacoes-active-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "13px",
                fontWeight: 950,
                marginBottom: "18px",
              }}
            >
              <i className={activeSection.icon}></i>
              {activeSection.highlight}
            </div>

            <h2
              className="orientacoes-active-title"
              style={{
                color: "#111827",
                fontSize: "34px",
                fontWeight: 950,
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
                marginBottom: "10px",
              }}
            >
              {activeSection.title}
            </h2>

            <p
              className="orientacoes-active-description"
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
                marginBottom: "24px",
                fontSize: "16px",
              }}
            >
              {activeSection.subtitle}
            </p>

            <div
              className="orientacoes-active-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {activeSection.content.map((text, index) => (
                <div
                  key={text}
                  className="orientacoes-active-item"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "38px 1fr",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "12px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 950,
                      fontSize: "14px",
                    }}
                  >
                    {index + 1}
                  </div>

                  <p
                    style={{
                      color: "#374151",
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section
        className="orientacoes-practice-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "20px",
          marginBottom: "26px",
        }}
      >
        <div
          className="orientacoes-practice-card"
          style={{
            ...glassCardStyle,
            padding: "26px",
            backgroundColor: "#ffffff",
          }}
        >
          <p
            style={{
              color: "#2563eb",
              fontWeight: 950,
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Jornada de uso
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "28px",
              fontWeight: 950,
              marginBottom: "8px",
              letterSpacing: "-0.03em",
            }}
          >
            {pageContent.journeyTitle}
          </h2>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.6,
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            {pageContent.journeyText}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {pageContent.journeySteps.map((item, index) => (
              <div
                key={item.step}
                className="orientacoes-step-item"
                style={{
                  display: "grid",
                  gridTemplateColumns: "58px 1fr",
                  gap: "14px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "18px",
                    backgroundColor: index === 0 ? "#2563eb" : "#eff6ff",
                    color: index === 0 ? "#ffffff" : "#1d4ed8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                    border: index === 0 ? "none" : "1px solid #bfdbfe",
                  }}
                >
                  {item.step}
                </div>

                <div
                  style={{
                    borderBottom:
                      index === pageContent.journeySteps.length - 1
                        ? "none"
                        : "1px solid rgba(226, 232, 240, 0.9)",
                    paddingBottom:
                      index === pageContent.journeySteps.length - 1 ? 0 : "16px",
                  }}
                >
                  <h3
                    style={{
                      color: "#111827",
                      fontSize: "18px",
                      fontWeight: 950,
                      marginBottom: "5px",
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      color: "#6b7280",
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="orientacoes-practice-card orientacoes-warning-card"
          style={{
            ...glassCardStyle,
            padding: "26px",
            backgroundColor: "#fffafa",
            border: "1px solid #fecaca",
          }}
        >
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "18px",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              marginBottom: "18px",
            }}
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>

          <h2
            style={{
              color: "#111827",
              fontSize: "28px",
              fontWeight: 950,
              lineHeight: 1.12,
              marginBottom: "12px",
              letterSpacing: "-0.03em",
            }}
          >
            Esta plataforma não é canal de emergência
          </h2>

          <p
            style={{
              color: "#4b5563",
              lineHeight: 1.65,
              marginBottom: "18px",
            }}
          >
            Em caso de risco imediato, crise intensa, ideação suicida,
            automutilação, violência ou qualquer situação de urgência, procure
            ajuda imediata na rede de emergência da sua região.
          </p>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #fecaca",
              borderRadius: "18px",
              padding: "16px",
            }}
          >
            <p
              style={{
                color: "#991b1b",
                fontWeight: 950,
                marginBottom: "8px",
              }}
            >
              Procure apoio imediato
            </p>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Acione serviços de emergência, unidades de saúde, familiares, rede
              de apoio ou profissionais responsáveis pelo cuidado.
            </p>
          </div>
        </div>
      </section>

      <section
        className="orientacoes-human-card"
        style={{
          ...glassCardStyle,
          padding: "24px",
          marginBottom: "20px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "18px",
          alignItems: "center",
          backgroundColor: "#f0fdf4",
          border: "1px solid #a7f3d0",
        }}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "20px",
            backgroundColor: "#d1fae5",
            color: "#047857",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
          }}
        >
          <i className="fa-solid fa-hand-holding-heart"></i>
        </div>

        <div>
          <h2
            style={{
              color: "#111827",
              fontSize: "22px",
              fontWeight: 950,
              marginBottom: "6px",
            }}
          >
            {pageContent.safeUseTitle}
          </h2>

          <p
            style={{
              color: "#4b5563",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {pageContent.safeUseText}
          </p>
        </div>
      </section>

      <section
        className="orientacoes-links-card"
        style={{
          ...glassCardStyle,
          padding: "20px",
          marginBottom: "48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              color: "#111827",
              fontWeight: 950,
              marginBottom: "4px",
            }}
          >
            Informações gerais do PsicoConnect
          </p>

          <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
            Consulte os documentos públicos para entender regras de uso,
            privacidade e exclusão de dados.
          </p>
        </div>

        <div
          className="orientacoes-links-actions"
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <Link className="orientacoes-link-button" href="/termos-de-uso">
            Termos de uso
          </Link>
          <Link className="orientacoes-link-button" href="/politica-de-privacidade">
            Privacidade
          </Link>
          <Link className="orientacoes-link-button" href="/exclusao-de-dados">
            Exclusão de dados
          </Link>
        </div>
      </section>

      <style>{`
        .orientacoes-page {
          width: 100%;
        }

        .orientacoes-hero-title,
        .orientacoes-hero-title *,
        .orientacoes-hero-description,
        .orientacoes-hero-pill,
        .orientacoes-hero-alert,
        .orientacoes-hero-alert * {
          color: #ffffff !important;
        }

        .orientacoes-quick-card,
        .orientacoes-guide-card,
        .orientacoes-guide-content,
        .orientacoes-practice-card,
        .orientacoes-human-card,
        .orientacoes-links-card {
          min-width: 0;
        }

        .orientacoes-guide-button,
        .orientacoes-link-button {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .orientacoes-guide-button:hover,
        .orientacoes-link-button:hover {
          transform: translateY(-1px);
        }

        .orientacoes-link-button {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        .orientacoes-link-button:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        .orientacoes-active-item,
        .orientacoes-step-item {
          min-width: 0;
        }

        @media (max-width: 1180px) {
          .orientacoes-hero-grid {
            grid-template-columns: 1fr !important;
          }

          .orientacoes-hero-alert {
            max-width: 760px;
          }

          .orientacoes-quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .orientacoes-guide-card {
            grid-template-columns: 1fr !important;
          }

          .orientacoes-guide-buttons {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .orientacoes-practice-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 900px) {
          .orientacoes-page {
            padding: 20px !important;
            padding-bottom: 150px !important;
            border-radius: 0 !important;
          }

          .orientacoes-hero {
            padding: 24px !important;
            border-radius: 24px !important;
          }

          .orientacoes-hero-title {
            font-size: 36px !important;
            line-height: 1.08 !important;
          }

          .orientacoes-guide-card,
          .orientacoes-guide-content,
          .orientacoes-practice-card,
          .orientacoes-human-card,
          .orientacoes-links-card {
            padding: 22px !important;
            border-radius: 22px !important;
          }

          .orientacoes-active-title {
            font-size: 30px !important;
          }
        }

        @media (max-width: 640px) {
          .orientacoes-page {
            padding: 16px !important;
            padding-bottom: 130px !important;
          }

          .orientacoes-hero {
            padding: 18px !important;
            border-radius: 22px !important;
            margin-bottom: 16px !important;
          }

          .orientacoes-hero-grid {
            gap: 16px !important;
          }

          .orientacoes-hero-pill {
            padding: 6px 10px !important;
            font-size: 12px !important;
            margin-bottom: 12px !important;
          }

          .orientacoes-hero-title {
            font-size: 28px !important;
            line-height: 1.1 !important;
            margin-bottom: 10px !important;
          }

          .orientacoes-hero-description {
            font-size: 14px !important;
            line-height: 1.45 !important;
          }

          .orientacoes-hero-alert {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .orientacoes-hero-alert p:first-child {
            font-size: 12px !important;
            margin-bottom: 8px !important;
          }

          .orientacoes-hero-alert p:nth-child(2) {
            font-size: 17px !important;
            line-height: 1.25 !important;
            margin-bottom: 8px !important;
          }

          .orientacoes-hero-alert p:last-child {
            font-size: 13px !important;
            line-height: 1.45 !important;
          }

          .orientacoes-guide-card,
          .orientacoes-guide-content,
          .orientacoes-practice-card,
          .orientacoes-human-card,
          .orientacoes-links-card {
            padding: 16px !important;
            border-radius: 18px !important;
            margin-bottom: 16px !important;
          }

          .orientacoes-guide-menu > h2,
          .orientacoes-active-title,
          .orientacoes-practice-card h2,
          .orientacoes-human-card h2 {
            font-size: 22px !important;
            line-height: 1.14 !important;
          }

          .orientacoes-guide-menu > p:not(:first-child),
          .orientacoes-active-description {
            font-size: 13px !important;
            line-height: 1.45 !important;
            margin-bottom: 14px !important;
          }

          .orientacoes-guide-buttons {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .orientacoes-guide-button {
            padding: 11px !important;
            border-radius: 14px !important;
          }

          .orientacoes-guide-button > div:first-child {
            width: 34px !important;
            height: 34px !important;
            border-radius: 12px !important;
            font-size: 14px !important;
          }

          .orientacoes-guide-button p {
            font-size: 13px !important;
            line-height: 1.2 !important;
          }

          .orientacoes-active-pill {
            padding: 6px 10px !important;
            font-size: 12px !important;
            margin-bottom: 12px !important;
          }

          .orientacoes-active-list {
            gap: 10px !important;
          }

          .orientacoes-active-item {
            grid-template-columns: 30px 1fr !important;
            gap: 10px !important;
          }

          .orientacoes-active-item > div:first-child {
            width: 28px !important;
            height: 28px !important;
            border-radius: 10px !important;
            font-size: 12px !important;
          }

          .orientacoes-active-item p {
            font-size: 13px !important;
            line-height: 1.5 !important;
          }

          .orientacoes-practice-grid {
            gap: 16px !important;
            margin-bottom: 16px !important;
          }

          .orientacoes-step-item {
            grid-template-columns: 40px 1fr !important;
            gap: 10px !important;
          }

          .orientacoes-step-item > div:first-child {
            width: 36px !important;
            height: 36px !important;
            border-radius: 13px !important;
            font-size: 12px !important;
          }

          .orientacoes-step-item h3 {
            font-size: 15px !important;
            line-height: 1.22 !important;
          }

          .orientacoes-step-item p,
          .orientacoes-warning-card p {
            font-size: 13px !important;
            line-height: 1.45 !important;
          }

          .orientacoes-human-card {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            text-align: left !important;
          }

          .orientacoes-human-card > div:first-child {
            width: 44px !important;
            height: 44px !important;
            border-radius: 15px !important;
            font-size: 18px !important;
          }

          .orientacoes-human-card p {
            font-size: 13px !important;
            line-height: 1.45 !important;
          }

          .orientacoes-links-card {
            align-items: flex-start !important;
          }

          .orientacoes-links-actions {
            width: 100% !important;
          }

          .orientacoes-link-button {
            flex: 1 1 100% !important;
          }
        }

        @media (min-width: 1181px) {
          .orientacoes-guide-card {
            align-items: start !important;
          }

          .orientacoes-guide-content {
            min-height: auto !important;
            height: fit-content !important;
            align-self: start !important;
            padding: 24px !important;
          }

          .orientacoes-active-description {
            margin-bottom: 18px !important;
          }

          .orientacoes-active-list {
            gap: 10px !important;
          }

          .orientacoes-active-item {
            grid-template-columns: 32px 1fr !important;
            gap: 10px !important;
          }

          .orientacoes-active-item > div:first-child {
            width: 28px !important;
            height: 28px !important;
            border-radius: 10px !important;
            font-size: 12px !important;
          }

          .orientacoes-active-item p {
            line-height: 1.5 !important;
          }
        }

        @media (max-width: 900px) {
          .chat-main-wrapper .orientacoes-page .orientacoes-quick-grid,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-grid,
          .orientacoes-page .orientacoes-quick-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-card,
          .orientacoes-page .orientacoes-quick-card {
            width: auto !important;
            min-width: 0 !important;
            min-height: 92px !important;
            padding: 10px !important;
            border-radius: 16px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-icon,
          .orientacoes-page .orientacoes-quick-icon {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            min-height: 28px !important;
            border-radius: 9px !important;
            font-size: 12px !important;
            margin: 0 !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card h2,
          .orientacoes-page .orientacoes-quick-card h2 {
            font-size: 11px !important;
            line-height: 1.12 !important;
            margin: 0 !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card p,
          .orientacoes-page .orientacoes-quick-card p {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .chat-main-wrapper .orientacoes-page .orientacoes-quick-grid,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-grid,
          .orientacoes-page .orientacoes-quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-card,
          .orientacoes-page .orientacoes-quick-card {
            min-height: 86px !important;
            padding: 10px !important;
            border-radius: 15px !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-icon,
          .orientacoes-page .orientacoes-quick-icon {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            min-height: 28px !important;
            border-radius: 9px !important;
            font-size: 12px !important;
            margin: 0 !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card h2,
          .orientacoes-page .orientacoes-quick-card h2 {
            font-size: 12px !important;
            line-height: 1.15 !important;
          }
        }

        @media (max-width: 420px) {
          .chat-main-wrapper .orientacoes-page .orientacoes-quick-grid,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-grid,
          .orientacoes-page .orientacoes-quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card,
          .chat-main-wrapper > div.orientacoes-page .orientacoes-quick-card,
          .orientacoes-page .orientacoes-quick-card {
            min-height: 82px !important;
            padding: 9px !important;
          }

          .chat-main-wrapper .orientacoes-page .orientacoes-quick-card h2,
          .orientacoes-page .orientacoes-quick-card h2 {
            font-size: 11px !important;
            line-height: 1.12 !important;
          }
        }
      `}</style>

      <div style={{ height: "120px", flexShrink: 0 }} />
    </div>
  );
}
