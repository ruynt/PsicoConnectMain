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

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
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
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
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

  const inputStyle = {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "13px 14px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#ffffff",
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
          Carregando suas consultas...
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
                <i className="fa-solid fa-calendar-days"></i>
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
                Minhas consultas
              </h1>

              <p
                style={{
                  fontSize: "18px",
                  color: "#dbeafe",
                  maxWidth: "760px",
                  margin: 0,
                }}
              >
                Acompanhe seus atendimentos, consulte cancelamentos, visualize o
                histórico e responda checklists pré-sessão.
              </p>
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
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              marginBottom: "18px",
              flexWrap: "wrap",
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
                {currentTabInfo.title}
              </h2>

              <p style={{ color: "#64748b", margin: 0 }}>
                {currentTabInfo.description}
              </p>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              <i className={currentTabInfo.icon}></i>
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
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value as AppointmentTab)}
                style={{
                  border:
                    activeTab === tab.value
                      ? "1px solid #2563eb"
                      : "1px solid #cbd5e1",
                  backgroundColor: activeTab === tab.value ? "#eff6ff" : "#fff",
                  color: activeTab === tab.value ? "#1d4ed8" : "#334155",
                  borderRadius: "999px",
                  padding: "10px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {tab.label}
                <span
                  style={{
                    backgroundColor:
                      activeTab === tab.value ? "#dbeafe" : "#f1f5f9",
                    color: activeTab === tab.value ? "#1d4ed8" : "#64748b",
                    borderRadius: "999px",
                    padding: "2px 8px",
                    fontSize: "12px",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {currentAppointments.length === 0 ? (
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
                {currentTabInfo.emptyTitle}
              </p>
              <p style={{ color: "#64748b", margin: 0 }}>
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
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "18px",
                    backgroundColor:
                      appointment.status === "CANCELLED"
                        ? "#fff7f7"
                        : "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#0f172a",
                          fontWeight: 900,
                          fontSize: "19px",
                          marginBottom: "6px",
                        }}
                      >
                        {appointment.title}
                      </p>

                      <p style={{ color: "#64748b", margin: 0 }}>
                        Profissional: {appointment.psychologist.name}
                      </p>
                    </div>

                    <span
                      style={{
                        backgroundColor:
                          appointment.status === "CANCELLED"
                            ? "#fef2f2"
                            : appointment.preSessionCheckin
                              ? "#ecfdf5"
                              : "#fffbeb",
                        color:
                          appointment.status === "CANCELLED"
                            ? "#b91c1c"
                            : appointment.preSessionCheckin
                              ? "#065f46"
                              : "#92400e",
                        border:
                          appointment.status === "CANCELLED"
                            ? "1px solid #fecaca"
                            : appointment.preSessionCheckin
                              ? "1px solid #a7f3d0"
                              : "1px solid #fde68a",
                        borderRadius: "999px",
                        padding: "6px 11px",
                        fontSize: "12px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {appointment.status === "CANCELLED"
                        ? "Cancelada"
                        : appointment.preSessionCheckin
                          ? "Checklist respondido"
                          : "Agendada"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "8px 18px",
                      marginBottom: "10px",
                    }}
                  >
                    <p style={{ color: "#475569", margin: 0 }}>
                      <strong>Início:</strong> {formatDate(appointment.dateTime)}
                    </p>

                    {appointment.endDateTime && (
                      <p style={{ color: "#475569", margin: 0 }}>
                        <strong>Fim:</strong>{" "}
                        {formatDate(appointment.endDateTime)}
                      </p>
                    )}

                    {appointment.location && (
                      <p style={{ color: "#475569", margin: 0 }}>
                        <strong>Local:</strong> {appointment.location}
                      </p>
                    )}

                    {appointment.status === "CANCELLED" &&
                      appointment.cancelledAt && (
                        <p style={{ color: "#475569", margin: 0 }}>
                          <strong>Cancelada em:</strong>{" "}
                          {formatDate(appointment.cancelledAt)}
                        </p>
                      )}
                  </div>

                  {appointment.description && (
                    <p style={{ color: "#475569", marginBottom: "8px" }}>
                      <strong>Descrição:</strong> {appointment.description}
                    </p>
                  )}

                  {appointment.status === "CANCELLED" &&
                    appointment.cancellationReason && (
                      <div
                        style={{
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#991b1b",
                          borderRadius: "14px",
                          padding: "12px",
                          marginTop: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <strong>Motivo do cancelamento:</strong>{" "}
                        {appointment.cancellationReason}
                      </div>
                    )}

                  {appointment.preSessionCheckin && (
                    <div
                      style={{
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        borderRadius: "14px",
                        padding: "12px",
                        marginTop: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <p
                        style={{
                          color: "#065f46",
                          fontWeight: 900,
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

                  <div
                    style={{
                      marginTop: "14px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {appointment.status === "SCHEDULED" &&
                      new Date(appointment.dateTime) >= now && (
                        <button
                          type="button"
                          onClick={() => openCheckinModal(appointment)}
                          style={primaryButtonStyle}
                        >
                          {appointment.preSessionCheckin
                            ? "Editar checklist"
                            : "Responder checklist"}
                        </button>
                      )}

                    {appointment.googleEventLink &&
                      appointment.status !== "CANCELLED" && (
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
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
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
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "12px",
                }}
              >
                <i className="fa-solid fa-clipboard-check"></i>
                Preparação para sessão
              </span>

              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Checklist pré-sessão
              </h2>

              <p style={{ color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                Responda algumas perguntas rápidas para ajudar o profissional a
                se preparar melhor para o atendimento.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "16px",
                padding: "14px",
                marginBottom: "18px",
              }}
            >
              <p
                style={{
                  color: "#1d4ed8",
                  fontWeight: 900,
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
                  borderRadius: "14px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  fontWeight: 800,
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
                      fontWeight: 800,
                      color: "#0f172a",
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
                      color: "#0f172a",
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
                      color: "#0f172a",
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

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#0f172a",
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
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#0f172a",
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
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#0f172a",
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
                    ...inputStyle,
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
