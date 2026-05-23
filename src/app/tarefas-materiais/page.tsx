"use client";

import { useEffect, useMemo, useState } from "react";

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

  async function loadTasks() {
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
    } catch (error: any) {
      setTaskError(error.message || "Erro ao carregar tarefas.");
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadMaterials() {
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
    } catch (error: any) {
      setMaterialError(error.message || "Erro ao carregar materiais.");
    } finally {
      setLoadingMaterials(false);
    }
  }

  useEffect(() => {
    loadTasks();
    loadMaterials();
  }, []);

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

      const response = await fetch(`/api/patient/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar tarefa.");
      }

      await loadTasks();

      showFeedback(
        "success",
        status === "COMPLETED"
          ? "Tarefa marcada como concluída."
          : "Tarefa reaberta com sucesso.",
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Não foi possível atualizar a tarefa.",
      );
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function handleMarkMaterialAsViewed(materialId: string) {
    try {
      setUpdatingMaterialId(materialId);

      const response = await fetch(`/api/patient/materials/${materialId}`, {
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
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Não foi possível atualizar o material.",
      );
    } finally {
      setUpdatingMaterialId("");
    }
  }

  const pageStyle = {
    padding: "36px",
    minHeight: "calc(100vh - 48px)",
    paddingBottom: "72px",
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
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(37, 99, 235, 0.24)",
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

  return (
    <div style={pageStyle}>
      <section
        style={{
          background: "linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa)",
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

        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: "#dbeafe",
              fontSize: "14px",
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            Acompanhamento terapêutico
          </p>

          <h1
            style={{
              fontSize: "42px",
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: "12px",
            }}
          >
            Tarefas e materiais
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#dbeafe",
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

      <section
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
              color: "#111827",
              fontSize: "30px",
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            {gamification.level}
          </h2>

          <p
            style={{
              color: "#6b7280",
              lineHeight: 1.6,
              marginBottom: "18px",
            }}
          >
            {gamification.levelDescription}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <p
                style={{
                  color: "#1d4ed8",
                  fontSize: "13px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                Pontos
              </p>

              <p
                style={{
                  color: "#111827",
                  fontSize: "28px",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                {gamification.points}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <p
                style={{
                  color: "#065f46",
                  fontSize: "13px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                Progresso
              </p>

              <p
                style={{
                  color: "#111827",
                  fontSize: "28px",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                {gamification.progressPercentage}%
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <p
                style={{
                  color: "#4b5563",
                  fontSize: "13px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                Itens acompanhados
              </p>

              <p
                style={{
                  color: "#111827",
                  fontSize: "28px",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                {gamification.completedTrackableItems}/
                {gamification.totalTrackableItems}
              </p>
            </div>
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
              color: "#6b7280",
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
              color: "#111827",
              fontSize: "18px",
              fontWeight: 900,
              marginBottom: "14px",
            }}
          >
            Indicadores de acompanhamento
          </p>

          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: 1.6,
              marginTop: "-6px",
              marginBottom: "14px",
            }}
          >
            Os indicadores se adaptam ao que foi enviado pelo psicólogo. Se não
            houver materiais, por exemplo, a tela não exige leitura.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            {gamification.indicators.map((indicator) => (
              <div
                key={indicator.title}
                style={{
                  border: indicator.unlocked
                    ? "1px solid #bfdbfe"
                    : "1px solid #e5e7eb",
                  backgroundColor: indicator.unlocked ? "#eff6ff" : "#f9fafb",
                  borderRadius: "16px",
                  padding: "14px",
                  opacity: indicator.unlocked ? 1 : 0.86,
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
                      color: indicator.unlocked ? "#ffffff" : "#6b7280",
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
                        color: "#111827",
                        fontWeight: 900,
                        margin: 0,
                        fontSize: "14px",
                      }}
                    >
                      {indicator.title}
                    </p>

                    <p
                      style={{
                        color: indicator.unlocked ? "#1d4ed8" : "#6b7280",
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
                    color: "#6b7280",
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={cardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Tarefas pendentes
          </p>
          <p
            style={{
              color: "#92400e",
              fontSize: "32px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            {taskStats.pending}
          </p>
        </div>

        <div style={cardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Tarefas concluídas
          </p>
          <p
            style={{
              color: "#065f46",
              fontSize: "32px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            {taskStats.completed}
          </p>
        </div>

        <div style={cardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Materiais novos
          </p>
          <p
            style={{
              color: "#1d4ed8",
              fontSize: "32px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            {materialStats.unread}
          </p>
        </div>

        <div style={cardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Materiais vistos
          </p>
          <p
            style={{
              color: "#065f46",
              fontSize: "32px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            {materialStats.viewed}
          </p>
        </div>

        <div style={cardStyle}>
          <p
            style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}
          >
            Total recebido
          </p>
          <p
            style={{
              color: "#111827",
              fontSize: "32px",
              fontWeight: 900,
              margin: 0,
            }}
          >
            {taskStats.total + materialStats.total}
          </p>
        </div>
      </div>

      <div
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
              activeTab === "TASKS" ? "1px solid #2563eb" : "1px solid #d1d5db",
            backgroundColor: activeTab === "TASKS" ? "#eff6ff" : "#fff",
            color: activeTab === "TASKS" ? "#1d4ed8" : "#374151",
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
            color: activeTab === "MATERIALS" ? "#1d4ed8" : "#374151",
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
        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Tarefas terapêuticas
          </h2>

          <p
            style={{ color: "#6b7280", marginBottom: "20px", lineHeight: 1.6 }}
          >
            Aqui ficam as atividades combinadas com seu psicólogo para apoiar
            seu processo terapêutico entre as sessões.
          </p>

          {taskError && (
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
              {taskError}
            </div>
          )}

          {loadingTasks ? (
            <div
              style={{
                minHeight: "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="psico-simple-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#111827",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                Nenhuma tarefa recebida
              </p>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Quando seu psicólogo enviar uma tarefa, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "18px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          color: "#111827",
                          fontSize: "20px",
                          fontWeight: 900,
                          marginBottom: "6px",
                        }}
                      >
                        {task.title}
                      </h3>

                      {task.dueDate && (
                        <p style={{ color: "#6b7280", margin: 0 }}>
                          Prazo: {formatDateOnly(task.dueDate)}
                        </p>
                      )}
                    </div>

                    <span
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

                  {task.description && (
                    <p
                      style={{
                        color: "#4b5563",
                        lineHeight: 1.6,
                        marginBottom: "12px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {task.description}
                    </p>
                  )}

                  {task.appointment && (
                    <p style={{ color: "#4b5563", marginBottom: "10px" }}>
                      <strong>Consulta relacionada:</strong>{" "}
                      {task.appointment.title} —{" "}
                      {formatDate(task.appointment.dateTime)}
                    </p>
                  )}

                  {task.psychologist?.name && (
                    <p
                      style={{
                        color: "#6b7280",
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
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
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

                    {task.status === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTaskStatus(task.id, "PENDING")
                        }
                        disabled={updatingTaskId === task.id}
                        style={{
                          ...buttonSecondaryStyle,
                          opacity: updatingTaskId === task.id ? 0.7 : 1,
                          cursor:
                            updatingTaskId === task.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        Reabrir tarefa
                      </button>
                    )}

                    {task.status === "CANCELLED" && (
                      <span style={{ color: "#b91c1c", fontWeight: 800 }}>
                        Esta tarefa foi cancelada pelo psicólogo.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "MATERIALS" && (
        <section style={cardStyle}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#111827",
              marginBottom: "8px",
            }}
          >
            Materiais psicoeducativos
          </h2>

          <p
            style={{ color: "#6b7280", marginBottom: "20px", lineHeight: 1.6 }}
          >
            Acesse links, textos e orientações enviados pelo seu psicólogo para
            apoiar seu acompanhamento.
          </p>

          {materialError && (
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
              {materialError}
            </div>
          )}

          {loadingMaterials ? (
            <div
              style={{
                minHeight: "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div className="psico-simple-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : materials.length === 0 ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "18px",
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  color: "#111827",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                Nenhum material recebido
              </p>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Quando seu psicólogo enviar um material, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {materials.map((material) => (
                <div
                  key={material.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "18px",
                    backgroundColor: material.viewedAt ? "#f8fafc" : "#eff6ff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          color: "#111827",
                          fontSize: "20px",
                          fontWeight: 900,
                          marginBottom: "6px",
                        }}
                      >
                        {material.title}
                      </h3>

                      {material.category && (
                        <p style={{ color: "#6b7280", margin: 0 }}>
                          Categoria: {material.category}
                        </p>
                      )}
                    </div>

                    <span
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

                  {material.description && (
                    <p
                      style={{
                        color: "#4b5563",
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
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "14px",
                        color: "#4b5563",
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
                        color: "#6b7280",
                        fontSize: "13px",
                        marginBottom: "10px",
                      }}
                    >
                      Enviado por {material.psychologist.name} em{" "}
                      {formatDate(material.createdAt)}
                    </p>
                  )}

                  {material.viewedAt && (
                    <p style={{ color: "#065f46", marginBottom: "10px" }}>
                      <strong>Visualizado em:</strong>{" "}
                      {formatDate(material.viewedAt)}
                    </p>
                  )}

                  {!material.viewedAt && (
                    <button
                      type="button"
                      onClick={() => handleMarkMaterialAsViewed(material.id)}
                      disabled={updatingMaterialId === material.id}
                      style={{
                        ...buttonSecondaryStyle,
                        opacity: updatingMaterialId === material.id ? 0.7 : 1,
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
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
