"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  endDateTime: string | null;
  status: "SCHEDULED" | "CANCELLED";
  googleEventLink: string;
  createdAt: string;
};

type PatientDetails = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  nextAppointment: Appointment | null;
  appointments: Appointment[];
};

type PatientNote = {
  id: string;
  title: string;
  content: string;
  patientId: string;
  appointmentId: string | null;
  appointment: {
    id: string;
    title: string;
    dateTime: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function PatientDetailsPage() {
  const params = useParams();
  const patientId = String(params.id);

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  async function loadPatient() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/patients/${patientId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar paciente.");
      }

      setPatient(data.patient);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar paciente.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotes() {
    try {
      setLoadingNotes(true);
      setNoteError("");

      const response = await fetch(`/api/patients/${patientId}/notes`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar anotações.");
      }

      setNotes(data.notes || []);
    } catch (error: any) {
      setNoteError(error.message || "Erro ao carregar anotações.");
    } finally {
      setLoadingNotes(false);
    }
  }

  useEffect(() => {
    if (patientId) {
      loadPatient();
      loadNotes();
    }
  }, [patientId]);

  const futureAppointments = useMemo(() => {
    if (!patient) return [];

    const now = new Date();

    return patient.appointments.filter(
      (appointment) =>
        appointment.status === "SCHEDULED" &&
        new Date(appointment.dateTime) >= now,
    );
  }, [patient]);

  const appointmentOptions = useMemo(() => {
    if (!patient) return [];

    return patient.appointments.filter(
      (appointment) => appointment.status === "SCHEDULED",
    );
  }, [patient]);

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

  function resetNoteForm() {
    setNoteTitle("");
    setNoteContent("");
    setSelectedAppointmentId("");
    setNoteError("");
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();

    setNoteError("");

    if (!noteContent.trim()) {
      setNoteError("Escreva o conteúdo da anotação antes de salvar.");
      return;
    }

    try {
      setSavingNote(true);

      const response = await fetch(`/api/patients/${patientId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          appointmentId: selectedAppointmentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao salvar anotação.");
      }

      await loadNotes();
      resetNoteForm();

      showFeedback("success", "Anotação salva com sucesso.");
    } catch (error: any) {
      setNoteError(error.message || "Erro ao salvar anotação.");
    } finally {
      setSavingNote(false);
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

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const buttonSecondaryStyle = {
    backgroundColor: "#fff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>
          Carregando paciente...
        </h1>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ padding: "32px" }}>
        <Link
          href="/pacientes"
          style={{
            display: "inline-block",
            color: "#2563eb",
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          ← Voltar para pacientes
        </Link>

        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 700, margin: 0 }}>
            {error || "Paciente não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/pacientes"
          style={{
            display: "inline-block",
            color: "#2563eb",
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: "18px",
          }}
        >
          ← Voltar para pacientes
        </Link>

        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          {patient.name}
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#4f46e5",
            margin: 0,
          }}
        >
          Histórico de consultas, informações do paciente e anotações clínicas.
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
          Perfil do paciente
        </p>
        <p style={{ color: "#1e40af", margin: 0 }}>
          Esta página reúne dados principais, consultas vinculadas e anotações
          registradas pelo psicólogo.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "28px",
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
            E-mail
          </p>
          <p
            style={{
              color: "#111827",
              fontSize: "16px",
              fontWeight: 800,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {patient.email}
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
            Total de consultas
          </p>
          <p
            style={{
              color: "#111827",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {patient.totalAppointments}
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
            Agendadas
          </p>
          <p
            style={{
              color: "#065f46",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {patient.scheduledAppointments}
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
            {patient.cancelledAppointments}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "14px",
            }}
          >
            Próxima consulta
          </h2>

          {patient.nextAppointment ? (
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
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                {patient.nextAppointment.title}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Início:</strong>{" "}
                {formatDate(patient.nextAppointment.dateTime)}
              </p>

              {patient.nextAppointment.endDateTime && (
                <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                  <strong>Fim:</strong>{" "}
                  {formatDate(patient.nextAppointment.endDateTime)}
                </p>
              )}

              {patient.nextAppointment.location && (
                <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                  <strong>Local:</strong> {patient.nextAppointment.location}
                </p>
              )}

              {patient.nextAppointment.googleEventLink && (
                <a
                  href={patient.nextAppointment.googleEventLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#2563eb",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Abrir no Google Calendar
                </a>
              )}
            </div>
          ) : (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Este paciente não possui consulta futura agendada.
            </p>
          )}
        </section>

        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "14px",
            }}
          >
            Histórico de consultas
          </h2>

          {patient.appointments.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Nenhuma consulta vinculada a este paciente.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {patient.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 800,
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      {appointment.title}
                    </p>

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
                        padding: "4px 10px",
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
                    <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                      <strong>Descrição:</strong> {appointment.description}
                    </p>
                  )}

                  {appointment.googleEventLink && (
                    <a
                      href={appointment.googleEventLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        fontWeight: 700,
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: "20px",
        }}
      >
        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Nova anotação
          </h2>

          <p style={{ color: "#6b7280", marginBottom: "18px" }}>
            Registre observações clínicas, evolução do atendimento ou pontos
            importantes para acompanhamento.
          </p>

          {noteError && (
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
              {noteError}
            </div>
          )}

          <form noValidate onSubmit={handleCreateNote}>
            <div style={{ marginBottom: "14px" }}>
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
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Ex.: Registro da sessão"
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

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Consulta relacionada
              </label>

              <select
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
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
                <option value="">Sem vínculo com consulta específica</option>

                {appointmentOptions.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.title} — {formatDate(appointment.dateTime)}
                  </option>
                ))}
              </select>
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
                Anotação
              </label>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Escreva aqui as observações do atendimento..."
                rows={8}
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

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="submit"
                style={{
                  ...buttonPrimaryStyle,
                  opacity: savingNote ? 0.7 : 1,
                  cursor: savingNote ? "not-allowed" : "pointer",
                }}
                disabled={savingNote}
              >
                {savingNote ? "Salvando..." : "Salvar anotação"}
              </button>

              <button
                type="button"
                style={buttonSecondaryStyle}
                onClick={resetNoteForm}
                disabled={savingNote}
              >
                Limpar
              </button>
            </div>
          </form>
        </section>

        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Anotações do paciente
          </h2>

          <p style={{ color: "#6b7280", marginBottom: "18px" }}>
            Histórico de registros criados pelo psicólogo para este paciente.
          </p>

          {loadingNotes ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Carregando anotações...
            </p>
          ) : notes.length === 0 ? (
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
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "6px",
                }}
              >
                Nenhuma anotação registrada
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
                As anotações criadas para este paciente aparecerão aqui.
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
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    {note.title || "Anotação sem título"}
                  </p>

                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      marginBottom: "10px",
                    }}
                  >
                    Criada em {formatDate(note.createdAt)}
                  </p>

                  {note.appointment && (
                    <div
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: 800,
                        display: "inline-block",
                        marginBottom: "10px",
                      }}
                    >
                      Consulta: {note.appointment.title} —{" "}
                      {formatDate(note.appointment.dateTime)}
                    </div>
                  )}

                  <p
                    style={{
                      color: "#374151",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
