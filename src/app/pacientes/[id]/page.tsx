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
  archived: boolean;
  archivedAt: string | null;
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

type NoteFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PatientTab = "SUMMARY" | "APPOINTMENTS" | "NOTES";

export default function PatientDetailsPage() {
  const params = useParams();
  const patientId = String(params.id);

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [archivingNoteId, setArchivingNoteId] = useState("");

  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const [editingNoteId, setEditingNoteId] = useState("");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("ACTIVE");
  const [activeTab, setActiveTab] = useState<PatientTab>("SUMMARY");

  const [noteToArchive, setNoteToArchive] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  async function loadNotes(filter: NoteFilter = noteFilter) {
    try {
      setLoadingNotes(true);
      setNoteError("");

      const response = await fetch(
        `/api/patients/${patientId}/notes?status=${filter}`,
        {
          cache: "no-store",
        },
      );

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
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadNotes(noteFilter);
    }
  }, [patientId, noteFilter]);

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
    setEditingNoteId("");
    setNoteError("");
  }

  function handleEditNote(note: PatientNote) {
    if (note.archived) {
      showFeedback("error", "Anotações arquivadas não podem ser editadas.");
      return;
    }

    setActiveTab("NOTES");
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteContent(note.content);
    setSelectedAppointmentId(note.appointmentId || "");
    setNoteError("");

    setTimeout(() => {
      const formElement = document.getElementById("note-form");
      formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleCreateOrUpdateNote(e: React.FormEvent) {
    e.preventDefault();

    setNoteError("");

    if (!noteContent.trim()) {
      setNoteError("Escreva o conteúdo da anotação antes de salvar.");
      return;
    }

    try {
      setSavingNote(true);

      const isEditing = Boolean(editingNoteId);

      const response = await fetch(
        isEditing
          ? `/api/patients/${patientId}/notes/${editingNoteId}`
          : `/api/patients/${patientId}/notes`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: noteTitle,
            content: noteContent,
            appointmentId: selectedAppointmentId || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEditing
              ? "Erro ao atualizar anotação."
              : "Erro ao salvar anotação."),
        );
      }

      await loadNotes(noteFilter);
      resetNoteForm();

      showFeedback(
        "success",
        isEditing
          ? "Anotação atualizada com sucesso."
          : "Anotação salva com sucesso.",
      );
    } catch (error: any) {
      setNoteError(error.message || "Erro ao salvar anotação.");
    } finally {
      setSavingNote(false);
    }
  }

  async function confirmArchiveNote() {
    if (!noteToArchive) return;

    try {
      setArchivingNoteId(noteToArchive.id);

      const response = await fetch(
        `/api/patients/${patientId}/notes/${noteToArchive.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao arquivar anotação.");
      }

      await loadNotes(noteFilter);
      setNoteToArchive(null);

      if (editingNoteId === noteToArchive.id) {
        resetNoteForm();
      }

      showFeedback("success", "Anotação arquivada com sucesso.");
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao arquivar anotação.");
    } finally {
      setArchivingNoteId("");
    }
  }

  const noteFilterInfo = {
    ACTIVE: {
      title: "Anotações ativas",
      emptyTitle: "Nenhuma anotação ativa",
      emptyDescription:
        "As anotações criadas para este paciente aparecerão aqui.",
    },
    ARCHIVED: {
      title: "Anotações arquivadas",
      emptyTitle: "Nenhuma anotação arquivada",
      emptyDescription:
        "As anotações arquivadas aparecerão aqui para consulta posterior.",
    },
    ALL: {
      title: "Todas as anotações",
      emptyTitle: "Nenhuma anotação registrada",
      emptyDescription:
        "Quando houver anotações para este paciente, elas aparecerão aqui.",
    },
  };

  const currentNoteFilterInfo = noteFilterInfo[noteFilter];

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
    textDecoration: "none",
    display: "inline-block",
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
    <>
      <div style={{ padding: "32px" }}>
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            <Link
              href="/pacientes"
              style={{
                display: "inline-block",
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ← Voltar para pacientes
            </Link>

            <Link
              href={`/agenda?patientId=${patient.id}`}
              style={buttonPrimaryStyle}
            >
              Agendar consulta
            </Link>
          </div>

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
            Acompanhe consultas, histórico e anotações internas do paciente.
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
            marginBottom: "24px",
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
            Consulte o histórico de atendimentos, acompanhe próximas consultas e
            registre anotações clínicas internas.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Resumo", value: "SUMMARY" },
            { label: "Consultas", value: "APPOINTMENTS" },
            { label: "Anotações", value: "NOTES" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as PatientTab)}
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

        {activeTab === "SUMMARY" && (
          <>
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
          </>
        )}

        {activeTab === "APPOINTMENTS" && (
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
                      <strong>Início:</strong>{" "}
                      {formatDate(appointment.dateTime)}
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
        )}

        {activeTab === "NOTES" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "20px",
            }}
          >
            <section id="note-form" style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                {editingNoteId ? "Editar anotação" : "Nova anotação"}
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Estas anotações são internas e não ficam visíveis para o
                paciente.
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

              <form noValidate onSubmit={handleCreateOrUpdateNote}>
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
                    <option value="">
                      Sem vínculo com consulta específica
                    </option>

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
                    {savingNote
                      ? "Salvando..."
                      : editingNoteId
                        ? "Atualizar anotação"
                        : "Salvar anotação"}
                  </button>

                  <button
                    type="button"
                    style={buttonSecondaryStyle}
                    onClick={resetNoteForm}
                    disabled={savingNote}
                  >
                    {editingNoteId ? "Cancelar edição" : "Limpar"}
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
                {currentNoteFilterInfo.title}
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Histórico de registros criados pelo psicólogo para este
                paciente.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { label: "Ativas", value: "ACTIVE" },
                  { label: "Arquivadas", value: "ARCHIVED" },
                  { label: "Todas", value: "ALL" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setNoteFilter(filter.value as NoteFilter)}
                    style={{
                      border:
                        noteFilter === filter.value
                          ? "1px solid #2563eb"
                          : "1px solid #d1d5db",
                      backgroundColor:
                        noteFilter === filter.value ? "#eff6ff" : "#fff",
                      color:
                        noteFilter === filter.value ? "#1d4ed8" : "#374151",
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
                    {currentNoteFilterInfo.emptyTitle}
                  </p>

                  <p style={{ color: "#6b7280", margin: 0 }}>
                    {currentNoteFilterInfo.emptyDescription}
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
                        backgroundColor: note.archived ? "#f9fafb" : "#f8fafc",
                        opacity: note.archived ? 0.85 : 1,
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
                          {note.title || "Anotação sem título"}
                        </p>

                        <span
                          style={{
                            backgroundColor: note.archived
                              ? "#f3f4f6"
                              : "#ecfdf5",
                            color: note.archived ? "#374151" : "#065f46",
                            border: note.archived
                              ? "1px solid #d1d5db"
                              : "1px solid #a7f3d0",
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {note.archived ? "Arquivada" : "Ativa"}
                        </span>
                      </div>

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                          marginBottom: "10px",
                        }}
                      >
                        Criada em {formatDate(note.createdAt)}
                        {note.updatedAt !== note.createdAt
                          ? ` · Atualizada em ${formatDate(note.updatedAt)}`
                          : ""}
                      </p>

                      {note.archived && note.archivedAt && (
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "13px",
                            marginBottom: "10px",
                          }}
                        >
                          Arquivada em {formatDate(note.archivedAt)}
                        </p>
                      )}

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
                          marginBottom: "14px",
                        }}
                      >
                        {note.content}
                      </p>

                      {!note.archived && (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditNote(note)}
                            style={{
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setNoteToArchive({
                                id: note.id,
                                title: note.title || "Anotação sem título",
                              })
                            }
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "10px",
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Arquivar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {noteToArchive && (
        <div
          onClick={() => setNoteToArchive(null)}
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
              maxWidth: "480px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#111827",
                marginBottom: "10px",
              }}
            >
              Arquivar anotação?
            </h2>

            <p
              style={{
                color: "#4b5563",
                marginBottom: "18px",
                lineHeight: 1.5,
              }}
            >
              A anotação <strong>{noteToArchive.title}</strong> será arquivada e
              deixará de aparecer na lista principal. Ela não será apagada do
              banco.
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
                onClick={() => setNoteToArchive(null)}
                style={buttonSecondaryStyle}
                disabled={archivingNoteId === noteToArchive.id}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmArchiveNote}
                disabled={archivingNoteId === noteToArchive.id}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor:
                    archivingNoteId === noteToArchive.id
                      ? "not-allowed"
                      : "pointer",
                  opacity: archivingNoteId === noteToArchive.id ? 0.7 : 1,
                }}
              >
                {archivingNoteId === noteToArchive.id
                  ? "Arquivando..."
                  : "Confirmar arquivamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
