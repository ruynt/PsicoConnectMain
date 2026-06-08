"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/errorUtils";

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
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);

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
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Erro ao carregar usuários."));
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

  const crpQuickStats = useMemo(() => {
    const psychologists = users.filter((user) => user.role === "PSYCHOLOGIST");

    return {
      pending: psychologists.filter(
        (user) => user.psychologist?.crpVerificationStatus === "PENDING",
      ).length,
      approved: psychologists.filter(
        (user) => user.psychologist?.crpVerificationStatus === "APPROVED",
      ).length,
      rejected: psychologists.filter(
        (user) => user.psychologist?.crpVerificationStatus === "REJECTED",
      ).length,
    };
  }, [users]);

  const hasActiveFilters =
    search.trim() || roleFilter !== "ALL" || crpFilter !== "ALL";

  function applyQuickFilter(
    nextRoleFilter: "ALL" | Role,
    nextCrpFilter: "ALL" | CrpVerificationStatus = "ALL",
  ) {
    setRoleFilter(nextRoleFilter);
    setCrpFilter(nextCrpFilter);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setCrpFilter("ALL");
  }

  function toggleUserDetails(userId: string) {
    setExpandedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId],
    );
  }

  async function copyCfpNumber(value: string | null | undefined) {
    const number = value?.trim();

    if (!number || number === "--") {
      showFeedback("error", "Não foi possível copiar o número para consulta.");
      return;
    }

    try {
      await navigator.clipboard.writeText(number);
      showFeedback("success", `Número ${number} copiado para consulta no CFP.`);
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = number;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.left = "-9999px";

      document.body.appendChild(temporaryInput);
      temporaryInput.focus();
      temporaryInput.select();

      try {
        document.execCommand("copy");
        showFeedback("success", `Número ${number} copiado para consulta no CFP.`);
      } catch {
        showFeedback("error", "Não foi possível copiar o número para consulta.");
      } finally {
        document.body.removeChild(temporaryInput);
      }
    }
  }

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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao atualizar usuário."));
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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao atualizar CRP."));
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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao rejeitar CRP."));
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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao editar usuário."));
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

  const quickFilterButtonStyle = (active: boolean) =>
    ({
      border: active ? "1px solid #001e5e" : "1px solid #dbe7ff",
      backgroundColor: active ? "#001e5e" : "#ffffff",
      color: active ? "#ffffff" : "#001e5e",
      borderRadius: "999px",
      padding: "9px 12px",
      fontSize: "13px",
      fontWeight: 900,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      whiteSpace: "nowrap",
      boxShadow: active ? "0 10px 24px rgba(0, 30, 94, 0.16)" : "none",
    }) as const;

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
      <div className="admin-users-page" style={pageStyle}>
        <section
          className="admin-users-hero"
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
          className="admin-users-main-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {[
            {
              label: "Usuários",
              value: data?.stats.totalUsers || 0,
              description: "Contas cadastradas",
              icon: "fa-solid fa-users",
              bg: "#eff6ff",
              color: "#1d4ed8",
            },
            {
              label: "Admins",
              value: data?.stats.adminUsers || 0,
              description: "Acesso administrativo",
              icon: "fa-solid fa-user-shield",
              bg: "#f8fbff",
              color: "#001e5e",
            },
            {
              label: "Psicólogos",
              value: data?.stats.psychologistUsers || 0,
              description: "Contas profissionais",
              icon: "fa-solid fa-user-doctor",
              bg: "#f5f3ff",
              color: "#6d28d9",
            },
            {
              label: "Pacientes",
              value: data?.stats.patientUsers || 0,
              description: "Contas de acompanhamento",
              icon: "fa-solid fa-user",
              bg: "#ecfdf5",
              color: "#047857",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="admin-users-stat-card"
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
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
                  {item.label}
                </p>
                <p
                  style={{
                    color: "#001e5e",
                    fontSize: "34px",
                    fontWeight: 900,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </p>
                <p
                  style={{
                    color: "#5272a6",
                    fontSize: "12px",
                    fontWeight: 800,
                    margin: "8px 0 0",
                  }}
                >
                  {item.description}
                </p>
              </div>

              <span
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: item.bg,
                  color: item.color,
                  fontSize: "18px",
                }}
              >
                <i className={item.icon}></i>
              </span>
            </div>
          ))}
        </div>

        <div
          className="admin-users-crp-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "CRPs pendentes",
              value: crpQuickStats.pending,
              bg: "#fffbeb",
              color: "#92400e",
              icon: "fa-solid fa-clock",
            },
            {
              label: "CRPs aprovados",
              value: crpQuickStats.approved,
              bg: "#ecfdf5",
              color: "#047857",
              icon: "fa-solid fa-circle-check",
            },
            {
              label: "CRPs rejeitados",
              value: crpQuickStats.rejected,
              bg: "#fef2f2",
              color: "#b91c1c",
              icon: "fa-solid fa-circle-xmark",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="admin-users-crp-stat-card"
              style={{
                ...cardStyle,
                padding: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: item.bg,
              }}
            >
              <div>
                <p
                  style={{
                    color: item.color,
                    fontSize: "13px",
                    fontWeight: 900,
                    marginBottom: "6px",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    color: item.color,
                    fontSize: "28px",
                    fontWeight: 900,
                    margin: 0,
                  }}
                >
                  {item.value}
                </p>
              </div>
              <span
                style={{
                  color: item.color,
                  fontSize: "20px",
                  opacity: 0.9,
                }}
              >
                <i className={item.icon}></i>
              </span>
            </div>
          ))}
        </div>

        <section className="admin-users-filter-card" style={{ ...cardStyle, marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              flexWrap: "wrap",
              marginBottom: "16px",
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
                Filtros e busca
              </h2>
              <p style={{ color: "#5272a6", margin: 0 }}>
                Encontre usuários por nome, e-mail, papel de acesso ou dados do
                CRP.
              </p>
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} style={secondaryButtonStyle}>
                Limpar filtros
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <button
              type="button"
              onClick={() => applyQuickFilter("ALL", "ALL")}
              style={quickFilterButtonStyle(roleFilter === "ALL" && crpFilter === "ALL")}
            >
              <i className="fa-solid fa-layer-group"></i>
              Todos
            </button>

            <button
              type="button"
              onClick={() => applyQuickFilter("PATIENT", "ALL")}
              style={quickFilterButtonStyle(roleFilter === "PATIENT")}
            >
              <i className="fa-solid fa-user"></i>
              Pacientes
            </button>

            <button
              type="button"
              onClick={() => applyQuickFilter("PSYCHOLOGIST", "ALL")}
              style={quickFilterButtonStyle(roleFilter === "PSYCHOLOGIST" && crpFilter === "ALL")}
            >
              <i className="fa-solid fa-user-doctor"></i>
              Psicólogos
            </button>

            <button
              type="button"
              onClick={() => applyQuickFilter("ADMIN", "ALL")}
              style={quickFilterButtonStyle(roleFilter === "ADMIN")}
            >
              <i className="fa-solid fa-user-shield"></i>
              Admins
            </button>

            <button
              type="button"
              onClick={() => applyQuickFilter("PSYCHOLOGIST", "PENDING")}
              style={quickFilterButtonStyle(
                roleFilter === "PSYCHOLOGIST" && crpFilter === "PENDING",
              )}
            >
              <i className="fa-solid fa-clock"></i>
              CRP pendente
            </button>
          </div>

          <div
            className="admin-users-filter-fields"
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

        <section className="admin-users-list-card" style={cardStyle}>
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
              {users.length} usuário(s) encontrado(s) conforme os filtros selecionados.
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
            <div className="admin-users-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {users.map((user) => {
                const roleStyle = roleStyles[user.role];
                const crpStyle = user.psychologist
                  ? crpStyles[user.psychologist.crpVerificationStatus]
                  : null;
                const isExpanded = expandedUserIds.includes(user.id);

                return (
                  <div
                    key={user.id}
                    className={`admin-user-card ${isExpanded ? "expanded" : "collapsed"}`}
                    style={{
                      border: "1px solid #e6edf7",
                      borderRadius: "18px",
                      padding: "16px",
                      background: "#ffffff",
                    }}
                  >
                    <div className="admin-user-card-summary">
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          alignItems: "center",
                          minWidth: 0,
                        }}
                      >
                        <h3
                          style={{
                            color: "#001e5e",
                            fontSize: "20px",
                            fontWeight: 900,
                            margin: 0,
                            overflowWrap: "anywhere",
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
                            whiteSpace: "nowrap",
                          }}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="admin-user-details-toggle"
                        onClick={() => toggleUserDetails(user.id)}
                        aria-expanded={isExpanded}
                      >
                        <i className={`fa-solid ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                        {isExpanded ? "Ocultar informações" : "Exibir informações"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="admin-user-card-details">
                        <div className="admin-user-basic-info">
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

                        <div className="admin-user-role-info">
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
                                  <div className="admin-user-crp-grid">
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

                                  <div className="admin-user-copy-row">
                                    <p
                                      style={{
                                        color: "#001e5e",
                                        fontWeight: 900,
                                        margin: 0,
                                      }}
                                    >
                                      Número para consulta CFP: {crpParts.number || "--"}
                                    </p>

                                    <button
                                      type="button"
                                      className="admin-user-copy-button"
                                      onClick={() => copyCfpNumber(crpParts.number)}
                                      title="Copiar número para consulta no CFP"
                                    >
                                      <i className="fa-regular fa-copy"></i>
                                      Copiar
                                    </button>
                                  </div>

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

                        <div className="admin-user-actions">
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
                    )}
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

      <style>{`
        .admin-users-page {
          width: 100%;
        }

        .admin-users-hero,
        .admin-users-filter-card,
        .admin-users-list-card,
        .admin-users-stat-card,
        .admin-users-crp-stat-card,
        .admin-user-card {
          min-width: 0;
        }

        .admin-users-hero h1,
        .admin-users-hero h1 *,
        .admin-users-hero p,
        .admin-users-hero span {
          color: #ffffff !important;
        }

        .admin-user-card-summary {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .admin-user-details-toggle {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
          transition: 0.18s ease;
        }

        .admin-user-details-toggle:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        .admin-user-card-details {
          display: grid;
          grid-template-columns: 1.1fr 1fr auto;
          gap: 16px;
          align-items: start;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e6edf7;
        }

        .admin-user-crp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .admin-user-copy-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .admin-user-copy-row p {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .admin-user-copy-button {
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

        .admin-user-copy-button:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        .admin-user-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 1180px) {
          .admin-users-page {
            padding: 28px !important;
            padding-bottom: 130px !important;
          }

          .admin-users-main-stats-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .admin-users-crp-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .admin-users-filter-fields {
            grid-template-columns: 1fr 1fr !important;
          }

          .admin-users-filter-fields button {
            grid-column: span 2;
          }

          .admin-user-card-details {
            grid-template-columns: 1fr !important;
          }

          .admin-user-actions {
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 900px) {
          .admin-users-page {
            padding: 20px !important;
            padding-bottom: 130px !important;
          }

          .admin-users-hero {
            padding: 24px !important;
            border-radius: 24px !important;
            margin-bottom: 18px !important;
          }

          .admin-users-hero h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .admin-users-hero p {
            font-size: 15px !important;
            line-height: 1.45 !important;
          }

          .admin-users-main-stats-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .admin-users-crp-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .admin-users-stat-card,
          .admin-users-crp-stat-card {
            min-height: 98px !important;
            padding: 10px !important;
            border-radius: 16px !important;
          }

          .admin-users-stat-card,
          .admin-users-crp-stat-card {
            flex-direction: column-reverse !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
          }

          .admin-users-stat-card p:first-child,
          .admin-users-crp-stat-card p:first-child {
            font-size: 11px !important;
            line-height: 1.12 !important;
            margin-bottom: 4px !important;
          }

          .admin-users-stat-card p:nth-child(2),
          .admin-users-crp-stat-card p:nth-child(2) {
            font-size: 24px !important;
          }

          .admin-users-stat-card p:nth-child(3) {
            display: none !important;
          }

          .admin-users-stat-card span,
          .admin-users-crp-stat-card span {
            width: 30px !important;
            height: 30px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }

          .admin-users-filter-card,
          .admin-users-list-card {
            padding: 20px !important;
            border-radius: 20px !important;
          }

          .admin-users-filter-card h2,
          .admin-users-list-card h2 {
            font-size: 23px !important;
            line-height: 1.12 !important;
          }

          .admin-users-filter-fields {
            grid-template-columns: 1fr !important;
          }

          .admin-users-filter-fields button {
            grid-column: auto;
          }

          .admin-user-card-summary {
            grid-template-columns: 1fr !important;
          }

          .admin-user-details-toggle {
            width: fit-content;
          }

          .admin-user-card {
            padding: 14px !important;
            border-radius: 17px !important;
          }

          .admin-user-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
          }

          .admin-user-actions button {
            width: 100% !important;
          }
        }

        @media (max-width: 640px) {
          .admin-users-page {
            padding: 16px !important;
            padding-bottom: 120px !important;
          }

          .admin-users-hero {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .admin-users-hero span {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin-bottom: 10px !important;
          }

          .admin-users-hero h1 {
            font-size: 28px !important;
            line-height: 1.08 !important;
          }

          .admin-users-hero p {
            display: none !important;
          }

          .admin-users-main-stats-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .admin-users-crp-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .admin-users-stat-card,
          .admin-users-crp-stat-card {
            min-height: 84px !important;
            padding: 8px !important;
            border-radius: 14px !important;
          }

          .admin-users-stat-card p:first-child,
          .admin-users-crp-stat-card p:first-child {
            font-size: 9.5px !important;
            line-height: 1.05 !important;
          }

          .admin-users-stat-card p:nth-child(2),
          .admin-users-crp-stat-card p:nth-child(2) {
            font-size: 20px !important;
          }

          .admin-users-stat-card span,
          .admin-users-crp-stat-card span {
            width: 26px !important;
            height: 26px !important;
            border-radius: 9px !important;
            font-size: 11px !important;
          }

          .admin-users-filter-card,
          .admin-users-list-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .admin-users-filter-card p,
          .admin-users-list-card p {
            font-size: 13px !important;
          }

          .admin-user-card-summary h3 {
            font-size: 18px !important;
          }

          .admin-user-details-toggle {
            width: 100%;
            padding: 9px 10px;
            font-size: 12.5px;
          }

          .admin-user-crp-grid {
            grid-template-columns: 1fr !important;
          }

          .admin-user-copy-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .admin-user-copy-button {
            width: fit-content;
          }

          .admin-user-actions {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 430px) {
          .admin-users-main-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .admin-users-crp-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        /* Ajuste final: cards em colunas e botão de detalhes menor */
        @media (max-width: 900px) {
          .chat-main-wrapper .admin-users-page .admin-users-main-stats-grid,
          .admin-users-page .admin-users-main-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stats-grid,
          .admin-users-page .admin-users-crp-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card,
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card,
          .admin-users-page .admin-users-stat-card,
          .admin-users-page .admin-users-crp-stat-card {
            width: auto !important;
            min-width: 0 !important;
            min-height: 92px !important;
            padding: 10px !important;
            border-radius: 16px !important;
            display: flex !important;
            flex-direction: column-reverse !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card p:first-child,
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card p:first-child,
          .admin-users-page .admin-users-stat-card p:first-child,
          .admin-users-page .admin-users-crp-stat-card p:first-child {
            font-size: 10.5px !important;
            line-height: 1.08 !important;
            margin-bottom: 4px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card p:nth-child(2),
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card p:nth-child(2),
          .admin-users-page .admin-users-stat-card p:nth-child(2),
          .admin-users-page .admin-users-crp-stat-card p:nth-child(2) {
            font-size: 22px !important;
            line-height: 1 !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card p:nth-child(3),
          .admin-users-page .admin-users-stat-card p:nth-child(3) {
            display: none !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card span,
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card span,
          .admin-users-page .admin-users-stat-card span,
          .admin-users-page .admin-users-crp-stat-card span {
            width: 28px !important;
            height: 28px !important;
            min-width: 28px !important;
            min-height: 28px !important;
            border-radius: 10px !important;
            font-size: 12px !important;
          }

          .admin-user-details-toggle {
            width: fit-content !important;
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            border-radius: 999px !important;
            gap: 5px !important;
            box-shadow: none !important;
          }

          .admin-user-details-toggle i {
            font-size: 10px !important;
          }
        }

        @media (max-width: 640px) {
          .chat-main-wrapper .admin-users-page .admin-users-main-stats-grid,
          .admin-users-page .admin-users-main-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stats-grid,
          .admin-users-page .admin-users-crp-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card,
          .admin-users-page .admin-users-stat-card {
            min-height: 86px !important;
            padding: 9px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card,
          .admin-users-page .admin-users-crp-stat-card {
            min-height: 78px !important;
            padding: 8px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card p:first-child,
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card p:first-child,
          .admin-users-page .admin-users-stat-card p:first-child,
          .admin-users-page .admin-users-crp-stat-card p:first-child {
            font-size: 9.5px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card p:nth-child(2),
          .admin-users-page .admin-users-stat-card p:nth-child(2) {
            font-size: 21px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card p:nth-child(2),
          .admin-users-page .admin-users-crp-stat-card p:nth-child(2) {
            font-size: 19px !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-stat-card span,
          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card span,
          .admin-users-page .admin-users-stat-card span,
          .admin-users-page .admin-users-crp-stat-card span {
            width: 25px !important;
            height: 25px !important;
            min-width: 25px !important;
            min-height: 25px !important;
            border-radius: 9px !important;
            font-size: 10.5px !important;
          }

          .admin-user-card-summary {
            grid-template-columns: minmax(0, 1fr) auto !important;
            gap: 8px !important;
          }

          .admin-user-details-toggle {
            width: auto !important;
            padding: 5px 8px !important;
            font-size: 0 !important;
            min-width: 32px !important;
            height: 32px !important;
          }

          .admin-user-details-toggle i {
            font-size: 11px !important;
          }
        }

        @media (max-width: 430px) {
          .chat-main-wrapper .admin-users-page .admin-users-main-stats-grid,
          .admin-users-page .admin-users-main-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stats-grid,
          .admin-users-page .admin-users-crp-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .chat-main-wrapper .admin-users-page .admin-users-crp-stat-card p:first-child,
          .admin-users-page .admin-users-crp-stat-card p:first-child {
            font-size: 8.8px !important;
          }
        }

      `}</style>

    </>
  );
}
