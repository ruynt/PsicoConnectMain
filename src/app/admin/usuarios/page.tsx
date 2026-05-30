"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Role = "ADMIN" | "PSYCHOLOGIST" | "PATIENT";
type CrpVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  emailVerified: string | null;
  patient: {
    id: string;
  } | null;
  psychologist: {
    id: string;
    crp: string;
    crpState: string | null;
    crpRegion: string | null;
    crpNumber: string | null;
    crpVerificationStatus: CrpVerificationStatus;
    crpVerifiedAt: string | null;
    crpRejectedAt: string | null;
    crpRejectionReason: string | null;
  } | null;
};

type AdminUsersResponse = {
  stats: {
    totalUsers: number;
    adminUsers: number;
    psychologistUsers: number;
    patientUsers: number;
  };
  users: AdminUser[];
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

type EditForm = {
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  newPassword: string;
  crpState: string;
  crpRegion: string;
  crpNumber: string;
  crpVerificationStatus: CrpVerificationStatus;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  PSYCHOLOGIST: "Psicólogo",
  PATIENT: "Paciente",
};

const crpStatusLabels: Record<CrpVerificationStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const roleStyles: Record<Role, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  PSYCHOLOGIST: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  PATIENT: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
};

const crpStyles: Record<
  CrpVerificationStatus,
  { bg: string; color: string; border: string }
> = {
  PENDING: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  APPROVED: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  REJECTED: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

const crpRegionByState: Record<string, string> = {
  DF: "01",
  PE: "02",
  BA: "03",
  MG: "04",
  RJ: "05",
  SP: "06",
  RS: "07",
  PR: "08",
  GO: "09",
  CE: "11",
  SC: "12",
  PB: "13",
  MS: "14",
  AL: "15",
  ES: "16",
  RN: "17",
  MT: "18",
  SE: "19",
  AM: "20",
  PI: "21",
  MA: "22",
  RO: "23",
  AC: "24",
};

const stateOptions = Object.keys(crpRegionByState).sort();

function getCrpParts(psychologist: AdminUser["psychologist"]) {
  if (!psychologist) {
    return { state: null, region: null, number: null, full: null };
  }

  const [fallbackRegion, fallbackNumber] = psychologist.crp.includes("/")
    ? psychologist.crp.split("/")
    : [null, psychologist.crp];

  return {
    state: psychologist.crpState || null,
    region: psychologist.crpRegion || fallbackRegion || null,
    number: psychologist.crpNumber || fallbackNumber || null,
    full: psychologist.crp,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildInitialEditForm(user: AdminUser): EditForm {
  const crpParts = getCrpParts(user.psychologist);

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    newPassword: "",
    crpState: crpParts.state || "PB",
    crpRegion: crpParts.region || crpRegionByState.PB,
    crpNumber: crpParts.number || "",
    crpVerificationStatus:
      user.psychologist?.crpVerificationStatus || "PENDING",
  };
}

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [crpFilter, setCrpFilter] = useState<"ALL" | CrpVerificationStatus>(
    "ALL",
  );
  const [updatingId, setUpdatingId] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingCrp, setRejectingCrp] = useState(false);

  async function loadUsers() {
    try {
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (crpFilter !== "ALL") params.set("crpStatus", crpFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao carregar usuários.");
      }

      setData(responseData);
    } catch (error: any) {
      setError(error?.message || "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, crpFilter]);

  const users = useMemo(() => data?.users || [], [data]);

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

  function openEditModal(user: AdminUser) {
    setEditingUser(user);
    setEditForm(buildInitialEditForm(user));
    setFeedback(null);
  }

  function closeEditModal() {
    setEditingUser(null);
    setEditForm(null);
    setSavingEdit(false);
  }

  function openRejectModal(user: AdminUser) {
    setRejectingUser(user);
    setRejectReason(user.psychologist?.crpRejectionReason || "");
    setFeedback(null);
  }

  function closeRejectModal() {
    setRejectingUser(null);
    setRejectReason("");
    setRejectingCrp(false);
  }

  function updateEditForm<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((current) => {
      if (!current) return current;

      if (key === "crpState") {
        const state = String(value).toUpperCase();
        return {
          ...current,
          crpState: state,
          crpRegion: crpRegionByState[state] || current.crpRegion,
        };
      }

      if (key === "crpNumber") {
        return {
          ...current,
          crpNumber: onlyDigits(String(value)),
        };
      }

      if (key === "crpRegion") {
        return {
          ...current,
          crpRegion: onlyDigits(String(value)).slice(0, 2),
        };
      }

      return { ...current, [key]: value };
    });
  }

  async function patchUserAction(
    userId: string,
    action: "verify-email",
  ) {
    try {
      setUpdatingId(userId);
      setFeedback(null);

      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "PATCH",
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao atualizar usuário.");
      }

      await loadUsers();
      showFeedback("success", responseData?.message || "Usuário atualizado.");
    } catch (error: any) {
      showFeedback("error", error?.message || "Erro ao atualizar usuário.");
    } finally {
      setUpdatingId("");
    }
  }

  async function updatePsychologistStatus(
    psychologistId: string,
    action: "approve",
  ) {
    try {
      setUpdatingId(psychologistId);
      setFeedback(null);

      const response = await fetch(
        `/api/admin/psychologists/${psychologistId}/${action}`,
        { method: "PATCH" },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao atualizar CRP.");
      }

      await loadUsers();
      showFeedback("success", "CRP aprovado com sucesso. O psicólogo receberá um e-mail de confirmação.");
    } catch (error: any) {
      showFeedback("error", error?.message || "Erro ao atualizar CRP.");
    } finally {
      setUpdatingId("");
    }
  }

  async function submitRejectCrp(event: FormEvent) {
    event.preventDefault();

    if (!rejectingUser?.psychologist) return;

    const reason = rejectReason.trim();

    if (!reason) {
      showFeedback("error", "Informe o motivo da rejeição do CRP.");
      return;
    }

    try {
      setRejectingCrp(true);
      setUpdatingId(rejectingUser.psychologist.id);
      setFeedback(null);

      const response = await fetch(
        `/api/admin/psychologists/${rejectingUser.psychologist.id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao rejeitar CRP.");
      }

      closeRejectModal();
      await loadUsers();
      showFeedback(
        "success",
        "CRP rejeitado com sucesso. O psicólogo receberá um e-mail com o motivo.",
      );
    } catch (error: any) {
      showFeedback("error", error?.message || "Erro ao rejeitar CRP.");
    } finally {
      setRejectingCrp(false);
      setUpdatingId("");
    }
  }

  async function submitEditUser(event: FormEvent) {
    event.preventDefault();

    if (!editingUser || !editForm) return;

    if (!editForm.name.trim()) {
      showFeedback("error", "Informe o nome do usuário.");
      return;
    }

    if (!editForm.email.trim()) {
      showFeedback("error", "Informe o e-mail do usuário.");
      return;
    }

    if (editForm.newPassword && editForm.newPassword.length < 8) {
      showFeedback("error", "A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (editForm.role === "PSYCHOLOGIST") {
      if (!editForm.crpState || !editForm.crpRegion || !editForm.crpNumber) {
        showFeedback(
          "error",
          "Informe estado, regional e número do CRP para psicólogos.",
        );
        return;
      }
    }

    try {
      setSavingEdit(true);
      setFeedback(null);

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          emailVerified: editForm.emailVerified,
          password: editForm.newPassword || undefined,
          crpState: editForm.crpState,
          crpRegion: editForm.crpRegion,
          crpNumber: editForm.crpNumber,
          crpVerificationStatus: editForm.crpVerificationStatus,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error || "Erro ao editar usuário.");
      }

      closeEditModal();
      await loadUsers();
      showFeedback("success", "Usuário editado com sucesso.");
    } catch (error: any) {
      showFeedback("error", error?.message || "Erro ao editar usuário.");
    } finally {
      setSavingEdit(false);
    }
  }

  const pageStyle = {
    padding: "36px",
    paddingBottom: "72px",
    minHeight: "calc(100vh - 48px)",
    background: "#ffffff",
    overflow: "visible",
  } as const;

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(0, 30, 94, 0.06)",
    border: "1px solid #e6edf7",
  } as const;

  const secondaryButtonStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "13px",
  } as const;

  const inputStyle = {
    width: "100%",
    border: "1px solid #dbe7ff",
    borderRadius: "14px",
    padding: "12px 14px",
    color: "#001e5e",
    fontWeight: 700,
    outline: "none",
    background: "#ffffff",
  } as const;

  const labelStyle = {
    display: "block",
    color: "#001e5e",
    fontWeight: 900,
    marginBottom: "6px",
    fontSize: "13px",
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
    <>
      <div style={pageStyle}>
        <section
          style={{
            background:
              "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
            borderRadius: "28px",
            padding: "30px",
            color: "#ffffff",
            marginBottom: "24px",
            boxShadow: "0 20px 50px rgba(37, 99, 235, 0.20)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-70px",
              top: "-80px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.16)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
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
                fontWeight: 900,
                marginBottom: "14px",
                color: "#ffffff",
              }}
            >
              <i className="fa-solid fa-users-gear"></i>
              Gestão de usuários
            </span>

            <h1
              style={{
                color: "#ffffff",
                fontSize: "42px",
                fontWeight: 900,
                lineHeight: 1.05,
                marginBottom: "10px",
              }}
            >
              Usuários cadastrados
            </h1>

            <p
              style={{
                color: "#dbeafe",
                fontSize: "17px",
                maxWidth: "900px",
                margin: 0,
              }}
            >
              Busque, filtre, edite e gerencie contas cadastradas no
              PsicoConnect.
            </p>
          </div>
        </section>

        {feedback && (
          <div
            style={{
              backgroundColor:
                feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
              border:
                feedback.type === "success"
                  ? "1px solid #a7f3d0"
                  : "1px solid #fecaca",
              color: feedback.type === "success" ? "#065f46" : "#b91c1c",
              borderRadius: "14px",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {[
            ["Usuários", data?.stats.totalUsers || 0],
            ["Admins", data?.stats.adminUsers || 0],
            ["Psicólogos", data?.stats.psychologistUsers || 0],
            ["Pacientes", data?.stats.patientUsers || 0],
          ].map(([label, value]) => (
            <div key={String(label)} style={cardStyle}>
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
                  fontSize: "34px",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <section style={{ ...cardStyle, marginBottom: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px 220px auto",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, estado, regional ou número do CRP"
              style={inputStyle}
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "ALL" | Role)}
              style={inputStyle}
            >
              <option value="ALL">Todos os papéis</option>
              <option value="ADMIN">Admin</option>
              <option value="PSYCHOLOGIST">Psicólogos</option>
              <option value="PATIENT">Pacientes</option>
            </select>

            <select
              value={crpFilter}
              onChange={(e) =>
                setCrpFilter(e.target.value as "ALL" | CrpVerificationStatus)
              }
              style={inputStyle}
            >
              <option value="ALL">Todos os CRPs</option>
              <option value="PENDING">CRP pendente</option>
              <option value="APPROVED">CRP aprovado</option>
              <option value="REJECTED">CRP rejeitado</option>
            </select>

            <button type="button" onClick={loadUsers} style={secondaryButtonStyle}>
              Atualizar
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                color: "#001e5e",
                fontSize: "28px",
                fontWeight: 900,
                marginBottom: "6px",
              }}
            >
              Lista de usuários
            </h2>
            <p style={{ color: "#5272a6", margin: 0 }}>
              Mostrando até 100 usuários conforme os filtros selecionados.
            </p>
          </div>

          {users.length === 0 ? (
            <div
              style={{
                border: "1px solid #e6edf7",
                borderRadius: "18px",
                padding: "18px",
                background: "#f8fbff",
                color: "#5272a6",
                fontWeight: 800,
              }}
            >
              Nenhum usuário encontrado para os filtros atuais.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {users.map((user) => {
                const roleStyle = roleStyles[user.role];
                const crpStyle = user.psychologist
                  ? crpStyles[user.psychologist.crpVerificationStatus]
                  : null;

                return (
                  <div
                    key={user.id}
                    style={{
                      border: "1px solid #e6edf7",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#ffffff",
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr auto",
                      gap: "16px",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginBottom: "8px",
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
                          {user.name}
                        </h3>

                        <span
                          style={{
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`,
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                          }}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </div>

                      <p
                        style={{
                          color: "#001e5e",
                          fontWeight: 800,
                          marginBottom: "6px",
                        }}
                      >
                        E-mail: {user.email}
                      </p>
                      <p style={{ color: "#5272a6", marginBottom: "6px" }}>
                        Cadastro: {formatDate(user.createdAt)}
                      </p>
                      <p
                        style={{
                          color: user.emailVerified ? "#047857" : "#b91c1c",
                          fontWeight: 800,
                          margin: 0,
                        }}
                      >
                        E-mail verificado: {user.emailVerified ? "Sim" : "Não"}
                      </p>
                    </div>

                    <div>
                      {user.role === "ADMIN" ? (
                        <div
                          style={{
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "14px",
                            padding: "12px",
                          }}
                        >
                          <p
                            style={{
                              color: "#1d4ed8",
                              fontWeight: 900,
                              marginBottom: "4px",
                            }}
                          >
                            Conta administrativa.
                          </p>
                          <p style={{ color: "#5272a6", margin: 0 }}>
                            A verificação de CRP não se aplica a usuários admin.
                          </p>
                        </div>
                      ) : user.role === "PSYCHOLOGIST" && user.psychologist ? (
                        (() => {
                          const crpParts = getCrpParts(user.psychologist);

                          return (
                            <>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",
                                  gap: "8px",
                                  marginBottom: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    backgroundColor: "#f8fbff",
                                    border: "1px solid #e6edf7",
                                    borderRadius: "12px",
                                    padding: "10px",
                                  }}
                                >
                                  <p
                                    style={{
                                      color: "#5272a6",
                                      fontSize: "12px",
                                      fontWeight: 900,
                                      marginBottom: "4px",
                                    }}
                                  >
                                    Estado
                                  </p>
                                  <p
                                    style={{
                                      color: "#001e5e",
                                      fontWeight: 900,
                                      margin: 0,
                                    }}
                                  >
                                    {crpParts.state || "--"}
                                  </p>
                                </div>

                                <div
                                  style={{
                                    backgroundColor: "#f8fbff",
                                    border: "1px solid #e6edf7",
                                    borderRadius: "12px",
                                    padding: "10px",
                                  }}
                                >
                                  <p
                                    style={{
                                      color: "#5272a6",
                                      fontSize: "12px",
                                      fontWeight: 900,
                                      marginBottom: "4px",
                                    }}
                                  >
                                    Regional
                                  </p>
                                  <p
                                    style={{
                                      color: "#001e5e",
                                      fontWeight: 900,
                                      margin: 0,
                                    }}
                                  >
                                    {crpParts.region ? `CRP-${crpParts.region}` : "--"}
                                  </p>
                                </div>
                              </div>

                              <p
                                style={{
                                  color: "#001e5e",
                                  fontWeight: 900,
                                  marginBottom: "6px",
                                }}
                              >
                                Número para consulta CFP: {crpParts.number || "--"}
                              </p>

                              <p
                                style={{
                                  color: "#5272a6",
                                  fontWeight: 800,
                                  marginBottom: "8px",
                                }}
                              >
                                CRP completo: {crpParts.full || "--"}
                              </p>

                              {crpStyle && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    backgroundColor: crpStyle.bg,
                                    color: crpStyle.color,
                                    border: `1px solid ${crpStyle.border}`,
                                    borderRadius: "999px",
                                    padding: "6px 10px",
                                    fontSize: "12px",
                                    fontWeight: 900,
                                    marginBottom: "8px",
                                  }}
                                >
                                  {
                                    crpStatusLabels[
                                      user.psychologist.crpVerificationStatus
                                    ]
                                  }
                                </span>
                              )}

                              <p
                                style={{
                                  color: "#5272a6",
                                  marginTop: "8px",
                                  marginBottom: 0,
                                }}
                              >
                                Verificado em: {formatDate(user.psychologist.crpVerifiedAt)}
                              </p>

                              {user.psychologist.crpVerificationStatus ===
                                "REJECTED" && (
                                <div
                                  style={{
                                    backgroundColor: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "12px",
                                    padding: "10px",
                                    marginTop: "10px",
                                  }}
                                >
                                  <p
                                    style={{
                                      color: "#b91c1c",
                                      fontWeight: 900,
                                      marginBottom: "6px",
                                    }}
                                  >
                                    Rejeitado em: {formatDate(user.psychologist.crpRejectedAt)}
                                  </p>
                                  <p
                                    style={{
                                      color: "#7f1d1d",
                                      fontWeight: 800,
                                      margin: 0,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    Motivo: {user.psychologist.crpRejectionReason || "Não informado."}
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : user.patient ? (
                        <p style={{ color: "#5272a6", fontWeight: 800, margin: 0 }}>
                          Perfil de paciente vinculado.
                        </p>
                      ) : (
                        <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
                          Sem perfil vinculado.
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        style={secondaryButtonStyle}
                      >
                        Editar
                      </button>

                      {!user.emailVerified && (
                        <button
                          type="button"
                          disabled={updatingId === user.id}
                          onClick={() => patchUserAction(user.id, "verify-email")}
                          style={secondaryButtonStyle}
                        >
                          Verificar e-mail
                        </button>
                      )}


                      {user.role === "PSYCHOLOGIST" && user.psychologist && (
                        <>
                          {user.psychologist.crpVerificationStatus !==
                            "APPROVED" && (
                            <button
                              type="button"
                              disabled={updatingId === user.psychologist.id}
                              onClick={() =>
                                updatePsychologistStatus(
                                  user.psychologist!.id,
                                  "approve",
                                )
                              }
                              style={{
                                backgroundColor: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "14px",
                                padding: "10px 14px",
                                fontWeight: 900,
                                cursor:
                                  updatingId === user.psychologist.id
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  updatingId === user.psychologist.id ? 0.7 : 1,
                                fontSize: "13px",
                              }}
                            >
                              Aprovar CRP
                            </button>
                          )}

                          {user.psychologist.crpVerificationStatus !==
                            "REJECTED" && (
                            <button
                              type="button"
                              disabled={updatingId === user.psychologist.id}
                              onClick={() => openRejectModal(user)}
                              style={{
                                backgroundColor: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                borderRadius: "14px",
                                padding: "10px 14px",
                                fontWeight: 900,
                                cursor:
                                  updatingId === user.psychologist.id
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  updatingId === user.psychologist.id ? 0.7 : 1,
                                fontSize: "13px",
                              }}
                            >
                              Rejeitar CRP
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editingUser && editForm && (
        <div
          onClick={closeEditModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.56)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <form
            onSubmit={submitEditUser}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.28)",
              border: "1px solid #e6edf7",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
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
                <i className="fa-solid fa-user-pen"></i>
                Editar usuário
              </span>

              <h2
                style={{
                  color: "#001e5e",
                  fontSize: "30px",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                {editingUser.name}
              </h2>

              <p style={{ color: "#5272a6", margin: 0 }}>
                Altere dados básicos, papel de acesso, senha e informações de
                CRP quando aplicável.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  value={editForm.name}
                  onChange={(e) => updateEditForm("name", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => updateEditForm("email", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tipo de conta</label>
                <select
                  value={editForm.role}
                  onChange={(e) => updateEditForm("role", e.target.value as Role)}
                  style={inputStyle}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="PSYCHOLOGIST">Psicólogo</option>
                  <option value="PATIENT">Paciente</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nova senha opcional</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    updateEditForm("newPassword", e.target.value)
                  }
                  placeholder="Deixe em branco para manter a atual"
                  style={inputStyle}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#001e5e",
                fontWeight: 900,
                marginBottom: "18px",
              }}
            >
              <input
                type="checkbox"
                checked={editForm.emailVerified}
                onChange={(e) =>
                  updateEditForm("emailVerified", e.target.checked)
                }
              />
              E-mail verificado
            </label>

            {editForm.role === "PSYCHOLOGIST" && (
              <div
                style={{
                  border: "1px solid #e6edf7",
                  borderRadius: "18px",
                  padding: "18px",
                  backgroundColor: "#f8fbff",
                  marginBottom: "18px",
                }}
              >
                <h3
                  style={{
                    color: "#001e5e",
                    fontSize: "20px",
                    fontWeight: 900,
                    marginBottom: "12px",
                  }}
                >
                  Dados profissionais do CRP
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select
                      value={editForm.crpState}
                      onChange={(e) =>
                        updateEditForm("crpState", e.target.value)
                      }
                      style={inputStyle}
                    >
                      {stateOptions.map((state) => (
                        <option key={state} value={state}>
                          {state} / CRP-{crpRegionByState[state]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Regional</label>
                    <input
                      value={editForm.crpRegion}
                      onChange={(e) =>
                        updateEditForm("crpRegion", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Número do CRP</label>
                    <input
                      value={editForm.crpNumber}
                      onChange={(e) =>
                        updateEditForm("crpNumber", e.target.value)
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Status do CRP</label>
                    <select
                      value={editForm.crpVerificationStatus}
                      onChange={(e) =>
                        updateEditForm(
                          "crpVerificationStatus",
                          e.target.value as CrpVerificationStatus,
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="REJECTED">Rejeitado</option>
                    </select>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #dbe7ff",
                      borderRadius: "14px",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        color: "#5272a6",
                        fontSize: "12px",
                        fontWeight: 900,
                        marginBottom: "4px",
                      }}
                    >
                      CRP completo gerado
                    </p>
                    <p
                      style={{
                        color: "#001e5e",
                        fontWeight: 900,
                        margin: 0,
                      }}
                    >
                      {editForm.crpRegion && editForm.crpNumber
                        ? `${editForm.crpRegion}/${editForm.crpNumber}`
                        : "--"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {editForm.role !== "PSYCHOLOGIST" && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  borderRadius: "14px",
                  padding: "12px",
                  marginBottom: "18px",
                  fontWeight: 800,
                }}
              >
                Dados de CRP só são utilizados para contas de psicólogo.
              </div>
            )}

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
                onClick={closeEditModal}
                disabled={savingEdit}
                style={secondaryButtonStyle}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={savingEdit}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #4f8cff)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: savingEdit ? "not-allowed" : "pointer",
                  opacity: savingEdit ? 0.7 : 1,
                }}
              >
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectingUser?.psychologist && (
        <div
          onClick={closeRejectModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(15, 23, 42, 0.56)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <form
            onSubmit={submitRejectCrp}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "620px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 28px 80px rgba(15, 23, 42, 0.28)",
              border: "1px solid #e6edf7",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
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
                <i className="fa-solid fa-circle-xmark"></i>
                Rejeitar CRP
              </span>

              <h2
                style={{
                  color: "#001e5e",
                  fontSize: "30px",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                {rejectingUser.name}
              </h2>

              <p style={{ color: "#5272a6", marginBottom: "8px" }}>
                Informe o motivo da rejeição. Esse texto será enviado por e-mail
                para o psicólogo.
              </p>

              <p
                style={{
                  color: "#001e5e",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                CRP: {rejectingUser.psychologist.crp}
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={labelStyle}>Motivo da rejeição</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex.: Não foi possível confirmar o CRP informado no Cadastro Nacional do CFP."
                rows={6}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "140px",
                  lineHeight: 1.5,
                }}
              />
            </div>

            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                borderRadius: "14px",
                padding: "12px",
                marginBottom: "18px",
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              Ao confirmar, o status do CRP será alterado para rejeitado e um
              e-mail será enviado para o usuário com essa justificativa.
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
                onClick={closeRejectModal}
                disabled={rejectingCrp}
                style={secondaryButtonStyle}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={rejectingCrp}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  fontWeight: 900,
                  cursor: rejectingCrp ? "not-allowed" : "pointer",
                  opacity: rejectingCrp ? 0.7 : 1,
                }}
              >
                {rejectingCrp ? "Rejeitando..." : "Confirmar rejeição"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
