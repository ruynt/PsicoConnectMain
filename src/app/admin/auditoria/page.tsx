"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import PsicoPageSkeleton from "@/components/PsicoPageSkeleton";
import { getErrorMessage } from "@/lib/errorUtils";

type Role = "ADMIN" | "PSYCHOLOGIST" | "PATIENT";

type AuditUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  actorRole: Role | null;
  actorUser: AuditUser | null;
  targetUserId: string | null;
  targetUser: AuditUser | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

type AuditResponse = {
  stats: {
    total: number;
    last24h: number;
    returned: number;
  };
  options: {
    actions: string[];
    entityTypes: string[];
  };
  logs: AuditLog[];
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  PSYCHOLOGIST: "Psicólogo",
  PATIENT: "Paciente",
};

const actionLabels: Record<string, string> = {
  AI_SUMMARY_GENERATED: "Resumo por IA gerado",
  APPOINTMENT_CANCELLED: "Consulta cancelada",
  APPOINTMENT_CREATED: "Consulta criada",
  APPOINTMENT_PAYMENT_UPDATED: "Pagamento atualizado",
  CRP_APPROVED: "CRP aprovado",
  CRP_REJECTED: "CRP rejeitado",
  GOOGLE_CALENDAR_CONNECTED: "Google Calendar conectado",
  GOOGLE_CALENDAR_DISCONNECTED: "Google Calendar desconectado",
  PATIENT_LINK_ACCEPTED: "Vínculo aceito pelo paciente",
  PATIENT_LINK_REJECTED: "Vínculo recusado pelo paciente",
  PATIENT_LINK_REQUESTED: "Solicitação de vínculo enviada",
  PATIENT_LINKED: "Paciente vinculado",
  PATIENT_MESSAGE_SENT: "Mensagem enviada pelo paciente",
  PATIENT_UNLINKED: "Paciente desvinculado",
  PROFILE_IMAGE_UPLOADED: "Foto de perfil atualizada",
  PROFILE_UPDATED: "Perfil atualizado",
  PSYCHOLOGIST_MESSAGE_SENT: "Mensagem enviada pelo psicólogo",
  SESSION_NOTE_ARCHIVED: "Anotação arquivada",
  SESSION_NOTE_CREATED: "Anotação criada",
  SESSION_NOTE_UPDATED: "Anotação atualizada",
  THERAPEUTIC_TASK_COMPLETED: "Tarefa concluída",
  THERAPEUTIC_TASK_CREATED: "Tarefa criada",
  THERAPEUTIC_TASK_DELETED: "Tarefa excluída",
  THERAPEUTIC_TASK_UPDATED: "Tarefa atualizada",
  USER_DELETED: "Usuário excluído",
  USER_EMAIL_VERIFIED_BY_ADMIN: "E-mail verificado pelo admin",
  USER_UPDATED_BY_ADMIN: "Usuário atualizado pelo admin",
};

const entityLabels: Record<string, string> = {
  Appointment: "Consulta",
  GoogleCalendar: "Google Calendar",
  PatientMessage: "Mensagem",
  PatientSummary: "Resumo",
  Psychologist: "Psicólogo",
  PsychologistPatient: "Vínculo",
  SessionNote: "Anotação",
  TherapeuticTask: "Tarefa",
  User: "Usuário",
};

const roleStyles: Record<Role, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  PSYCHOLOGIST: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  PATIENT: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getActionLabel(action: string) {
  return actionLabels[action] || action.replaceAll("_", " ").toLowerCase();
}

function getEntityLabel(entityType: string) {
  return entityLabels[entityType] || entityType;
}

function formatUser(user: AuditUser | null, fallbackId: string | null) {
  if (user) {
    return `${user.name} (${user.email})`;
  }

  if (fallbackId) {
    return `ID ${fallbackId.slice(0, 8)}...`;
  }

  return "--";
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata) return "Sem metadados adicionais.";

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "Não foi possível exibir os metadados.";
  }
}

const pageStyle = {
  padding: "36px",
  paddingBottom: "120px",
  width: "100%",
  minHeight: "calc(100vh - 48px)",
  background: "#ffffff",
  overflow: "visible",
} as const;

const heroStyle = {
  background: "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
  borderRadius: "28px",
  padding: "32px",
  marginBottom: "24px",
  color: "#ffffff",
  boxShadow: "0 20px 50px rgba(37, 99, 235, 0.24)",
  position: "relative",
  overflow: "hidden",
} as const;

const cardStyle = {
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
} as const;

const primaryButtonStyle = {
  border: "none",
  borderRadius: "14px",
  padding: "11px 16px",
  background: "linear-gradient(135deg, #2563eb, #4f8cff)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
} as const;

const inputStyle = {
  width: "100%",
  border: "1px solid #dbe4f0",
  borderRadius: "14px",
  padding: "12px 14px",
  color: "#0f172a",
  background: "#ffffff",
  fontWeight: 700,
  outline: "none",
} as const;

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorRole, setActorRole] = useState<"ALL" | Role>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (actorRole !== "ALL") params.set("actorRole", actorRole);
    params.set("take", "100");

    return params.toString();
  }, [action, actorRole, entityType, search]);

  const loadAuditLogs = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) setRefreshing(true);
        setError("");

        const response = await fetch(`/api/admin/audit-logs?${queryString}`, {
          cache: "no-store",
        });

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData?.error || "Erro ao carregar auditoria.");
        }

        setData(responseData);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Erro ao carregar auditoria."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryString],
  );

  useEffect(() => {
    setLoading(true);
    loadAuditLogs(false);
  }, [loadAuditLogs]);

  const logs = data?.logs || [];

  if (loading && !data) {
    return (
      <PsicoPageSkeleton
        variant="adminUsers"
        title="Carregando auditoria"
        subtitle="Buscando ações sensíveis, usuários envolvidos e registros recentes."
        badge="Administração"
      />
    );
  }

  return (
    <main className="admin-audit-page" style={pageStyle}>
      <section className="admin-hero audit-hero" style={heroStyle}>
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
          className="admin-hero-content audit-hero-content"
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
          <div className="admin-hero-text audit-hero-text" style={{ flex: 1, minWidth: "320px" }}>
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
              <i className="fa-solid fa-list-check"></i>
              Auditoria e segurança
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
              Logs de auditoria
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
              Acompanhe ações sensíveis realizadas no PsicoConnect, como alterações de perfil,
              mensagens, tarefas, resumos por IA, vínculos e operações administrativas.
            </p>
          </div>

          <div className="admin-hero-actions audit-hero-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href="/admin"
              style={{
                ...primaryButtonStyle,
                background: "rgba(255, 255, 255, 0.16)",
                border: "1px solid rgba(255, 255, 255, 0.32)",
                boxShadow: "none",
              }}
            >
              <i className="fa-solid fa-arrow-left"></i>
              Administração
            </Link>

            <button
              type="button"
              onClick={() => loadAuditLogs(true)}
              disabled={refreshing}
              style={{ ...primaryButtonStyle, background: "#ffffff", color: "#001e5e", boxShadow: "none" }}
            >
              <i className="fa-solid fa-rotate-right"></i>
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          style={{
            ...cardStyle,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontWeight: 900,
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      <section
        className="audit-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        {[
          { label: "Logs filtrados", value: data?.stats.total ?? 0, icon: "fa-list-check" },
          { label: "Exibidos", value: data?.stats.returned ?? 0, icon: "fa-table" },
          { label: "Últimas 24h", value: data?.stats.last24h ?? 0, icon: "fa-clock" },
        ].map((stat) => (
          <article key={stat.label} className="audit-stat-card" style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: "13px", fontWeight: 900, marginBottom: "8px" }}>
                  {stat.label}
                </p>
                <strong style={{ color: "#001e5e", fontSize: "34px", fontWeight: 900 }}>
                  {stat.value}
                </strong>
              </div>
              <span
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "16px",
                  background: "#eef6ff",
                  color: "#001e5e",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                <i className={`fa-solid ${stat.icon}`}></i>
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="audit-filter-card" style={{ ...cardStyle, marginBottom: "18px" }}>
        <div
          className="audit-filter-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          <label style={{ display: "grid", gap: "6px", color: "#001e5e", fontWeight: 900 }}>
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ação, entidade, usuário ou IP"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", color: "#001e5e", fontWeight: 900 }}>
            Ação
            <select value={action} onChange={(event) => setAction(event.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {(data?.options.actions || []).map((option) => (
                <option key={option} value={option}>
                  {getActionLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px", color: "#001e5e", fontWeight: 900 }}>
            Entidade
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)} style={inputStyle}>
              <option value="">Todas</option>
              {(data?.options.entityTypes || []).map((option) => (
                <option key={option} value={option}>
                  {getEntityLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px", color: "#001e5e", fontWeight: 900 }}>
            Perfil
            <select value={actorRole} onChange={(event) => setActorRole(event.target.value as "ALL" | Role)} style={inputStyle}>
              <option value="ALL">Todos</option>
              <option value="ADMIN">Admin</option>
              <option value="PSYCHOLOGIST">Psicólogo</option>
              <option value="PATIENT">Paciente</option>
            </select>
          </label>
        </div>
      </section>

      <section className="audit-log-section" style={{ ...cardStyle }}>
        <div className="audit-table-wrap">
          <table className="audit-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "118px" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "88px" }} />
            </colgroup>
            <thead>
              <tr style={{ color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>Data</th>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>Ação</th>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>Autor</th>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>Alvo</th>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>Entidade</th>
                <th style={{ textAlign: "left", padding: "0 10px 12px" }}>IP</th>
                <th style={{ textAlign: "right", padding: "0 10px 12px" }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "34px 12px", textAlign: "center", color: "#64748b", fontWeight: 800 }}>
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const roleStyle = log.actorRole ? roleStyles[log.actorRole] : null;

                  return (
                    <Fragment key={log.id}>
                      <tr style={{ borderTop: "1px solid #edf2f7", verticalAlign: "top" }}>
                        <td className="audit-table-cell" style={{ padding: "16px 10px", color: "#334155", fontWeight: 800 }}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="audit-table-cell" style={{ padding: "16px 10px" }}>
                          <strong style={{ color: "#001e5e" }}>{getActionLabel(log.action)}</strong>
                          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px", fontWeight: 800 }}>
                            {log.action}
                          </div>
                        </td>
                        <td className="audit-table-cell" style={{ padding: "16px 10px", color: "#334155", fontWeight: 700 }}>
                          <div>{formatUser(log.actorUser, log.actorUserId)}</div>
                          {log.actorRole && roleStyle && (
                            <span
                              style={{
                                display: "inline-flex",
                                marginTop: "8px",
                                borderRadius: "999px",
                                padding: "4px 8px",
                                background: roleStyle.bg,
                                color: roleStyle.color,
                                border: `1px solid ${roleStyle.border}`,
                                fontSize: "12px",
                                fontWeight: 900,
                              }}
                            >
                              {roleLabels[log.actorRole]}
                            </span>
                          )}
                        </td>
                        <td className="audit-table-cell" style={{ padding: "16px 10px", color: "#334155", fontWeight: 700 }}>
                          {formatUser(log.targetUser, log.targetUserId)}
                        </td>
                        <td className="audit-table-cell" style={{ padding: "16px 10px", color: "#334155", fontWeight: 800 }}>
                          {getEntityLabel(log.entityType)}
                          {log.entityId && (
                            <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                              {log.entityId.slice(0, 10)}...
                            </div>
                          )}
                        </td>
                        <td className="audit-table-cell" style={{ padding: "16px 10px", color: "#334155", fontWeight: 700 }}>
                          {log.ipAddress || "--"}
                        </td>
                        <td style={{ padding: "16px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            style={{
                              border: "1px solid #dbe4f0",
                              background: isExpanded ? "#001e5e" : "#ffffff",
                              color: isExpanded ? "#ffffff" : "#001e5e",
                              borderRadius: "12px",
                              padding: "9px 12px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {isExpanded ? "Ocultar" : "Ver"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: "0 10px 18px" }}>
                            <div
                              style={{
                                textAlign: "left",
                                background: "#0f172a",
                                color: "#e2e8f0",
                                borderRadius: "16px",
                                padding: "14px",
                                width: "100%",
                              }}
                            >
                              <p style={{ margin: "0 0 8px", color: "#93c5fd", fontWeight: 900 }}>
                                Metadados
                              </p>
                              <pre
                                style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  margin: 0,
                                  fontSize: "12px",
                                  lineHeight: 1.5,
                                }}
                              >
                                {stringifyMetadata(log.metadata)}
                              </pre>
                              {log.userAgent && (
                                <p style={{ margin: "12px 0 0", color: "#cbd5e1", fontSize: "12px", wordBreak: "break-word" }}>
                                  <strong>User-agent:</strong> {log.userAgent}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="audit-mobile-list">
          {logs.length === 0 ? (
            <div style={{ padding: "24px 4px", textAlign: "center", color: "#64748b", fontWeight: 800 }}>
              Nenhum registro encontrado para os filtros atuais.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const roleStyle = log.actorRole ? roleStyles[log.actorRole] : null;

              return (
                <article key={log.id} className="audit-mobile-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#64748b", fontSize: "12px", fontWeight: 900, margin: "0 0 6px" }}>
                        {formatDate(log.createdAt)}
                      </p>
                      <h3 style={{ color: "#001e5e", fontSize: "16px", fontWeight: 900, margin: "0 0 5px", lineHeight: 1.2 }}>
                        {getActionLabel(log.action)}
                      </h3>
                      <p style={{ color: "#64748b", fontSize: "11px", fontWeight: 800, margin: 0, wordBreak: "break-word" }}>
                        {log.action}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      style={{
                        border: "1px solid #dbe4f0",
                        background: isExpanded ? "#001e5e" : "#ffffff",
                        color: isExpanded ? "#ffffff" : "#001e5e",
                        borderRadius: "12px",
                        padding: "8px 11px",
                        fontWeight: 900,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isExpanded ? "Ocultar" : "Ver"}
                    </button>
                  </div>

                  <div className="audit-mobile-info-grid">
                    <div>
                      <span>Autor</span>
                      <strong>{formatUser(log.actorUser, log.actorUserId)}</strong>
                      {log.actorRole && roleStyle && (
                        <em style={{ background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}` }}>
                          {roleLabels[log.actorRole]}
                        </em>
                      )}
                    </div>
                    <div>
                      <span>Alvo</span>
                      <strong>{formatUser(log.targetUser, log.targetUserId)}</strong>
                    </div>
                    <div>
                      <span>Entidade</span>
                      <strong>{getEntityLabel(log.entityType)}</strong>
                    </div>
                    <div>
                      <span>IP</span>
                      <strong>{log.ipAddress || "--"}</strong>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "12px",
                        background: "#0f172a",
                        color: "#e2e8f0",
                        borderRadius: "16px",
                        padding: "14px",
                      }}
                    >
                      <p style={{ margin: "0 0 8px", color: "#93c5fd", fontWeight: 900 }}>
                        Metadados
                      </p>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          margin: 0,
                          fontSize: "12px",
                          lineHeight: 1.5,
                        }}
                      >
                        {stringifyMetadata(log.metadata)}
                      </pre>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <style>{`
        .admin-audit-page,
        .admin-audit-page * {
          box-sizing: border-box;
        }

        .admin-audit-page {
          width: 100%;
          min-width: 0;
        }

        .admin-hero h1,
        .admin-hero h1 *,
        .admin-hero p,
        .admin-hero span {
          color: #ffffff !important;
        }


        .audit-stats-grid {
          min-width: 0;
        }

        .audit-stat-card {
          min-width: 0;
        }

        .audit-filter-card,
        .audit-log-section,
        .audit-table-wrap,
        .audit-table,
        .audit-table-cell {
          min-width: 0;
        }

        .audit-table-wrap {
          width: 100%;
          overflow-x: visible;
        }

        .audit-table-cell {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .audit-mobile-list {
          display: none;
        }

        .audit-mobile-card {
          border: 1px solid #e6edf7;
          border-radius: 18px;
          padding: 14px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(0, 30, 94, 0.05);
        }

        .audit-mobile-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .audit-mobile-info-grid div {
          min-width: 0;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          border-radius: 14px;
          padding: 10px;
        }

        .audit-mobile-info-grid span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .audit-mobile-info-grid strong {
          display: block;
          color: #001e5e;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .audit-mobile-info-grid em {
          display: inline-flex;
          margin-top: 7px;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 11px;
          font-style: normal;
          font-weight: 900;
        }

        @media (max-width: 1180px) {
          .admin-audit-page {
            padding: 28px !important;
            padding-bottom: 130px !important;
          }

          .audit-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 900px) {
          .admin-audit-page {
            padding: 20px !important;
            padding-bottom: 130px !important;
          }

          .audit-hero {
            padding: 24px !important;
            border-radius: 24px !important;
            margin-bottom: 18px !important;
          }

          .audit-hero-content {
            gap: 18px !important;
          }

          .audit-hero-text {
            min-width: 0 !important;
          }

          .audit-hero h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .audit-hero p {
            font-size: 15px !important;
            line-height: 1.45 !important;
          }

          .audit-hero-actions {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .audit-hero-actions a,
          .audit-hero-actions button {
            flex: 1 1 220px !important;
          }
        }

        @media (max-width: 900px) {
          .admin-audit-page .audit-stats-grid,
          .chat-main-wrapper .admin-audit-page .audit-stats-grid {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            grid-template-columns: unset !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 2px 2px 12px !important;
            margin-bottom: 16px !important;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .admin-audit-page .audit-stats-grid::-webkit-scrollbar,
          .chat-main-wrapper .admin-audit-page .audit-stats-grid::-webkit-scrollbar {
            display: none;
          }

          .admin-audit-page .audit-stat-card,
          .chat-main-wrapper .admin-audit-page .audit-stat-card {
            flex: 0 0 210px !important;
            width: 210px !important;
            min-width: 210px !important;
            max-width: 210px !important;
            scroll-snap-align: start;
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .admin-audit-page .audit-stat-card strong,
          .chat-main-wrapper .admin-audit-page .audit-stat-card strong {
            font-size: 28px !important;
          }

          .admin-audit-page .audit-stat-card span,
          .chat-main-wrapper .admin-audit-page .audit-stat-card span {
            width: 38px !important;
            height: 38px !important;
            border-radius: 13px !important;
            font-size: 16px !important;
          }
        }

        @media (max-width: 760px) {
          .audit-table-wrap {
            display: none !important;
          }

          .audit-mobile-list {
            display: grid;
            gap: 12px;
          }
        }

        @media (max-width: 640px) {
          .admin-audit-page {
            padding: 16px !important;
            padding-bottom: 120px !important;
          }

          .audit-hero {
            padding: 18px !important;
            border-radius: 22px !important;
          }

          .audit-hero span {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin-bottom: 10px !important;
          }

          .audit-hero h1 {
            font-size: 27px !important;
            line-height: 1.08 !important;
            margin-bottom: 8px !important;
          }

          .audit-hero p {
            display: none !important;
          }

          .audit-hero-actions {
            gap: 8px !important;
          }

          .audit-hero-actions a,
          .audit-hero-actions button {
            flex: 1 1 100% !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
            border-radius: 13px !important;
          }

          .audit-filter-grid {
            grid-template-columns: 1fr !important;
          }

          .audit-filter-card,
          .audit-log-section {
            padding: 16px !important;
            border-radius: 20px !important;
          }

          .audit-mobile-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
