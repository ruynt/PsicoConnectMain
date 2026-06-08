"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/errorUtils";

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
  createdAt: string;
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
  preSessionCheckin: PreSessionCheckin | null;
};

type AppointmentTab = "UPCOMING" | "CANCELLED" | "HISTORY";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "red";
};

const NAVY = "#001e5e";
const NAVY_SOFT = "#102a56";
const BLUE = "#2563eb";
const MUTED = "#5272a6";
const BORDER = "#e6edf7";

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
  red: {
    bg: "#fef2f2",
    text: "#b91c1c",
    border: "#fecaca",
  },
};

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentTab>("UPCOMING");

  const [checkinAppointment, setCheckinAppointment] =
    useState<PatientAppointment | null>(null);
  const [cancelRequestAppointment, setCancelRequestAppointment] =
    useState<PatientAppointment | null>(null);

  const [updatingConfirmationId, setUpdatingConfirmationId] = useState("");
  const [savingCancelRequest, setSavingCancelRequest] = useState(false);
  const [cancelRequestReason, setCancelRequestReason] = useState("");
  const [cancelRequestError, setCancelRequestError] = useState("");

  const [moodLevel, setMoodLevel] = useState("");
  const [anxietyLevel, setAnxietyLevel] = useState("");
  const [sleepLevel, setSleepLevel] = useState("");
  const [mainConcern, setMainConcern] = useState("");
  const [importantEvents, setImportantEvents] = useState("");
  const [topicsToDiscuss, setTopicsToDiscuss] = useState("");

  const [checkinError, setCheckinError] = useState("");
  const [savingCheckin, setSavingCheckin] = useState(false);

  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/patient/appointments", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar consultas.");
      }

      setAppointments(data.appointments || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Erro ao carregar consultas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
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
    return appointments
      .filter((appointment) => appointment.status === "CANCELLED")
      .sort(
        (a, b) =>
          new Date(b.cancelledAt || b.dateTime).getTime() -
          new Date(a.cancelledAt || a.dateTime).getTime(),
      );
  }, [appointments]);

  const historyAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.status === "CANCELLED" ||
          new Date(appointment.dateTime) < now,
      )
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
      );
  }, [appointments]);

  const answeredCheckinsCount = useMemo(() => {
    return appointments.filter((appointment) => appointment.preSessionCheckin)
      .length;
  }, [appointments]);

  const pendingCheckinsCount = useMemo(() => {
    return upcomingAppointments.filter(
      (appointment) => !appointment.preSessionCheckin,
    ).length;
  }, [upcomingAppointments]);

  const appointmentsByTab = {
    UPCOMING: upcomingAppointments,
    CANCELLED: cancelledAppointments,
    HISTORY: historyAppointments,
  };

  const tabInfo = {
    UPCOMING: {
      label: "Próximas",
      title: "Próximas consultas",
      description: "Atendimentos futuros agendados pelo profissional.",
      emptyTitle: "Nenhuma consulta futura",
      emptyDescription:
        "Quando seu psicólogo agendar uma nova consulta, ela aparecerá aqui.",
      icon: "fa-solid fa-calendar-check",
    },
    CANCELLED: {
      label: "Canceladas",
      title: "Consultas canceladas",
      description: "Registros de atendimentos cancelados e seus motivos.",
      emptyTitle: "Nenhuma consulta cancelada",
      emptyDescription:
        "As consultas canceladas aparecerão aqui para acompanhamento.",
      icon: "fa-solid fa-calendar-xmark",
    },
    HISTORY: {
      label: "Histórico",
      title: "Histórico de consultas",
      description: "Consultas anteriores e cancelamentos reunidos em um só lugar.",
      emptyTitle: "Nenhum histórico disponível",
      emptyDescription:
        "Consultas anteriores e canceladas aparecerão neste espaço.",
      icon: "fa-solid fa-clock-rotate-left",
    },
  };

  const currentAppointments = appointmentsByTab[activeTab];
  const currentTabInfo = tabInfo[activeTab];

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
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

  function isFutureAppointment(appointment: PatientAppointment) {
    return (
      appointment.status === "SCHEDULED" &&
      new Date(appointment.dateTime) >= new Date()
    );
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
        bg: "#f8fbff",
        color: NAVY,
        border: "#dbe7ff",
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
        bg: "#f8fbff",
        color: NAVY,
        border: "#dbe7ff",
        icon: "fa-solid fa-hourglass-half",
      };
    }

    return {
      label: "Aguardando confirmação",
      description: "Confirme sua presença ou solicite cancelamento, se necessário.",
      bg: "#f8fbff",
      color: NAVY,
      border: "#dbe7ff",
      icon: "fa-solid fa-calendar-check",
    };
  }

  async function handleConfirmPresence(appointmentId: string) {
    try {
      setUpdatingConfirmationId(appointmentId);

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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao confirmar presença."));
    } finally {
      setUpdatingConfirmationId("");
    }
  }

  async function handleSubmitCancelRequest(e: FormEvent) {
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
      showFeedback("success", "Solicitação de cancelamento enviada ao profissional.");
    } catch (error: unknown) {
      setCancelRequestError(getErrorMessage(error, "Erro ao solicitar cancelamento."));
    } finally {
      setSavingCancelRequest(false);
    }
  }

  async function handleWithdrawCancelRequest(appointmentId: string) {
    try {
      setUpdatingConfirmationId(appointmentId);

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
      showFeedback("success", "Solicitação de cancelamento retirada com sucesso.");
    } catch (error: unknown) {
      showFeedback(
        "error",
        getErrorMessage(error, "Erro ao cancelar solicitação de cancelamento."),
      );
    } finally {
      setUpdatingConfirmationId("");
    }
  }

  function resetCheckinForm() {
    setMoodLevel("");
    setAnxietyLevel("");
    setSleepLevel("");
    setMainConcern("");
    setImportantEvents("");
    setTopicsToDiscuss("");
    setCheckinError("");
  }

  function closeCheckinModal() {
    setCheckinAppointment(null);
    resetCheckinForm();
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

  function openCheckinModal(appointment: PatientAppointment) {
    setCheckinAppointment(appointment);
    setCheckinError("");

    if (appointment.preSessionCheckin) {
      setMoodLevel(
        appointment.preSessionCheckin.moodLevel !== null
          ? String(appointment.preSessionCheckin.moodLevel)
          : "",
      );
      setAnxietyLevel(
        appointment.preSessionCheckin.anxietyLevel !== null
          ? String(appointment.preSessionCheckin.anxietyLevel)
          : "",
      );
      setSleepLevel(
        appointment.preSessionCheckin.sleepLevel !== null
          ? String(appointment.preSessionCheckin.sleepLevel)
          : "",
      );
      setMainConcern(appointment.preSessionCheckin.mainConcern || "");
      setImportantEvents(appointment.preSessionCheckin.importantEvents || "");
      setTopicsToDiscuss(appointment.preSessionCheckin.topicsToDiscuss || "");
    } else {
      resetCheckinForm();
    }
  }

  function validateScaleValue(value: string, label: string) {
    if (!value) return null;

    const numberValue = Number(value);

    if (Number.isNaN(numberValue) || numberValue < 0 || numberValue > 10) {
      return `${label} deve ser um número de 0 a 10.`;
    }

    return null;
  }

  async function handleSubmitCheckin(e: FormEvent) {
    e.preventDefault();

    if (!checkinAppointment) return;

    setCheckinError("");

    const moodError = validateScaleValue(moodLevel, "Humor");
    const anxietyError = validateScaleValue(anxietyLevel, "Ansiedade");
    const sleepError = validateScaleValue(sleepLevel, "Sono");

    if (moodError || anxietyError || sleepError) {
      setCheckinError(moodError || anxietyError || sleepError || "");
      return;
    }

    try {
      setSavingCheckin(true);

      const response = await fetch("/api/patient/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: checkinAppointment.id,
          moodLevel: moodLevel === "" ? null : Number(moodLevel),
          anxietyLevel: anxietyLevel === "" ? null : Number(anxietyLevel),
          sleepLevel: sleepLevel === "" ? null : Number(sleepLevel),
          mainConcern,
          importantEvents,
          topicsToDiscuss,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao salvar checklist.");
      }

      await loadAppointments();
      closeCheckinModal();

      showFeedback("success", "Checklist pré-sessão salvo com sucesso.");
    } catch (error: unknown) {
      setCheckinError(getErrorMessage(error, "Erro ao salvar checklist."));
    } finally {
      setSavingCheckin(false);
    }
  }

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    paddingBottom: "150px",
    background: "#ffffff",
    borderRadius: 0,
    overflow: "visible",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 10px 28px rgba(0, 30, 94, 0.06)",
    border: `1px solid ${BORDER}`,
  };

  const primaryButtonStyle = {
    background: NAVY,
    color: "#fff",
    border: `1px solid ${NAVY}`,
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(0, 30, 94, 0.20)",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  const warningButtonStyle = {
    backgroundColor: "#ffffff",
    color: "#92400e",
    border: "1px solid #fcd34d",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const inputStyle = {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "13px 14px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
    color: NAVY,
  } as const;

  function MetricCard({ label, value, description, icon, tone }: MetricCardProps) {
    const selectedTone = tones[tone];

    return (
      <div className="appointments-metric-card" style={cardStyle}>
        <div
          className="appointments-metric-bg"
          style={{ backgroundColor: selectedTone.bg }}
        />

        <div className="appointments-metric-content">
          <div>
            <p className="appointments-metric-label">{label}</p>
            <p
              className="appointments-metric-value"
              style={{ color: selectedTone.text }}
            >
              {value}
            </p>
          </div>

          <div
            className="appointments-metric-icon"
            style={{
              backgroundColor: selectedTone.bg,
              border: `1px solid ${selectedTone.border}`,
              color: selectedTone.text,
            }}
          >
            <i className={icon}></i>
          </div>
        </div>

        <p className="appointments-metric-description">{description}</p>
      </div>
    );
  }

  function renderAppointmentActions(appointment: PatientAppointment) {
    const future = isFutureAppointment(appointment);
    const confirmationStatus = getConfirmationStatus(appointment);

    if (!future) return null;

    return (
      <div className="appointments-actions">
        <button
          type="button"
          onClick={() => openCheckinModal(appointment)}
          style={primaryButtonStyle}
        >
          {appointment.preSessionCheckin
            ? "Editar checklist"
            : "Responder checklist"}
        </button>

        {confirmationStatus !== "CONFIRMED" &&
          confirmationStatus !== "CANCELLATION_REQUESTED" && (
            <button
              type="button"
              onClick={() => handleConfirmPresence(appointment.id)}
              disabled={updatingConfirmationId === appointment.id}
              style={{
                ...primaryButtonStyle,
                opacity: updatingConfirmationId === appointment.id ? 0.7 : 1,
                cursor:
                  updatingConfirmationId === appointment.id
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {updatingConfirmationId === appointment.id
                ? "Confirmando..."
                : "Confirmar presença"}
            </button>
          )}

        {confirmationStatus !== "CANCELLATION_REQUESTED" && (
          <button
            type="button"
            onClick={() => openCancelRequestModal(appointment)}
            style={warningButtonStyle}
          >
            Solicitar cancelamento
          </button>
        )}

        {confirmationStatus === "CANCELLATION_REQUESTED" && (
          <button
            type="button"
            onClick={() => handleWithdrawCancelRequest(appointment.id)}
            disabled={updatingConfirmationId === appointment.id}
            style={{
              ...warningButtonStyle,
              opacity: updatingConfirmationId === appointment.id ? 0.7 : 1,
              cursor:
                updatingConfirmationId === appointment.id
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {updatingConfirmationId === appointment.id
              ? "Cancelando..."
              : "Cancelar solicitação"}
          </button>
        )}

        {appointment.googleEventLink && appointment.status !== "CANCELLED" && (
          <a
            href={appointment.googleEventLink}
            target="_blank"
            rel="noreferrer"
            style={secondaryButtonStyle}
          >
            Abrir no Google Calendar
          </a>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="psico-simple-loader" aria-label="Carregando">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={pageStyle}>
        <section className="appointments-hero">
          <div className="appointments-hero-orb appointments-hero-orb-one" />
          <div className="appointments-hero-orb appointments-hero-orb-two" />

          <div className="appointments-hero-content">
            <span className="appointments-hero-pill">
              <i className="fa-solid fa-calendar-days"></i>
              Área do paciente
            </span>

            <h1>
              <span className="appointments-hero-title-word">Minhas Consultas</span>
            </h1>

            <p>
              Acompanhe seus atendimentos, consulte cancelamentos, visualize o
              histórico e responda checklists pré-sessão.
            </p>
          </div>
        </section>

        {feedback && (
          <div
            className={`appointments-feedback appointments-feedback-${feedback.type}`}
          >
            {feedback.message}
          </div>
        )}

        {error && (
          <div className="appointments-error-box">
            <p>{error}</p>
          </div>
        )}

        <div className="appointments-metrics-grid">
          <MetricCard
            label="Próximas consultas"
            value={upcomingAppointments.length}
            description="Atendimentos futuros agendados."
            icon="fa-solid fa-calendar-check"
            tone="blue"
          />

          <MetricCard
            label="Checklists pendentes"
            value={pendingCheckinsCount}
            description="Formulários pré-sessão ainda não respondidos."
            icon="fa-solid fa-clipboard-question"
            tone="amber"
          />

          <MetricCard
            label="Checklists respondidos"
            value={answeredCheckinsCount}
            description="Respostas enviadas ao profissional."
            icon="fa-solid fa-clipboard-check"
            tone="green"
          />

          <MetricCard
            label="Canceladas"
            value={cancelledAppointments.length}
            description="Consultas canceladas no histórico."
            icon="fa-solid fa-calendar-xmark"
            tone="red"
          />
        </div>

        <section className="appointments-section" style={cardStyle}>
          <div className="appointments-section-header">
            <div>
              <h2>{currentTabInfo.title}</h2>
              <p>{currentTabInfo.description}</p>
            </div>

            <div className="appointments-section-icon">
              <i className={currentTabInfo.icon}></i>
            </div>
          </div>

          <div className="appointments-tabs">
            {[
              {
                label: "Próximas",
                value: "UPCOMING",
                count: upcomingAppointments.length,
              },
              {
                label: "Canceladas",
                value: "CANCELLED",
                count: cancelledAppointments.length,
              },
              {
                label: "Histórico",
                value: "HISTORY",
                count: historyAppointments.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value as AppointmentTab)}
                  className={isActive ? "is-active" : ""}
                >
                  {tab.label}
                  <span>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {currentAppointments.length === 0 ? (
            <div className="appointments-empty-box">
              <p>{currentTabInfo.emptyTitle}</p>
              <span>{currentTabInfo.emptyDescription}</span>
            </div>
          ) : (
            <div className="appointments-list">
              {currentAppointments.map((appointment) => {
                const confirmationInfo = getConfirmationInfo(appointment);
                const isFuture = isFutureAppointment(appointment);

                return (
                  <article key={appointment.id} className="appointment-card">
                    <div className="appointment-card-header">
                      <div>
                        <h3>{appointment.title}</h3>
                        <p>Profissional: {appointment.psychologist.name}</p>
                      </div>

                      <span
                        className={`appointment-status-pill ${
                          appointment.status === "CANCELLED"
                            ? "is-cancelled"
                            : appointment.preSessionCheckin
                              ? "is-done"
                              : "is-pending"
                        }`}
                      >
                        {appointment.status === "CANCELLED"
                          ? "Cancelada"
                          : appointment.preSessionCheckin
                            ? "Checklist respondido"
                            : "Agendada"}
                      </span>
                    </div>

                    <div className="appointment-info-grid">
                      <p>
                        <strong>Início:</strong> {formatDate(appointment.dateTime)}
                      </p>

                      {appointment.endDateTime && (
                        <p>
                          <strong>Fim:</strong>{" "}
                          {formatDate(appointment.endDateTime)}
                        </p>
                      )}

                      {appointment.location && (
                        <p>
                          <strong>Local:</strong> {appointment.location}
                        </p>
                      )}

                      {appointment.status === "CANCELLED" &&
                        appointment.cancelledAt && (
                          <p>
                            <strong>Cancelada em:</strong>{" "}
                            {formatDate(appointment.cancelledAt)}
                          </p>
                        )}
                    </div>

                    {isFuture && (
                      <div className="appointment-confirmation-box">
                        <p>
                          <i className={confirmationInfo.icon}></i>
                          <strong>{confirmationInfo.label}</strong>
                        </p>

                        <span>{confirmationInfo.description}</span>

                        {appointment.cancellationRequestReason && (
                          <span>
                            <strong>Motivo informado:</strong>{" "}
                            {appointment.cancellationRequestReason}
                          </span>
                        )}
                      </div>
                    )}

                    {appointment.description && (
                      <p className="appointment-description">
                        <strong>Descrição:</strong> {appointment.description}
                      </p>
                    )}

                    {appointment.status === "CANCELLED" &&
                      appointment.cancellationReason && (
                        <div className="appointment-cancel-reason">
                          <strong>Motivo do cancelamento:</strong>{" "}
                          {appointment.cancellationReason}
                        </div>
                      )}

                    {appointment.preSessionCheckin && (
                      <div className="appointment-checkin-box">
                        <p>Checklist pré-sessão respondido</p>
                        <span>
                          Última atualização em{" "}
                          {formatDate(appointment.preSessionCheckin.updatedAt)}
                        </span>
                      </div>
                    )}

                    {renderAppointmentActions(appointment)}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .fa-clipboard-question::before {
          content: "\\f46d";
        }

        .appointments-hero {
          background: linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa);
          border-radius: 28px;
          padding: 30px;
          color: #ffffff;
          margin-bottom: 24px;
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.18);
          position: relative;
          overflow: hidden;
        }

        .appointments-hero-orb {
          position: absolute;
          border-radius: 999px;
          background-color: rgba(255, 255, 255, 0.13);
        }

        .appointments-hero-orb-one {
          right: -80px;
          top: -90px;
          width: 240px;
          height: 240px;
        }

        .appointments-hero-orb-two {
          right: 90px;
          bottom: -110px;
          width: 220px;
          height: 220px;
        }

        .appointments-hero-content {
          position: relative;
          z-index: 1;
        }

        .appointments-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 14px;
          color: #ffffff;
        }

        .appointments-hero h1 {
          font-size: 44px;
          font-weight: 900;
          line-height: 1.05;
          margin-bottom: 10px;
          color: #ffffff !important;
        }

        .appointments-hero-title-word {
          color: #ffffff !important;
        }

        .appointments-hero p {
          font-size: 18px;
          color: #ffffff;
          max-width: 760px;
          margin: 0;
          line-height: 1.5;
        }

        .appointments-feedback {
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .appointments-feedback-success {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .appointments-feedback-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .appointments-feedback-info {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }

        .appointments-error-box {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 22px;
          padding: 18px;
          margin-bottom: 24px;
        }

        .appointments-error-box p {
          color: #b91c1c;
          font-weight: 800;
          margin: 0;
        }

        .appointments-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .appointments-metric-card {
          min-height: 132px;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .appointments-metric-bg {
          position: absolute;
          right: -24px;
          top: -24px;
          width: 94px;
          height: 94px;
          border-radius: 999px;
        }

        .appointments-metric-content {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }

        .appointments-metric-label {
          color: #64748b !important;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .appointments-metric-value {
          font-size: 36px;
          font-weight: 900;
          line-height: 1;
          margin: 0;
        }

        .appointments-metric-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .appointments-metric-description {
          color: #64748b;
          font-size: 13px;
          margin-top: 12px;
          margin-bottom: 0;
          position: relative;
          z-index: 1;
        }

        .appointments-section-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .appointments-section-header h2 {
          font-size: 28px;
          font-weight: 900;
          color: ${NAVY};
          margin-bottom: 6px;
        }

        .appointments-section-header p {
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .appointments-section-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .appointments-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .appointments-tabs button {
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 900;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .appointments-tabs button:hover,
        .appointments-actions button:hover:not(:disabled),
        .appointments-actions a:hover {
          transform: translateY(-1px);
        }

        .appointments-tabs button.is-active {
          border-color: #2563eb;
          background-color: #eff6ff;
          color: #1d4ed8;
        }

        .appointments-tabs button span {
          background-color: #f1f5f9;
          color: #64748b;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 12px;
        }

        .appointments-tabs button.is-active span {
          background-color: #dbeafe;
          color: #1d4ed8;
        }

        .appointments-empty-box {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 18px;
          background-color: #f8fafc;
        }

        .appointments-empty-box p {
          color: ${NAVY};
          font-weight: 900;
          margin-bottom: 6px;
        }

        .appointments-empty-box span {
          color: #64748b;
        }

        .appointments-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .appointment-card {
          border: 1px solid ${BORDER};
          border-radius: 18px;
          padding: 18px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(0, 30, 94, 0.05);
        }

        .appointment-card-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .appointment-card-header h3 {
          color: ${NAVY};
          font-weight: 900;
          font-size: 19px;
          margin-bottom: 6px;
          line-height: 1.25;
        }

        .appointment-card-header p {
          color: #64748b;
          margin: 0;
        }

        .appointment-status-pill {
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 900;
          white-space: normal;
          overflow-wrap: anywhere;
          text-align: center;
          max-width: 180px;
          line-height: 1.2;
        }

        .appointment-status-pill.is-cancelled {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .appointment-status-pill.is-done {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .appointment-status-pill.is-pending {
          background-color: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .appointment-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 18px;
          margin-bottom: 10px;
        }

        .appointment-info-grid p,
        .appointment-description {
          color: #475569;
          margin: 0;
          line-height: 1.5;
        }

        .appointment-description {
          margin-bottom: 8px;
        }

        .appointment-confirmation-box,
        .appointment-checkin-box,
        .appointment-cancel-reason {
          border-radius: 14px;
          padding: 12px;
          margin-top: 12px;
          margin-bottom: 12px;
          line-height: 1.45;
        }

        .appointment-confirmation-box {
          background-color: #f8fbff;
          border: 1px solid #dbe7ff;
          color: ${NAVY};
        }

        .appointment-confirmation-box p {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .appointment-confirmation-box span {
          display: block;
          color: ${NAVY_SOFT};
          font-size: 14px;
          line-height: 1.5;
        }

        .appointment-checkin-box {
          background-color: #f8fbff;
          border: 1px solid #dbe7ff;
        }

        .appointment-checkin-box p {
          color: ${NAVY};
          font-weight: 900;
          margin-bottom: 6px;
        }

        .appointment-checkin-box span {
          color: ${MUTED};
          font-size: 14px;
        }

        .appointment-cancel-reason {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .appointments-actions {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .appointments-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1000;
          backdrop-filter: blur(6px);
        }

        .appointments-modal-card {
          width: 100%;
          background-color: #ffffff;
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
          border: 1px solid #e2e8f0;
        }

        .appointments-modal-card.is-cancel {
          max-width: 620px;
        }

        .appointments-modal-card.is-checkin {
          max-width: 760px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .appointments-modal-header {
          margin-bottom: 22px;
        }

        .appointments-modal-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .appointments-modal-pill.is-cancel {
          background-color: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }

        .appointments-modal-pill.is-checkin {
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .appointments-modal-header h2 {
          font-size: 30px;
          font-weight: 900;
          color: ${NAVY};
          margin-bottom: 8px;
        }

        .appointments-modal-header p {
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .appointments-modal-summary {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 18px;
        }

        .appointments-modal-summary p:first-child {
          color: #1d4ed8;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .appointments-modal-summary p:last-child {
          color: #1e40af;
          margin: 0;
        }

        .appointments-modal-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-weight: 800;
        }

        .appointments-form-group {
          margin-bottom: 18px;
        }

        .appointments-form-group label {
          display: block;
          font-weight: 800;
          color: ${NAVY};
          margin-bottom: 8px;
        }

        .appointments-checkin-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .appointments-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 1180px) {
          .appointments-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .appointments-hero {
            padding: 24px;
            border-radius: 24px;
          }

          .appointments-hero h1 {
            font-size: 34px;
          }

          .appointments-section {
            padding: 20px !important;
          }

          .appointment-info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .appointments-hero {
            padding: 18px;
            border-radius: 22px;
            margin-bottom: 16px;
          }

          .appointments-hero h1 {
            font-size: 26px;
            line-height: 1.08;
            margin-bottom: 0;
            color: #ffffff !important;
          }

          .appointments-hero-title-word {
            display: block;
            color: #ffffff !important;
          }

          .appointments-hero p {
            display: none;
          }

          .appointments-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }

          .appointments-metric-card {
            min-height: 104px;
            padding: 12px !important;
            border-radius: 16px !important;
          }

          .appointments-metric-bg {
            width: 58px;
            height: 58px;
            right: -22px;
            top: -22px;
          }

          .appointments-metric-content {
            gap: 8px;
          }

          .appointments-metric-label {
            font-size: 11px;
            line-height: 1.12;
            margin-bottom: 6px;
          }

          .appointments-metric-value {
            font-size: 26px;
          }

          .appointments-metric-icon {
            width: 30px;
            height: 30px;
            border-radius: 10px;
            font-size: 14px;
          }

          .appointments-metric-description {
            display: none;
          }

          .appointments-section {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .appointments-section-header {
            gap: 10px;
            margin-bottom: 14px;
          }

          .appointments-section-header h2 {
            font-size: 22px;
          }

          .appointments-section-header p {
            font-size: 13px;
          }

          .appointments-section-icon {
            width: 40px;
            height: 40px;
            border-radius: 14px;
            font-size: 18px;
          }

          .appointments-tabs {
            gap: 8px;
          }

          .appointments-tabs button {
            padding: 8px 11px;
            font-size: 12px;
          }

          .appointment-card {
            padding: 14px;
            border-radius: 16px;
          }

          .appointment-card-header {
            flex-direction: column;
            gap: 10px;
          }

          .appointment-card-header h3 {
            font-size: 17px;
          }

          .appointment-status-pill {
            width: fit-content;
            max-width: 100%;
            padding: 6px 10px;
            font-size: 11px;
            text-align: left;
          }

          .appointment-confirmation-box,
          .appointment-checkin-box,
          .appointment-cancel-reason {
            padding: 10px;
            border-radius: 12px;
            font-size: 12px;
            margin-top: 10px;
            margin-bottom: 10px;
          }

          .appointment-confirmation-box span,
          .appointment-checkin-box span {
            font-size: 12px;
            line-height: 1.35;
          }

          .appointments-actions {
            gap: 8px;
          }

          .appointments-actions button,
          .appointments-actions a {
            width: 100%;
            justify-content: center;
            padding: 10px 12px !important;
            font-size: 13px !important;
            box-shadow: none !important;
          }

          .appointments-modal-overlay {
            padding: 16px;
            align-items: flex-start;
          }

          .appointments-modal-card {
            max-height: 88dvh;
            overflow-y: auto;
            padding: 20px;
            border-radius: 20px;
          }

          .appointments-modal-header h2 {
            font-size: 24px;
          }

          .appointments-checkin-grid {
            grid-template-columns: 1fr;
          }

          .appointments-modal-actions button {
            flex: 1 1 auto;
          }
        }

        @media (max-width: 420px) {
          .appointments-metrics-grid {
            gap: 8px;
          }

          .appointments-metric-card {
            min-height: 98px;
            padding: 10px !important;
          }

          .appointments-hero h1 {
            font-size: 24px;
            color: #ffffff !important;
          }

          .appointments-tabs button {
            flex: 1 1 auto;
            justify-content: center;
          }
        }
      `}</style>

      {cancelRequestAppointment && (
        <div
          className="appointments-modal-overlay"
          onClick={closeCancelRequestModal}
        >
          <div
            className="appointments-modal-card is-cancel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="appointments-modal-header">
              <span className="appointments-modal-pill is-cancel">
                <i className="fa-solid fa-calendar-xmark"></i>
                Solicitação de cancelamento
              </span>

              <h2>Solicitar cancelamento da consulta</h2>

              <p>
                Sua solicitação será enviada ao profissional, que poderá aprovar
                ou rejeitar o cancelamento. A consulta continua agendada até a
                análise.
              </p>
            </div>

            <div className="appointments-modal-summary">
              <p>{cancelRequestAppointment.title}</p>

              <p>
                {formatDate(cancelRequestAppointment.dateTime)} · Profissional:{" "}
                {cancelRequestAppointment.psychologist.name}
              </p>
            </div>

            {cancelRequestError && (
              <div className="appointments-modal-error">{cancelRequestError}</div>
            )}

            <form noValidate onSubmit={handleSubmitCancelRequest}>
              <div className="appointments-form-group">
                <label>Motivo da solicitação</label>

                <textarea
                  value={cancelRequestReason}
                  onChange={(e) => setCancelRequestReason(e.target.value)}
                  rows={5}
                  placeholder="Explique brevemente o motivo do cancelamento..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="appointments-modal-actions">
                <button
                  type="button"
                  onClick={closeCancelRequestModal}
                  style={secondaryButtonStyle}
                  disabled={savingCancelRequest}
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  style={{
                    ...warningButtonStyle,
                    backgroundColor: "#ea580c",
                    color: "#ffffff",
                    border: "1px solid #ea580c",
                    opacity: savingCancelRequest ? 0.7 : 1,
                    cursor: savingCancelRequest ? "not-allowed" : "pointer",
                  }}
                  disabled={savingCancelRequest}
                >
                  {savingCancelRequest
                    ? "Enviando..."
                    : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {checkinAppointment && (
        <div className="appointments-modal-overlay" onClick={closeCheckinModal}>
          <div
            className="appointments-modal-card is-checkin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="appointments-modal-header">
              <span className="appointments-modal-pill is-checkin">
                <i className="fa-solid fa-clipboard-check"></i>
                Preparação para sessão
              </span>

              <h2>Checklist pré-sessão</h2>

              <p>
                Responda algumas perguntas rápidas para ajudar o profissional a
                se preparar melhor para o atendimento.
              </p>
            </div>

            <div className="appointments-modal-summary">
              <p>{checkinAppointment.title}</p>

              <p>
                {formatDate(checkinAppointment.dateTime)} · Profissional:{" "}
                {checkinAppointment.psychologist.name}
              </p>
            </div>

            {checkinError && (
              <div className="appointments-modal-error">{checkinError}</div>
            )}

            <form noValidate onSubmit={handleSubmitCheckin}>
              <div className="appointments-checkin-grid">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: NAVY,
                      marginBottom: "8px",
                    }}
                  >
                    Humor hoje (0 a 10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={moodLevel}
                    onChange={(e) => setMoodLevel(e.target.value)}
                    placeholder="Ex.: 7"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: NAVY,
                      marginBottom: "8px",
                    }}
                  >
                    Ansiedade (0 a 10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={anxietyLevel}
                    onChange={(e) => setAnxietyLevel(e.target.value)}
                    placeholder="Ex.: 5"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: NAVY,
                      marginBottom: "8px",
                    }}
                  >
                    Sono (0 a 10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={sleepLevel}
                    onChange={(e) => setSleepLevel(e.target.value)}
                    placeholder="Ex.: 6"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="appointments-form-group">
                <label>Qual sua principal preocupação no momento?</label>

                <textarea
                  value={mainConcern}
                  onChange={(e) => setMainConcern(e.target.value)}
                  rows={3}
                  placeholder="Escreva brevemente o que mais tem preocupado você..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="appointments-form-group">
                <label>Aconteceu algo importante desde a última sessão?</label>

                <textarea
                  value={importantEvents}
                  onChange={(e) => setImportantEvents(e.target.value)}
                  rows={3}
                  placeholder="Ex.: acontecimentos, mudanças, dificuldades ou avanços recentes..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="appointments-form-group">
                <label>Existe algum tema que você gostaria de falar na consulta?</label>

                <textarea
                  value={topicsToDiscuss}
                  onChange={(e) => setTopicsToDiscuss(e.target.value)}
                  rows={3}
                  placeholder="Ex.: assuntos que você gostaria de priorizar no atendimento..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="appointments-modal-actions">
                <button
                  type="button"
                  onClick={closeCheckinModal}
                  style={secondaryButtonStyle}
                  disabled={savingCheckin}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    ...primaryButtonStyle,
                    opacity: savingCheckin ? 0.7 : 1,
                    cursor: savingCheckin ? "not-allowed" : "pointer",
                  }}
                  disabled={savingCheckin}
                >
                  {savingCheckin ? "Salvando..." : "Salvar checklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
