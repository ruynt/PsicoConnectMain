"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CalendarEvent = {
  id: string;
  appointmentId?: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  location: string;
  htmlLink: string;
  status?: string;
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  googleEventId?: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  confirmationStatus?: "PENDING" | "CONFIRMED" | "CANCELLATION_REQUESTED";
  confirmedAt?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationRequestReason?: string | null;
  cancellationRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  lastReminderSentAt?: string | null;
  reminderEmailSentAt?: string | null;
};

type PatientOption = {
  id: string;
  name: string;
  email: string;
};

type AppointmentStatusFilter = "SCHEDULED" | "CANCELLED" | "ALL";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function AgendaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");

  const googleConnected = Boolean((session?.user as any)?.googleAccessToken);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [appointmentStatusFilter, setAppointmentStatusFilter] =
    useState<AppointmentStatusFilter>("SCHEDULED");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentStartTime, setAppointmentStartTime] = useState("");
  const [appointmentEndTime, setAppointmentEndTime] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");

  const [savingAppointment, setSavingAppointment] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState("");
  const [reviewingCancellationId, setReviewingCancellationId] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [formError, setFormError] = useState("");

  const [handledPatientFromUrl, setHandledPatientFromUrl] = useState(false);

  const [appointmentToCancel, setAppointmentToCancel] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [cancellationReason, setCancellationReason] = useState("");

  async function loadEvents() {
    if (!googleConnected) {
      setEvents([]);
      return;
    }

    try {
      setLoadingEvents(true);
      setEventsError("");

      const response = await fetch(
        `/api/appointments?status=${appointmentStatusFilter}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar consultas.");
      }

      setEvents(data.events || []);
    } catch (error: any) {
      setEventsError(error.message || "Erro ao carregar consultas.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadPatients() {
    try {
      setLoadingPatients(true);

      const response = await fetch("/api/patients", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar pacientes.");
      }

      setPatients(data.patients || []);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setLoadingPatients(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [googleConnected, appointmentStatusFilter]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (!patientIdFromUrl || handledPatientFromUrl || patients.length === 0) {
      return;
    }

    const patientExists = patients.some(
      (patient) => patient.id === patientIdFromUrl,
    );

    if (!patientExists) {
      showFeedback(
        "error",
        "Paciente não encontrado na sua lista de vínculos.",
      );
      setHandledPatientFromUrl(true);
      return;
    }

    setSelectedPatientId(patientIdFromUrl);
    setIsModalOpen(true);
    setHandledPatientFromUrl(true);
  }, [patientIdFromUrl, handledPatientFromUrl, patients]);

  const nextEvent = useMemo(() => {
    const scheduledEvents = events.filter(
      (event) => event.status !== "CANCELLED",
    );

    return scheduledEvents.length > 0 ? scheduledEvents[0] : null;
  }, [events]);

  const statusInfo = {
    SCHEDULED: {
      label: "Agendadas",
      cardTitle: "Consultas agendadas",
      sectionTitle: "Próximos horários",
      emptyTitle: "Nenhuma consulta agendada",
      emptyDescription:
        "Quando houver consultas futuras cadastradas, elas aparecerão aqui.",
    },
    CANCELLED: {
      label: "Canceladas",
      cardTitle: "Consultas canceladas",
      sectionTitle: "Consultas canceladas",
      emptyTitle: "Nenhuma consulta cancelada",
      emptyDescription:
        "As consultas canceladas aparecerão aqui para acompanhamento do histórico.",
    },
    ALL: {
      label: "Todas",
      cardTitle: "Consultas encontradas",
      sectionTitle: "Histórico de consultas",
      emptyTitle: "Nenhuma consulta encontrada",
      emptyDescription:
        "Quando houver consultas cadastradas no sistema, elas aparecerão aqui.",
    },
  };

  const currentStatusInfo = statusInfo[appointmentStatusFilter];

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function getConfirmationLabel(event: CalendarEvent) {
    if (event.status === "CANCELLED") {
      return "Consulta cancelada";
    }

    if (
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    ) {
      return "Cancelamento solicitado";
    }

    if (event.confirmationStatus === "CONFIRMED") {
      return "Presença confirmada";
    }

    if (event.cancellationRequestStatus === "REJECTED") {
      return "Solicitação rejeitada";
    }

    return "Aguardando confirmação";
  }

  function getConfirmationStyle(event: CalendarEvent) {
    if (event.status === "CANCELLED") {
      return {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    if (
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    ) {
      return {
        backgroundColor: "#fffbeb",
        color: "#92400e",
        border: "1px solid #fde68a",
      };
    }

    if (event.confirmationStatus === "CONFIRMED") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (event.cancellationRequestStatus === "REJECTED") {
      return {
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      backgroundColor: "#f8fafc",
      color: "#475569",
      border: "1px solid #e2e8f0",
    };
  }

  function isCancellationRequestPending(event: CalendarEvent) {
    return (
      event.status !== "CANCELLED" &&
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    );
  }

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function resetForm() {
    setAppointmentTitle("");
    setAppointmentDate("");
    setAppointmentStartTime("");
    setAppointmentEndTime("");
    setAppointmentLocation("");
    setAppointmentDescription("");
    setSelectedPatientId("");
    setFormError("");
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function handleOpenModal() {
    if (!googleConnected) {
      showFeedback(
        "error",
        "Conecte o Google Calendar antes de criar uma consulta.",
      );
      return;
    }

    setIsModalOpen(true);
  }

  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();

    setFormError("");

    if (!googleConnected) {
      setFormError("Conecte o Google Calendar antes de criar uma consulta.");
      return;
    }

    if (!appointmentTitle.trim()) {
      setFormError("Informe um título para a consulta.");
      return;
    }

    if (!selectedPatientId) {
      setFormError("Selecione um paciente para criar a consulta.");
      return;
    }

    if (!appointmentDate) {
      setFormError("Informe a data da consulta.");
      return;
    }

    if (!appointmentStartTime) {
      setFormError("Informe a hora inicial da consulta.");
      return;
    }

    if (!appointmentEndTime) {
      setFormError("Informe a hora final da consulta.");
      return;
    }

    const startDateTime = new Date(
      `${appointmentDate}T${appointmentStartTime}:00`,
    );
    const endDateTime = new Date(`${appointmentDate}T${appointmentEndTime}:00`);

    if (endDateTime <= startDateTime) {
      setFormError("A hora final deve ser maior que a hora inicial.");
      return;
    }

    try {
      setSavingAppointment(true);

      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: appointmentTitle,
          date: appointmentDate,
          startTime: appointmentStartTime,
          endTime: appointmentEndTime,
          location: appointmentLocation,
          description: appointmentDescription,
          patientId: selectedPatientId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao criar consulta.");
      }

      await loadEvents();
      handleCloseModal();

      showFeedback(
        data?.emailWarning ? "info" : "success",
        data?.message ||
          "Consulta criada com sucesso. O paciente foi notificado por e-mail.",
      );
    } catch (error: any) {
      setFormError(error.message || "Erro ao criar consulta.");
    } finally {
      setSavingAppointment(false);
    }
  }

  function handleCancelAppointment(appointmentId?: string, title?: string) {
    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    setCancellationReason("");

    setAppointmentToCancel({
      id: appointmentId,
      title: title || "Consulta",
    });
  }

  function closeCancelModal() {
    setAppointmentToCancel(null);
    setCancellationReason("");
  }

  async function confirmCancelAppointment() {
    if (!appointmentToCancel) return;

    try {
      setCancelingAppointmentId(appointmentToCancel.id);

      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointmentToCancel.id,
          cancellationReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao cancelar consulta.");
      }

      await loadEvents();
      closeCancelModal();

      showFeedback(
        data?.emailWarning ? "info" : "success",
        data?.message ||
          "Consulta cancelada com sucesso. O paciente foi notificado por e-mail.",
      );
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao cancelar consulta.");
    } finally {
      setCancelingAppointmentId("");
    }
  }

  async function handleReviewCancellationRequest(
    appointmentId: string | undefined,
    action: "APPROVE" | "REJECT",
  ) {
    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    try {
      setReviewingCancellationId(`${appointmentId}-${action}`);

      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel-request`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao analisar solicitação de cancelamento.",
        );
      }

      await loadEvents();

      showFeedback(
        "success",
        data?.message ||
          (action === "APPROVE"
            ? "Solicitação de cancelamento aprovada."
            : "Solicitação de cancelamento rejeitada."),
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao analisar solicitação de cancelamento.",
      );
    } finally {
      setReviewingCancellationId("");
    }
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

  const infoCardStyle = {
    ...cardStyle,
    minHeight: "150px",
    position: "relative",
    overflow: "hidden",
  } as const;

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
  } as const;

  const buttonSecondaryStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    width: "100%",
  } as const;

  const buttonSuccessStyle = {
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    fontSize: "14px",
    width: "100%",
    textAlign: "center",
  } as const;

  if (status === "loading") {
    return (
      <div style={pageStyle}>
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#0f172a" }}>
          Carregando agenda...
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
              "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
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
                <i className="fa-solid fa-calendar-days"></i>
                Agenda integrada
              </span>

              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  marginBottom: "10px",
                }}
              >
                Agenda do Psicólogo
              </h1>

              <p
                style={{
                  fontSize: "18px",
                  color: "#dbeafe",
                  maxWidth: "780px",
                  margin: 0,
                }}
              >
                Organize atendimentos, acompanhe horários, notifique pacientes
                por e-mail e mantenha sua agenda sincronizada com o Google
                Calendar.
              </p>
            </div>

            <button
              type="button"
              style={{
                ...buttonPrimaryStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
                opacity: googleConnected ? 1 : 0.7,
                cursor: googleConnected ? "pointer" : "not-allowed",
              }}
              disabled={!googleConnected}
              onClick={handleOpenModal}
            >
              Novo horário
            </button>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div style={infoCardStyle}>
            <div
              style={{
                position: "absolute",
                right: "-24px",
                top: "-24px",
                width: "94px",
                height: "94px",
                borderRadius: "999px",
                backgroundColor: "#eff6ff",
              }}
            />
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              {currentStatusInfo.cardTitle}
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "8px",
              }}
            >
              {events.length}
            </div>

            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              {appointmentStatusFilter === "SCHEDULED"
                ? "Total de consultas futuras agendadas."
                : appointmentStatusFilter === "CANCELLED"
                  ? "Total de consultas canceladas no histórico."
                  : "Total de consultas exibidas no filtro atual."}
            </div>
          </div>

          <div style={infoCardStyle}>
            <div
              style={{
                position: "absolute",
                right: "-24px",
                top: "-24px",
                width: "94px",
                height: "94px",
                borderRadius: "999px",
                backgroundColor: "#ecfdf5",
              }}
            />
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              Próxima consulta
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "8px",
              }}
            >
              {nextEvent ? formatDate(nextEvent.start) : "--"}
            </div>

            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              {nextEvent
                ? nextEvent.title
                : "A próxima consulta aparecerá aqui quando houver agendamentos."}
            </div>
          </div>

          <div style={infoCardStyle}>
            <div
              style={{
                position: "absolute",
                right: "-24px",
                top: "-24px",
                width: "94px",
                height: "94px",
                borderRadius: "999px",
                backgroundColor: "#f5f3ff",
              }}
            />
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "12px",
              }}
            >
              Google Calendar
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: googleConnected ? "#065f46" : "#111827",
                marginBottom: "8px",
              }}
            >
              {googleConnected ? "Conectado" : "Não conectado"}
            </div>

            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              {googleConnected
                ? "Sua conta Google está vinculada."
                : "Conecte sua agenda para sincronizar os atendimentos."}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
          }}
        >
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "18px",
                gap: "16px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {currentStatusInfo.sectionTitle}
                </h2>

                <p style={{ color: "#6b7280", margin: 0 }}>
                  Acompanhe suas consultas e mantenha o histórico organizado.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "18px",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Agendadas", value: "SCHEDULED" },
                { label: "Canceladas", value: "CANCELLED" },
                { label: "Todas", value: "ALL" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setAppointmentStatusFilter(
                      filter.value as AppointmentStatusFilter,
                    )
                  }
                  style={{
                    border:
                      appointmentStatusFilter === filter.value
                        ? "1px solid #2563eb"
                        : "1px solid #d1d5db",
                    backgroundColor:
                      appointmentStatusFilter === filter.value
                        ? "#eff6ff"
                        : "#fff",
                    color:
                      appointmentStatusFilter === filter.value
                        ? "#1d4ed8"
                        : "#374151",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {loadingEvents ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "18px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Carregando consultas...
                </p>
              </div>
            ) : eventsError ? (
              <div
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "14px",
                  padding: "18px",
                  backgroundColor: "#fef2f2",
                }}
              >
                <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>
                  {eventsError}
                </p>
              </div>
            ) : events.length === 0 ? (
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
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {currentStatusInfo.emptyTitle}
                </p>

                <p style={{ color: "#6b7280", margin: 0 }}>
                  {currentStatusInfo.emptyDescription}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {events.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "18px",
                      padding: "18px",
                      backgroundColor:
                        event.status === "CANCELLED" ? "#fff7f7" : "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: "8px",
                      }}
                    >
                      {event.title}
                    </div>

                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor:
                          event.status === "CANCELLED" ? "#fef2f2" : "#ecfdf5",
                        color:
                          event.status === "CANCELLED" ? "#b91c1c" : "#065f46",
                        border:
                          event.status === "CANCELLED"
                            ? "1px solid #fecaca"
                            : "1px solid #a7f3d0",
                        borderRadius: "999px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 800,
                        marginBottom: "10px",
                      }}
                    >
                      {event.status === "CANCELLED" ? "Cancelada" : "Agendada"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "10px",
                      }}
                    >
                      <span
                        style={{
                          ...getConfirmationStyle(event),
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <i
                          className={
                            isCancellationRequestPending(event)
                              ? "fa-solid fa-clock"
                              : event.confirmationStatus === "CONFIRMED"
                                ? "fa-solid fa-circle-check"
                                : "fa-solid fa-circle-info"
                          }
                        ></i>
                        {getConfirmationLabel(event)}
                      </span>
                    </div>

                    {event.patientName && (
                      <div style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Paciente:</strong> {event.patientName}
                        {event.patientEmail ? ` — ${event.patientEmail}` : ""}
                      </div>
                    )}

                    <div style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Início:</strong> {formatDate(event.start)}
                    </div>

                    {event.end && (
                      <div style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Fim:</strong> {formatDate(event.end)}
                      </div>
                    )}

                    {event.location && (
                      <div style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Local:</strong> {event.location}
                      </div>
                    )}

                    {event.description && (
                      <div style={{ color: "#4b5563", marginBottom: "10px" }}>
                        <strong>Descrição:</strong> {event.description}
                      </div>
                    )}

                    {event.status === "CANCELLED" && event.cancelledAt && (
                      <div style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Cancelada em:</strong>{" "}
                        {formatDate(event.cancelledAt)}
                      </div>
                    )}

                    {event.status === "CANCELLED" &&
                      event.cancellationReason && (
                        <div style={{ color: "#4b5563", marginBottom: "10px" }}>
                          <strong>Motivo do cancelamento:</strong>{" "}
                          {event.cancellationReason}
                        </div>
                      )}

                    {isCancellationRequestPending(event) && (
                      <div
                        style={{
                          backgroundColor: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "16px",
                          padding: "14px",
                          marginTop: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#92400e",
                            fontWeight: 900,
                            marginBottom: "8px",
                          }}
                        >
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          Solicitação de cancelamento pendente
                        </div>

                        <p
                          style={{
                            color: "#78350f",
                            lineHeight: 1.5,
                            marginBottom: "10px",
                          }}
                        >
                          O paciente solicitou o cancelamento desta consulta.
                          Analise o motivo antes de aprovar ou rejeitar.
                        </p>

                        {event.cancellationRequestedAt && (
                          <p
                            style={{
                              color: "#78350f",
                              fontSize: "13px",
                              marginBottom: "8px",
                            }}
                          >
                            <strong>Solicitada em:</strong>{" "}
                            {formatDate(event.cancellationRequestedAt)}
                          </p>
                        )}

                        {event.cancellationRequestReason && (
                          <div
                            style={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #fde68a",
                              borderRadius: "12px",
                              padding: "12px",
                              color: "#4b5563",
                              marginBottom: "12px",
                              lineHeight: 1.5,
                            }}
                          >
                            <strong>Motivo informado:</strong>{" "}
                            {event.cancellationRequestReason}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleReviewCancellationRequest(
                                event.appointmentId || event.id,
                                "APPROVE",
                              )
                            }
                            disabled={
                              reviewingCancellationId ===
                              `${event.appointmentId || event.id}-APPROVE`
                            }
                            style={{
                              backgroundColor: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "12px",
                              padding: "10px 14px",
                              fontWeight: 800,
                              cursor:
                                reviewingCancellationId ===
                                `${event.appointmentId || event.id}-APPROVE`
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                reviewingCancellationId ===
                                `${event.appointmentId || event.id}-APPROVE`
                                  ? 0.7
                                  : 1,
                            }}
                          >
                            {reviewingCancellationId ===
                            `${event.appointmentId || event.id}-APPROVE`
                              ? "Aprovando..."
                              : "Aprovar cancelamento"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleReviewCancellationRequest(
                                event.appointmentId || event.id,
                                "REJECT",
                              )
                            }
                            disabled={
                              reviewingCancellationId ===
                              `${event.appointmentId || event.id}-REJECT`
                            }
                            style={{
                              backgroundColor: "#ffffff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "12px",
                              padding: "10px 14px",
                              fontWeight: 800,
                              cursor:
                                reviewingCancellationId ===
                                `${event.appointmentId || event.id}-REJECT`
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                reviewingCancellationId ===
                                `${event.appointmentId || event.id}-REJECT`
                                  ? 0.7
                                  : 1,
                            }}
                          >
                            {reviewingCancellationId ===
                            `${event.appointmentId || event.id}-REJECT`
                              ? "Rejeitando..."
                              : "Rejeitar solicitação"}
                          </button>
                        </div>
                      </div>
                    )}

                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-block",
                          marginTop: "4px",
                        }}
                      >
                        Abrir no Google Calendar
                      </a>
                    )}

                    {event.patientId && (
                      <div style={{ marginTop: "12px" }}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/pacientes/${event.patientId}`)
                          }
                          style={{
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          Ver paciente
                        </button>
                      </div>
                    )}

                    {event.status !== "CANCELLED" &&
                      !isCancellationRequestPending(event) && (
                        <div style={{ marginTop: "14px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              handleCancelAppointment(
                                event.appointmentId || event.id,
                                event.title,
                              )
                            }
                            disabled={
                              cancelingAppointmentId ===
                              (event.appointmentId || event.id)
                            }
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              fontWeight: 700,
                              cursor:
                                cancelingAppointmentId ===
                                (event.appointmentId || event.id)
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                cancelingAppointmentId ===
                                (event.appointmentId || event.id)
                                  ? 0.7
                                  : 1,
                            }}
                          >
                            {cancelingAppointmentId ===
                            (event.appointmentId || event.id)
                              ? "Cancelando..."
                              : "Cancelar consulta"}
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "14px",
                }}
              >
                Integração
              </h2>

              <p style={{ color: "#4b5563", marginBottom: "18px" }}>
                {googleConnected
                  ? "Sua conta Google está conectada. As consultas criadas no sistema também serão sincronizadas com o Google Calendar."
                  : "Conecte sua conta Google para sincronizar seus atendimentos."}
              </p>

              {googleConnected ? (
                <div style={buttonSuccessStyle}>Google Calendar conectado</div>
              ) : (
                <button
                  type="button"
                  style={buttonSecondaryStyle}
                  onClick={() => signIn("google", { callbackUrl: "/agenda" })}
                >
                  Conectar com Google Calendar
                </button>
              )}
            </section>
          </aside>
        </div>
      </div>

      {appointmentToCancel && (
        <div
          onClick={closeCancelModal}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1001,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "30px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "10px",
              }}
            >
              Cancelar consulta?
            </h2>

            <p
              style={{
                color: "#4b5563",
                marginBottom: "18px",
                lineHeight: 1.5,
              }}
            >
              A consulta <strong>{appointmentToCancel.title}</strong> será
              cancelada no sistema e removida do Google Calendar.
            </p>

            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Motivo do cancelamento
              </label>

              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Opcional. Ex.: Remarcação por conflito de horário."
                rows={4}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  marginTop: "8px",
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                Se preenchido, esse motivo será enviado ao paciente no e-mail de
                cancelamento.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={closeCancelModal}
                style={{
                  backgroundColor: "#fff",
                  color: "#1f2937",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                disabled={cancelingAppointmentId === appointmentToCancel.id}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmCancelAppointment}
                disabled={cancelingAppointmentId === appointmentToCancel.id}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor:
                    cancelingAppointmentId === appointmentToCancel.id
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    cancelingAppointmentId === appointmentToCancel.id ? 0.7 : 1,
                }}
              >
                {cancelingAppointmentId === appointmentToCancel.id
                  ? "Cancelando..."
                  : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          onClick={handleCloseModal}
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
              maxWidth: "720px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "30px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ marginBottom: "22px" }}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Novo horário
              </h2>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Preencha os dados da consulta para criar o agendamento no
                sistema e no Google Calendar.
              </p>
            </div>

            {formError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  fontWeight: 700,
                }}
              >
                {formError}
              </div>
            )}

            <form noValidate onSubmit={handleSubmitAppointment}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Título
                  </label>

                  <input
                    type="text"
                    value={appointmentTitle}
                    onChange={(e) => setAppointmentTitle(e.target.value)}
                    placeholder="Ex.: Sessão com paciente"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Paciente
                  </label>

                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    <option value="">
                      {loadingPatients
                        ? "Carregando pacientes..."
                        : patients.length === 0
                          ? "Nenhum paciente cadastrado"
                          : "Selecione um paciente"}
                    </option>

                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} — {patient.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Data
                  </label>

                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Local
                  </label>

                  <input
                    type="text"
                    value={appointmentLocation}
                    onChange={(e) => setAppointmentLocation(e.target.value)}
                    placeholder="Ex.: Atendimento online"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Hora inicial
                  </label>

                  <input
                    type="time"
                    value={appointmentStartTime}
                    onChange={(e) => setAppointmentStartTime(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Hora final
                  </label>

                  <input
                    type="time"
                    value={appointmentEndTime}
                    onChange={(e) => setAppointmentEndTime(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Descrição
                  </label>

                  <textarea
                    value={appointmentDescription}
                    onChange={(e) => setAppointmentDescription(e.target.value)}
                    placeholder="Observações sobre o atendimento"
                    rows={4}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    backgroundColor: "#fff",
                    color: "#1f2937",
                    border: "1px solid #d1d5db",
                    borderRadius: "12px",
                    padding: "12px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    ...buttonPrimaryStyle,
                    opacity:
                      savingAppointment || patients.length === 0 ? 0.7 : 1,
                    cursor:
                      savingAppointment || patients.length === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  disabled={savingAppointment || patients.length === 0}
                >
                  {savingAppointment ? "Salvando..." : "Salvar horário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
