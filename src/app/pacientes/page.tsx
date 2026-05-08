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

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [patientEmailToLink, setPatientEmailToLink] = useState("");
  const [linkingPatient, setLinkingPatient] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [patientToUnlink, setPatientToUnlink] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [unlinkingPatientId, setUnlinkingPatientId] = useState("");

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

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function closeLinkModal() {
    setIsLinkModalOpen(false);
    setPatientEmailToLink("");
    setLinkError("");
  }

  async function handleLinkPatient(e: React.FormEvent) {
    e.preventDefault();

    setLinkError("");

    const email = patientEmailToLink.trim().toLowerCase();

    if (!email) {
      setLinkError("Informe o e-mail do paciente.");
      return;
    }

    try {
      setLinkingPatient(true);

      const response = await fetch("/api/patients/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao vincular paciente.");
      }

      await loadPatients();
      closeLinkModal();

      showFeedback("success", "Paciente vinculado com sucesso.");
    } catch (error: any) {
      setLinkError(error.message || "Erro ao vincular paciente.");
    } finally {
      setLinkingPatient(false);
    }
  }

  async function confirmUnlinkPatient() {
    if (!patientToUnlink) return;

    try {
      setUnlinkingPatientId(patientToUnlink.id);

      const response = await fetch("/api/patients/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: patientToUnlink.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao desvincular paciente.");
      }

      await loadPatients();

      setPatientToUnlink(null);

      showFeedback("success", "Paciente desvinculado com sucesso.");
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao desvincular paciente.");
    } finally {
      setUnlinkingPatientId("");
    }
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

  const buttonSecondaryStyle = {
    backgroundColor: "#fff",
    color: "#1f2937",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  return (
    <>
      <div style={{ padding: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
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

          <button
            type="button"
            style={buttonPrimaryStyle}
            onClick={() => setIsLinkModalOpen(true)}
          >
            Vincular paciente
          </button>
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
            Histórico do paciente
          </p>
          <p style={{ color: "#1e40af", margin: 0 }}>
            Esta área reúne os pacientes vinculados a você e será a base para
            histórico clínico, anotações e prontuário.
          </p>
        </div>

        {loading ? (
          <div style={cardStyle}>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Carregando pacientes...
            </p>
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
              Nenhum paciente vinculado
            </p>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Vincule um paciente pelo e-mail para começar a acompanhar
              consultas e anotações.
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

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={buttonPrimaryStyle}
                    onClick={() => {
                      window.location.href = `/pacientes/${patient.id}`;
                    }}
                  >
                    Ver detalhes
                  </button>

                  <button
                    type="button"
                    style={{
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() =>
                      setPatientToUnlink({
                        id: patient.id,
                        name: patient.name,
                      })
                    }
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLinkModalOpen && (
        <div
          onClick={closeLinkModal}
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
              maxWidth: "520px",
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
                Vincular paciente
              </h2>

              <p style={{ color: "#6b7280", margin: 0 }}>
                Informe o e-mail de um paciente já cadastrado para vinculá-lo ao
                seu acompanhamento.
              </p>
            </div>

            {linkError && (
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
                {linkError}
              </div>
            )}

            <form noValidate onSubmit={handleLinkPatient}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "8px",
                  }}
                >
                  E-mail do paciente
                </label>

                <input
                  type="email"
                  value={patientEmailToLink}
                  onChange={(e) => setPatientEmailToLink(e.target.value)}
                  placeholder="exemplo@email.com"
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

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={closeLinkModal}
                  style={buttonSecondaryStyle}
                  disabled={linkingPatient}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    ...buttonPrimaryStyle,
                    opacity: linkingPatient ? 0.7 : 1,
                    cursor: linkingPatient ? "not-allowed" : "pointer",
                  }}
                  disabled={linkingPatient}
                >
                  {linkingPatient ? "Vinculando..." : "Vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {patientToUnlink && (
        <div
          onClick={() => setPatientToUnlink(null)}
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
              Desvincular paciente?
            </h2>

            <p
              style={{
                color: "#4b5563",
                marginBottom: "18px",
                lineHeight: 1.5,
              }}
            >
              O paciente <strong>{patientToUnlink.name}</strong> será removido
              da sua lista de acompanhamento. Os registros já criados não serão
              apagados.
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
                onClick={() => setPatientToUnlink(null)}
                style={buttonSecondaryStyle}
                disabled={unlinkingPatientId === patientToUnlink.id}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmUnlinkPatient}
                disabled={unlinkingPatientId === patientToUnlink.id}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor:
                    unlinkingPatientId === patientToUnlink.id
                      ? "not-allowed"
                      : "pointer",
                  opacity: unlinkingPatientId === patientToUnlink.id ? 0.7 : 1,
                }}
              >
                {unlinkingPatientId === patientToUnlink.id
                  ? "Desvinculando..."
                  : "Confirmar desvinculação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
