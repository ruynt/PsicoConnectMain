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
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
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
              style={{
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              Caso acredite que os dados estão corretos e mesmo assim não consiga
              reenviar, entre em contato com a equipe responsável pelo projeto.
            </p>

            <button
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
      </section>
    </main>
  );
}
