"use client";

import Link from "next/link";
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

export default function PatientHomePage() {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAppointments() {
    try {
      setLoading(true);
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
    return appointments.filter(
      (appointment) => appointment.status === "CANCELLED",
    );
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0] || null;

  const pendingCheckins = useMemo(() => {
    return upcomingAppointments.filter(
      (appointment) => !appointment.preSessionCheckin,
    );
  }, [upcomingAppointments]);

  const answeredCheckins = useMemo(() => {
    return appointments.filter((appointment) => appointment.preSessionCheckin);
  }, [appointments]);

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

  const smallCardStyle = {
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

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827" }}>
          Carregando início...
        </h1>
      </div>
    );
  }

  return (
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
          Início
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#4f46e5",
            margin: 0,
          }}
        >
          Acompanhe seus atendimentos, checklists e informações importantes do
          seu acompanhamento.
        </p>
      </div>

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
          Use esta página para visualizar sua próxima consulta e acompanhar
          pendências importantes antes do atendimento.
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
              color: "#b45309",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            Checklists pendentes
          </p>

          <p
            style={{
              color: "#b45309",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {pendingCheckins.length}
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
            Checklists respondidos
          </p>

          <p
            style={{
              color: "#065f46",
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {answeredCheckins.length}
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
            Consultas canceladas
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
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "20px",
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

          {nextAppointment ? (
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
                {nextAppointment.title}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Profissional:</strong>{" "}
                {nextAppointment.psychologist.name}
              </p>

              <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                <strong>Início:</strong> {formatDate(nextAppointment.dateTime)}
              </p>

              {nextAppointment.endDateTime && (
                <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                  <strong>Fim:</strong>{" "}
                  {formatDate(nextAppointment.endDateTime)}
                </p>
              )}

              {nextAppointment.location && (
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  <strong>Local:</strong> {nextAppointment.location}
                </p>
              )}

              {nextAppointment.preSessionCheckin ? (
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 700,
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
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "14px",
                    fontWeight: 700,
                  }}
                >
                  Você ainda possui um checklist pré-sessão pendente.
                </div>
              )}

              <Link href="/minhas-consultas" style={primaryButtonStyle}>
                Ver minhas consultas
              </Link>
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

              <p style={{ color: "#6b7280", margin: 0 }}>
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
              fontWeight: 800,
              color: "#111827",
              marginBottom: "14px",
            }}
          >
            Próximas funcionalidades
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
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
                  marginBottom: "4px",
                }}
              >
                Tarefas terapêuticas
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Em breve, tarefas combinadas em atendimento aparecerão nesta
                área.
              </p>
            </div>

            <div
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
                  marginBottom: "4px",
                }}
              >
                Materiais psicoeducativos
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Materiais enviados pelo profissional poderão ser acessados pelo
                paciente.
              </p>
            </div>

            <div
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
                  marginBottom: "4px",
                }}
              >
                Solicitações
              </p>

              <p style={{ color: "#6b7280", margin: 0 }}>
                O paciente poderá solicitar alterações ou cancelamentos de
                consultas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
