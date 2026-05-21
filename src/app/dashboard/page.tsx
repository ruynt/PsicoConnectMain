"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardData = {
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
  metrics: {
    activePatientsCount: number;
    todayAppointmentsCount: number;
    scheduledAppointmentsCount: number;
    cancelledAppointmentsThisMonthCount: number;
    recentCheckinsCount: number;
    recentNotesCount: number;
    pendingTasksCount: number;
    completedTasksCount: number;
    dueSoonTasksCount: number;
    materialsCount: number;
    viewedMaterialsCount: number;
    unviewedMaterialsCount: number;
  };
  nextAppointment: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    location: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
  } | null;
  todayAppointments: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    location: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
  }[];
  recentCancelledAppointments: {
    id: string;
    title: string;
    dateTime: string;
    cancelledAt: string | null;
    cancellationReason: string;
    patientId: string;
    patientName: string;
  }[];
  recentCheckins: {
    id: string;
    patientId: string;
    patientName: string;
    appointmentId: string;
    appointmentTitle: string;
    appointmentDateTime: string;
    moodLevel: number | null;
    anxietyLevel: number | null;
    sleepLevel: number | null;
    mainConcern: string;
    importantEvents: string;
    topicsToDiscuss: string;
    updatedAt: string;
  }[];
  recentNotes: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    updatedAt: string;
  }[];
  dueSoonTasks: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    updatedAt: string;
  }[];
  recentTasks: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    completedAt: string | null;
    cancelledAt: string | null;
    updatedAt: string;
  }[];
  recentMaterials: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    description: string;
    category: string;
    url: string;
    viewedAt: string | null;
    createdAt: string;
  }[];
  recommendations: string[];
};

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "purple" | "red" | "slate";
};

const tones = {
  blue: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
    soft: "#dbeafe",
  },
  green: {
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
    soft: "#d1fae5",
  },
  amber: {
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
    soft: "#fef3c7",
  },
  purple: {
    bg: "#f5f3ff",
    text: "#6d28d9",
    border: "#ddd6fe",
    soft: "#ede9fe",
  },
  red: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fecaca",
    soft: "#fee2e2",
  },
  slate: {
    bg: "#f8fafc",
    text: "#334155",
    border: "#e2e8f0",
    soft: "#f1f5f9",
  },
};

export default function PsychologistDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/psychologist", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar dashboard.");
      }

      setData(result);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function formatDateOnly(dateString: string | null | undefined) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(dateString));
  }

  function getTaskStatusLabel(status: string) {
    if (status === "COMPLETED") return "Concluída";
    if (status === "CANCELLED") return "Cancelada";
    return "Pendente";
  }

  function getTaskStatusStyle(status: string) {
    if (status === "COMPLETED") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (status === "CANCELLED") {
      return {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    return {
      backgroundColor: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    background:
      "radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%), #f8fafc",
    borderRadius: "32px",
    overflow: "visible",
  };

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
  };

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.28)",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  function MetricCard({ label, value, description, icon, tone }: MetricCardProps) {
    const selectedTone = tones[tone];

    return (
      <div
        style={{
          ...cardStyle,
          minHeight: "132px",
          padding: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-24px",
            top: "-24px",
            width: "94px",
            height: "94px",
            borderRadius: "999px",
            backgroundColor: selectedTone.bg,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              {label}
            </p>

            <p
              style={{
                color: selectedTone.text,
                fontSize: "36px",
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {value}
            </p>
          </div>

          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              backgroundColor: selectedTone.bg,
              border: `1px solid ${selectedTone.border}`,
              color: selectedTone.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            <i className={icon}></i>
          </div>
        </div>

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginTop: "12px",
            marginBottom: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          {description}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "32px",
          background: "#f8fbff",
          overflow: "hidden",
        }}
      >
        <div className="psico-simple-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 900,
            color: "#0f172a",
            marginBottom: "18px",
          }}
        >
          Dashboard
        </h1>

        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
            {error || "Não foi possível carregar o dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section
        style={{
          background: "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
          borderRadius: "28px",
          padding: "30px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 20px 50px rgba(37, 99, 235, 0.24)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-90px",
            width: "240px",
            height: "240px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.16)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "90px",
            bottom: "-110px",
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            alignItems: "flex-start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "13px",
                fontWeight: 800,
                marginBottom: "14px",
              }}
            >
              <i className="fa-solid fa-chart-line"></i>
              Central do psicólogo
            </span>

            <h1
              style={{
                fontSize: "44px",
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: "10px",
              }}
            >
              Olá, {data.psychologist.name}
            </h1>

            <p
              style={{
                fontSize: "18px",
                color: "#dbeafe",
                maxWidth: "760px",
                margin: 0,
              }}
            >
              Acompanhe sua agenda, checklists pré-sessão, tarefas terapêuticas,
              materiais psicoeducativos e registros recentes em um só painel.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/agenda"
              style={{
                ...primaryButtonStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
              }}
            >
              Nova consulta
            </Link>

            <Link
              href="/pacientes"
              style={{
                ...secondaryButtonStyle,
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.28)",
              }}
            >
              Ver pacientes
            </Link>
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "18px",
        }}
      >
        <MetricCard
          label="Pacientes ativos"
          value={data.metrics.activePatientsCount}
          description="Pacientes vinculados ao seu acompanhamento."
          icon="fa-solid fa-users"
          tone="slate"
        />

        <MetricCard
          label="Consultas futuras"
          value={data.metrics.scheduledAppointmentsCount}
          description="Atendimentos agendados a partir de hoje."
          icon="fa-solid fa-calendar-check"
          tone="blue"
        />

        <MetricCard
          label="Tarefas pendentes"
          value={data.metrics.pendingTasksCount}
          description="Atividades terapêuticas aguardando conclusão."
          icon="fa-solid fa-list-check"
          tone="amber"
        />

        <MetricCard
          label="Materiais enviados"
          value={data.metrics.materialsCount}
          description="Conteúdos psicoeducativos enviados aos pacientes."
          icon="fa-solid fa-book-open"
          tone="purple"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <MetricCard
          label="Consultas hoje"
          value={data.metrics.todayAppointmentsCount}
          description="Atendimentos previstos para o dia atual."
          icon="fa-solid fa-clock"
          tone="blue"
        />

        <MetricCard
          label="Checklists recentes"
          value={data.metrics.recentCheckinsCount}
          description="Respostas pré-sessão recebidas recentemente."
          icon="fa-solid fa-clipboard-check"
          tone="amber"
        />

        <MetricCard
          label="Tarefas concluídas"
          value={data.metrics.completedTasksCount}
          description="Atividades já finalizadas pelos pacientes."
          icon="fa-solid fa-circle-check"
          tone="green"
        />

        <MetricCard
          label="Materiais pendentes"
          value={data.metrics.unviewedMaterialsCount}
          description="Materiais ainda não visualizados."
          icon="fa-solid fa-eye-slash"
          tone="red"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "6px",
                }}
              >
                Próxima consulta
              </h2>
              <p style={{ color: "#64748b", margin: 0 }}>
                Acompanhe o próximo atendimento agendado.
              </p>
            </div>

            <Link href="/agenda" style={secondaryButtonStyle}>
              Abrir agenda
            </Link>
          </div>

          {data.nextAppointment ? (
            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: "18px",
                padding: "18px",
                background:
                  "linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.95))",
              }}
            >
              <p
                style={{
                  color: "#0f172a",
                  fontWeight: 900,
                  fontSize: "20px",
                  marginBottom: "10px",
                }}
              >
                {data.nextAppointment.title}
              </p>

              <p style={{ color: "#475569", marginBottom: "6px" }}>
                <strong>Paciente:</strong> {data.nextAppointment.patientName}
              </p>

              <p style={{ color: "#475569", marginBottom: "6px" }}>
                <strong>Início:</strong> {formatDate(data.nextAppointment.dateTime)}
              </p>

              {data.nextAppointment.endDateTime && (
                <p style={{ color: "#475569", marginBottom: "6px" }}>
                  <strong>Fim:</strong> {formatDate(data.nextAppointment.endDateTime)}
                </p>
              )}

              {data.nextAppointment.location && (
                <p style={{ color: "#475569", marginBottom: "14px" }}>
                  <strong>Local:</strong> {data.nextAppointment.location}
                </p>
              )}

              <Link href={`/pacientes/${data.nextAppointment.patientId}`} style={primaryButtonStyle}>
                Ver paciente
              </Link>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "6px" }}>
                Nenhuma consulta futura
              </p>

              <p style={{ color: "#64748b", marginBottom: "14px" }}>
                Agende novos horários para manter o acompanhamento organizado.
              </p>

              <Link href="/agenda" style={primaryButtonStyle}>
                Criar horário
              </Link>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              Ações recomendadas
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>
              Pontos de atenção identificados a partir dos registros recentes.
            </p>
          </div>

          {data.recommendations.length === 0 ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ color: "#64748b", margin: 0 }}>
                Nenhuma recomendação no momento.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "16px",
                    padding: "14px",
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 800,
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <i className="fa-solid fa-circle-info" style={{ marginTop: "2px" }}></i>
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <section style={cardStyle}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginBottom: "6px" }}>
            Tarefas terapêuticas recentes
          </h2>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Últimas atividades criadas, concluídas ou atualizadas.
          </p>

          {data.recentTasks.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>
              Nenhuma tarefa terapêutica registrada recentemente.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.recentTasks.map((task) => {
                const statusStyle = getTaskStatusStyle(task.status);

                return (
                  <div
                    key={task.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "18px",
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "4px" }}>
                          {task.title}
                        </p>

                        <p style={{ color: "#475569", margin: 0 }}>
                          Paciente: {task.patientName}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusStyle,
                          borderRadius: "999px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getTaskStatusLabel(task.status)}
                      </span>
                    </div>

                    {task.dueDate && (
                      <p style={{ color: "#475569", marginBottom: "6px" }}>
                        <strong>Prazo:</strong> {formatDateOnly(task.dueDate)}
                      </p>
                    )}

                    {task.description && (
                      <p style={{ color: "#475569", marginBottom: "12px" }}>
                        {task.description}
                      </p>
                    )}

                    <Link href={`/pacientes/${task.patientId}`} style={secondaryButtonStyle}>
                      Ver paciente
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginBottom: "6px" }}>
            Materiais psicoeducativos recentes
          </h2>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Conteúdos enviados e status de visualização pelos pacientes.
          </p>

          {data.recentMaterials.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>
              Nenhum material psicoeducativo enviado recentemente.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.recentMaterials.map((material) => (
                <div
                  key={material.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      {material.category && (
                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                            marginBottom: "8px",
                          }}
                        >
                          {material.category}
                        </span>
                      )}

                      <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "4px" }}>
                        {material.title}
                      </p>

                      <p style={{ color: "#475569", margin: 0 }}>
                        Paciente: {material.patientName}
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor: material.viewedAt ? "#ecfdf5" : "#fef2f2",
                        color: material.viewedAt ? "#065f46" : "#b91c1c",
                        border: material.viewedAt ? "1px solid #a7f3d0" : "1px solid #fecaca",
                        borderRadius: "999px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {material.viewedAt ? "Visualizado" : "Não visualizado"}
                    </span>
                  </div>

                  {material.description && (
                    <p style={{ color: "#475569", marginBottom: "10px" }}>
                      {material.description}
                    </p>
                  )}

                  <p style={{ color: "#64748b", marginBottom: "12px", fontSize: "14px" }}>
                    Enviado em {formatDate(material.createdAt)}
                    {material.viewedAt ? ` · Visualizado em ${formatDate(material.viewedAt)}` : ""}
                  </p>

                  <Link href={`/pacientes/${material.patientId}`} style={secondaryButtonStyle}>
                    Ver paciente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <section style={cardStyle}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginBottom: "6px" }}>
            Checklists pré-sessão recentes
          </h2>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Respostas enviadas pelos pacientes antes dos atendimentos.
          </p>

          {data.recentCheckins.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>
              Nenhum checklist respondido recentemente.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "6px" }}>
                    {checkin.patientName}
                  </p>

                  <p style={{ color: "#475569", marginBottom: "6px" }}>
                    {checkin.appointmentTitle} · {formatDate(checkin.appointmentDateTime)}
                  </p>

                  <p style={{ color: "#475569", marginBottom: "12px" }}>
                    Humor: {checkin.moodLevel ?? "--"}/10 · Ansiedade:{" "}
                    {checkin.anxietyLevel ?? "--"}/10 · Sono:{" "}
                    {checkin.sleepLevel ?? "--"}/10
                  </p>

                  <Link href={`/pacientes/${checkin.patientId}`} style={secondaryButtonStyle}>
                    Ver paciente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", marginBottom: "6px" }}>
            Anotações recentes
          </h2>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Registros clínicos internos atualizados recentemente.
          </p>

          {data.recentNotes.length === 0 ? (
            <p style={{ color: "#64748b", margin: 0 }}>
              Nenhuma anotação recente registrada.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.recentNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "6px" }}>
                    {note.title}
                  </p>

                  <p style={{ color: "#475569", marginBottom: "12px" }}>
                    Paciente: {note.patientName} · Atualizada em {formatDate(note.updatedAt)}
                  </p>

                  <Link href={`/pacientes/${note.patientId}`} style={secondaryButtonStyle}>
                    Ver paciente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
