"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type CrpStatus = "PENDING" | "APPROVED" | "REJECTED";

type PsychologistStatus = {
  user: {
    name: string;
    email: string;
  };
  psychologist: {
    id: string;
    crp: string;
    crpState: string | null;
    crpRegion: string | null;
    crpNumber: string | null;
    crpVerificationStatus: CrpStatus;
    crpVerifiedAt: string | null;
    crpRejectedAt: string | null;
    crpRejectionReason: string | null;
  };
};

const stateOptions = [
  { uf: "AC", region: "24" },
  { uf: "AL", region: "15" },
  { uf: "AM", region: "20" },
  { uf: "BA", region: "03" },
  { uf: "CE", region: "11" },
  { uf: "DF", region: "01" },
  { uf: "ES", region: "16" },
  { uf: "GO", region: "09" },
  { uf: "MA", region: "22" },
  { uf: "MG", region: "04" },
  { uf: "MS", region: "14" },
  { uf: "MT", region: "18" },
  { uf: "PB", region: "13" },
  { uf: "PE", region: "02" },
  { uf: "PI", region: "21" },
  { uf: "PR", region: "08" },
  { uf: "RJ", region: "05" },
  { uf: "RN", region: "17" },
  { uf: "RO", region: "23" },
  { uf: "RS", region: "07" },
  { uf: "SC", region: "12" },
  { uf: "SE", region: "19" },
  { uf: "SP", region: "06" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        color: "#001e5e",
        fontSize: "13px",
        fontWeight: 900,
        marginBottom: "8px",
      }}
    >
      {children}
    </label>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid #cfe0ff",
    borderRadius: "14px",
    padding: "12px 14px",
    color: "#001e5e",
    fontSize: "15px",
    outline: "none",
    backgroundColor: "#ffffff",
  };
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AguardandoVerificacaoPage() {
  const [data, setData] = useState<PsychologistStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [crpState, setCrpState] = useState("PB");
  const [crpRegion, setCrpRegion] = useState("13");
  const [crpNumber, setCrpNumber] = useState("");

  const status = data?.psychologist.crpVerificationStatus;
  const isRejected = status === "REJECTED";
  const isPending = status === "PENDING";
  const isApproved = status === "APPROVED";

  const selectedState = useMemo(
    () => stateOptions.find((option) => option.uf === crpState),
    [crpState],
  );

  useEffect(() => {
    async function loadStatus() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/psychologist/crp/resubmit", {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || "Não foi possível carregar seus dados.");
        }

        setData(payload);
        setName(payload.user?.name || "");
        setCrpState(payload.psychologist?.crpState || "PB");
        setCrpRegion(payload.psychologist?.crpRegion || "13");
        setCrpNumber(payload.psychologist?.crpNumber || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar seus dados.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStatus();
  }, []);

  useEffect(() => {
    if (selectedState?.region) {
      setCrpRegion(selectedState.region);
    }
  }, [selectedState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/psychologist/crp/resubmit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          crpState,
          crpRegion,
          crpNumber,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error || "Não foi possível reenviar seus dados para análise.",
        );
      }

      setData(payload);
      setName(payload.user?.name || "");
      setCrpState(payload.psychologist?.crpState || "PB");
      setCrpRegion(payload.psychologist?.crpRegion || "13");
      setCrpNumber(payload.psychologist?.crpNumber || "");
      setSuccess("Dados reenviados com sucesso. Seu cadastro voltou para análise.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível reenviar seus dados para análise.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main
      className="verification-page-shell"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef5ff 0%, #ffffff 45%, #f8fbff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <section
        className="verification-card"
        style={{
          width: "100%",
          maxWidth: "820px",
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          padding: "42px",
          boxShadow: "0 24px 70px rgba(0, 30, 94, 0.12)",
          border: "1px solid #dbe7ff",
          textAlign: "center",
        }}
      >
        <div
          className="verification-icon-card"
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "24px",
            background: isRejected
              ? "linear-gradient(135deg, #dc2626, #f97316)"
              : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            margin: "0 auto 22px",
            boxShadow: isRejected
              ? "0 14px 28px rgba(220, 38, 38, 0.20)"
              : "0 14px 28px rgba(37, 99, 235, 0.24)",
          }}
        >
          <i
            className={
              isRejected
                ? "fa-solid fa-triangle-exclamation"
                : "fa-solid fa-user-shield"
            }
          ></i>
        </div>

        {isLoading ? (
          <p style={{ color: "#5272a6", fontSize: "16px", fontWeight: 800 }}>
            Carregando dados do cadastro...
          </p>
        ) : (
          <>
            <span
              className="verification-status-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: isRejected ? "#fff7ed" : "#eff6ff",
                color: isRejected ? "#c2410c" : "#1d4ed8",
                border: isRejected ? "1px solid #fed7aa" : "1px solid #bfdbfe",
                borderRadius: "999px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 900,
                marginBottom: "18px",
              }}
            >
              <i className={isRejected ? "fa-solid fa-xmark" : "fa-solid fa-clock"}></i>
              {isRejected
                ? "Cadastro profissional não aprovado"
                : isApproved
                  ? "Cadastro profissional aprovado"
                  : "Cadastro profissional em análise"}
            </span>

            <h1
              className="verification-title"
              style={{
                color: "#001e5e",
                fontSize: "38px",
                fontWeight: 900,
                lineHeight: 1.08,
                marginBottom: "14px",
              }}
            >
              {isRejected
                ? "Corrija seus dados profissionais"
                : isApproved
                  ? "Seu CRP foi aprovado"
                  : "Seu CRP está aguardando verificação"}
            </h1>

            <p
              className="verification-description"
              style={{
                color: "#5272a6",
                fontSize: "17px",
                lineHeight: 1.7,
                maxWidth: "650px",
                margin: "0 auto 26px",
              }}
            >
              {isRejected
                ? "A administração encontrou uma inconsistência no cadastro. Revise o nome completo e os dados do CRP para enviar novamente para análise."
                : isApproved
                  ? "Seu cadastro profissional foi verificado e liberado para uso da plataforma."
                  : "Recebemos seu cadastro como psicólogo(a). Para proteger pacientes e garantir o uso responsável da plataforma, o acesso à área profissional será liberado após a verificação do CRP informado."}
            </p>

            {error && (
              <div
                className="verification-feedback"
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "16px",
                  color: "#991b1b",
                  padding: "14px 16px",
                  fontSize: "14px",
                  fontWeight: 800,
                  marginBottom: "18px",
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="verification-feedback"
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "16px",
                  color: "#166534",
                  padding: "14px 16px",
                  fontSize: "14px",
                  fontWeight: 800,
                  marginBottom: "18px",
                  textAlign: "left",
                }}
              >
                {success}
              </div>
            )}

            {isRejected && data?.psychologist.crpRejectionReason && (
              <div
                className="verification-rejection-box"
                style={{
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "20px",
                  padding: "20px",
                  textAlign: "left",
                  marginBottom: "22px",
                }}
              >
                <h2
                  style={{
                    color: "#9a3412",
                    fontSize: "18px",
                    fontWeight: 900,
                    marginBottom: "10px",
                  }}
                >
                  Motivo da rejeição
                </h2>
                <p style={{ color: "#7c2d12", fontSize: "15px", lineHeight: 1.6 }}>
                  {data.psychologist.crpRejectionReason}
                </p>
                <p
                  style={{
                    color: "#9a3412",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    marginTop: "10px",
                  }}
                >
                  Rejeitado em: {formatDate(data.psychologist.crpRejectedAt)}
                </p>
              </div>
            )}

            {isRejected ? (
              <form
                className="verification-resubmit-form"
                onSubmit={handleSubmit}
                style={{
                  backgroundColor: "#f8fbff",
                  border: "1px solid #dbe7ff",
                  borderRadius: "20px",
                  padding: "22px",
                  textAlign: "left",
                  marginBottom: "26px",
                }}
              >
                <h2
                  style={{
                    color: "#001e5e",
                    fontSize: "18px",
                    fontWeight: 900,
                    marginBottom: "16px",
                  }}
                >
                  Reenviar dados para análise
                </h2>

                <div style={{ marginBottom: "16px" }}>
                  <FieldLabel>Nome completo</FieldLabel>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Digite seu nome completo"
                    style={inputStyle()}
                  />
                </div>

                <div
                  className="verification-crp-grid"
                  style={{
                    display: "grid",
                    gap: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <FieldLabel>Estado do CRP</FieldLabel>
                    <select
                      value={crpState}
                      onChange={(event) => setCrpState(event.target.value)}
                      style={inputStyle()}
                    >
                      {stateOptions.map((option) => (
                        <option key={option.uf} value={option.uf}>
                          {option.uf}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Regional</FieldLabel>
                    <input
                      value={crpRegion}
                      onChange={(event) => setCrpRegion(event.target.value)}
                      placeholder="Ex.: 13"
                      style={inputStyle()}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <FieldLabel>Número do CRP</FieldLabel>
                  <input
                    value={crpNumber}
                    onChange={(event) =>
                      setCrpNumber(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Digite apenas o número"
                    style={inputStyle()}
                  />
                </div>

                <div
                  className="verification-crp-preview"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #dbe7ff",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    color: "#5272a6",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    marginBottom: "18px",
                  }}
                >
                  <strong style={{ color: "#001e5e" }}>CRP que será reenviado:</strong>{" "}
                  {crpRegion && crpNumber ? `${crpRegion}/${crpNumber}` : "-"}
                </div>

                <button
                  className="verification-submit-button"
                  type="submit"
                  disabled={isSaving}
                  style={{
                    width: "100%",
                    background: isSaving
                      ? "#93c5fd"
                      : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "14px",
                    padding: "13px 22px",
                    fontWeight: 900,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    boxShadow: "0 12px 26px rgba(37, 99, 235, 0.22)",
                  }}
                >
                  {isSaving ? "Enviando..." : "Enviar novamente para análise"}
                </button>
              </form>
            ) : (
              <div
                className="verification-next-steps"
                style={{
                  backgroundColor: "#f8fbff",
                  border: "1px solid #dbe7ff",
                  borderRadius: "20px",
                  padding: "20px",
                  textAlign: "left",
                  marginBottom: "26px",
                }}
              >
                <h2
                  style={{
                    color: "#001e5e",
                    fontSize: "18px",
                    fontWeight: 900,
                    marginBottom: "12px",
                  }}
                >
                  O que acontece agora?
                </h2>

                <ul
                  className="verification-steps-list"
                  style={{
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    color: "#5272a6",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <li>
                    <strong style={{ color: "#001e5e" }}>1.</strong> Seus dados
                    foram recebidos pelo PsicoConnect.
                  </li>
                  <li>
                    <strong style={{ color: "#001e5e" }}>2.</strong> O CRP
                    informado será conferido pela equipe responsável.
                  </li>
                  <li>
                    <strong style={{ color: "#001e5e" }}>3.</strong> Após a
                    aprovação, o acesso ao dashboard, agenda e pacientes será
                    liberado.
                  </li>
                </ul>
              </div>
            )}

            <p
              className="verification-support-note"
              style={{
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              Caso acredite que os dados estão corretos e mesmo assim não consiga
              reenviar, entre em contato com o suporte.
            </p>

            <button
              className="verification-logout-button"
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                padding: "13px 22px",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: "15px",
                boxShadow: "0 12px 26px rgba(37, 99, 235, 0.22)",
              }}
            >
              Sair e voltar ao login
            </button>
          </>
        )}

        <style>{`
          .verification-page-shell,
          .verification-page-shell * {
            min-width: 0;
            box-sizing: border-box;
          }

          .verification-crp-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .verification-card input,
          .verification-card select {
            min-height: 44px;
          }

          @media (max-width: 900px) {
            .verification-page-shell {
              align-items: flex-start !important;
              padding: 22px !important;
            }

            .verification-card {
              max-width: 720px !important;
              padding: 32px !important;
              border-radius: 24px !important;
            }

            .verification-icon-card {
              width: 64px !important;
              height: 64px !important;
              border-radius: 20px !important;
              font-size: 26px !important;
              margin-bottom: 18px !important;
            }

            .verification-status-badge {
              font-size: 12px !important;
              padding: 7px 12px !important;
              margin-bottom: 15px !important;
            }

            .verification-title {
              font-size: 32px !important;
              line-height: 1.1 !important;
              margin-bottom: 12px !important;
            }

            .verification-description {
              font-size: 15px !important;
              line-height: 1.6 !important;
              margin-bottom: 20px !important;
            }

            .verification-rejection-box,
            .verification-resubmit-form,
            .verification-next-steps {
              padding: 18px !important;
              border-radius: 18px !important;
              margin-bottom: 20px !important;
            }

            .verification-crp-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 12px !important;
            }

            .verification-card input,
            .verification-card select {
              padding: 10px 12px !important;
              font-size: 14px !important;
              border-radius: 12px !important;
            }

            .verification-crp-preview {
              padding: 12px 14px !important;
              font-size: 13px !important;
            }

            .verification-submit-button,
            .verification-logout-button {
              padding: 12px 18px !important;
              font-size: 14px !important;
              border-radius: 13px !important;
            }
          }

          @media (max-width: 640px) {
            .verification-page-shell {
              min-height: 100dvh !important;
              padding: 16px !important;
              justify-content: flex-start !important;
            }

            .verification-card {
              padding: 22px !important;
              border-radius: 22px !important;
              text-align: left !important;
            }

            .verification-icon-card {
              width: 56px !important;
              height: 56px !important;
              border-radius: 18px !important;
              font-size: 23px !important;
              margin: 0 0 16px 0 !important;
            }

            .verification-status-badge {
              align-self: flex-start !important;
              font-size: 11.5px !important;
              padding: 7px 10px !important;
              margin-bottom: 14px !important;
              max-width: 100% !important;
            }

            .verification-title {
              font-size: 27px !important;
              line-height: 1.08 !important;
              margin-bottom: 10px !important;
            }

            .verification-description {
              font-size: 14px !important;
              line-height: 1.55 !important;
              max-width: none !important;
              margin: 0 0 18px 0 !important;
            }

            .verification-feedback {
              padding: 12px 13px !important;
              border-radius: 14px !important;
              font-size: 13px !important;
              margin-bottom: 14px !important;
            }

            .verification-rejection-box,
            .verification-resubmit-form,
            .verification-next-steps {
              padding: 15px !important;
              border-radius: 16px !important;
              margin-bottom: 16px !important;
            }

            .verification-rejection-box h2,
            .verification-resubmit-form h2,
            .verification-next-steps h2 {
              font-size: 17px !important;
              margin-bottom: 10px !important;
            }

            .verification-rejection-box p,
            .verification-next-steps li,
            .verification-crp-preview,
            .verification-support-note {
              font-size: 13px !important;
              line-height: 1.5 !important;
            }

            .verification-crp-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
              margin-bottom: 14px !important;
            }

            .verification-card label {
              font-size: 12px !important;
              margin-bottom: 6px !important;
            }

            .verification-card input,
            .verification-card select {
              min-height: 40px !important;
              padding: 8px 10px !important;
              font-size: 13px !important;
              border-radius: 11px !important;
            }

            .verification-crp-preview {
              padding: 11px 12px !important;
              border-radius: 13px !important;
              margin-bottom: 14px !important;
            }

            .verification-submit-button,
            .verification-logout-button {
              width: 100% !important;
              padding: 11px 14px !important;
              font-size: 13.5px !important;
              border-radius: 12px !important;
            }

            .verification-support-note {
              margin-bottom: 16px !important;
            }
          }

          @media (max-width: 420px) {
            .verification-page-shell {
              padding: 12px !important;
            }

            .verification-card {
              padding: 18px !important;
              border-radius: 20px !important;
            }

            .verification-title {
              font-size: 24px !important;
            }

            .verification-description {
              font-size: 13.5px !important;
            }

            .verification-icon-card {
              width: 52px !important;
              height: 52px !important;
              border-radius: 16px !important;
              font-size: 21px !important;
            }

            .verification-rejection-box,
            .verification-resubmit-form,
            .verification-next-steps {
              padding: 13px !important;
            }

            .verification-status-badge {
              white-space: normal !important;
              line-height: 1.25 !important;
            }
          }

          /* Ajuste final: centralizar ícone e status no mobile */
          @media (max-width: 640px) {
            .verification-icon-card {
              margin: 0 auto 16px auto !important;
            }

            .verification-status-badge {
              display: flex !important;
              width: fit-content !important;
              max-width: 100% !important;
              margin-left: auto !important;
              margin-right: auto !important;
              justify-content: center !important;
              text-align: center !important;
            }
          }

          @media (max-width: 420px) {
            .verification-icon-card {
              margin: 0 auto 14px auto !important;
            }

            .verification-status-badge {
              margin-left: auto !important;
              margin-right: auto !important;
            }
          }

        `}</style>

      </section>
    </main>
  );
}
