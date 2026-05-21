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

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function PatientHomePage() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [tasks, setTasks] = useState<PatientTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [completingTaskId, setCompletingTaskId] = useState("");

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

  async function loadPageData() {
    try {
      setLoading(true);
      await Promise.all([loadAppointments(), loadTasks()]);
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

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const smallCardStyle = {
    ...cardStyle,
    minHeight: "130px",
  };

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-block",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-block",
  } as const;

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>
          Carregando início...
        </h1>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Início
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#4f46e5",
            margin: 0,
          }}
        >
          Acompanhe seus atendimentos, checklists, tarefas e informações
          importantes do seu acompanhamento.
        </p>
      </div>

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
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "18px",
            fontWeight: 700,
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
          <p style={{ color: "#b91c1c", fontWeight: 700, margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#eff6ff",
          borderLeft: "4px solid #3b82f6",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "28px",
        }}
      >
        <p
          style={{
            fontWeight: 700,
            color: "#1d4ed8",
            marginBottom: "6px",
          }}
        >
          Área do paciente
        </p>

        <p style={{ color: "#1e40af", margin: 0 }}>
          Use esta página para visualizar sua próxima consulta, responder
          checklists e acompanhar tarefas combinadas com o profissional.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={smallCardStyle}>
          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Próximas consultas
          </p>

          <p
            style={{
              color: "#111827",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {upcomingAppointments.length}
          </p>
        </div>

        <div style={smallCardStyle}>
          <p
            style={{
              color: "#b45309",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Checklists pendentes
          </p>

          <p
            style={{
              color: "#b45309",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {pendingCheckins.length}
          </p>
        </div>

        <div style={smallCardStyle}>
          <p
            style={{
              color: "#065f46",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Checklists respondidos
          </p>

          <p
            style={{
              color: "#065f46",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {answeredCheckins.length}
          </p>
        </div>

        <div style={smallCardStyle}>
          <p
            style={{
              color: "#7c3aed",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Tarefas pendentes
          </p>

          <p
            style={{
              color: "#7c3aed",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {pendingTasks.length}
          </p>
        </div>

        <div style={smallCardStyle}>
          <p
            style={{
              color: "#b91c1c",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Consultas canceladas
          </p>

          <p
            style={{
              color: "#b91c1c",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {cancelledAppointments.length}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "14px",
            }}
          >
            Próxima consulta
          </h2>

          {nextAppointment ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#111827",
                  fontWeight: 800,
                  fontSize: "18px",
                  marginBottom: "8px",
                }}
              >
                {nextAppointment.title}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Profissional:</strong>{" "}
                {nextAppointment.psychologist.name}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Início:</strong> {formatDate(nextAppointment.dateTime)}
              </p>

              {nextAppointment.endDateTime && (
                <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                  <strong>Fim:</strong> {formatDate(nextAppointment.endDateTime)}
                </p>
              )}

              {nextAppointment.location && (
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  <strong>Local:</strong> {nextAppointment.location}
                </p>
              )}

              {nextAppointment.preSessionCheckin ? (
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 700,
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
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 700,
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
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#111827",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                Nenhuma consulta futura
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
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
              fontWeight: 800,
              color: "#111827",
              marginBottom: "14px",
            }}
          >
            Tarefas terapêuticas
          </h2>

          {taskError && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "12px",
                fontWeight: 700,
              }}
            >
              {taskError}
            </div>
          )}

          {loadingTasks ? (
            <p style={{ color: "#6b7280", margin: 0 }}>Carregando tarefas...</p>
          ) : recentTasks.length === 0 ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#111827",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                Nenhuma tarefa registrada
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Quando o profissional adicionar tarefas, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "14px",
                    backgroundColor:
                      task.status === "COMPLETED" ? "#ecfdf5" : "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#111827",
                          fontWeight: 800,
                          marginBottom: "4px",
                        }}
                      >
                        {task.title}
                      </p>

                      <p
                        style={{
                          color: "#6b7280",
                          margin: 0,
                          fontSize: "14px",
                        }}
                      >
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
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.status === "COMPLETED" ? "Concluída" : "Pendente"}
                    </span>
                  </div>

                  {task.dueDate && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Prazo:</strong> {formatDateOnly(task.dueDate)}
                    </p>
                  )}

                  {task.description && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      {task.description}
                    </p>
                  )}

                  {task.appointment && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Consulta relacionada:</strong>{" "}
                      {task.appointment.title} —{" "}
                      {formatDate(task.appointment.dateTime)}
                    </p>
                  )}

                  {task.completedAt && (
                    <p style={{ color: "#047857", marginBottom: "8px" }}>
                      <strong>Concluída em:</strong>{" "}
                      {formatDate(task.completedAt)}
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
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontWeight: 800,
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

      <section style={cardStyle}>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "#111827",
            marginBottom: "14px",
          }}
        >
          Resumo das tarefas
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "16px",
              backgroundColor: "#f8fafc",
            }}
          >
            <p
              style={{
                color: "#7c3aed",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Pendentes
            </p>

            <p
              style={{
                color: "#7c3aed",
                fontSize: "28px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {pendingTasks.length}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "16px",
              backgroundColor: "#f8fafc",
            }}
          >
            <p
              style={{
                color: "#065f46",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Concluídas
            </p>

            <p
              style={{
                color: "#065f46",
                fontSize: "28px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {completedTasks.length}
            </p>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "16px",
              backgroundColor: "#f8fafc",
            }}
          >
            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Total
            </p>

            <p
              style={{
                color: "#111827",
                fontSize: "28px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {tasks.filter((task) => task.status !== "CANCELLED").length}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}