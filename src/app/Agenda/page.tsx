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

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [formError, setFormError] = useState("");

  const [handledPatientFromUrl, setHandledPatientFromUrl] = useState(false);

  const [appointmentToCancel, setAppointmentToCancel] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
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
        "success",
        "Consulta criada com sucesso no sistema e no Google Calendar.",
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

    setAppointmentToCancel({
      id: appointmentId,
      title: title || "Consulta",
    });
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao cancelar consulta.");
      }

      await loadEvents();
      setAppointmentToCancel(null);

      showFeedback(
        "success",
        "Consulta cancelada com sucesso. O evento também foi removido do Google Calendar.",
      );
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao cancelar consulta.");
    } finally {
      setCancelingAppointmentId("");
    }
  }

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const infoCardStyle = {
    ...cardStyle,
    minHeight: "160px",
  };

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const buttonSecondaryStyle = {
    backgroundColor: "#fff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
    width: "100%",
  } as const;

  const buttonSuccessStyle = {
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: "14px",
    width: "100%",
  } as const;

  if (status === "loading") {
    return (
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>
          Carregando agenda...
        </h1>
      </div>
    );
  }

  return (
    <>
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
            Agenda do Psicólogo
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#4f46e5",
              margin: 0,
            }}
          >
            Organize atendimentos, acompanhe horários e conecte sua agenda ao
            Google Calendar.
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
            Agenda integrada
          </p>
          <p style={{ color: "#1e40af", margin: 0 }}>
            Gerencie seus atendimentos, acompanhe pacientes e mantenha sua
            agenda sincronizada.
          </p>
        </div>

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
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              {currentStatusInfo.cardTitle}
            </div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#111827",
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
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              Próxima consulta
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#111827",
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
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
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

              <button
                type="button"
                style={{
                  ...buttonPrimaryStyle,
                  opacity: googleConnected ? 1 : 0.6,
                  cursor: googleConnected ? "pointer" : "not-allowed",
                }}
                disabled={!googleConnected}
                onClick={handleOpenModal}
              >
                Novo horário
              </button>
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
                    padding: "8px 14px",
                    fontWeight: 700,
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
                      borderRadius: "14px",
                      padding: "18px",
                      backgroundColor: "#f8fafc",
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

                    {event.status !== "CANCELLED" && (
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
                  fontWeight: 700,
                  color: "#111827",
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
          onClick={() => setAppointmentToCancel(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1001,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#111827",
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

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setAppointmentToCancel(null)}
                style={{
                  backgroundColor: "#fff",
                  color: "#1f2937",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
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
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "720px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
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
