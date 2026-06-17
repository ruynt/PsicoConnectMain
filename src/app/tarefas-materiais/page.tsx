"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errorUtils";
import PsicoInlineSkeleton from "@/components/PsicoInlineSkeleton";
import PsicoPageSkeleton from "@/components/PsicoPageSkeleton";

type TaskStatus = "PENDING" | "COMPLETED" | "CANCELLED";

type PatientTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  psychologist?: {
    id?: string;
    name: string;
    email: string;
  };
  appointment: {
    id: string;
    title: string;
    dateTime: string;
  } | null;
};

type PatientMaterial = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  content: string;
  viewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  psychologist?: {
    id?: string;
    name: string;
    email: string;
  };
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

type ActiveTab = "TASKS" | "MATERIALS";

const NAVY = "#001e5e";
const NAVY_SOFT = "#102a56";
const MUTED = "#5272a6";
const BORDER = "#e6edf7";

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "A rota respondeu em formato inesperado. Verifique se o caminho da API existe.",
    );
  }
}

export default function TarefasMateriaisPage() {
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [materials, setMaterials] = useState<PatientMaterial[]>([]);

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [updatingMaterialId, setUpdatingMaterialId] = useState("");

  const [taskError, setTaskError] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("TASKS");
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<string[]>([]);

  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setTaskError("");

      const response = await fetch("/api/patient/tasks", {
        cache: "no-store",
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar tarefas.");
      }

      setTasks(data.tasks || []);
    } catch (error: unknown) {
      setTaskError(getErrorMessage(error, "Erro ao carregar tarefas."));
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    try {
      setLoadingMaterials(true);
      setMaterialError("");

      const response = await fetch("/api/patient/materials", {
        cache: "no-store",
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar materiais.");
      }

      setMaterials(data.materials || []);
    } catch (error: unknown) {
      setMaterialError(getErrorMessage(error, "Erro ao carregar materiais."));
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadMaterials();
  }, [loadMaterials, loadTasks]);

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
      cancelled: tasks.filter((task) => task.status === "CANCELLED").length,
    };
  }, [tasks]);

  const materialStats = useMemo(() => {
    return {
      total: materials.length,
      unread: materials.filter((material) => !material.viewedAt).length,
      viewed: materials.filter((material) => material.viewedAt).length,
    };
  }, [materials]);

  const gamification = useMemo(() => {
    const completedTasks = taskStats.completed;
    const viewedMaterials = materialStats.viewed;
    const totalTrackableItems = taskStats.total + materialStats.total;
    const completedTrackableItems = completedTasks + viewedMaterials;

    const points = completedTasks * 10 + viewedMaterials * 5;

    const progressPercentage =
      totalTrackableItems > 0
        ? Math.round((completedTrackableItems / totalTrackableItems) * 100)
        : 0;

    let level = "Primeiros passos";
    let levelDescription =
      "O acompanhamento está começando. Os itens enviados pelo profissional aparecerão aqui como parte da continuidade do cuidado.";

    if (points >= 100) {
      level = "Acompanhamento ativo";
      levelDescription =
        "Você tem mantido uma participação consistente nas atividades e materiais do acompanhamento.";
    } else if (points >= 50) {
      level = "Ritmo terapêutico";
      levelDescription =
        "Você já construiu um bom ritmo de participação entre as sessões.";
    } else if (points >= 20) {
      level = "Em construção";
      levelDescription =
        "Seu progresso está em construção. Continue acompanhando as tarefas e materiais enviados.";
    }

    const indicators: {
      title: string;
      description: string;
      status: string;
      unlocked: boolean;
      icon: string;
    }[] = [];

    if (taskStats.total > 0) {
      indicators.push({
        title: "Tarefas terapêuticas",
        description: `${taskStats.completed} de ${taskStats.total} tarefa(s) concluída(s).`,
        status:
          taskStats.completed === taskStats.total
            ? "Em dia"
            : taskStats.completed > 0
              ? "Em andamento"
              : "Pendente",
        unlocked: taskStats.completed === taskStats.total,
        icon: "fa-solid fa-list-check",
      });
    }

    if (materialStats.total > 0) {
      indicators.push({
        title: "Materiais recebidos",
        description: `${materialStats.viewed} de ${materialStats.total} material(is) visualizado(s).`,
        status:
          materialStats.viewed === materialStats.total
            ? "Em dia"
            : materialStats.viewed > 0
              ? "Em andamento"
              : "Pendente",
        unlocked: materialStats.viewed === materialStats.total,
        icon: "fa-solid fa-book-open",
      });
    }

    if (totalTrackableItems > 0) {
      indicators.push({
        title: "Participação geral",
        description: `${completedTrackableItems} de ${totalTrackableItems} item(ns) acompanhado(s).`,
        status:
          completedTrackableItems === totalTrackableItems
            ? "Completa"
            : completedTrackableItems > 0
              ? "Em andamento"
              : "Inicial",
        unlocked: completedTrackableItems > 0,
        icon: "fa-solid fa-chart-line",
      });
    }

    if (
      totalTrackableItems > 0 &&
      completedTrackableItems === totalTrackableItems
    ) {
      indicators.push({
        title: "Organização do cuidado",
        description:
          "Todos os itens enviados foram acompanhados até o momento.",
        status: "Completo",
        unlocked: true,
        icon: "fa-solid fa-circle-check",
      });
    }

    if (totalTrackableItems === 0) {
      indicators.push({
        title: "Nenhum item enviado ainda",
        description:
          "Quando o psicólogo enviar tarefas ou materiais, o acompanhamento aparecerá aqui.",
        status: "Aguardando",
        unlocked: false,
        icon: "fa-solid fa-clock",
      });
    }

    return {
      points,
      level,
      levelDescription,
      progressPercentage,
      completedTrackableItems,
      totalTrackableItems,
      indicators,
    };
  }, [taskStats, materialStats]);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function toggleTaskDetails(taskId: string) {
    setExpandedTaskIds((previous) =>
      previous.includes(taskId)
        ? previous.filter((id) => id !== taskId)
        : [...previous, taskId],
    );
  }

  function toggleMaterialDetails(materialId: string) {
    setExpandedMaterialIds((previous) =>
      previous.includes(materialId)
        ? previous.filter((id) => id !== materialId)
        : [...previous, materialId],
    );
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateString));
  }

  function formatDateOnly(dateString: string | null) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(dateString));
  }

  function getTaskStatusLabel(status: TaskStatus) {
    if (status === "COMPLETED") return "Concluída";
    if (status === "CANCELLED") return "Cancelada";
    return "Pendente";
  }

  function getTaskStatusStyle(status: TaskStatus) {
    if (status === "COMPLETED") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (status === "CANCELLED") {
      return {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    return {
      backgroundColor: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  async function handleUpdateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      setUpdatingTaskId(taskId);

      if (status !== "COMPLETED") {
        showFeedback(
          "info",
          "A reabertura de tarefas ainda não possui rota configurada nesta versão.",
        );
        return;
      }

      const response = await fetch(`/api/patient/tasks/${taskId}/complete`, {
        method: "PATCH",
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar tarefa.");
      }

      await loadTasks();

      showFeedback("success", "Tarefa marcada como concluída.");
    } catch (error: unknown) {
      showFeedback(
        "error",
        getErrorMessage(error, "Não foi possível atualizar a tarefa."),
      );
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function handleMarkMaterialAsViewed(materialId: string) {
    try {
      setUpdatingMaterialId(materialId);

      const response = await fetch(`/api/patient/materials/${materialId}/view`, {
        method: "PATCH",
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao marcar material como visualizado.",
        );
      }

      await loadMaterials();

      showFeedback("success", "Material marcado como visualizado.");
    } catch (error: unknown) {
      showFeedback(
        "error",
        getErrorMessage(error, "Não foi possível atualizar o material."),
      );
    } finally {
      setUpdatingMaterialId("");
    }
  }

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    paddingBottom: "150px",
    background: "#ffffff",
    borderRadius: 0,
    overflow: "visible",
  };

  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 10px 28px rgba(0, 30, 94, 0.06)",
    border: `1px solid ${BORDER}`,
  };

  const buttonPrimaryStyle = {
    background: "linear-gradient(135deg, #2563eb, #4f8cff)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.20)",
  } as const;

  const buttonSecondaryStyle = {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "14px",
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
  } as const;

  const isLoadingAnyData = loadingTasks || loadingMaterials;

  if (isLoadingAnyData) {
    return (
      <PsicoPageSkeleton
        variant="tasksMaterials"
        title="Carregando atividades"
        subtitle="Preparando tarefas terapêuticas e materiais psicoeducativos enviados."
      />
    );
  }

  return (
    <div className="tasks-materials-page" style={pageStyle}>
      <section
        className="tasks-materials-hero"
        style={{
          background: "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
          borderRadius: "28px",
          padding: "30px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 20px 50px rgba(37, 99, 235, 0.18)",
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

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            Acompanhamento terapêutico
          </p>

          <div
            className="tasks-materials-hero-title"
            role="heading"
            aria-level={1}
            style={{
              color: "#ffffff",
              fontSize: "42px",
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: "12px",
            }}
          >
            Tarefas e materiais
          </div>

          <p
            className="tasks-materials-hero-description"
            style={{
              fontSize: "18px",
              color: "#ffffff",
              maxWidth: "850px",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Acompanhe as tarefas combinadas em sessão e acesse os materiais
            psicoeducativos enviados pelo seu psicólogo.
          </p>
        </div>
      </section>

      {isLoadingAnyData ? (
        <div style={{ ...cardStyle, marginBottom: "24px" }}>
          <PsicoInlineSkeleton rows={3} minHeight={220} />
        </div>
      ) : (
        <>
          <section
            className="tasks-progress-card"
            style={{
              ...cardStyle,
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: "24px",
              alignItems: "stretch",
            }}
          >
            <div>
              <p
                style={{
                  color: "#2563eb",
                  fontSize: "14px",
                  fontWeight: 900,
                  marginBottom: "8px",
                }}
              >
                Progresso do acompanhamento
              </p>

              <h2
                style={{
                  color: NAVY,
                  fontSize: "30px",
                  fontWeight: 900,
                  marginBottom: "8px",
                }}
              >
                {gamification.level}
              </h2>

              <p
                style={{
                  color: MUTED,
                  lineHeight: 1.6,
                  marginBottom: "18px",
                }}
              >
                {gamification.levelDescription}
              </p>

              <div
                className="tasks-progress-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <SmallStatCard
                  label="Pontos"
                  value={gamification.points}
                  tone="blue"
                />

                <SmallStatCard
                  label="Progresso"
                  value={`${gamification.progressPercentage}%`}
                  tone="green"
                />

                <SmallStatCard
                  label="Itens acompanhados"
                  value={`${gamification.completedTrackableItems}/${gamification.totalTrackableItems}`}
                  tone="slate"
                />
              </div>

              <div
                style={{
                  width: "100%",
                  height: "12px",
                  borderRadius: "999px",
                  backgroundColor: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${gamification.progressPercentage}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #2563eb, #22c55e)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <p
                style={{
                  color: MUTED,
                  fontSize: "13px",
                  marginTop: "10px",
                  marginBottom: 0,
                }}
              >
                A pontuação é simbólica e serve apenas para visualizar sua
                participação no acompanhamento.
              </p>
            </div>

            <div>
              <p
                style={{
                  color: NAVY,
                  fontSize: "18px",
                  fontWeight: 900,
                  marginBottom: "14px",
                }}
              >
                Indicadores de acompanhamento
              </p>

              <p
                style={{
                  color: MUTED,
                  fontSize: "14px",
                  lineHeight: 1.6,
                  marginTop: "-6px",
                  marginBottom: "14px",
                }}
              >
                Os indicadores se adaptam ao que foi enviado pelo psicólogo. Se
                não houver materiais, por exemplo, a tela não exige leitura.
              </p>

              <div
                className="tasks-indicators-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {gamification.indicators.map((indicator) => (
                  <div
                    key={indicator.title}
                    className="tasks-indicator-card"
                    style={{
                      border: indicator.unlocked
                        ? "1px solid #bfdbfe"
                        : `1px solid ${BORDER}`,
                      backgroundColor: indicator.unlocked ? "#eff6ff" : "#f9fafb",
                      borderRadius: "16px",
                      padding: "14px",
                      opacity: indicator.unlocked ? 1 : 0.88,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "12px",
                          backgroundColor: indicator.unlocked
                            ? "#2563eb"
                            : "#e5e7eb",
                          color: indicator.unlocked ? "#ffffff" : "#5272a6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className={indicator.icon}></i>
                      </div>

                      <div>
                        <p
                          style={{
                            color: NAVY,
                            fontWeight: 900,
                            margin: 0,
                            fontSize: "14px",
                          }}
                        >
                          {indicator.title}
                        </p>

                        <p
                          style={{
                            color: indicator.unlocked ? "#1d4ed8" : MUTED,
                            fontSize: "12px",
                            fontWeight: 800,
                            margin: 0,
                          }}
                        >
                          {indicator.status}
                        </p>
                      </div>
                    </div>

                    <p
                      style={{
                        color: MUTED,
                        fontSize: "13px",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {indicator.description}
                    </p>
                  </div>
                ))}
              </div>
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
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "18px",
                fontWeight: 800,
              }}
            >
              {feedback.message}
            </div>
          )}

          <div
            className="tasks-metrics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <MetricCard label="Tarefas pendentes" value={taskStats.pending} tone="amber" />
            <MetricCard label="Tarefas concluídas" value={taskStats.completed} tone="green" />
            <MetricCard label="Materiais novos" value={materialStats.unread} tone="blue" />
            <MetricCard label="Materiais vistos" value={materialStats.viewed} tone="green" />
            <MetricCard label="Total recebido" value={taskStats.total + materialStats.total} tone="navy" />
          </div>

          <div
            className="tasks-tabs"
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("TASKS")}
              style={{
                border:
                  activeTab === "TASKS"
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                backgroundColor: activeTab === "TASKS" ? "#eff6ff" : "#fff",
                color: activeTab === "TASKS" ? "#1d4ed8" : NAVY_SOFT,
                borderRadius: "999px",
                padding: "11px 17px",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fa-solid fa-list-check"></i>
              Tarefas terapêuticas
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("MATERIALS")}
              style={{
                border:
                  activeTab === "MATERIALS"
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                backgroundColor: activeTab === "MATERIALS" ? "#eff6ff" : "#fff",
                color: activeTab === "MATERIALS" ? "#1d4ed8" : NAVY_SOFT,
                borderRadius: "999px",
                padding: "11px 17px",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="fa-solid fa-book-open"></i>
              Materiais psicoeducativos
            </button>
          </div>

          {activeTab === "TASKS" && (
            <section className="tasks-content-section" style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: NAVY,
                  marginBottom: "8px",
                }}
              >
                Tarefas terapêuticas
              </h2>

              <p
                style={{ color: MUTED, marginBottom: "20px", lineHeight: 1.6 }}
              >
                Aqui ficam as atividades combinadas com seu psicólogo para apoiar
                seu processo terapêutico entre as sessões.
              </p>

              {taskError && (
                <ErrorBox message={taskError} />
              )}

              {tasks.length === 0 ? (
                <EmptyBox
                  title="Nenhuma tarefa recebida"
                  description="Quando seu psicólogo enviar uma tarefa, ela aparecerá aqui."
                />
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                >
                  {tasks.map((task) => {
                    const isTaskExpanded = expandedTaskIds.includes(task.id);

                    return (
                      <div
                        key={task.id}
                        className={`tasks-list-card ${isTaskExpanded ? "is-expanded" : ""}`}
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderRadius: "16px",
                          padding: "18px",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <div
                          className="tasks-list-card-header"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                            marginBottom: isTaskExpanded ? "12px" : "10px",
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                color: NAVY,
                                fontSize: "20px",
                                fontWeight: 900,
                                marginBottom: "0",
                              }}
                            >
                              {task.title}
                            </h3>
                          </div>

                          <span
                            className="tasks-status-pill"
                            style={{
                              ...getTaskStatusStyle(task.status),
                              borderRadius: "999px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="tasks-card-toggle"
                          onClick={() => toggleTaskDetails(task.id)}
                        >
                          {isTaskExpanded ? "Ocultar detalhes" : "Exibir detalhes"}
                        </button>

                        {isTaskExpanded && (
                          <div className="tasks-list-card-details">
                            {task.dueDate && (
                              <p style={{ color: MUTED, marginBottom: "10px" }}>
                                <strong>Prazo:</strong>{" "}
                                {formatDateOnly(task.dueDate)}
                              </p>
                            )}

                            {task.description && (
                              <p
                                style={{
                                  color: NAVY_SOFT,
                                  lineHeight: 1.6,
                                  marginBottom: "12px",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {task.description}
                              </p>
                            )}

                            {task.appointment && (
                              <p style={{ color: NAVY_SOFT, marginBottom: "10px" }}>
                                <strong>Consulta relacionada:</strong>{" "}
                                {task.appointment.title} —{" "}
                                {formatDate(task.appointment.dateTime)}
                              </p>
                            )}

                            {task.psychologist?.name && (
                              <p
                                style={{
                                  color: MUTED,
                                  fontSize: "13px",
                                  marginBottom: "10px",
                                }}
                              >
                                Enviada por {task.psychologist.name}
                              </p>
                            )}

                            {task.completedAt && (
                              <p style={{ color: "#065f46", marginBottom: "10px" }}>
                                <strong>Concluída em:</strong>{" "}
                                {formatDate(task.completedAt)}
                              </p>
                            )}

                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                              }}
                            >
                              {task.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateTaskStatus(task.id, "COMPLETED")
                                  }
                                  disabled={updatingTaskId === task.id}
                                  style={{
                                    ...buttonPrimaryStyle,
                                    opacity: updatingTaskId === task.id ? 0.7 : 1,
                                    cursor:
                                      updatingTaskId === task.id
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  {updatingTaskId === task.id
                                    ? "Atualizando..."
                                    : "Marcar como concluída"}
                                </button>
                              )}

                              {task.status === "CANCELLED" && (
                                <span
                                  style={{
                                    color: "#b91c1c",
                                    fontWeight: 800,
                                  }}
                                >
                                  Esta tarefa foi cancelada pelo psicólogo.
                                </span>
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
          )}

          {activeTab === "MATERIALS" && (
            <section className="tasks-content-section" style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  color: NAVY,
                  marginBottom: "8px",
                }}
              >
                Materiais psicoeducativos
              </h2>

              <p
                style={{ color: MUTED, marginBottom: "20px", lineHeight: 1.6 }}
              >
                Acesse links, textos e orientações enviados pelo seu psicólogo
                para apoiar seu acompanhamento.
              </p>

              {materialError && (
                <ErrorBox message={materialError} />
              )}

              {materials.length === 0 ? (
                <EmptyBox
                  title="Nenhum material recebido"
                  description="Quando seu psicólogo enviar um material, ele aparecerá aqui."
                />
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                >
                  {materials.map((material) => {
                    const isMaterialExpanded = expandedMaterialIds.includes(
                      material.id,
                    );

                    return (
                      <div
                        key={material.id}
                        className={`tasks-list-card ${isMaterialExpanded ? "is-expanded" : ""}`}
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderRadius: "16px",
                          padding: "18px",
                          backgroundColor: material.viewedAt
                            ? "#f8fafc"
                            : "#eff6ff",
                        }}
                      >
                        <div
                          className="tasks-list-card-header"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "flex-start",
                            marginBottom: isMaterialExpanded ? "12px" : "10px",
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                color: NAVY,
                                fontSize: "20px",
                                fontWeight: 900,
                                marginBottom: "0",
                              }}
                            >
                              {material.title}
                            </h3>
                          </div>

                          <span
                            className="tasks-status-pill"
                            style={{
                              backgroundColor: material.viewedAt
                                ? "#ecfdf5"
                                : "#dbeafe",
                              color: material.viewedAt ? "#065f46" : "#1d4ed8",
                              border: material.viewedAt
                                ? "1px solid #a7f3d0"
                                : "1px solid #bfdbfe",
                              borderRadius: "999px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {material.viewedAt ? "Visualizado" : "Novo"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="tasks-card-toggle"
                          onClick={() => toggleMaterialDetails(material.id)}
                        >
                          {isMaterialExpanded
                            ? "Ocultar detalhes"
                            : "Exibir detalhes"}
                        </button>

                        {isMaterialExpanded && (
                          <div className="tasks-list-card-details">
                            {material.category && (
                              <p style={{ color: MUTED, marginBottom: "10px" }}>
                                <strong>Categoria:</strong> {material.category}
                              </p>
                            )}

                            {material.description && (
                              <p
                                style={{
                                  color: NAVY_SOFT,
                                  lineHeight: 1.6,
                                  marginBottom: "12px",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {material.description}
                              </p>
                            )}

                            {material.url && (
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  ...buttonPrimaryStyle,
                                  marginBottom: "12px",
                                }}
                              >
                                Abrir material
                              </a>
                            )}

                            {material.content && (
                              <div
                                style={{
                                  backgroundColor: "#ffffff",
                                  border: `1px solid ${BORDER}`,
                                  borderRadius: "14px",
                                  padding: "14px",
                                  color: NAVY_SOFT,
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.6,
                                  marginTop: "8px",
                                  marginBottom: "12px",
                                }}
                              >
                                {material.content}
                              </div>
                            )}

                            {material.psychologist?.name && (
                              <p
                                style={{
                                  color: MUTED,
                                  fontSize: "13px",
                                  marginBottom: "10px",
                                }}
                              >
                                Enviado por {material.psychologist.name} em{" "}
                                {formatDate(material.createdAt)}
                              </p>
                            )}

                            {material.viewedAt && (
                              <p
                                style={{
                                  color: "#065f46",
                                  marginBottom: "10px",
                                }}
                              >
                                <strong>Visualizado em:</strong>{" "}
                                {formatDate(material.viewedAt)}
                              </p>
                            )}

                            {!material.viewedAt && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkMaterialAsViewed(material.id)
                                }
                                disabled={updatingMaterialId === material.id}
                                style={{
                                  ...buttonSecondaryStyle,
                                  opacity:
                                    updatingMaterialId === material.id ? 0.7 : 1,
                                  cursor:
                                    updatingMaterialId === material.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {updatingMaterialId === material.id
                                  ? "Atualizando..."
                                  : "Marcar como visualizado"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}


      <style>{`
        .tasks-materials-hero-title,
        .tasks-materials-hero-title * {
          color: #ffffff !important;
        }

        .tasks-materials-hero-description {
          color: #ffffff !important;
        }

        .tasks-metric-card-label {
          color: #64748b !important;
        }

        .tasks-small-stat-card {
          min-height: 86px;
        }

        .tasks-content-section {
          overflow: visible;
        }

        .tasks-list-card {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .tasks-list-card:not(.is-expanded) {
          padding-top: 16px !important;
          padding-bottom: 16px !important;
        }

        .tasks-list-card:hover {
          transform: translateY(-1px);
        }

        .tasks-list-card-header {
          min-width: 0;
        }

        .tasks-list-card-header h3 {
          overflow-wrap: anywhere;
        }

        .tasks-card-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          margin-top: 2px;
        }

        .tasks-list-card-details {
          margin-top: 14px;
          border-top: 1px solid #e6edf7;
          padding-top: 14px;
        }

        .tasks-tabs button {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .tasks-tabs button:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 1180px) {
          .tasks-progress-card {
            grid-template-columns: 1fr !important;
          }

          .tasks-metrics-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .tasks-indicators-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 900px) {
          .tasks-materials-page {
            padding: 20px !important;
            padding-bottom: 130px !important;
          }

          .tasks-materials-hero {
            padding: 24px !important;
            border-radius: 24px !important;
          }

          .tasks-materials-hero-title {
            font-size: 34px !important;
          }

          .tasks-progress-card,
          .tasks-content-section {
            padding: 20px !important;
          }

          .tasks-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          .tasks-materials-page {
            padding: 16px !important;
            padding-bottom: 120px !important;
          }

          .tasks-materials-hero {
            padding: 18px !important;
            border-radius: 22px !important;
            margin-bottom: 16px !important;
          }

          .tasks-materials-hero-title {
            font-size: 26px !important;
            line-height: 1.08 !important;
            margin-bottom: 0 !important;
            color: #ffffff !important;
          }

          .tasks-materials-hero-description {
            display: none !important;
          }

          .tasks-progress-card {
            padding: 16px !important;
            gap: 16px !important;
            margin-bottom: 16px !important;
            border-radius: 18px !important;
          }

          .tasks-progress-card h2 {
            font-size: 23px !important;
            line-height: 1.16 !important;
            margin-bottom: 6px !important;
          }

          .tasks-progress-card > div:first-child > p:nth-of-type(2) {
            font-size: 13px !important;
            line-height: 1.45 !important;
            margin-bottom: 12px !important;
          }

          .tasks-progress-card > div:first-child > p:last-child,
          .tasks-progress-card > div:nth-child(2) > p:nth-of-type(2) {
            display: none !important;
          }

          .tasks-progress-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 12px !important;
          }

          .tasks-small-stat-card {
            min-height: 74px !important;
            padding: 10px !important;
            border-radius: 14px !important;
          }

          .tasks-small-stat-card p:first-child {
            font-size: 10.5px !important;
            line-height: 1.15 !important;
            margin-bottom: 5px !important;
            color: #64748b !important;
          }

          .tasks-small-stat-card p:last-child {
            font-size: 22px !important;
            line-height: 1 !important;
          }

          .tasks-indicators-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .tasks-indicator-card {
            padding: 10px !important;
            border-radius: 14px !important;
          }

          .tasks-indicator-card > div:first-child {
            margin-bottom: 0 !important;
            gap: 8px !important;
          }

          .tasks-indicator-card > div:first-child > div:first-child {
            width: 30px !important;
            height: 30px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
          }

          .tasks-indicator-card p {
            font-size: 11px !important;
            line-height: 1.2 !important;
          }

          .tasks-indicator-card > p {
            display: none !important;
          }

          .tasks-metrics-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }

          .tasks-metric-card {
            min-height: 82px !important;
            padding: 10px !important;
            border-radius: 16px !important;
          }

          .tasks-metric-card-label {
            font-size: 10.5px !important;
            line-height: 1.15 !important;
            margin-bottom: 6px !important;
            color: #64748b !important;
          }

          .tasks-metric-card-value {
            font-size: 24px !important;
            line-height: 1 !important;
          }

          .tasks-tabs {
            gap: 8px !important;
            margin-bottom: 16px !important;
          }

          .tasks-tabs button {
            flex: 1 1 100%;
            justify-content: center !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }

          .tasks-content-section {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .tasks-content-section h2 {
            font-size: 22px !important;
            line-height: 1.15 !important;
          }

          .tasks-content-section > p {
            display: none !important;
          }

          .tasks-list-card {
            padding: 14px !important;
            border-radius: 16px !important;
          }

          .tasks-list-card > div:first-child {
            flex-direction: column !important;
            gap: 8px !important;
          }

          .tasks-list-card h3 {
            font-size: 17px !important;
            line-height: 1.25 !important;
          }

          .tasks-status-pill {
            width: fit-content !important;
            max-width: 100% !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            text-align: left !important;
            font-size: 11px !important;
            padding: 6px 10px !important;
          }

          .tasks-list-card button:not(.tasks-card-toggle),
          .tasks-list-card a {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
            box-shadow: none !important;
          }

          .tasks-card-toggle {
            width: fit-content !important;
            max-width: 100% !important;
            padding: 7px 12px !important;
            font-size: 12px !important;
          }

          .tasks-list-card-details {
            margin-top: 12px !important;
            padding-top: 12px !important;
          }
        }

        @media (max-width: 420px) {
          .tasks-materials-hero-title {
            font-size: 24px !important;
          }

          .tasks-metrics-grid,
          .tasks-progress-stats-grid,
          .tasks-indicators-grid {
            gap: 7px !important;
          }

          .tasks-small-stat-card {
            min-height: 70px !important;
            padding: 9px !important;
          }

          .tasks-metric-card {
            min-height: 78px !important;
            padding: 9px !important;
          }

          .tasks-metric-card-label,
          .tasks-small-stat-card p:first-child {
            font-size: 10px !important;
          }

          .tasks-metric-card-value,
          .tasks-small-stat-card p:last-child {
            font-size: 22px !important;
          }
        }
      `}</style>


      <div style={{ height: "90px" }} aria-hidden="true" />
    </div>
  );
}

function SmallStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "green" | "slate";
}) {
  const toneMap = {
    blue: {
      bg: "#eff6ff",
      border: "#bfdbfe",
      label: "#1d4ed8",
    },
    green: {
      bg: "#ecfdf5",
      border: "#a7f3d0",
      label: "#065f46",
    },
    slate: {
      bg: "#f8fafc",
      border: BORDER,
      label: MUTED,
    },
  };

  const selectedTone = toneMap[tone];

  return (
    <div
      className="tasks-small-stat-card"
      style={{
        backgroundColor: selectedTone.bg,
        border: `1px solid ${selectedTone.border}`,
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <p
        style={{
          color: selectedTone.label,
          fontSize: "13px",
          fontWeight: 800,
          marginBottom: "6px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          color: NAVY,
          fontSize: "28px",
          fontWeight: 900,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "navy";
}) {
  const toneMap = {
    blue: "#1d4ed8",
    green: "#047857",
    amber: "#92400e",
    navy: NAVY,
  };

  return (
    <div
      className="tasks-metric-card"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "22px",
        padding: "24px",
        boxShadow: "0 10px 28px rgba(0, 30, 94, 0.06)",
        border: `1px solid ${BORDER}`,
      }}
    >
      <p className="tasks-metric-card-label" style={{ color: MUTED, fontSize: "14px", marginBottom: "8px" }}>
        {label}
      </p>

      <p
        className="tasks-metric-card-value"
        style={{
          color: toneMap[tone],
          fontSize: "32px",
          fontWeight: 900,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        borderRadius: "12px",
        padding: "12px 14px",
        marginBottom: "16px",
        fontWeight: 800,
      }}
    >
      {message}
    </div>
  );
}

function EmptyBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: "16px",
        padding: "18px",
        backgroundColor: "#f8fafc",
      }}
    >
      <p
        style={{
          color: NAVY,
          fontWeight: 900,
          marginBottom: "6px",
        }}
      >
        {title}
      </p>

      <p style={{ color: MUTED, margin: 0 }}>{description}</p>
    </div>
  );
}
