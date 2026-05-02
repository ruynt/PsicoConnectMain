"use client";

import { useEffect, useState } from "react";

type PatientSummary = {
  id: string;
  name: string;
  email: string;
  totalAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  nextAppointment: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    status: string;
  } | null;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPatients() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/patients", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar pacientes.");
      }

      setPatients(data.patients || []);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar pacientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

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
          Pacientes
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "#4f46e5",
            margin: 0,
          }}
        >
          Acompanhe seus pacientes, consultas vinculadas e próximos
          atendimentos.
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
          Histórico do paciente
        </p>
        <p style={{ color: "#1e40af", margin: 0 }}>
          Esta área reúne os pacientes cadastrados e será a base para histórico
          clínico, anotações e prontuário.
        </p>
      </div>

      {loading ? (
        <div style={cardStyle}>
          <p style={{ color: "#6b7280", margin: 0 }}>Carregando pacientes...</p>
        </div>
      ) : error ? (
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 700, margin: 0 }}>
            {error}
          </p>
        </div>
      ) : patients.length === 0 ? (
        <div style={cardStyle}>
          <p
            style={{
              color: "#111827",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            Nenhum paciente encontrado
          </p>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Quando houver pacientes cadastrados, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {patients.map((patient) => (
            <div key={patient.id} style={cardStyle}>
              <div style={{ marginBottom: "16px" }}>
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {patient.name}
                </h2>

                <p style={{ color: "#6b7280", margin: 0 }}>{patient.email}</p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    Total
                  </p>
                  <p
                    style={{
                      color: "#111827",
                      fontSize: "22px",
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {patient.totalAppointments}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <p
                    style={{
                      color: "#065f46",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    Ativas
                  </p>
                  <p
                    style={{
                      color: "#065f46",
                      fontSize: "22px",
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    {patient.scheduledAppointments}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <p
                    style={{
                      color: "#b91c1c",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    Canceladas
                  </p>
                  <p
                    style={{
                      color: "#b91c1c",
                      fontSize: "22px",
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
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  Próxima consulta
                </p>

                {patient.nextAppointment ? (
                  <>
                    <p style={{ color: "#4b5563", marginBottom: "4px" }}>
                      {patient.nextAppointment.title}
                    </p>
                    <p style={{ color: "#6b7280", margin: 0 }}>
                      {formatDate(patient.nextAppointment.dateTime)}
                    </p>
                  </>
                ) : (
                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Sem consulta futura agendada.
                  </p>
                )}
              </div>

              <button
                type="button"
                style={buttonPrimaryStyle}
                onClick={() => {
                  window.location.href = `/pacientes/${patient.id}`;
                }}
              >
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
