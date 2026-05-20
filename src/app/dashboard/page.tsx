"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardData = {
  psychologist: {
    id: string;
    name: string;
    email: string;
  };
  metrics: {
    activePatientsCount: number;
    todayAppointmentsCount: number;
    scheduledAppointmentsCount: number;
    cancelledAppointmentsThisMonthCount: number;
    recentCheckinsCount: number;
    recentNotesCount: number;
  };
  nextAppointment: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    location: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
  } | null;
  todayAppointments: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    location: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
  }[];
  recentCancelledAppointments: {
    id: string;
    title: string;
    dateTime: string;
    cancelledAt: string | null;
    cancellationReason: string;
    patientId: string;
    patientName: string;
  }[];
  recentCheckins: {
    id: string;
    patientId: string;
    patientName: string;
    appointmentId: string;
    appointmentTitle: string;
    appointmentDateTime: string;
    moodLevel: number | null;
    anxietyLevel: number | null;
    sleepLevel: number | null;
    mainConcern: string;
    importantEvents: string;
    topicsToDiscuss: string;
    updatedAt: string;
  }[];
  recentNotes: {
    id: string;
    patientId: string;
    patientName: string;
    title: string;
    updatedAt: string;
  }[];
  recommendations: string[];
};

export default function PsychologistDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/psychologist", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao carregar dashboard.");
      }

      setData(result);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const metricCardStyle = {
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
          Carregando dashboard...
        </h1>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "32px" }}>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            color: "#111827",
            marginBottom: "18px",
          }}
        >
          Dashboard
        </h1>

        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 700, margin: 0 }}>
            {error || "Não foi possível carregar o dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          marginBottom: "28px",
        }}
      >
        <div>
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
            Bem-vindo, {data.psychologist.name}. Acompanhe sua rotina de
            atendimentos e pendências clínicas.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/agenda" style={primaryButtonStyle}>
            Nova consulta
          </Link>

          <Link href="/pacientes" style={secondaryButtonStyle}>
            Ver pacientes
          </Link>
        </div>
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
          Central do psicólogo
        </p>

        <p style={{ color: "#1e40af", margin: 0 }}>
          Visualize consultas, checklists pré-sessão, pacientes e registros
          recentes em um só lugar.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={metricCardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Pacientes ativos
          </p>
          <p
            style={{
              color: "#111827",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {data.metrics.activePatientsCount}
          </p>
        </div>

        <div style={metricCardStyle}>
          <p
            style={{ color: "#2563eb", fontSize: "14px", marginBottom: "8px" }}
          >
            Consultas hoje
          </p>
          <p
            style={{
              color: "#2563eb",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {data.metrics.todayAppointmentsCount}
          </p>
        </div>

        <div style={metricCardStyle}>
          <p
            style={{ color: "#065f46", fontSize: "14px", marginBottom: "8px" }}
          >
            Consultas futuras
          </p>
          <p
            style={{
              color: "#065f46",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {data.metrics.scheduledAppointmentsCount}
          </p>
        </div>

        <div style={metricCardStyle}>
          <p
            style={{ color: "#b45309", fontSize: "14px", marginBottom: "8px" }}
          >
            Checklists recentes
          </p>
          <p
            style={{
              color: "#b45309",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {data.metrics.recentCheckinsCount}
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

          {data.nextAppointment ? (
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
                {data.nextAppointment.title}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Paciente:</strong> {data.nextAppointment.patientName}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Início:</strong>{" "}
                {formatDate(data.nextAppointment.dateTime)}
              </p>

              {data.nextAppointment.endDateTime && (
                <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                  <strong>Fim:</strong>{" "}
                  {formatDate(data.nextAppointment.endDateTime)}
                </p>
              )}

              {data.nextAppointment.location && (
                <p style={{ color: "#4b5563", marginBottom: "14px" }}>
                  <strong>Local:</strong> {data.nextAppointment.location}
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link
                  href={`/pacientes/${data.nextAppointment.patientId}`}
                  style={secondaryButtonStyle}
                >
                  Ver paciente
                </Link>

                <Link href="/agenda" style={primaryButtonStyle}>
                  Abrir agenda
                </Link>
              </div>
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

              <p style={{ color: "#6b7280", marginBottom: "14px" }}>
                Crie novos horários na agenda para acompanhar seus atendimentos.
              </p>

              <Link href="/agenda" style={primaryButtonStyle}>
                Abrir agenda
              </Link>
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
            Ações recomendadas
          </h2>

          {data.recommendations.length === 0 ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p style={{ color: "#6b7280", margin: 0 }}>
                Nenhuma recomendação no momento.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {data.recommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "14px",
                    padding: "14px",
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                >
                  {recommendation}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
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
            Checklists pré-sessão recentes
          </h2>

          {data.recentCheckins.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Nenhum checklist respondido recentemente.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {data.recentCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "14px",
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
                    {checkin.patientName}
                  </p>

                  <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                    {checkin.appointmentTitle} ·{" "}
                    {formatDate(checkin.appointmentDateTime)}
                  </p>

                  <p style={{ color: "#4b5563", marginBottom: "10px" }}>
                    Humor: {checkin.moodLevel ?? "--"}/10 · Ansiedade:{" "}
                    {checkin.anxietyLevel ?? "--"}/10 · Sono:{" "}
                    {checkin.sleepLevel ?? "--"}/10
                  </p>

                  <Link
                    href={`/pacientes/${checkin.patientId}`}
                    style={secondaryButtonStyle}
                  >
                    Ver paciente
                  </Link>
                </div>
              ))}
            </div>
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
            Anotações recentes
          </h2>

          {data.recentNotes.length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>
              Nenhuma anotação recente registrada.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {data.recentNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "14px",
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
                    {note.title}
                  </p>

                  <p style={{ color: "#4b5563", marginBottom: "10px" }}>
                    Paciente: {note.patientName} · Atualizada em{" "}
                    {formatDate(note.updatedAt)}
                  </p>

                  <Link
                    href={`/pacientes/${note.patientId}`}
                    style={secondaryButtonStyle}
                  >
                    Ver paciente
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
