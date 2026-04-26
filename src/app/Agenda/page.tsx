"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  location: string;
  htmlLink: string;
};

type PatientOption = {
  id: string;
  name: string;
  email: string;
};

export default function AgendaPage() {
  const { data: session, status } = useSession();

  const googleConnected = Boolean((session?.user as any)?.googleAccessToken);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentStartTime, setAppointmentStartTime] = useState("");
  const [appointmentEndTime, setAppointmentEndTime] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  async function loadEvents() {
    if (!googleConnected) {
      setEvents([]);
      return;
    }

    try {
      setLoadingEvents(true);
      setEventsError("");

      const response = await fetch("/api/google-calendar/events", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar eventos.");
      }

      setEvents(data.events || []);
    } catch (error: any) {
      setEventsError(error.message || "Erro ao carregar eventos.");
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
  }, [googleConnected]);

  useEffect(() => {
    loadPatients();
  }, []);

  const nextEvent = useMemo(() => {
    return events.length > 0 ? events[0] : null;
  }, [events]);

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function resetForm() {
    setAppointmentTitle("");
    setAppointmentDate("");
    setAppointmentStartTime("");
    setAppointmentEndTime("");
    setAppointmentLocation("");
    setAppointmentDescription("");
    setSelectedPatientId("");
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();

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
        throw new Error(data?.error || "Erro ao criar horário.");
      }

      await loadEvents();
      handleCloseModal();
      alert("Consulta criada com sucesso no Google Calendar e no banco.");
    } catch (error: any) {
      alert(error.message || "Erro ao criar horário.");
    } finally {
      setSavingAppointment(false);
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
            Área em desenvolvimento
          </p>
          <p style={{ color: "#1e40af", margin: 0 }}>
            Esta tela será usada para visualizar compromissos, criar novos
            atendimentos e sincronizar a agenda do psicólogo com serviços
            externos.
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
              Consultas agendadas
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
              Quantidade de atendimentos encontrados na agenda.
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
              Próximo atendimento
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
                : "O próximo compromisso aparecerá aqui quando houver eventos."}
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
                ? "A sua conta Google foi vinculada com sucesso."
                : "A integração permitirá importar e sincronizar eventos."}
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
                alignItems: "center",
                marginBottom: "20px",
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
                  Próximos horários
                </h2>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Visualização resumida dos próximos atendimentos.
                </p>
              </div>

              <button
                style={buttonPrimaryStyle}
                onClick={() => setIsModalOpen(true)}
              >
                Novo horário
              </button>
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
                  Carregando eventos...
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
                  Nenhum atendimento agendado
                </p>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Quando houver eventos no Google Calendar, eles aparecerão
                  aqui.
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
                        }}
                      >
                        Abrir no Google Calendar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
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
                  ? "Sua conta Google já está conectada. Os próximos eventos do calendário podem ser visualizados nesta página."
                  : "Conecte sua conta Google para visualizar eventos do seu calendário diretamente na plataforma."}
              </p>

              {googleConnected ? (
                <div style={buttonSuccessStyle}>Google Calendar conectado</div>
              ) : (
                <button
                  style={buttonSecondaryStyle}
                  onClick={() => signIn("google", { callbackUrl: "/agenda" })}
                >
                  Conectar com Google Calendar
                </button>
              )}
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "14px",
                }}
              >
                Próximas funcionalidades
              </h2>

              <ul
                style={{
                  color: "#4b5563",
                  paddingLeft: "20px",
                  margin: 0,
                  lineHeight: 1.8,
                }}
              >
                <li>Restrição de acesso apenas para psicólogos</li>
                <li>Integração com Google Calendar</li>
                <li>Criação e edição de atendimentos</li>
                <li>Visualização de horários livres</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

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
                Preencha as informações do atendimento. No próximo passo, isso
                será salvo no Google Calendar e no banco do sistema.
              </p>
            </div>

            <form onSubmit={handleSubmitAppointment}>
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
                    required
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
                    required
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
                    required
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
                    required
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
                    required
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
                    opacity: savingAppointment ? 0.7 : 1,
                    cursor: savingAppointment ? "not-allowed" : "pointer",
                  }}
                  disabled={savingAppointment}
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
