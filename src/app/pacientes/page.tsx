"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errorUtils";
import PsicoPageSkeleton from "@/components/PsicoPageSkeleton";

type PatientSummary = {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string | null;
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

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "purple" | "red" | "slate";
};

const INITIAL_VISIBLE_PATIENTS = 8;

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

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showAllPatients, setShowAllPatients] = useState(false);

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
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Erro ao carregar pacientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    setShowAllPatients(false);
  }, [searchTerm]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return patients;
    }

    return patients.filter((patient) => {
      const name = patient.name.toLowerCase();
      const email = patient.email.toLowerCase();

      return (
        name.includes(normalizedSearch) || email.includes(normalizedSearch)
      );
    });
  }, [patients, searchTerm]);

  const visiblePatients = useMemo(() => {
    if (searchTerm.trim()) {
      return filteredPatients;
    }

    return showAllPatients
      ? filteredPatients
      : filteredPatients.slice(0, INITIAL_VISIBLE_PATIENTS);
  }, [filteredPatients, searchTerm, showAllPatients]);

  const hiddenPatientsCount = Math.max(
    filteredPatients.length - visiblePatients.length,
    0,
  );

  const patientsWithFutureAppointment = useMemo(() => {
    return patients.filter((patient) => patient.nextAppointment).length;
  }, [patients]);

  const totalScheduledAppointments = useMemo(() => {
    return patients.reduce(
      (total, patient) => total + patient.scheduledAppointments,
      0,
    );
  }, [patients]);

  const totalCancelledAppointments = useMemo(() => {
    return patients.reduce(
      (total, patient) => total + patient.cancelledAppointments,
      0,
    );
  }, [patients]);

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

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "P";
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

      showFeedback(
        "success",
        data?.message ||
          "Solicitação enviada. O paciente precisa aceitar o vínculo antes de aparecer na sua lista.",
      );
    } catch (error: unknown) {
      setLinkError(getErrorMessage(error, "Erro ao vincular paciente."));
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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao desvincular paciente."));
    } finally {
      setUnlinkingPatientId("");
    }
  }

  const pageStyle = {
    padding: "36px",
    paddingBottom: "160px",
    minHeight: "calc(100vh - 48px)",
    background:
      "radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%), #f8fafc",
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

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
  } as const;

  const buttonSecondaryStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const buttonDangerStyle = {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
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
        className="patients-metric-card"
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
      <PsicoPageSkeleton
        variant="patients"
        title="Carregando pacientes"
        subtitle="Buscando vínculos, próximos atendimentos e dados principais dos pacientes."
      />
    );
  }

  return (
    <>
      <div className="patients-page" style={pageStyle}>
        <section
          className="patients-hero"
          style={{
            background:
              "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
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
                <i className="fa-solid fa-users"></i>
                Gestão de pacientes
              </span>

              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  marginBottom: "10px",
                }}
              >
                Pacientes
              </h1>

              <p
                style={{
                  fontSize: "18px",
                  color: "#dbeafe",
                  maxWidth: "780px",
                  margin: 0,
                }}
              >
                Gerencie vínculos, acompanhe próximas consultas e acesse
                registros clínicos, tarefas, checklists e materiais de cada
                paciente.
              </p>
            </div>

            <button
              type="button"
              style={{
                ...buttonPrimaryStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
              }}
              onClick={() => setIsLinkModalOpen(true)}
            >
              Vincular paciente
            </button>
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

        <div
          className="patients-metrics-grid"
          style={{
            display: "grid",
            gap: "18px",
            marginBottom: "24px",
          }}
        >
          <MetricCard
            label="Pacientes vinculados"
            value={patients.length}
            description="Pacientes ativos na sua lista."
            icon="fa-solid fa-user-group"
            tone="slate"
          />

          <MetricCard
            label="Com próxima consulta"
            value={patientsWithFutureAppointment}
            description="Pacientes com atendimento futuro."
            icon="fa-solid fa-calendar-check"
            tone="blue"
          />

          <MetricCard
            label="Consultas ativas"
            value={totalScheduledAppointments}
            description="Total de consultas agendadas."
            icon="fa-solid fa-clock"
            tone="green"
          />

          <MetricCard
            label="Cancelamentos"
            value={totalCancelledAppointments}
            description="Consultas canceladas no histórico."
            icon="fa-solid fa-calendar-xmark"
            tone="red"
          />
        </div>

        <section className="patients-search-card" style={{ ...cardStyle, marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Buscar paciente
              </label>

              <div style={{ position: "relative" }}>
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                ></i>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite nome ou e-mail do paciente"
                  style={{
                    ...inputStyle,
                    paddingLeft: "42px",
                  }}
                />
              </div>
            </div>

            {searchTerm && (
              <button
                type="button"
                style={buttonSecondaryStyle}
                onClick={() => setSearchTerm("")}
              >
                Limpar busca
              </button>
            )}
          </div>

          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
            {patients.length === 0
              ? "Nenhum paciente vinculado até o momento."
              : searchTerm
                ? `${filteredPatients.length} de ${patients.length} paciente(s) encontrado(s).`
                : `${patients.length} paciente(s) vinculado(s).`}
          </p>
        </section>

        {loading ? (
          <div style={cardStyle}>
            <p style={{ color: "#64748b", margin: 0 }}>
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
            <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
              {error}
            </p>
          </div>
        ) : patients.length === 0 ? (
          <div style={cardStyle}>
            <p
              style={{
                color: "#0f172a",
                fontWeight: 900,
                marginBottom: "6px",
              }}
            >
              Nenhum paciente vinculado
            </p>
            <p style={{ color: "#64748b", marginBottom: "16px" }}>
              Vincule um paciente pelo e-mail para começar a acompanhar
              consultas, anotações, tarefas e materiais.
            </p>

            <button
              type="button"
              style={buttonPrimaryStyle}
              onClick={() => setIsLinkModalOpen(true)}
            >
              Vincular primeiro paciente
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={cardStyle}>
            <p
              style={{
                color: "#0f172a",
                fontWeight: 900,
                marginBottom: "6px",
              }}
            >
              Nenhum resultado encontrado
            </p>
            <p style={{ color: "#64748b", margin: 0 }}>
              Não encontramos paciente vinculado com esse nome ou e-mail.
            </p>
          </div>
        ) : (
          <div
            className="patients-cards-grid"
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            {visiblePatients.map((patient) => (
              <div
                key={patient.id}
                className="patient-card"
                style={{
                  ...cardStyle,
                  padding: "22px",
                }}
              >
                <div
                  className="patient-card-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    {patient.profileImageUrl ? (
                      <Image
                        src={patient.profileImageUrl}
                        alt={`Foto de ${patient.name}`}
                        width={58}
                        height={58}
                        style={{
                          width: "58px",
                          height: "58px",
                          borderRadius: "18px",
                          objectFit: "cover",
                          border: "2px solid #bfdbfe",
                          boxShadow: "0 10px 22px rgba(15, 23, 42, 0.12)",
                          marginBottom: "12px",
                          backgroundColor: "#eff6ff",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "58px",
                          height: "58px",
                          borderRadius: "18px",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          fontWeight: 900,
                          marginBottom: "12px",
                        }}
                      >
                        {getInitials(patient.name)}
                      </div>
                    )}

                    <h2
                      style={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "#0f172a",
                        marginBottom: "6px",
                      }}
                    >
                      {patient.name}
                    </h2>

                    <p style={{ color: "#64748b", margin: 0 }}>
                      {patient.email}
                    </p>
                  </div>

                  <span
                    style={{
                      backgroundColor: patient.nextAppointment
                        ? "#ecfdf5"
                        : "#f8fafc",
                      color: patient.nextAppointment ? "#047857" : "#64748b",
                      border: patient.nextAppointment
                        ? "1px solid #a7f3d0"
                        : "1px solid #e2e8f0",
                      borderRadius: "999px",
                      padding: "6px 11px",
                      fontSize: "12px",
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {patient.nextAppointment ? "Com consulta" : "Sem consulta"}
                  </span>
                </div>

                <div
                  className="patient-card-actions"
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
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
                    style={buttonSecondaryStyle}
                    onClick={() => {
                      window.location.href = `/agenda?patientId=${patient.id}`;
                    }}
                  >
                    Agendar
                  </button>

                  <button
                    type="button"
                    style={buttonDangerStyle}
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

                <div
                  className="patient-mini-stats-grid"
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        marginBottom: "4px",
                        fontWeight: 800,
                      }}
                    >
                      Total
                    </p>
                    <p
                      style={{
                        color: "#0f172a",
                        fontSize: "24px",
                        fontWeight: 900,
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
                      borderRadius: "14px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        color: "#065f46",
                        fontSize: "12px",
                        marginBottom: "4px",
                        fontWeight: 800,
                      }}
                    >
                      Ativas
                    </p>
                    <p
                      style={{
                        color: "#065f46",
                        fontSize: "24px",
                        fontWeight: 900,
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
                      borderRadius: "14px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        color: "#b91c1c",
                        fontSize: "12px",
                        marginBottom: "4px",
                        fontWeight: 800,
                      }}
                    >
                      Canceladas
                    </p>
                    <p
                      style={{
                        color: "#b91c1c",
                        fontSize: "24px",
                        fontWeight: 900,
                        margin: 0,
                      }}
                    >
                      {patient.cancelledAppointments}
                    </p>
                  </div>
                </div>

                <div
                  className="patient-next-appointment-card"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 900,
                      color: "#0f172a",
                      marginBottom: "6px",
                    }}
                  >
                    Próxima consulta
                  </p>

                  {patient.nextAppointment ? (
                    <>
                      <p style={{ color: "#475569", marginBottom: "4px" }}>
                        {patient.nextAppointment.title}
                      </p>
                      <p style={{ color: "#64748b", margin: 0 }}>
                        {formatDate(patient.nextAppointment.dateTime)}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: "#64748b", margin: 0 }}>
                      Sem consulta futura agendada.
                    </p>
                  )}
                </div>


              </div>
            ))}

            {hiddenPatientsCount > 0 && (
              <button
                type="button"
                style={{
                  ...buttonSecondaryStyle,
                  gridColumn: "1 / -1",
                  width: "100%",
                }}
                onClick={() => setShowAllPatients(true)}
              >
                Exibir mais {hiddenPatientsCount} paciente(s)
              </button>
            )}
          </div>
        )}


      <style>{`
        .patients-page {
          width: 100%;
        }

        .patients-hero,
        .patients-search-card,
        .patients-metric-card,
        .patient-card,
        .patient-next-appointment-card {
          min-width: 0;
        }

        .patients-hero h1,
        .patients-hero h1 *,
        .patients-hero p,
        .patients-hero span {
          color: #ffffff !important;
        }

        .patients-metrics-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 18px !important;
        }

        .patients-cards-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
          gap: 20px !important;
        }

        .patient-mini-stats-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .patient-card-actions button {
          min-width: 0;
        }

        @media (max-width: 1180px) {
          .patients-page {
            padding: 28px !important;
            padding-bottom: 130px !important;
          }

          .patients-metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-bottom: 18px !important;
          }

          .patients-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }

          .patients-metric-card {
            min-height: 112px !important;
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .patients-metric-card p:last-child {
            font-size: 12px !important;
          }
        }

        @media (max-width: 900px) {
          .patients-page {
            padding: 20px !important;
            padding-bottom: 120px !important;
            border-radius: 24px !important;
          }

          .patients-hero {
            padding: 24px !important;
            border-radius: 24px !important;
            margin-bottom: 18px !important;
          }

          .patients-hero > div:last-child {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .patients-hero h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .patients-hero p {
            font-size: 15px !important;
            line-height: 1.45 !important;
          }

          .patients-hero button {
            width: 100% !important;
            padding: 11px 14px !important;
            font-size: 13px !important;
          }

          .patients-metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 9px !important;
            margin-bottom: 14px !important;
          }

          .patients-metric-card {
            min-height: 96px !important;
            padding: 10px !important;
            border-radius: 16px !important;
          }

          .patients-metric-card > div:nth-child(2) {
            height: 100% !important;
            display: flex !important;
            flex-direction: column-reverse !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          .patients-metric-card p:first-child {
            font-size: 10.5px !important;
            line-height: 1.08 !important;
            margin-bottom: 4px !important;
          }

          .patients-metric-card p:nth-child(2) {
            font-size: 22px !important;
            line-height: 1 !important;
          }

          .patients-metric-card > p:last-child {
            display: none !important;
          }

          .patients-metric-card > div:nth-child(2) > div:last-child {
            width: 28px !important;
            height: 28px !important;
            border-radius: 10px !important;
            font-size: 12px !important;
          }

          .patients-search-card {
            padding: 18px !important;
            border-radius: 20px !important;
            margin-bottom: 18px !important;
          }

          .patients-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }

          .patient-card {
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .patient-card-header {
            gap: 10px !important;
            margin-bottom: 14px !important;
          }

          .patient-card h2 {
            font-size: 20px !important;
          }

          .patient-card-actions {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .patient-card-actions button {
            width: 100% !important;
            padding: 10px 10px !important;
            font-size: 12.5px !important;
            border-radius: 12px !important;
          }

          .patient-mini-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .patient-mini-stats-grid > div {
            padding: 10px !important;
            border-radius: 13px !important;
          }

          .patient-mini-stats-grid p:first-child {
            font-size: 11px !important;
            line-height: 1.05 !important;
          }

          .patient-mini-stats-grid p:last-child {
            font-size: 21px !important;
          }
        }

        @media (max-width: 640px) {
          .patients-page {
            padding: 16px !important;
            padding-bottom: 110px !important;
            border-radius: 20px !important;
          }

          .patients-hero {
            padding: 18px !important;
            border-radius: 22px !important;
            margin-bottom: 14px !important;
          }

          .patients-hero span {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin-bottom: 10px !important;
          }

          .patients-hero h1 {
            font-size: 28px !important;
            line-height: 1.08 !important;
            margin-bottom: 0 !important;
          }

          .patients-hero p {
            display: none !important;
          }

          .patients-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 14px !important;
          }

          .patients-metric-card {
            min-height: 84px !important;
            padding: 9px !important;
            border-radius: 15px !important;
          }

          .patients-metric-card p:first-child {
            font-size: 9.5px !important;
            line-height: 1.05 !important;
          }

          .patients-metric-card p:nth-child(2) {
            font-size: 21px !important;
          }

          .patients-metric-card > div:nth-child(2) > div:last-child {
            width: 25px !important;
            height: 25px !important;
            border-radius: 9px !important;
            font-size: 10.5px !important;
          }

          .patients-search-card {
            padding: 16px !important;
            border-radius: 18px !important;
            margin-bottom: 14px !important;
          }

          .patients-search-card > div:first-child {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .patients-search-card button {
            width: 100% !important;
            padding: 10px 12px !important;
            font-size: 12.5px !important;
          }

          .patients-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .patient-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .patient-card-header {
            flex-direction: row !important;
            align-items: flex-start !important;
          }

          .patient-card-header img,
          .patient-card-header > div > div:first-child {
            width: 50px !important;
            height: 50px !important;
            border-radius: 16px !important;
            margin-bottom: 10px !important;
          }

          .patient-card h2 {
            font-size: 19px !important;
            margin-bottom: 4px !important;
          }

          .patient-card p {
            font-size: 13px !important;
          }

          .patient-card-actions {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .patient-card-actions button {
            padding: 9px 7px !important;
            font-size: 11.5px !important;
            border-radius: 11px !important;
          }

          .patient-mini-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
            margin-bottom: 12px !important;
          }

          .patient-mini-stats-grid > div {
            padding: 8px !important;
            border-radius: 12px !important;
          }

          .patient-mini-stats-grid p:first-child {
            font-size: 10px !important;
            margin-bottom: 3px !important;
          }

          .patient-mini-stats-grid p:last-child {
            font-size: 19px !important;
          }

          .patient-next-appointment-card {
            padding: 12px !important;
            margin-bottom: 12px !important;
            border-radius: 14px !important;
          }
        }

        @media (max-width: 430px) {
          .patients-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .patients-metric-card {
            min-height: 80px !important;
            padding: 8px !important;
          }

          .patients-cards-grid {
            grid-template-columns: 1fr !important;
          }

          .patient-card-actions {
            grid-template-columns: 1fr !important;
          }

          .patient-mini-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        /* Ajuste final: manter números das métricas visíveis no mobile */
        @media (max-width: 900px) {
          .patients-metric-card > p:last-child {
            display: none !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:first-child {
            display: block !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:nth-child(2) {
            display: block !important;
            font-size: 22px !important;
            line-height: 1 !important;
            margin: 0 !important;
          }
        }

        @media (max-width: 640px) {
          .patients-metric-card > div:nth-child(2) > div:first-child > p:nth-child(2) {
            display: block !important;
            font-size: 21px !important;
            line-height: 1 !important;
            margin: 0 !important;
          }
        }

        @media (max-width: 430px) {
          .patients-metric-card > div:nth-child(2) > div:first-child > p:nth-child(2) {
            display: block !important;
            font-size: 20px !important;
          }
        }


        /* Ajuste final: número à direita nos cards de métricas no celular */
        @media (max-width: 640px) {
          .patients-metric-card {
            min-height: 82px !important;
            padding: 10px 12px !important;
          }

          .patients-metric-card > div:nth-child(2) {
            display: block !important;
            height: auto !important;
            gap: 0 !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child {
            width: 100% !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:first-child {
            display: block !important;
            flex: 1 1 auto !important;
            max-width: calc(100% - 42px) !important;
            margin: 0 !important;
            font-size: 9.5px !important;
            line-height: 1.08 !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:nth-child(2) {
            display: block !important;
            flex: 0 0 auto !important;
            margin: 0 !important;
            text-align: right !important;
            font-size: 22px !important;
            line-height: 1 !important;
          }

          .patients-metric-card > div:nth-child(2) > div:last-child {
            margin-top: 12px !important;
            width: 25px !important;
            height: 25px !important;
            border-radius: 9px !important;
            font-size: 10.5px !important;
          }
        }

        @media (max-width: 430px) {
          .patients-metric-card {
            min-height: 78px !important;
            padding: 9px 10px !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:first-child {
            max-width: calc(100% - 38px) !important;
            font-size: 9px !important;
          }

          .patients-metric-card > div:nth-child(2) > div:first-child > p:nth-child(2) {
            font-size: 21px !important;
          }

          .patients-metric-card > div:nth-child(2) > div:last-child {
            margin-top: 10px !important;
            width: 24px !important;
            height: 24px !important;
            font-size: 10px !important;
          }
        }

      `}</style>


        <div style={{ height: "96px" }} />
      </div>

      {isLinkModalOpen && (
        <div
          onClick={closeLinkModal}
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
              maxWidth: "540px",
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
                <i className="fa-solid fa-link"></i>
                Novo vínculo
              </span>

              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Vincular paciente
              </h2>

              <p style={{ color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                Informe o e-mail de um paciente já cadastrado. O vínculo ficará
                pendente até o paciente aceitar a solicitação.
              </p>
            </div>

            {linkError && (
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
                {linkError}
              </div>
            )}

            <form noValidate onSubmit={handleLinkPatient}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 900,
                    color: "#0f172a",
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
                  style={inputStyle}
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
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1001,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "500px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "30px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
              border: "1px solid #e2e8f0",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                borderRadius: "999px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 900,
                marginBottom: "12px",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              Confirmação
            </span>

            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "10px",
              }}
            >
              Desvincular paciente?
            </h2>

            <p
              style={{
                color: "#475569",
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
                flexWrap: "wrap",
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
                  ...buttonDangerStyle,
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
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
