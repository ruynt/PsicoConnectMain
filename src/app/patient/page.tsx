"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PreSessionCheckin = {
  id: string;
  moodLevel: number | null;
  anxietyLevel: number | null;
  sleepLevel: number | null;
  mainConcern: string;
  importantEvents: string;
  topicsToDiscuss: string;
  createdAt: string;
  updatedAt: string;
};

type PatientAppointment = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  endDateTime: string | null;
  status: "SCHEDULED" | "CANCELLED";
  googleEventLink: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
  preSessionCheckin: PreSessionCheckin | null;
};

type PatientTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
  appointment: {
    id: string;
    title: string;
    dateTime: string;
  } | null;
};

type PatientMaterial = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  content: string;
  viewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
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
  },
  green: {
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
  },
  amber: {
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
  },
  purple: {
    bg: "#f5f3ff",
    text: "#6d28d9",
    border: "#ddd6fe",
  },
  red: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fecaca",
  },
  slate: {
    bg: "#f8fafc",
    text: "#334155",
    border: "#e2e8f0",
  },
};

export default function PatientHomePage() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [materials, setMaterials] = useState<PatientMaterial[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [completingTaskId, setCompletingTaskId] = useState("");
  const [viewingMaterialId, setViewingMaterialId] = useState("");

  async function loadAppointments() {
    try {
      setError("");

      const response = await fetch("/api/patient/appointments", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar informações.");
      }

      setAppointments(data.appointments || []);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar informações.");
    }
  }

  async function loadTasks() {
    try {
      setLoadingTasks(true);
      setTaskError("");

      const response = await fetch("/api/patient/tasks", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar tarefas.");
      }

      setTasks(data.tasks || []);
    } catch (error: any) {
      setTaskError(error.message || "Erro ao carregar tarefas.");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadMaterials() {
    try {
      setLoadingMaterials(true);
      setMaterialError("");

      const response = await fetch("/api/patient/materials", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar materiais.");
      }

      setMaterials(data.materials || []);
    } catch (error: any) {
      setMaterialError(error.message || "Erro ao carregar materiais.");
    } finally {
      setLoadingMaterials(false);
    }
  }

  async function loadPageData() {
    try {
      setLoading(true);
      await Promise.all([loadAppointments(), loadTasks(), loadMaterials()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const now = new Date();

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === "SCHEDULED" &&
          new Date(appointment.dateTime) >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
  }, [appointments]);

  const cancelledAppointments = useMemo(() => {
    return appointments.filter(
      (appointment) => appointment.status === "CANCELLED",
    );
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0] || null;

  const pendingCheckins = useMemo(() => {
    return upcomingAppointments.filter(
      (appointment) => !appointment.preSessionCheckin,
    );
  }, [upcomingAppointments]);

  const answeredCheckins = useMemo(() => {
    return appointments.filter((appointment) => appointment.preSessionCheckin);
  }, [appointments]);

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "PENDING");
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.status === "COMPLETED");
  }, [tasks]);

  const unviewedMaterials = useMemo(() => {
    return materials.filter((material) => !material.viewedAt);
  }, [materials]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.status !== "CANCELLED")
      .sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;

        const aDate = new Date(a.dueDate || a.createdAt).getTime();
        const bDate = new Date(b.dueDate || b.createdAt).getTime();

        return aDate - bDate;
      })
      .slice(0, 5);
  }, [tasks]);

  const recentMaterials = useMemo(() => {
    return [...materials]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [materials]);

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

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  async function completeTask(taskId: string) {
    try {
      setCompletingTaskId(taskId);

      const response = await fetch(`/api/patient/tasks/${taskId}/complete`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao concluir tarefa.");
      }

      await loadTasks();

      showFeedback("success", "Tarefa marcada como concluída.");
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao concluir tarefa.");
    } finally {
      setCompletingTaskId("");
    }
  }

  async function markMaterialAsViewed(materialId: string) {
    try {
      setViewingMaterialId(materialId);

      const response = await fetch(`/api/patient/materials/${materialId}/view`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao marcar material como visualizado.",
        );
      }

      await loadMaterials();

      showFeedback("success", "Material marcado como visualizado.");
    } catch (error: any) {
      showFeedback(
        "error",
        error?.message || "Erro ao marcar material como visualizado.",
      );
    } finally {
      setViewingMaterialId("");
    }
  }

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    background:
      "radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 32%), #f8fafc",
    borderRadius: "32px",
    overflow: "hidden",

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
      <div style={pageStyle}>
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0f172a" }}>
          Carregando início...
        </h1>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section
        style={{
          background: "linear-gradient(135deg, #4338ca, #2563eb 55%, #60a5fa)",
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
              <i className="fa-solid fa-user"></i>
              Área do paciente
            </span>

            <h1
              style={{
                fontSize: "44px",
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: "10px",
              }}
            >
              Início do acompanhamento
            </h1>

            <p
              style={{
                fontSize: "18px",
                color: "#dbeafe",
                maxWidth: "780px",
                margin: 0,
              }}
            >
              Visualize sua próxima consulta, responda checklists pré-sessão,
              acompanhe tarefas terapêuticas e acesse materiais enviados pelo
              profissional.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/minhas-consultas"
              style={{
                ...primaryButtonStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
              }}
            >
              Minhas consultas
            </Link>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          style={{
            backgroundColor:
              feedback.type === "success"
                ? "#ecfdf5"
                : feedback.type === "error"
                  ? "#fef2f2"
                  : "#eff6ff",
            border:
              feedback.type === "success"
                ? "1px solid #a7f3d0"
                : feedback.type === "error"
                  ? "1px solid #fecaca"
                  : "1px solid #bfdbfe",
            color:
              feedback.type === "success"
                ? "#065f46"
                : feedback.type === "error"
                  ? "#b91c1c"
                  : "#1d4ed8",
            borderRadius: "16px",
            padding: "14px 16px",
            marginBottom: "18px",
            fontWeight: 800,
          }}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            marginBottom: "24px",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <MetricCard
          label="Próximas consultas"
          value={upcomingAppointments.length}
          description="Atendimentos futuros agendados."
          icon="fa-solid fa-calendar-check"
          tone="blue"
        />

        <MetricCard
          label="Checklists pendentes"
          value={pendingCheckins.length}
          description="Formulários para responder antes da sessão."
          icon="fa-solid fa-clipboard-question"
          tone="amber"
        />

        <MetricCard
          label="Tarefas pendentes"
          value={pendingTasks.length}
          description="Atividades combinadas com o profissional."
          icon="fa-solid fa-list-check"
          tone="purple"
        />

        <MetricCard
          label="Materiais novos"
          value={unviewedMaterials.length}
          description="Conteúdos ainda não visualizados."
          icon="fa-solid fa-book-open"
          tone="red"
        />

        <MetricCard
          label="Consultas canceladas"
          value={cancelledAppointments.length}
          description="Atendimentos cancelados no histórico."
          icon="fa-solid fa-calendar-xmark"
          tone="slate"
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
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Informações principais do próximo atendimento agendado.
          </p>

          {nextAppointment ? (
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
                {nextAppointment.title}
              </p>

              <p style={{ color: "#475569", marginBottom: "6px" }}>
                <strong>Profissional:</strong> {nextAppointment.psychologist.name}
              </p>

              <p style={{ color: "#475569", marginBottom: "6px" }}>
                <strong>Início:</strong> {formatDate(nextAppointment.dateTime)}
              </p>

              {nextAppointment.endDateTime && (
                <p style={{ color: "#475569", marginBottom: "6px" }}>
                  <strong>Fim:</strong> {formatDate(nextAppointment.endDateTime)}
                </p>
              )}

              {nextAppointment.location && (
                <p style={{ color: "#475569", marginBottom: "14px" }}>
                  <strong>Local:</strong> {nextAppointment.location}
                </p>
              )}

              {nextAppointment.preSessionCheckin ? (
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    borderRadius: "14px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 800,
                  }}
                >
                  Checklist pré-sessão respondido.
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    borderRadius: "14px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 800,
                  }}
                >
                  Você ainda possui um checklist pré-sessão pendente.
                </div>
              )}

              <Link href="/minhas-consultas" style={primaryButtonStyle}>
                Ver minhas consultas
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

              <p style={{ color: "#64748b", margin: 0 }}>
                Quando o profissional agendar uma nova consulta, ela aparecerá
                aqui.
              </p>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#0f172a",
              marginBottom: "6px",
            }}
          >
            Tarefas terapêuticas
          </h2>
          <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
            Atividades combinadas para apoiar o processo terapêutico.
          </p>

          {taskError && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "14px",
                padding: "12px",
                marginBottom: "12px",
                fontWeight: 800,
              }}
            >
              {taskError}
            </div>
          )}

          {loadingTasks ? (
            <p style={{ color: "#64748b", margin: 0 }}>Carregando tarefas...</p>
          ) : recentTasks.length === 0 ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "6px" }}>
                Nenhuma tarefa registrada
              </p>
              <p style={{ color: "#64748b", margin: 0 }}>
                Quando o profissional adicionar tarefas, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px",
                    backgroundColor:
                      task.status === "COMPLETED" ? "#ecfdf5" : "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "4px" }}>
                        {task.title}
                      </p>

                      <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                        Profissional: {task.psychologist.name}
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor:
                          task.status === "COMPLETED" ? "#d1fae5" : "#fffbeb",
                        color:
                          task.status === "COMPLETED" ? "#065f46" : "#92400e",
                        border:
                          task.status === "COMPLETED"
                            ? "1px solid #a7f3d0"
                            : "1px solid #fde68a",
                        borderRadius: "999px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.status === "COMPLETED" ? "Concluída" : "Pendente"}
                    </span>
                  </div>

                  {task.dueDate && (
                    <p style={{ color: "#475569", marginBottom: "6px" }}>
                      <strong>Prazo:</strong> {formatDateOnly(task.dueDate)}
                    </p>
                  )}

                  {task.description && (
                    <p style={{ color: "#475569", marginBottom: "8px" }}>
                      {task.description}
                    </p>
                  )}

                  {task.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => completeTask(task.id)}
                      disabled={completingTaskId === task.id}
                      style={{
                        backgroundColor: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        fontWeight: 900,
                        cursor:
                          completingTaskId === task.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: completingTaskId === task.id ? 0.7 : 1,
                        marginTop: "8px",
                      }}
                    >
                      {completingTaskId === task.id
                        ? "Concluindo..."
                        : "Marcar como concluída"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={{ ...cardStyle, marginBottom: "20px" }}>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#0f172a",
            marginBottom: "6px",
          }}
        >
          Materiais psicoeducativos
        </h2>
        <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
          Conteúdos enviados pelo profissional para apoiar seu acompanhamento.
        </p>

        {materialError && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "14px",
              padding: "12px",
              marginBottom: "12px",
              fontWeight: 800,
            }}
          >
            {materialError}
          </div>
        )}

        {loadingMaterials ? (
          <p style={{ color: "#64748b", margin: 0 }}>Carregando materiais...</p>
        ) : recentMaterials.length === 0 ? (
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              padding: "18px",
              backgroundColor: "#f8fafc",
            }}
          >
            <p style={{ color: "#0f172a", fontWeight: 900, marginBottom: "6px" }}>
              Nenhum material enviado
            </p>
            <p style={{ color: "#64748b", margin: 0 }}>
              Quando o profissional enviar materiais, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {recentMaterials.map((material) => (
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

                    <p style={{ color: "#0f172a", fontWeight: 900, fontSize: "17px", marginBottom: "6px" }}>
                      {material.title}
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
                    {material.viewedAt ? "Visualizado" : "Novo"}
                  </span>
                </div>

                <p style={{ color: "#64748b", marginBottom: "8px", fontSize: "14px" }}>
                  Enviado por {material.psychologist.name} em {formatDate(material.createdAt)}
                </p>

                {material.viewedAt && (
                  <p style={{ color: "#047857", marginBottom: "8px", fontSize: "14px", fontWeight: 800 }}>
                    Visualizado em {formatDate(material.viewedAt)}
                  </p>
                )}

                {material.description && (
                  <p style={{ color: "#475569", marginBottom: "10px" }}>
                    {material.description}
                  </p>
                )}

                {material.content && (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "12px",
                      color: "#374151",
                      marginBottom: "10px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {material.content}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {material.url && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      style={secondaryButtonStyle}
                      onClick={() => markMaterialAsViewed(material.id)}
                    >
                      Abrir material
                    </a>
                  )}

                  {!material.viewedAt && (
                    <button
                      type="button"
                      onClick={() => markMaterialAsViewed(material.id)}
                      disabled={viewingMaterialId === material.id}
                      style={{
                        backgroundColor: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        fontWeight: 900,
                        cursor:
                          viewingMaterialId === material.id
                            ? "not-allowed"
                            : "pointer",
                        opacity: viewingMaterialId === material.id ? 0.7 : 1,
                      }}
                    >
                      {viewingMaterialId === material.id
                        ? "Marcando..."
                        : "Marcar como visualizado"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#0f172a",
            marginBottom: "6px",
          }}
        >
          Resumo do acompanhamento
        </h2>
        <p style={{ color: "#64748b", marginTop: 0, marginBottom: "16px" }}>
          Visão geral dos principais registros disponíveis na sua área.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
          <MetricCard
            label="Tarefas pendentes"
            value={pendingTasks.length}
            description="Atividades ainda em aberto."
            icon="fa-solid fa-list-check"
            tone="purple"
          />

          <MetricCard
            label="Tarefas concluídas"
            value={completedTasks.length}
            description="Atividades finalizadas."
            icon="fa-solid fa-circle-check"
            tone="green"
          />

          <MetricCard
            label="Materiais recebidos"
            value={materials.length}
            description="Conteúdos enviados pelo profissional."
            icon="fa-solid fa-book-open"
            tone="blue"
          />

          <MetricCard
            label="Checklists respondidos"
            value={answeredCheckins.length}
            description="Respostas pré-sessão registradas."
            icon="fa-solid fa-clipboard-check"
            tone="amber"
          />
        </div>
      </section>
    </div>
  );
}
