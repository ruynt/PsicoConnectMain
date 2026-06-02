"use client";

import { useMemo, useState } from "react";

type GuideSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  highlight: string;
  content: string[];
};

export default function OrientacoesPage() {
  const [activeSectionId, setActiveSectionId] = useState("uso-plataforma");

  const guideSections: GuideSection[] = [
    {
      id: "uso-plataforma",
      title: "Como usar o PsicoConnect",
      subtitle: "Entenda o papel de cada área da plataforma.",
      icon: "fa-solid fa-compass",
      highlight: "Guia rápido",
      content: [
        "A página Início reúne um resumo do seu acompanhamento, como próxima consulta, tarefas pendentes, materiais novos e checklists.",
        "A área Minhas Consultas concentra atendimentos futuros, histórico de consultas e formulários pré-sessão.",
        "A área Tarefas e materiais reúne atividades terapêuticas e conteúdos enviados pelo profissional.",
        "O Chat funciona como apoio informativo e orientação de uso, sem substituir o acompanhamento profissional.",
      ],
    },
    {
      id: "checklists",
      title: "Checklists pré-sessão",
      subtitle: "Prepare melhor suas consultas.",
      icon: "fa-solid fa-clipboard-check",
      highlight: "Antes da sessão",
      content: [
        "Os checklists ajudam o profissional a compreender como você chegou para a sessão.",
        "Você pode registrar informações como humor, ansiedade, sono, principais preocupações e temas que deseja abordar.",
        "As respostas auxiliam a organização do atendimento e favorecem um acompanhamento mais direcionado.",
        "Responda de forma honesta e objetiva. Não existe resposta certa ou errada.",
      ],
    },
    {
      id: "tarefas-materiais",
      title: "Tarefas e materiais",
      subtitle: "Acompanhe o que foi combinado em sessão.",
      icon: "fa-solid fa-list-check",
      highlight: "Entre sessões",
      content: [
        "As tarefas terapêuticas são atividades combinadas com o profissional para apoiar o processo fora da sessão.",
        "Os materiais podem incluir textos, links, orientações ou exercícios psicoeducativos.",
        "A plataforma mostra indicadores de acompanhamento para ajudar você a visualizar sua participação.",
        "Esses indicadores são simbólicos e não representam avaliação clínica, desempenho ou julgamento pessoal.",
      ],
    },
    {
      id: "ia",
      title: "Uso responsável da IA",
      subtitle: "A inteligência artificial é apoio, não substituição.",
      icon: "fa-solid fa-brain",
      highlight: "IA com cuidado",
      content: [
        "A IA pode auxiliar na organização de informações, explicações gerais e navegação pela plataforma.",
        "As respostas geradas por IA não substituem avaliação psicológica, psicoterapia ou orientação clínica profissional.",
        "Informações sensíveis devem ser tratadas com cautela e revisadas pelo profissional responsável.",
        "Em decisões importantes sobre saúde mental, procure sempre o acompanhamento de um profissional habilitado.",
      ],
    },
    {
      id: "privacidade",
      title: "Privacidade e sigilo",
      subtitle: "Cuidados com dados pessoais e informações sensíveis.",
      icon: "fa-solid fa-lock",
      highlight: "Segurança",
      content: [
        "Evite compartilhar informações pessoais desnecessárias em campos abertos.",
        "O acesso às informações deve ser restrito ao paciente e ao profissional vinculado.",
        "Anotações clínicas internas são destinadas ao uso profissional e não aparecem para o paciente.",
        "O uso da plataforma deve respeitar princípios de sigilo, ética profissional e proteção de dados.",
      ],
    },
  ];

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
    <div style={pageStyle}>
      <section
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
              Central de orientação
            </div>

            <h1
              style={{
                fontSize: "46px",
                lineHeight: 1.02,
                fontWeight: 950,
                marginBottom: "14px",
                letterSpacing: "-0.04em",
              }}
            >
              Orientações para um uso seguro e consciente
            </h1>

            <p
              style={{
                fontSize: "18px",
                color: "#dbeafe",
                lineHeight: 1.65,
                maxWidth: "820px",
                margin: 0,
              }}
            >
              Um guia para compreender os recursos do PsicoConnect, acompanhar
              consultas, responder checklists, acessar tarefas e usar a IA de
              forma ética e responsável.
            </p>
          </div>

          <div
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
              A plataforma apoia o cuidado, mas não substitui o profissional.
            </p>

            <p
              style={{
                color: "#dbeafe",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Em situações de urgência, risco ou sofrimento intenso, procure
              atendimento presencial, serviços de emergência ou rede de apoio
              imediatamente.
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "26px",
        }}
      >
        {[
          {
            title: "Acompanhamento",
            text: "Organize consultas, checklists, tarefas e materiais em um só lugar.",
            icon: "fa-solid fa-route",
            color: "#2563eb",
            bg: "#eff6ff",
          },
          {
            title: "Clareza",
            text: "Entenda como cada recurso contribui para o processo terapêutico.",
            icon: "fa-solid fa-lightbulb",
            color: "#ca8a04",
            bg: "#fffbeb",
          },
          {
            title: "Privacidade",
            text: "Use a plataforma com cuidado ao registrar informações sensíveis.",
            icon: "fa-solid fa-lock",
            color: "#059669",
            bg: "#ecfdf5",
          },
          {
            title: "IA responsável",
            text: "A IA oferece apoio informativo, mas não substitui avaliação profissional.",
            icon: "fa-solid fa-brain",
            color: "#7c3aed",
            bg: "#f5f3ff",
          },
        ].map((item) => (
          <div key={item.title} style={miniCardStyle}>
            <div
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
        style={{
          ...glassCardStyle,
          padding: "26px",
          marginBottom: "26px",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.3fr",
          gap: "24px",
        }}
      >
        <div>
          <p
            style={{
              color: "#2563eb",
              fontWeight: 950,
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Guia interativo
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
            Escolha um tema para ver orientações
          </h2>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.65,
              marginBottom: "20px",
            }}
          >
            Esta área reúne orientações gerais sobre o uso da plataforma, o
            acompanhamento entre sessões, privacidade e inteligência artificial.
          </p>

          <div
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
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
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
                    boxShadow: isActive ? "0 8px 18px rgba(37, 99, 235, 0.10)" : "none",
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

        <div
          style={{
            borderRadius: "28px",
            padding: "28px",
            backgroundColor: "#f8fbff",
            border: "1px solid #bfdbfe",
            minHeight: "100%",
          }}
        >
          <div
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
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {activeSection.content.map((text, index) => (
              <div
                key={text}
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
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "20px",
          marginBottom: "26px",
        }}
      >
        <div
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
              marginBottom: "20px",
              letterSpacing: "-0.03em",
            }}
          >
            Como o acompanhamento acontece na plataforma
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {[
              {
                step: "01",
                title: "Consulta agendada",
                text: "O profissional registra o atendimento e ele aparece na área do paciente.",
              },
              {
                step: "02",
                title: "Checklist pré-sessão",
                text: "Antes da consulta, o paciente pode registrar informações importantes para o atendimento.",
              },
              {
                step: "03",
                title: "Tarefas e materiais",
                text: "Após ou entre sessões, o profissional pode enviar atividades e conteúdos de apoio.",
              },
              {
                step: "04",
                title: "Acompanhamento contínuo",
                text: "O paciente visualiza seu progresso e mantém maior clareza sobre o processo.",
              },
            ].map((item, index) => (
              <div
                key={item.step}
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
                      index === 3
                        ? "none"
                        : "1px solid rgba(226, 232, 240, 0.9)",
                    paddingBottom: index === 3 ? 0 : "16px",
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
              de apoio ou profissionais responsáveis pelo seu cuidado.
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          ...glassCardStyle,
          padding: "24px",
          marginBottom: "48px",
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
            O cuidado continua sendo humano
          </h2>

          <p
            style={{
              color: "#4b5563",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            O PsicoConnect organiza informações e facilita o acompanhamento, mas
            a escuta, a interpretação clínica e as decisões sobre o processo
            terapêutico pertencem ao profissional e ao vínculo construído com o
            paciente.
          </p>
        </div>
      </section>

      <div style={{ height: "120px", flexShrink: 0 }} />
    </div>
  );
}
