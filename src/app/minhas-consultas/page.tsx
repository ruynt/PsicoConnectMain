"use client";

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

type AppointmentTab = "UPCOMING" | "CANCELLED" | "HISTORY";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentTab>("UPCOMING");

  const [checkinAppointment, setCheckinAppointment] =
    useState<PatientAppointment | null>(null);

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
    } catch (error: any) {
      setError(error.message || "Erro ao carregar consultas.");
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

  const appointmentsByTab = {
    UPCOMING: upcomingAppointments,
    CANCELLED: cancelledAppointments,
    HISTORY: historyAppointments,
  };

  const tabInfo = {
    UPCOMING: {
      label: "Próximas",
      title: "Próximas consultas",
      emptyTitle: "Nenhuma consulta futura",
      emptyDescription:
        "Quando seu psicólogo agendar uma nova consulta, ela aparecerá aqui.",
    },
    CANCELLED: {
      label: "Canceladas",
      title: "Consultas canceladas",
      emptyTitle: "Nenhuma consulta cancelada",
      emptyDescription:
        "As consultas canceladas aparecerão aqui para acompanhamento.",
    },
    HISTORY: {
      label: "Histórico",
      title: "Histórico de consultas",
      emptyTitle: "Nenhum histórico disponível",
      emptyDescription:
        "Consultas anteriores e canceladas aparecerão neste espaço.",
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

  async function handleSubmitCheckin(e: React.FormEvent) {
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
          moodLevel: moodLevel || null,
          anxietyLevel: anxietyLevel || null,
          sleepLevel: sleepLevel || null,
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
    } catch (error: any) {
      setCheckinError(error.message || "Erro ao salvar checklist.");
    } finally {
      setSavingCheckin(false);
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
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#fff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>
          Carregando suas consultas...
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
            Minhas consultas
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#4f46e5",
              margin: 0,
            }}
          >
            Acompanhe seus atendimentos agendados, cancelamentos e histórico de
            consultas.
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
            Aqui você pode consultar seus horários, acompanhar cancelamentos e
            responder checklists pré-sessão.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
                color: "#b91c1c",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Canceladas
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

          <div style={smallCardStyle}>
            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              Total no histórico
            </p>
            <p
              style={{
                color: "#111827",
                fontSize: "34px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {appointments.length}
            </p>
          </div>
        </div>

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                {currentTabInfo.title}
              </h2>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Consulte os detalhes dos seus atendimentos.
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
              { label: "Próximas", value: "UPCOMING" },
              { label: "Canceladas", value: "CANCELLED" },
              { label: "Histórico", value: "HISTORY" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value as AppointmentTab)}
                style={{
                  border:
                    activeTab === tab.value
                      ? "1px solid #2563eb"
                      : "1px solid #d1d5db",
                  backgroundColor: activeTab === tab.value ? "#eff6ff" : "#fff",
                  color: activeTab === tab.value ? "#1d4ed8" : "#374151",
                  borderRadius: "999px",
                  padding: "10px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {currentAppointments.length === 0 ? (
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
                {currentTabInfo.emptyTitle}
              </p>
              <p style={{ color: "#6b7280", margin: 0 }}>
                {currentTabInfo.emptyDescription}
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
              {currentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "18px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#111827",
                          fontWeight: 800,
                          fontSize: "18px",
                          marginBottom: "6px",
                        }}
                      >
                        {appointment.title}
                      </p>

                      <p style={{ color: "#6b7280", margin: 0 }}>
                        Profissional: {appointment.psychologist.name}
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor:
                          appointment.status === "CANCELLED"
                            ? "#fef2f2"
                            : "#ecfdf5",
                        color:
                          appointment.status === "CANCELLED"
                            ? "#b91c1c"
                            : "#065f46",
                        border:
                          appointment.status === "CANCELLED"
                            ? "1px solid #fecaca"
                            : "1px solid #a7f3d0",
                        borderRadius: "999px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {appointment.status === "CANCELLED"
                        ? "Cancelada"
                        : "Agendada"}
                    </span>
                  </div>

                  <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                    <strong>Início:</strong> {formatDate(appointment.dateTime)}
                  </p>

                  {appointment.endDateTime && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Fim:</strong>{" "}
                      {formatDate(appointment.endDateTime)}
                    </p>
                  )}

                  {appointment.location && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Local:</strong> {appointment.location}
                    </p>
                  )}

                  {appointment.description && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Descrição:</strong> {appointment.description}
                    </p>
                  )}

                  {appointment.status === "CANCELLED" &&
                    appointment.cancelledAt && (
                      <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Cancelada em:</strong>{" "}
                        {formatDate(appointment.cancelledAt)}
                      </p>
                    )}

                  {appointment.status === "CANCELLED" &&
                    appointment.cancellationReason && (
                      <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Motivo do cancelamento:</strong>{" "}
                        {appointment.cancellationReason}
                      </p>
                    )}

                  {appointment.preSessionCheckin && (
                    <div
                      style={{
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "12px",
                        padding: "12px",
                        marginTop: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "#065f46",
                          fontWeight: 800,
                          marginBottom: "6px",
                        }}
                      >
                        Checklist pré-sessão respondido
                      </p>

                      <p
                        style={{
                          color: "#047857",
                          margin: 0,
                          fontSize: "14px",
                        }}
                      >
                        Última atualização em{" "}
                        {formatDate(appointment.preSessionCheckin.updatedAt)}
                      </p>
                    </div>
                  )}

                  {appointment.googleEventLink &&
                    appointment.status !== "CANCELLED" && (
                      <a
                        href={appointment.googleEventLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-block",
                          marginTop: "8px",
                        }}
                      >
                        Abrir no Google Calendar
                      </a>
                    )}

                  {appointment.status === "SCHEDULED" &&
                    new Date(appointment.dateTime) >= now && (
                      <div
                        style={{
                          marginTop: "14px",
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openCheckinModal(appointment)}
                          style={primaryButtonStyle}
                        >
                          {appointment.preSessionCheckin
                            ? "Editar checklist pré-sessão"
                            : "Responder checklist pré-sessão"}
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {checkinAppointment && (
        <div
          onClick={closeCheckinModal}
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
              maxHeight: "90vh",
              overflowY: "auto",
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
                Checklist pré-sessão
              </h2>

              <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                Responda algumas perguntas rápidas para ajudar o profissional a
                se preparar melhor para o atendimento.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "14px",
                padding: "14px",
                marginBottom: "18px",
              }}
            >
              <p
                style={{
                  color: "#1d4ed8",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                {checkinAppointment.title}
              </p>

              <p style={{ color: "#1e40af", margin: 0 }}>
                {formatDate(checkinAppointment.dateTime)} · Profissional:{" "}
                {checkinAppointment.psychologist.name}
              </p>
            </div>

            {checkinError && (
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
                {checkinError}
              </div>
            )}

            <form noValidate onSubmit={handleSubmitCheckin}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "14px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
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
                    Ansiedade (0 a 10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={anxietyLevel}
                    onChange={(e) => setAnxietyLevel(e.target.value)}
                    placeholder="Ex.: 5"
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
                    Sono (0 a 10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={sleepLevel}
                    onChange={(e) => setSleepLevel(e.target.value)}
                    placeholder="Ex.: 6"
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
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Qual sua principal preocupação no momento?
                </label>

                <textarea
                  value={mainConcern}
                  onChange={(e) => setMainConcern(e.target.value)}
                  rows={3}
                  placeholder="Escreva brevemente o que mais tem preocupado você..."
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

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Aconteceu algo importante desde a última sessão?
                </label>

                <textarea
                  value={importantEvents}
                  onChange={(e) => setImportantEvents(e.target.value)}
                  rows={3}
                  placeholder="Ex.: acontecimentos, mudanças, dificuldades ou avanços recentes..."
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

              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  Existe algum tema que você gostaria de falar na consulta?
                </label>

                <textarea
                  value={topicsToDiscuss}
                  onChange={(e) => setTopicsToDiscuss(e.target.value)}
                  rows={3}
                  placeholder="Ex.: assuntos que você gostaria de priorizar no atendimento..."
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
