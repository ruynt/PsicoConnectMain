"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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

type AppointmentConfirmationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLATION_REQUESTED";

type CancellationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  confirmationStatus?: AppointmentConfirmationStatus;
  confirmedAt?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationRequestReason?: string | null;
  cancellationRequestStatus?: CancellationRequestStatus | null;
  lastReminderSentAt?: string | null;
  reminderEmailSentAt?: string | null;
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

  const [updatingAppointmentId, setUpdatingAppointmentId] = useState("");
  const [cancelRequestAppointment, setCancelRequestAppointment] =
    useState<PatientAppointment | null>(null);
  const [cancelRequestReason, setCancelRequestReason] = useState("");
  const [cancelRequestError, setCancelRequestError] = useState("");
  const [savingCancelRequest, setSavingCancelRequest] = useState(false);

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

  const upcoming24hAppointment = useMemo(() => {
    const twentyFourHoursFromNow = new Date();
    twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

    return (
      upcomingAppointments.find((appointment) => {
        const appointmentDate = new Date(appointment.dateTime);

        return (
          appointmentDate >= now && appointmentDate <= twentyFourHoursFromNow
        );
      }) || null
    );
  }, [upcomingAppointments, now]);

  function getTimeUntilAppointment(dateString: string) {
    const appointmentDate = new Date(dateString);
    const diffInMs = appointmentDate.getTime() - new Date().getTime();

    if (diffInMs <= 0) return "em instantes";

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    if (hours <= 0) {
      return `${minutes} min`;
    }

    if (minutes <= 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}min`;
  }

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

  async function readJsonSafely(response: Response) {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }

  function getConfirmationStatus(appointment: PatientAppointment) {
    return appointment.confirmationStatus || "PENDING";
  }

  function getConfirmationInfo(appointment: PatientAppointment) {
    if (appointment.status === "CANCELLED") {
      return {
        label: "Consulta cancelada",
        description: appointment.cancelledAt
          ? `Cancelada em ${formatDate(appointment.cancelledAt)}`
          : "Esta consulta foi cancelada.",
        bg: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
        icon: "fa-solid fa-calendar-xmark",
      };
    }

    const confirmationStatus = getConfirmationStatus(appointment);

    if (confirmationStatus === "CONFIRMED") {
      return {
        label: "Presença confirmada",
        description: appointment.confirmedAt
          ? `Confirmada em ${formatDate(appointment.confirmedAt)}`
          : "Você confirmou presença nesta consulta.",
        bg: "#ecfdf5",
        color: "#047857",
        border: "#a7f3d0",
        icon: "fa-solid fa-circle-check",
      };
    }

    if (confirmationStatus === "CANCELLATION_REQUESTED") {
      return {
        label: "Cancelamento solicitado",
        description:
          appointment.cancellationRequestStatus === "REJECTED"
            ? "A solicitação foi analisada e rejeitada pelo profissional."
            : "Sua solicitação está aguardando análise do profissional.",
        bg: "#fffbeb",
        color: "#92400e",
        border: "#fde68a",
        icon: "fa-solid fa-hourglass-half",
      };
    }

    return {
      label: "Aguardando confirmação",
      description:
        "Confirme sua presença ou solicite cancelamento, se necessário.",
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
      icon: "fa-solid fa-calendar-check",
    };
  }

  function openCancelRequestModal(appointment: PatientAppointment) {
    setCancelRequestAppointment(appointment);
    setCancelRequestReason(appointment.cancellationRequestReason || "");
    setCancelRequestError("");
  }

  function closeCancelRequestModal() {
    setCancelRequestAppointment(null);
    setCancelRequestReason("");
    setCancelRequestError("");
  }

  async function confirmPresence(appointmentId: string) {
    try {
      setUpdatingAppointmentId(appointmentId);

      const response = await fetch(
        `/api/patient/appointments/${appointmentId}/confirm`,
        {
          method: "PATCH",
        },
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao confirmar presença.");
      }

      await loadAppointments();
      showFeedback("success", "Presença confirmada com sucesso.");
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao confirmar presença.");
    } finally {
      setUpdatingAppointmentId("");
    }
  }

  async function submitCancelRequest(e: FormEvent) {
    e.preventDefault();

    if (!cancelRequestAppointment) return;

    const reason = cancelRequestReason.trim();

    if (!reason) {
      setCancelRequestError("Informe o motivo da solicitação de cancelamento.");
      return;
    }

    try {
      setSavingCancelRequest(true);
      setCancelRequestError("");

      const response = await fetch(
        `/api/patient/appointments/${cancelRequestAppointment.id}/cancel-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        },
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao solicitar cancelamento.");
      }

      await loadAppointments();
      closeCancelRequestModal();
      showFeedback(
        "success",
        "Solicitação de cancelamento enviada ao profissional.",
      );
    } catch (error: any) {
      setCancelRequestError(error.message || "Erro ao solicitar cancelamento.");
    } finally {
      setSavingCancelRequest(false);
    }
  }

  async function withdrawCancelRequest(appointmentId: string) {
    try {
      setUpdatingAppointmentId(appointmentId);

      const response = await fetch(
        `/api/patient/appointments/${appointmentId}/cancel-request`,
        {
          method: "DELETE",
        },
      );

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao cancelar solicitação de cancelamento.",
        );
      }

      await loadAppointments();
      showFeedback(
        "success",
        "Solicitação de cancelamento retirada com sucesso.",
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao cancelar solicitação de cancelamento.",
      );
    } finally {
      setUpdatingAppointmentId("");
    }
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

      const response = await fetch(
        `/api/patient/materials/${materialId}/view`,
        {
          method: "PATCH",
        },
      );

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
    paddingBottom: "72px",
    background:
      "radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 32%), #f8fafc",
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

  function MetricCard({
    label,
    value,
    description,
    icon,
    tone,
  }: MetricCardProps) {
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
    <>
      <div style={pageStyle}>
        <section
          style={{
            background:
              "linear-gradient(135deg, #4338ca, #2563eb 55%, #60a5fa)",
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

        {upcoming24hAppointment && (
          <section
            style={{
              background:
                "linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.98))",
              border: "1px solid #bfdbfe",
              borderRadius: "22px",
              padding: "22px",
              marginBottom: "24px",
              boxShadow: "0 16px 38px rgba(37, 99, 235, 0.12)",
            }}
          >
            {(() => {
              const confirmationInfo = getConfirmationInfo(
                upcoming24hAppointment,
              );
              const confirmationStatus = getConfirmationStatus(
                upcoming24hAppointment,
              );

              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "18px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          backgroundColor: "#dbeafe",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: "999px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 900,
                          marginBottom: "10px",
                        }}
                      >
                        <i className="fa-solid fa-bell"></i>
                        Consulta nas próximas 24h
                      </span>

                      <h2
                        style={{
                          color: "#0f172a",
                          fontSize: "24px",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        Sua consulta está próxima
                      </h2>

                      <p
                        style={{
                          color: "#475569",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        Faltam aproximadamente{" "}
                        <strong>
                          {getTimeUntilAppointment(
                            upcoming24hAppointment.dateTime,
                          )}
                        </strong>{" "}
                        para o atendimento. Confira os dados e confirme sua
                        presença, se ainda não tiver confirmado.
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor: confirmationInfo.bg,
                        color: confirmationInfo.color,
                        border: `1px solid ${confirmationInfo.border}`,
                        borderRadius: "999px",
                        padding: "7px 12px",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {confirmationInfo.label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #dbeafe",
                        borderRadius: "14px",
                        padding: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 800,
                          marginBottom: "4px",
                        }}
                      >
                        Consulta
                      </p>
                      <p
                        style={{ color: "#0f172a", fontWeight: 900, margin: 0 }}
                      >
                        {upcoming24hAppointment.title}
                      </p>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #dbeafe",
                        borderRadius: "14px",
                        padding: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 800,
                          marginBottom: "4px",
                        }}
                      >
                        Horário
                      </p>
                      <p
                        style={{ color: "#0f172a", fontWeight: 900, margin: 0 }}
                      >
                        {formatDate(upcoming24hAppointment.dateTime)}
                      </p>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #dbeafe",
                        borderRadius: "14px",
                        padding: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 800,
                          marginBottom: "4px",
                        }}
                      >
                        Profissional
                      </p>
                      <p
                        style={{ color: "#0f172a", fontWeight: 900, margin: 0 }}
                      >
                        {upcoming24hAppointment.psychologist.name}
                      </p>
                    </div>
                  </div>

                  {upcoming24hAppointment.reminderEmailSentAt && (
                    <div
                      style={{
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        borderRadius: "14px",
                        padding: "12px",
                        marginBottom: "16px",
                        fontWeight: 800,
                      }}
                    >
                      <i className="fa-solid fa-envelope-circle-check"></i>{" "}
                      Lembrete automático enviado por e-mail em{" "}
                      {formatDate(upcoming24hAppointment.reminderEmailSentAt)}.
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {confirmationStatus !== "CONFIRMED" &&
                      confirmationStatus !== "CANCELLATION_REQUESTED" && (
                        <button
                          type="button"
                          onClick={() =>
                            confirmPresence(upcoming24hAppointment.id)
                          }
                          disabled={
                            updatingAppointmentId === upcoming24hAppointment.id
                          }
                          style={{
                            ...primaryButtonStyle,
                            background:
                              "linear-gradient(135deg, #059669, #22c55e)",
                            boxShadow: "0 10px 24px rgba(34, 197, 94, 0.20)",
                            opacity:
                              updatingAppointmentId ===
                              upcoming24hAppointment.id
                                ? 0.7
                                : 1,
                            cursor:
                              updatingAppointmentId ===
                              upcoming24hAppointment.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {updatingAppointmentId === upcoming24hAppointment.id
                            ? "Confirmando..."
                            : "Confirmar presença"}
                        </button>
                      )}

                    {confirmationStatus !== "CANCELLATION_REQUESTED" && (
                      <button
                        type="button"
                        onClick={() =>
                          openCancelRequestModal(upcoming24hAppointment)
                        }
                        style={{
                          backgroundColor: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fed7aa",
                          borderRadius: "14px",
                          padding: "11px 16px",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        Solicitar cancelamento
                      </button>
                    )}

                    {confirmationStatus === "CANCELLATION_REQUESTED" && (
                      <button
                        type="button"
                        onClick={() =>
                          withdrawCancelRequest(upcoming24hAppointment.id)
                        }
                        disabled={
                          updatingAppointmentId === upcoming24hAppointment.id
                        }
                        style={{
                          backgroundColor: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fed7aa",
                          borderRadius: "14px",
                          padding: "11px 16px",
                          fontWeight: 900,
                          cursor:
                            updatingAppointmentId === upcoming24hAppointment.id
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "14px",
                          opacity:
                            updatingAppointmentId === upcoming24hAppointment.id
                              ? 0.7
                              : 1,
                        }}
                      >
                        {updatingAppointmentId === upcoming24hAppointment.id
                          ? "Cancelando..."
                          : "Cancelar solicitação"}
                      </button>
                    )}

                    <Link href="/minhas-consultas" style={secondaryButtonStyle}>
                      Ver minhas consultas
                    </Link>
                  </div>
                </>
              );
            })()}
          </section>
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
                {(() => {
                  const confirmationInfo = getConfirmationInfo(nextAppointment);
                  const isFuture =
                    nextAppointment.status === "SCHEDULED" &&
                    new Date(nextAppointment.dateTime) >= new Date();
                  const confirmationStatus =
                    getConfirmationStatus(nextAppointment);

                  return (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "14px",
                          alignItems: "flex-start",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
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
                            <strong>Profissional:</strong>{" "}
                            {nextAppointment.psychologist.name}
                          </p>

                          <p style={{ color: "#475569", marginBottom: "6px" }}>
                            <strong>Início:</strong>{" "}
                            {formatDate(nextAppointment.dateTime)}
                          </p>

                          {nextAppointment.endDateTime && (
                            <p
                              style={{ color: "#475569", marginBottom: "6px" }}
                            >
                              <strong>Fim:</strong>{" "}
                              {formatDate(nextAppointment.endDateTime)}
                            </p>
                          )}

                          {nextAppointment.location && (
                            <p
                              style={{ color: "#475569", marginBottom: "12px" }}
                            >
                              <strong>Local:</strong> {nextAppointment.location}
                            </p>
                          )}
                        </div>

                        <span
                          style={{
                            backgroundColor: confirmationInfo.bg,
                            color: confirmationInfo.color,
                            border: `1px solid ${confirmationInfo.border}`,
                            borderRadius: "999px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {confirmationInfo.label}
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: confirmationInfo.bg,
                          border: `1px solid ${confirmationInfo.border}`,
                          color: confirmationInfo.color,
                          borderRadius: "14px",
                          padding: "12px",
                          marginBottom: "14px",
                          fontWeight: 800,
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <i
                          className={confirmationInfo.icon}
                          style={{ marginTop: "2px" }}
                        ></i>
                        <span>{confirmationInfo.description}</span>
                      </div>

                      {nextAppointment.cancellationRequestReason &&
                        confirmationStatus === "CANCELLATION_REQUESTED" && (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #fed7aa",
                              color: "#9a3412",
                              borderRadius: "14px",
                              padding: "12px",
                              marginBottom: "14px",
                              lineHeight: 1.5,
                            }}
                          >
                            <strong>Motivo informado:</strong>{" "}
                            {nextAppointment.cancellationRequestReason}
                          </div>
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

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {isFuture &&
                          confirmationStatus !== "CONFIRMED" &&
                          confirmationStatus !== "CANCELLATION_REQUESTED" && (
                            <button
                              type="button"
                              onClick={() =>
                                confirmPresence(nextAppointment.id)
                              }
                              disabled={
                                updatingAppointmentId === nextAppointment.id
                              }
                              style={{
                                ...primaryButtonStyle,
                                background:
                                  "linear-gradient(135deg, #059669, #22c55e)",
                                boxShadow:
                                  "0 10px 24px rgba(34, 197, 94, 0.20)",
                                opacity:
                                  updatingAppointmentId === nextAppointment.id
                                    ? 0.7
                                    : 1,
                                cursor:
                                  updatingAppointmentId === nextAppointment.id
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {updatingAppointmentId === nextAppointment.id
                                ? "Confirmando..."
                                : "Confirmar presença"}
                            </button>
                          )}

                        {isFuture &&
                          confirmationStatus !== "CANCELLATION_REQUESTED" && (
                            <button
                              type="button"
                              onClick={() =>
                                openCancelRequestModal(nextAppointment)
                              }
                              style={{
                                backgroundColor: "#fff7ed",
                                color: "#c2410c",
                                border: "1px solid #fed7aa",
                                borderRadius: "14px",
                                padding: "11px 16px",
                                fontWeight: 900,
                                cursor: "pointer",
                                fontSize: "14px",
                              }}
                            >
                              Solicitar cancelamento
                            </button>
                          )}

                        {isFuture &&
                          confirmationStatus === "CANCELLATION_REQUESTED" && (
                            <button
                              type="button"
                              onClick={() =>
                                withdrawCancelRequest(nextAppointment.id)
                              }
                              disabled={
                                updatingAppointmentId === nextAppointment.id
                              }
                              style={{
                                backgroundColor: "#fff7ed",
                                color: "#c2410c",
                                border: "1px solid #fed7aa",
                                borderRadius: "14px",
                                padding: "11px 16px",
                                fontWeight: 900,
                                cursor:
                                  updatingAppointmentId === nextAppointment.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize: "14px",
                                opacity:
                                  updatingAppointmentId === nextAppointment.id
                                    ? 0.7
                                    : 1,
                              }}
                            >
                              {updatingAppointmentId === nextAppointment.id
                                ? "Cancelando..."
                                : "Cancelar solicitação"}
                            </button>
                          )}

                        <Link
                          href="/minhas-consultas"
                          style={secondaryButtonStyle}
                        >
                          Ver minhas consultas
                        </Link>
                      </div>
                    </>
                  );
                })()}
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
                <p
                  style={{
                    color: "#0f172a",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
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
              <p style={{ color: "#64748b", margin: 0 }}>
                Carregando tarefas...
              </p>
            ) : recentTasks.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "18px",
                  padding: "18px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <p
                  style={{
                    color: "#0f172a",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
                  Nenhuma tarefa registrada
                </p>
                <p style={{ color: "#64748b", margin: 0 }}>
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
                      border: "1px solid #e2e8f0",
                      borderRadius: "18px",
                      padding: "16px",
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
                            color: "#0f172a",
                            fontWeight: 900,
                            marginBottom: "4px",
                          }}
                        >
                          {task.title}
                        </p>

                        <p
                          style={{
                            color: "#64748b",
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
            <p style={{ color: "#64748b", margin: 0 }}>
              Carregando materiais...
            </p>
          ) : recentMaterials.length === 0 ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#0f172a",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                Nenhum material enviado
              </p>
              <p style={{ color: "#64748b", margin: 0 }}>
                Quando o profissional enviar materiais, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
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

                      <p
                        style={{
                          color: "#0f172a",
                          fontWeight: 900,
                          fontSize: "17px",
                          marginBottom: "6px",
                        }}
                      >
                        {material.title}
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor: material.viewedAt
                          ? "#ecfdf5"
                          : "#fef2f2",
                        color: material.viewedAt ? "#065f46" : "#b91c1c",
                        border: material.viewedAt
                          ? "1px solid #a7f3d0"
                          : "1px solid #fecaca",
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

                  <p
                    style={{
                      color: "#64748b",
                      marginBottom: "8px",
                      fontSize: "14px",
                    }}
                  >
                    Enviado por {material.psychologist.name} em{" "}
                    {formatDate(material.createdAt)}
                  </p>

                  {material.viewedAt && (
                    <p
                      style={{
                        color: "#047857",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
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

                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "16px",
            }}
          >
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

      {cancelRequestAppointment && (
        <div
          onClick={closeCancelRequestModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "620px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "30px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ marginBottom: "22px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#fff7ed",
                  color: "#c2410c",
                  border: "1px solid #fed7aa",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "12px",
                }}
              >
                <i className="fa-solid fa-calendar-xmark"></i>
                Solicitação de cancelamento
              </span>

              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Solicitar cancelamento da consulta
              </h2>

              <p style={{ color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                Informe o motivo da solicitação. O profissional poderá analisar
                e aprovar ou rejeitar o cancelamento posteriormente.
              </p>
            </div>

            <form onSubmit={submitCancelRequest}>
              {cancelRequestError && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    marginBottom: "16px",
                    fontWeight: 800,
                  }}
                >
                  {cancelRequestError}
                </div>
              )}

              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#0f172a",
                    fontWeight: 900,
                    marginBottom: "8px",
                  }}
                >
                  Motivo da solicitação
                </label>

                <textarea
                  value={cancelRequestReason}
                  onChange={(e) => setCancelRequestReason(e.target.value)}
                  placeholder="Explique brevemente por que deseja solicitar o cancelamento."
                  rows={5}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={closeCancelRequestModal}
                  disabled={savingCancelRequest}
                  style={secondaryButtonStyle}
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={savingCancelRequest}
                  style={{
                    ...primaryButtonStyle,
                    background: "linear-gradient(135deg, #ea580c, #fb923c)",
                    boxShadow: "0 10px 24px rgba(234, 88, 12, 0.20)",
                    opacity: savingCancelRequest ? 0.7 : 1,
                    cursor: savingCancelRequest ? "not-allowed" : "pointer",
                  }}
                >
                  {savingCancelRequest ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
