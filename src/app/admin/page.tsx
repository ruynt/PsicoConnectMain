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

  async function copyCfpSearchNumber(psychologist: AdminPsychologist) {
    const crpNumber = getCrpNumberForSearch(psychologist);

    if (!crpNumber || crpNumber === "--") {
      showFeedback("error", "Não foi possível copiar o número do CRP.");
      return;
    }

    try {
      await navigator.clipboard.writeText(crpNumber);
      showFeedback("success", `Número ${crpNumber} copiado para consulta no CFP.`);
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = crpNumber;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.left = "-9999px";

      document.body.appendChild(temporaryInput);
      temporaryInput.focus();
      temporaryInput.select();

      try {
        document.execCommand("copy");
        showFeedback("success", `Número ${crpNumber} copiado para consulta no CFP.`);
      } catch {
        showFeedback("error", "Não foi possível copiar o número do CRP.");
      } finally {
        document.body.removeChild(temporaryInput);
      }
    }
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
    <div className="admin-page" style={pageStyle}>
      <section
        className="admin-hero"
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
          className="admin-hero-content"
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
          <div className="admin-hero-text" style={{ flex: 1, minWidth: "320px" }}>
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
            className="admin-hero-actions"
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
            className="admin-metric-grid"
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
            className="admin-overview-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
              gap: "18px",
              marginBottom: "22px",
            }}
          >
            <section
              className="admin-status-card"
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

            <section className="admin-actions-card" style={cardStyle}>
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

          <section className="admin-verification-card" style={cardStyle}>
            <div
              className="admin-verification-header"
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
              className="admin-filter-row"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) auto",
                gap: "14px",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div
                className="admin-search-box"
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

              <div className="admin-filter-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
              <div className="admin-psychologist-list" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {filteredPsychologists.map((psychologist) => {
                  const selectedStatus = statusStyles[psychologist.crpVerificationStatus];
                  const isUpdating = updatingId === psychologist.id;
                  const isApproved = psychologist.crpVerificationStatus === "APPROVED";
                  const isRejected = psychologist.crpVerificationStatus === "REJECTED";

                  return (
                    <article
                      key={psychologist.id}
                      className="admin-psychologist-card"
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
                          className="admin-info-grid"
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
                          <div className="admin-copy-info-item">
                            <p style={{ margin: 0 }}>
                              <strong>Número para consulta CFP:</strong>{" "}
                              {getCrpNumberForSearch(psychologist)}
                            </p>

                            <button
                              type="button"
                              className="admin-copy-button"
                              onClick={() => copyCfpSearchNumber(psychologist)}
                              title="Copiar número para consulta no CFP"
                            >
                              <i className="fa-regular fa-copy"></i>
                              Copiar
                            </button>
                          </div>
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
                        className="admin-psychologist-actions"
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

      <style>{`
        .admin-page {
          width: 100%;
        }

        .admin-hero,
        .admin-status-card,
        .admin-actions-card,
        .admin-verification-card,
        .admin-psychologist-card {
          min-width: 0;
        }

        .admin-hero h1,
        .admin-hero h1 *,
        .admin-hero p,
        .admin-hero span {
          color: #ffffff !important;
        }

        .admin-metric-card {
          min-width: 0;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .admin-metric-card:hover {
          transform: translateY(-1px);
        }

        .admin-filter-buttons button,
        .admin-hero-actions a,
        .admin-hero-actions button,
        .admin-psychologist-actions a,
        .admin-psychologist-actions button {
          min-width: 0;
        }

        @media (max-width: 1180px) {
          .admin-page {
            padding: 28px !important;
            padding-bottom: 130px !important;
          }

          .admin-hero {
            padding: 28px !important;
          }

          .admin-hero-content {
            align-items: flex-start !important;
          }

          .admin-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .admin-overview-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-filter-row {
            grid-template-columns: 1fr !important;
          }

          .admin-filter-buttons {
            width: 100% !important;
          }

          .admin-filter-buttons button {
            flex: 1 1 150px !important;
          }

          .admin-psychologist-card {
            grid-template-columns: 1fr !important;
          }

          .admin-psychologist-actions {
            min-width: 0 !important;
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 900px) {
          .admin-page {
            padding: 20px !important;
            padding-bottom: 130px !important;
          }

          .admin-hero {
            padding: 24px !important;
            border-radius: 24px !important;
            margin-bottom: 18px !important;
          }

          .admin-hero-content {
            gap: 18px !important;
          }

          .admin-hero-text {
            min-width: 0 !important;
          }

          .admin-hero h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .admin-hero p {
            font-size: 15px !important;
            line-height: 1.45 !important;
          }

          .admin-hero-actions {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .admin-hero-actions a,
          .admin-hero-actions button {
            flex: 1 1 220px !important;
          }

          .admin-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 10px !important;
            margin-bottom: 18px !important;
          }

          .admin-metric-card {
            padding: 13px !important;
            border-radius: 18px !important;
          }

          .admin-status-card,
          .admin-actions-card,
          .admin-verification-card {
            padding: 20px !important;
            border-radius: 20px !important;
          }

          .admin-status-card h2,
          .admin-actions-card h2,
          .admin-verification-card h2 {
            font-size: 23px !important;
            line-height: 1.12 !important;
          }

          .admin-status-card p,
          .admin-verification-card p {
            font-size: 14px !important;
            line-height: 1.45 !important;
          }

          .admin-search-box {
            padding: 11px 13px !important;
          }

          .admin-filter-buttons {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .admin-filter-buttons button {
            width: 100% !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }

          .admin-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 9px 14px !important;
          }

          .admin-psychologist-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .admin-psychologist-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
          }

          .admin-psychologist-actions a,
          .admin-psychologist-actions button {
            width: 100% !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }
        }

        @media (max-width: 640px) {
          .admin-page {
            padding: 16px !important;
            padding-bottom: 120px !important;
          }

          .admin-hero {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .admin-hero span {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin-bottom: 10px !important;
          }

          .admin-hero h1 {
            font-size: 27px !important;
            line-height: 1.08 !important;
            margin-bottom: 8px !important;
          }

          .admin-hero p {
            display: none !important;
          }

          .admin-hero-actions {
            gap: 8px !important;
          }

          .admin-hero-actions a,
          .admin-hero-actions button {
            flex: 1 1 100% !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
            border-radius: 13px !important;
          }

          .admin-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .admin-metric-card {
            min-height: 104px !important;
            padding: 10px !important;
            border-radius: 16px !important;
          }

          .admin-metric-card > div {
            height: 100% !important;
            flex-direction: column-reverse !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .admin-metric-card p:first-child {
            font-size: 11px !important;
            line-height: 1.12 !important;
            margin-bottom: 6px !important;
          }

          .admin-metric-card p:last-child {
            font-size: 24px !important;
          }

          .admin-metric-card > div > div:last-child {
            width: 30px !important;
            height: 30px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }

          .admin-status-card,
          .admin-actions-card,
          .admin-verification-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .admin-status-card h2,
          .admin-actions-card h2,
          .admin-verification-card h2 {
            font-size: 21px !important;
          }

          .admin-status-card p,
          .admin-verification-card p {
            font-size: 13px !important;
          }

          .admin-verification-header {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .admin-verification-header > div:last-child {
            width: fit-content !important;
            white-space: normal !important;
          }

          .admin-search-box input {
            font-size: 13px !important;
          }

          .admin-filter-buttons {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-info-grid {
            grid-template-columns: 1fr !important;
            gap: 7px !important;
            font-size: 13px !important;
          }

          .admin-psychologist-card h3 {
            font-size: 18px !important;
          }

          .admin-psychologist-actions {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 420px) {
          .admin-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-metric-card {
            min-height: 96px !important;
          }

          .admin-filter-buttons {
            grid-template-columns: 1fr !important;
          }
        }

        /* Ajuste final: métricas em colunas e botão copiar CFP */
        .admin-copy-info-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 0;
          min-width: 0;
        }

        .admin-copy-info-item p {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-copy-button {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-shrink: 0;
          transition: 0.18s ease;
        }

        .admin-copy-button:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        @media (max-width: 900px) {
          .chat-main-wrapper .admin-page .admin-metric-grid,
          .admin-page .admin-metric-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card,
          .admin-page .admin-metric-card {
            width: auto !important;
            min-width: 0 !important;
            min-height: 98px !important;
            padding: 10px !important;
            border-radius: 16px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card > div,
          .admin-page .admin-metric-card > div {
            height: 100% !important;
            flex-direction: column-reverse !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:first-child,
          .admin-page .admin-metric-card p:first-child {
            font-size: 11px !important;
            line-height: 1.12 !important;
            margin-bottom: 4px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:last-child,
          .admin-page .admin-metric-card p:last-child {
            font-size: 24px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card > div > div:last-child,
          .admin-page .admin-metric-card > div > div:last-child {
            width: 30px !important;
            height: 30px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }
        }

        @media (max-width: 640px) {
          .chat-main-wrapper .admin-page .admin-metric-grid,
          .admin-page .admin-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card,
          .admin-page .admin-metric-card {
            min-height: 88px !important;
            padding: 9px !important;
            border-radius: 15px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:first-child,
          .admin-page .admin-metric-card p:first-child {
            font-size: 10.5px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:last-child,
          .admin-page .admin-metric-card p:last-child {
            font-size: 22px !important;
          }

          .admin-copy-info-item {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .admin-copy-button {
            width: fit-content;
            padding: 6px 9px;
            font-size: 11.5px;
          }
        }

        @media (max-width: 430px) {
          .chat-main-wrapper .admin-page .admin-metric-grid,
          .admin-page .admin-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card,
          .admin-page .admin-metric-card {
            min-height: 82px !important;
            padding: 8px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:first-child,
          .admin-page .admin-metric-card p:first-child {
            font-size: 9.5px !important;
            line-height: 1.05 !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card p:last-child,
          .admin-page .admin-metric-card p:last-child {
            font-size: 20px !important;
          }

          .chat-main-wrapper .admin-page .admin-metric-card > div > div:last-child,
          .admin-page .admin-metric-card > div > div:last-child {
            width: 26px !important;
            height: 26px !important;
            border-radius: 9px !important;
            font-size: 11px !important;
          }
        }

      `}</style>

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
      <div className="admin-metric-card" style={{ ...cardStyle, padding: "18px" }}>
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
