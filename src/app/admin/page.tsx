// src/app/admin/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CrpVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

type AdminPsychologist = {
  id: string;
  crp: string;
  crpRegion: string | null;
  crpState: string | null;
  crpNumber: string | null;
  crpVerificationStatus: CrpVerificationStatus;
  crpVerifiedAt: string | null;
  crpRejectedAt?: string | null;
  crpRejectionReason?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    emailVerified: string | null;
  };
};

type AdminStats = {
  totalUsers: number;
  totalPatients: number;
  totalPsychologists: number;
  pendingPsychologists: number;
  approvedPsychologists: number;
  rejectedPsychologists: number;
};

type AdminResponse = {
  stats: AdminStats;
  psychologists: AdminPsychologist[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const statusLabels: Record<CrpVerificationStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const statusStyles: Record<
  CrpVerificationStatus,
  { bg: string; color: string; border: string }
> = {
  PENDING: {
    bg: "#fffbeb",
    color: "#92400e",
    border: "#fde68a",
  },
  APPROVED: {
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
  },
  REJECTED: {
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
  },
};

export default function AdminPage() {
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CrpVerificationStatus>(
    "PENDING",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<AdminPsychologist | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");

  async function loadAdminData() {
    try {
      setError("");

      const response = await fetch("/api/admin/psychologists", {
        cache: "no-store",
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData?.error || "Erro ao carregar dados administrativos.",
        );
      }

      setData(responseData);
    } catch (error: any) {
      setError(error?.message || "Erro ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredPsychologists = useMemo(() => {
    const psychologists = data?.psychologists || [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return psychologists.filter((psychologist) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        psychologist.crpVerificationStatus === statusFilter;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const searchableText = [
        psychologist.user.name,
        psychologist.user.email,
        psychologist.crp,
        psychologist.crpState || "",
        psychologist.crpRegion || "",
        psychologist.crpNumber || "",
        psychologist.crpRejectionReason || "",
        statusLabels[psychologist.crpVerificationStatus],
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [data, searchTerm, statusFilter]);

  const pendingPsychologists = useMemo(() => {
    return (data?.psychologists || []).filter(
      (psychologist) => psychologist.crpVerificationStatus === "PENDING",
    );
  }, [data]);

  const latestPsychologists = useMemo(() => {
    return [...(data?.psychologists || [])]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3);
  }, [data]);

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function getCrpNumberForSearch(psychologist: AdminPsychologist) {
    if (psychologist.crpNumber) return psychologist.crpNumber;

    const crpParts = psychologist.crp.split("/");
    const rawNumber = crpParts.length > 1 ? crpParts[1] : psychologist.crp;

    return rawNumber.replace(/\D/g, "") || "--";
  }

  function getCrpRegion(psychologist: AdminPsychologist) {
    if (psychologist.crpRegion) return psychologist.crpRegion;

    const crpParts = psychologist.crp.split("/");
    return crpParts.length > 1 ? crpParts[0].replace(/\D/g, "") : "--";
  }

  function getCrpState(psychologist: AdminPsychologist) {
    return psychologist.crpState || "--";
  }

  function getCfpSearchUrl(psychologist: AdminPsychologist) {
    const crpNumber = getCrpNumberForSearch(psychologist);
    const query = encodeURIComponent(crpNumber === "--" ? psychologist.crp : crpNumber);

    return `https://cadastro.cfp.org.br/?q=${query}`;
  }

  function openRejectModal(psychologist: AdminPsychologist) {
    setFeedback(null);
    setRejectionTarget(psychologist);
    setRejectionReason(psychologist.crpRejectionReason || "");
  }

  function closeRejectModal() {
    if (updatingId) return;

    setRejectionTarget(null);
    setRejectionReason("");
  }

  async function updateCrpStatus(
    psychologistId: string,
    action: "approve" | "reject",
    reason?: string,
  ) {
    try {
      setUpdatingId(psychologistId);
      setFeedback(null);

      const response = await fetch(
        `/api/admin/psychologists/${psychologistId}/${action}`,
        {
          method: "PATCH",
          headers:
            action === "reject"
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
          body:
            action === "reject"
              ? JSON.stringify({ reason: reason?.trim() || "" })
              : undefined,
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao atualizar CRP.");
      }

      await loadAdminData();

      if (action === "reject") {
        setRejectionTarget(null);
        setRejectionReason("");
      }

      showFeedback(
        "success",
        action === "approve"
          ? "Psicólogo aprovado com sucesso. O e-mail de aprovação foi enviado."
          : "Psicólogo rejeitado com sucesso. O e-mail com o motivo foi enviado.",
      );
    } catch (error: any) {
      showFeedback("error", error?.message || "Erro ao atualizar CRP.");
    } finally {
      setUpdatingId("");
    }
  }

  async function submitRejection() {
    const reason = rejectionReason.trim();

    if (!rejectionTarget) return;

    if (!reason) {
      showFeedback("error", "Informe o motivo da rejeição do CRP.");
      return;
    }

    await updateCrpStatus(rejectionTarget.id, "reject", reason);
  }

  const pageStyle = {
    padding: "36px",
    paddingBottom: "120px",
    minHeight: "calc(100vh - 48px)",
    background: "#ffffff",
    overflow: "visible",
  } as const;

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 14px 34px rgba(0, 30, 94, 0.06)",
    border: "1px solid #e6edf7",
  } as const;

  const primaryButtonStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  } as const;

  const dangerButtonStyle = {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "11px 16px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  } as const;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div className="psico-simple-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <section
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
          borderRadius: "28px",
          padding: "32px",
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
            right: "140px",
            bottom: "-120px",
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            backgroundColor: "rgba(255, 255, 255, 0.10)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "320px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.24)",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "13px",
                fontWeight: 900,
                marginBottom: "14px",
                color: "#ffffff",
              }}
            >
              <i className="fa-solid fa-user-shield"></i>
              Área administrativa
            </span>

            <h1
              style={{
                color: "#ffffff",
                fontSize: "44px",
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: "10px",
              }}
            >
              Administração do PsicoConnect
            </h1>

            <p
              style={{
                color: "#dbeafe",
                fontSize: "18px",
                maxWidth: "920px",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Acompanhe cadastros, valide CRPs e mantenha o acesso profissional
              do sistema seguro antes da liberação completa da plataforma.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Link
              href="/admin/usuarios"
              style={{
                ...primaryButtonStyle,
                background: "#ffffff",
                color: "#001e5e",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
              }}
            >
              <i className="fa-solid fa-users-gear"></i>
              Gerenciar usuários
            </Link>

            <button
              type="button"
              onClick={loadAdminData}
              style={{
                ...primaryButtonStyle,
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.32)",
                boxShadow: "none",
              }}
            >
              <i className="fa-solid fa-rotate-right"></i>
              Atualizar dados
            </button>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          style={{
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border:
              feedback.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: feedback.type === "success" ? "#065f46" : "#b91c1c",
            borderRadius: "16px",
            padding: "14px 16px",
            marginBottom: "18px",
            fontWeight: 900,
          }}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 900,
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "16px",
              marginBottom: "22px",
            }}
          >
            <MetricCard
              label="Usuários"
              value={data.stats.totalUsers}
              icon="fa-users"
              color="#1d4ed8"
              background="#eff6ff"
              border="#bfdbfe"
            />
            <MetricCard
              label="Pacientes"
              value={data.stats.totalPatients}
              icon="fa-user"
              color="#0891b2"
              background="#ecfeff"
              border="#a5f3fc"
            />
            <MetricCard
              label="Psicólogos"
              value={data.stats.totalPsychologists}
              icon="fa-user-doctor"
              color="#7c3aed"
              background="#f5f3ff"
              border="#ddd6fe"
            />
            <MetricCard
              label="Pendentes"
              value={data.stats.pendingPsychologists}
              icon="fa-hourglass-half"
              color="#92400e"
              background="#fffbeb"
              border="#fde68a"
            />
            <MetricCard
              label="Aprovados"
              value={data.stats.approvedPsychologists}
              icon="fa-circle-check"
              color="#047857"
              background="#ecfdf5"
              border="#a7f3d0"
            />
            <MetricCard
              label="Rejeitados"
              value={data.stats.rejectedPsychologists}
              icon="fa-circle-xmark"
              color="#b91c1c"
              background="#fef2f2"
              border="#fecaca"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
              gap: "18px",
              marginBottom: "22px",
            }}
          >
            <section
              style={{
                ...cardStyle,
                background:
                  pendingPsychologists.length > 0
                    ? "linear-gradient(135deg, #fff7ed, #ffffff)"
                    : "linear-gradient(135deg, #ecfdf5, #ffffff)",
                border:
                  pendingPsychologists.length > 0
                    ? "1px solid #fed7aa"
                    : "1px solid #a7f3d0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor:
                        pendingPsychologists.length > 0 ? "#ffedd5" : "#dcfce7",
                      color:
                        pendingPsychologists.length > 0 ? "#9a3412" : "#166534",
                      borderRadius: "999px",
                      padding: "6px 11px",
                      fontSize: "12px",
                      fontWeight: 900,
                      marginBottom: "10px",
                    }}
                  >
                    <i
                      className={
                        pendingPsychologists.length > 0
                          ? "fa-solid fa-triangle-exclamation"
                          : "fa-solid fa-circle-check"
                      }
                    ></i>
                    {pendingPsychologists.length > 0
                      ? "Atenção necessária"
                      : "Tudo certo"}
                  </span>

                  <h2
                    style={{
                      color: "#001e5e",
                      fontSize: "26px",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    {pendingPsychologists.length > 0
                      ? `${pendingPsychologists.length} CRP(s) aguardando análise`
                      : "Nenhum CRP pendente no momento"}
                  </h2>

                  <p style={{ color: "#5272a6", margin: 0, lineHeight: 1.6 }}>
                    Antes de liberar o acesso completo do psicólogo, consulte o
                    registro informado e aprove ou rejeite a solicitação com um
                    motivo claro quando necessário.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStatusFilter("PENDING")}
                  style={{
                    ...secondaryButtonStyle,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <i className="fa-solid fa-filter"></i>
                  Ver pendentes
                </button>
              </div>
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  color: "#001e5e",
                  fontSize: "22px",
                  fontWeight: 900,
                  marginBottom: "12px",
                }}
              >
                Ações rápidas
              </h2>

              <div style={{ display: "grid", gap: "10px" }}>
                <Link href="/admin/usuarios" style={quickActionStyle}>
                  <span>
                    <i className="fa-solid fa-users-gear"></i>
                  </span>
                  Gerenciar usuários cadastrados
                </Link>

                <button
                  type="button"
                  onClick={() => setStatusFilter("PENDING")}
                  style={quickActionStyle}
                >
                  <span>
                    <i className="fa-solid fa-hourglass-half"></i>
                  </span>
                  Filtrar CRPs pendentes
                </button>

                <button type="button" onClick={loadAdminData} style={quickActionStyle}>
                  <span>
                    <i className="fa-solid fa-rotate-right"></i>
                  </span>
                  Atualizar painel administrativo
                </button>
              </div>
            </section>
          </div>

          <section style={cardStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "18px",
                alignItems: "flex-start",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  style={{
                    color: "#001e5e",
                    fontSize: "28px",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
                  Verificações de CRP
                </h2>

                <p style={{ color: "#5272a6", margin: 0, lineHeight: 1.6 }}>
                  Confira o registro informado pelo profissional antes de liberar
                  o acesso completo à área do psicólogo.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#f8fbff",
                  border: "1px solid #dbe7ff",
                  borderRadius: "16px",
                  padding: "12px 14px",
                  color: "#5272a6",
                  fontWeight: 900,
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                {filteredPsychologists.length} resultado(s)
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) auto",
                gap: "14px",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  border: "1px solid #dbe7ff",
                  borderRadius: "16px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "#f8fbff",
                }}
              >
                <i className="fa-solid fa-magnifying-glass" style={{ color: "#5272a6" }}></i>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, e-mail, estado, regional, CRP ou motivo"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#001e5e",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      style={{
                        ...secondaryButtonStyle,
                        backgroundColor: statusFilter === status ? "#001e5e" : "#eff6ff",
                        color: statusFilter === status ? "#ffffff" : "#1d4ed8",
                        borderColor: statusFilter === status ? "#001e5e" : "#bfdbfe",
                      }}
                    >
                      {status === "ALL" ? "Todos" : statusLabels[status]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {filteredPsychologists.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e6edf7",
                  borderRadius: "18px",
                  padding: "20px",
                  backgroundColor: "#f8fbff",
                  color: "#5272a6",
                  fontWeight: 800,
                }}
              >
                Nenhum psicólogo encontrado para este filtro.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {filteredPsychologists.map((psychologist) => {
                  const selectedStatus = statusStyles[psychologist.crpVerificationStatus];
                  const isUpdating = updatingId === psychologist.id;
                  const isApproved = psychologist.crpVerificationStatus === "APPROVED";
                  const isRejected = psychologist.crpVerificationStatus === "REJECTED";

                  return (
                    <article
                      key={psychologist.id}
                      style={{
                        border: "1px solid #e6edf7",
                        borderRadius: "20px",
                        padding: "18px",
                        backgroundColor: "#ffffff",
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: "18px",
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          <h3
                            style={{
                              color: "#001e5e",
                              fontSize: "20px",
                              fontWeight: 900,
                              margin: 0,
                            }}
                          >
                            {psychologist.user.name}
                          </h3>

                          <span
                            style={{
                              backgroundColor: selectedStatus.bg,
                              color: selectedStatus.color,
                              border: `1px solid ${selectedStatus.border}`,
                              borderRadius: "999px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 900,
                            }}
                          >
                            {statusLabels[psychologist.crpVerificationStatus]}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: "10px 18px",
                            color: "#102a56",
                            lineHeight: 1.55,
                          }}
                        >
                          <InfoItem label="E-mail" value={psychologist.user.email} />
                          <InfoItem label="Estado" value={getCrpState(psychologist)} />
                          <InfoItem label="Regional" value={`CRP-${getCrpRegion(psychologist)}`} />
                          <InfoItem
                            label="Número para consulta CFP"
                            value={getCrpNumberForSearch(psychologist)}
                          />
                          <InfoItem label="CRP completo" value={psychologist.crp} />
                          <InfoItem label="Cadastro" value={formatDate(psychologist.user.createdAt)} />
                          <InfoItem
                            label="E-mail verificado"
                            value={psychologist.user.emailVerified ? "Sim" : "Não"}
                          />
                          <InfoItem label="Verificado em" value={formatDate(psychologist.crpVerifiedAt)} />

                          {isRejected && (
                            <>
                              <InfoItem
                                label="Rejeitado em"
                                value={formatDate(psychologist.crpRejectedAt)}
                              />
                              <InfoItem
                                label="Motivo da rejeição"
                                value={psychologist.crpRejectionReason || "--"}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          minWidth: "280px",
                        }}
                      >
                        <a
                          href={getCfpSearchUrl(psychologist)}
                          target="_blank"
                          rel="noreferrer"
                          style={secondaryButtonStyle}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square"></i>
                          Consultar CFP
                        </a>

                        {!isApproved && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateCrpStatus(psychologist.id, "approve")}
                            style={{
                              ...primaryButtonStyle,
                              background: "linear-gradient(135deg, #059669, #22c55e)",
                              boxShadow: "0 10px 24px rgba(34, 197, 94, 0.20)",
                              opacity: isUpdating ? 0.7 : 1,
                              cursor: isUpdating ? "not-allowed" : "pointer",
                            }}
                          >
                            <i className="fa-solid fa-circle-check"></i>
                            {isUpdating ? "Salvando..." : isRejected ? "Aprovar novamente" : "Aprovar"}
                          </button>
                        )}

                        {!isRejected && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => openRejectModal(psychologist)}
                            style={{
                              ...dangerButtonStyle,
                              opacity: isUpdating ? 0.7 : 1,
                              cursor: isUpdating ? "not-allowed" : "pointer",
                            }}
                          >
                            <i className="fa-solid fa-circle-xmark"></i>
                            Rejeitar
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div style={{ height: "80px" }} />
        </>
      )}

      {rejectionTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onMouseDown={closeRejectModal}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "620px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
              border: "1px solid #e6edf7",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    color: "#001e5e",
                    fontSize: "24px",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
                  Rejeitar CRP
                </h2>
                <p style={{ color: "#5272a6", margin: 0, lineHeight: 1.5 }}>
                  Informe o motivo da rejeição. Esse texto será enviado por e-mail
                  para o profissional.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(updatingId)}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  border: "1px solid #dbe7ff",
                  backgroundColor: "#f8fbff",
                  color: "#5272a6",
                  cursor: updatingId ? "not-allowed" : "pointer",
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f8fbff",
                border: "1px solid #dbe7ff",
                borderRadius: "16px",
                padding: "14px",
                marginBottom: "16px",
                color: "#102a56",
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Profissional:</strong> {rejectionTarget.user.name}
              </p>
              <p style={{ margin: 0 }}>
                <strong>E-mail:</strong> {rejectionTarget.user.email}
              </p>
              <p style={{ margin: 0 }}>
                <strong>CRP:</strong> {rejectionTarget.crp}
              </p>
            </div>

            <label
              style={{
                display: "block",
                color: "#001e5e",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              Motivo da rejeição
            </label>

            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Ex.: Não foi possível confirmar o CRP informado no Cadastro Nacional do CFP."
              rows={6}
              style={{
                width: "100%",
                resize: "vertical",
                border: "1px solid #dbe7ff",
                borderRadius: "16px",
                padding: "14px",
                outline: "none",
                color: "#001e5e",
                fontSize: "14px",
                lineHeight: 1.5,
                backgroundColor: "#ffffff",
                marginBottom: "18px",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={Boolean(updatingId)}
                style={{
                  ...secondaryButtonStyle,
                  opacity: updatingId ? 0.7 : 1,
                  cursor: updatingId ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={submitRejection}
                disabled={Boolean(updatingId)}
                style={{
                  ...dangerButtonStyle,
                  opacity: updatingId ? 0.7 : 1,
                  cursor: updatingId ? "not-allowed" : "pointer",
                }}
              >
                <i className="fa-solid fa-circle-xmark"></i>
                {updatingId ? "Rejeitando..." : "Confirmar rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function MetricCard({
    label,
    value,
    icon,
    color,
    background,
    border,
  }: {
    label: string;
    value: number;
    icon: string;
    color: string;
    background: string;
    border: string;
  }) {
    return (
      <div style={{ ...cardStyle, padding: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <p
              style={{
                color: "#5272a6",
                fontSize: "13px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                color: "#001e5e",
                fontSize: "30px",
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
              backgroundColor: background,
              color,
              border: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            <i className={`fa-solid ${icon}`}></i>
          </div>
        </div>
      </div>
    );
  }

  function InfoItem({ label, value }: { label: string; value: string }) {
    return (
      <p style={{ margin: 0 }}>
        <strong>{label}:</strong> {value}
      </p>
    );
  }
}

const quickActionStyle = {
  width: "100%",
  border: "1px solid #dbe7ff",
  backgroundColor: "#f8fbff",
  color: "#001e5e",
  borderRadius: "16px",
  padding: "13px 14px",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
} as const;
