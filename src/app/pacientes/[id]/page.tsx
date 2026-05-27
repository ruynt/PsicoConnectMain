"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  endDateTime: string | null;
  status: "SCHEDULED" | "CANCELLED";
  googleEventLink: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number | string | null;
  paymentNote?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

type PatientDetails = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  nextAppointment: Appointment | null;
  appointments: Appointment[];
};

type PatientNote = {
  id: string;
  title: string;
  content: string;
  archived: boolean;
  archivedAt: string | null;
  patientId: string;
  appointmentId: string | null;
  appointment: {
    id: string;
    title: string;
    dateTime: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type PatientCheckin = {
  id: string;
  appointmentId: string;
  patientId: string;
  moodLevel: number | null;
  anxietyLevel: number | null;
  sleepLevel: number | null;
  mainConcern: string;
  importantEvents: string;
  topicsToDiscuss: string;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    title: string;
    dateTime: string;
    endDateTime: string | null;
    status: "SCHEDULED" | "CANCELLED";
    location: string;
  };
};

type TherapeuticTaskStatus = "PENDING" | "COMPLETED" | "CANCELLED";

type PaymentStatus = "PENDING" | "PAID" | "EXEMPT";

type PatientTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TherapeuticTaskStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
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
};

type PatientMessage = {
  id: string;
  content: string;
  senderRole: "PSYCHOLOGIST" | "PATIENT";
  patientId: string;
  psychologistId: string;
  readByPatientAt: string | null;
  readByPsychologistAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

type NoteFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PatientTab =
  | "SUMMARY"
  | "APPOINTMENTS"
  | "NOTES"
  | "CHECKINS"
  | "TASKS"
  | "MATERIALS"
  | "MESSAGES";

export default function PatientDetailsPage() {
  const params = useParams();
  const patientId = String(params.id);

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [checkins, setCheckins] = useState<PatientCheckin[]>([]);
  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [materials, setMaterials] = useState<PatientMaterial[]>([]);
  const [messages, setMessages] = useState<PatientMessage[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [archivingNoteId, setArchivingNoteId] = useState("");

  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [checkinError, setCheckinError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAppointmentId, setTaskAppointmentId] = useState("");

  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialContent, setMaterialContent] = useState("");

  const [messageContent, setMessageContent] = useState("");

  const [editingNoteId, setEditingNoteId] = useState("");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("ACTIVE");
  const [activeTab, setActiveTab] = useState<PatientTab>("SUMMARY");

  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState("");
  const [summarySourceNotesCount, setSummarySourceNotesCount] = useState(0);

  const [noteToArchive, setNoteToArchive] = useState<{
    id: string;
    title: string;
  } | null>(null);

  async function loadPatient() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/patients/${patientId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar paciente.");
      }

      setPatient(data.patient);
    } catch (error: any) {
      setError(error.message || "Erro ao carregar paciente.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotes(filter: NoteFilter = noteFilter) {
    try {
      setLoadingNotes(true);
      setNoteError("");

      const response = await fetch(
        `/api/patients/${patientId}/notes?status=${filter}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar anotações.");
      }

      setNotes(data.notes || []);
    } catch (error: any) {
      setNoteError(error.message || "Erro ao carregar anotações.");
    } finally {
      setLoadingNotes(false);
    }
  }

  async function loadCheckins() {
    try {
      setLoadingCheckins(true);
      setCheckinError("");

      const response = await fetch(`/api/patients/${patientId}/checkins`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar checklists.");
      }

      setCheckins(data.checkins || []);
    } catch (error: any) {
      setCheckinError(error.message || "Erro ao carregar checklists.");
    } finally {
      setLoadingCheckins(false);
    }
  }

  async function loadTasks() {
    try {
      setLoadingTasks(true);
      setTaskError("");

      const response = await fetch(`/api/patients/${patientId}/tasks`, {
        cache: "no-store",
      });

      const data = await response.json();

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

      const response = await fetch(`/api/patients/${patientId}/materials`, {
        cache: "no-store",
      });

      const data = await response.json();

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

  async function loadMessages() {
    try {
      setLoadingMessages(true);
      setMessageError("");

      const response = await fetch(`/api/patients/${patientId}/messages`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar mensagens.");
      }

      setMessages(data.messages || []);
    } catch (error: any) {
      setMessageError(error.message || "Erro ao carregar mensagens.");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadNotes(noteFilter);
    }
  }, [patientId, noteFilter]);

  useEffect(() => {
    if (patientId) {
      loadCheckins();
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadTasks();
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadMaterials();
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) {
      loadMessages();
    }
  }, [patientId]);

  const appointmentOptions = useMemo(() => {
    if (!patient) return [];

    return patient.appointments.filter(
      (appointment) => appointment.status === "SCHEDULED",
    );
  }, [patient]);

  function formatDate(dateString: string | null) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function formatDateOnly(dateString: string | null) {
    if (!dateString) return "--";

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
    }).format(new Date(dateString));
  }

  function formatCurrency(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return "Não informado";
    }

    const numericValue =
      typeof value === "number" ? value : Number(String(value).replace(",", "."));

    if (Number.isNaN(numericValue)) {
      return "Não informado";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  }

  function getPaymentStatusLabel(status: PaymentStatus | null | undefined) {
    if (status === "PAID") return "Pago";
    if (status === "EXEMPT") return "Isento";
    return "Pendente";
  }

  function getPaymentStatusStyle(status: PaymentStatus | null | undefined) {
    if (status === "PAID") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (status === "EXEMPT") {
      return {
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      backgroundColor: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fde68a",
    };
  }

  function getPaymentIcon(status: PaymentStatus | null | undefined) {
    if (status === "PAID") return "fa-solid fa-circle-check";
    if (status === "EXEMPT") return "fa-solid fa-hand-holding-heart";
    return "fa-solid fa-clock";
  }

  function getTaskStatusLabel(status: TherapeuticTaskStatus) {
    if (status === "COMPLETED") return "Concluída";
    if (status === "CANCELLED") return "Cancelada";
    return "Pendente";
  }

  function getTaskStatusStyle(status: TherapeuticTaskStatus) {
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

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function resetNoteForm() {
    setNoteTitle("");
    setNoteContent("");
    setSelectedAppointmentId("");
    setEditingNoteId("");
    setNoteError("");
  }

  function handleEditNote(note: PatientNote) {
    if (note.archived) {
      showFeedback("error", "Anotações arquivadas não podem ser editadas.");
      return;
    }

    setActiveTab("NOTES");
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteContent(note.content);
    setSelectedAppointmentId(note.appointmentId || "");
    setNoteError("");

    setTimeout(() => {
      const formElement = document.getElementById("note-form");
      formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleCreateOrUpdateNote(e: React.FormEvent) {
    e.preventDefault();

    setNoteError("");

    if (!noteContent.trim()) {
      setNoteError("Escreva o conteúdo da anotação antes de salvar.");
      return;
    }

    try {
      setSavingNote(true);

      const isEditing = Boolean(editingNoteId);

      const response = await fetch(
        isEditing
          ? `/api/patients/${patientId}/notes/${editingNoteId}`
          : `/api/patients/${patientId}/notes`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: noteTitle,
            content: noteContent,
            appointmentId: selectedAppointmentId || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEditing
              ? "Erro ao atualizar anotação."
              : "Erro ao salvar anotação."),
        );
      }

      await loadNotes(noteFilter);
      resetNoteForm();

      showFeedback(
        "success",
        isEditing
          ? "Anotação atualizada com sucesso."
          : "Anotação salva com sucesso.",
      );
    } catch (error: any) {
      setNoteError(error.message || "Erro ao salvar anotação.");
    } finally {
      setSavingNote(false);
    }
  }

  async function confirmArchiveNote() {
    if (!noteToArchive) return;

    try {
      setArchivingNoteId(noteToArchive.id);

      const response = await fetch(
        `/api/patients/${patientId}/notes/${noteToArchive.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao arquivar anotação.");
      }

      await loadNotes(noteFilter);
      setNoteToArchive(null);

      if (editingNoteId === noteToArchive.id) {
        resetNoteForm();
      }

      showFeedback("success", "Anotação arquivada com sucesso.");
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao arquivar anotação.");
    } finally {
      setArchivingNoteId("");
    }
  }

  async function handleGenerateProntuarioSummary() {
    try {
      setGeneratingSummary(true);
      setGeneratedSummary("");
      setSummaryGeneratedAt("");
      setSummarySourceNotesCount(0);

      const response = await fetch(`/api/patients/${patientId}/generate-summary`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar resumo para prontuário.");
      }

      setGeneratedSummary(data.summary || "");
      setSummaryGeneratedAt(data.generatedAt || "");
      setSummarySourceNotesCount(data.sourceNotesCount || 0);
      showFeedback("success", "Resumo para prontuário gerado com sucesso.");
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao gerar resumo para prontuário.",
      );
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleCopyProntuarioSummary() {
    if (!generatedSummary.trim()) return;

    try {
      await navigator.clipboard.writeText(generatedSummary);
      showFeedback("success", "Resumo copiado para a área de transferência.");
    } catch {
      showFeedback(
        "error",
        "Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.",
      );
    }
  }

  function resetTaskForm() {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskAppointmentId("");
    setTaskError("");
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();

    setTaskError("");

    if (!taskTitle.trim()) {
      setTaskError("Informe um título para a tarefa.");
      return;
    }

    try {
      setSavingTask(true);

      const response = await fetch(`/api/patients/${patientId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          dueDate: taskDueDate || null,
          appointmentId: taskAppointmentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao criar tarefa terapêutica.");
      }

      await loadTasks();
      resetTaskForm();

      showFeedback("success", "Tarefa terapêutica criada com sucesso.");
    } catch (error: any) {
      setTaskError(error.message || "Erro ao criar tarefa terapêutica.");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleUpdateTaskStatus(
    taskId: string,
    status: TherapeuticTaskStatus,
  ) {
    try {
      setUpdatingTaskId(taskId);

      const response = await fetch(`/api/patients/${patientId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar tarefa.");
      }

      await loadTasks();

      showFeedback(
        "success",
        status === "COMPLETED"
          ? "Tarefa marcada como concluída."
          : status === "CANCELLED"
            ? "Tarefa cancelada com sucesso."
            : "Tarefa reaberta com sucesso.",
      );
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao atualizar tarefa.");
    } finally {
      setUpdatingTaskId("");
    }
  }

  function resetMaterialForm() {
    setMaterialTitle("");
    setMaterialDescription("");
    setMaterialCategory("");
    setMaterialUrl("");
    setMaterialContent("");
    setMaterialError("");
  }

  async function handleCreateMaterial(e: React.FormEvent) {
    e.preventDefault();

    setMaterialError("");

    if (!materialTitle.trim()) {
      setMaterialError("Informe um título para o material.");
      return;
    }

    if (!materialUrl.trim() && !materialContent.trim()) {
      setMaterialError("Informe pelo menos um link ou um conteúdo textual.");
      return;
    }

    try {
      setSavingMaterial(true);

      const response = await fetch(`/api/patients/${patientId}/materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: materialTitle,
          description: materialDescription,
          category: materialCategory,
          url: materialUrl,
          content: materialContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao enviar material.");
      }

      await loadMaterials();
      resetMaterialForm();

      showFeedback("success", "Material psicoeducativo enviado com sucesso.");
    } catch (error: any) {
      setMaterialError(error.message || "Erro ao enviar material.");
    } finally {
      setSavingMaterial(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    setMessageError("");

    if (!messageContent.trim()) {
      setMessageError("Escreva uma mensagem antes de enviar.");
      return;
    }

    try {
      setSendingMessage(true);

      const response = await fetch(`/api/patients/${patientId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao enviar mensagem.");
      }

      setMessageContent("");
      await loadMessages();

      showFeedback("success", "Mensagem enviada com sucesso.");
    } catch (error: any) {
      setMessageError(error.message || "Erro ao enviar mensagem.");
    } finally {
      setSendingMessage(false);
    }
  }

  const noteFilterInfo = {
    ACTIVE: {
      title: "Anotações ativas",
      emptyTitle: "Nenhuma anotação ativa",
      emptyDescription:
        "As anotações criadas para este paciente aparecerão aqui.",
    },
    ARCHIVED: {
      title: "Anotações arquivadas",
      emptyTitle: "Nenhuma anotação arquivada",
      emptyDescription:
        "As anotações arquivadas aparecerão aqui para consulta posterior.",
    },
    ALL: {
      title: "Todas as anotações",
      emptyTitle: "Nenhuma anotação registrada",
      emptyDescription:
        "Quando houver anotações para este paciente, elas aparecerão aqui.",
    },
  };

  const currentNoteFilterInfo = noteFilterInfo[noteFilter];

  const pageStyle = {
    padding: "36px",
    paddingBottom: "72px",
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

  const smallCardStyle = {
    ...cardStyle,
    minHeight: "132px",
    position: "relative",
    overflow: "hidden",
  } as const;

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "32px",
          background: "#f8fbff",
          overflow: "visible",
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

  if (error || !patient) {
    return (
      <div style={pageStyle}>
        <Link
          href="/pacientes"
          style={{
            display: "inline-block",
            color: "#2563eb",
            fontWeight: 800,
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          ← Voltar para pacientes
        </Link>

        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <p style={{ color: "#b91c1c", fontWeight: 800, margin: 0 }}>
            {error || "Paciente não encontrado."}
          </p>
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
              <Link
                href="/pacientes"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dbeafe",
                  fontWeight: 800,
                  textDecoration: "none",
                  marginBottom: "14px",
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
                Voltar para pacientes
              </Link>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "18px",
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                    border: "1px solid rgba(255, 255, 255, 0.24)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                  }}
                >
                  <i className="fa-solid fa-user"></i>
                </div>

                <div>
                  <p
                    style={{
                      color: "#dbeafe",
                      fontSize: "13px",
                      fontWeight: 800,
                      marginBottom: "4px",
                    }}
                  >
                    Perfil do paciente
                  </p>

                  <h1
                    style={{
                      fontSize: "42px",
                      fontWeight: 900,
                      lineHeight: 1.05,
                      margin: 0,
                    }}
                  >
                    {patient.name}
                  </h1>
                </div>
              </div>

              <p
                style={{
                  fontSize: "18px",
                  color: "#dbeafe",
                  maxWidth: "820px",
                  margin: 0,
                }}
              >
                Acompanhe consultas, checklists pré-sessão, tarefas terapêuticas,
                materiais psicoeducativos e anotações clínicas internas.
              </p>
            </div>

            <Link
              href={`/agenda?patientId=${patient.id}`}
              style={{
                ...buttonPrimaryStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
                position: "relative",
                zIndex: 1,
              }}
            >
              Agendar consulta
            </Link>
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
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Resumo", value: "SUMMARY", icon: "fa-solid fa-chart-simple" },
            { label: "Consultas", value: "APPOINTMENTS", icon: "fa-solid fa-calendar-days" },
            { label: "Anotações", value: "NOTES", icon: "fa-solid fa-pen-to-square" },
            { label: "Checklists", value: "CHECKINS", icon: "fa-solid fa-clipboard-check" },
            { label: "Tarefas", value: "TASKS", icon: "fa-solid fa-list-check" },
            { label: "Materiais", value: "MATERIALS", icon: "fa-solid fa-book-open" },
            { label: "Mensagens", value: "MESSAGES", icon: "fa-solid fa-comments" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as PatientTab)}
              style={{
                border:
                  activeTab === tab.value
                    ? "1px solid #2563eb"
                    : "1px solid #d1d5db",
                backgroundColor: activeTab === tab.value ? "#eff6ff" : "#fff",
                color: activeTab === tab.value ? "#1d4ed8" : "#374151",
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
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "SUMMARY" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              <div style={smallCardStyle}>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  E-mail
                </p>
                <p
                  style={{
                    color: "#111827",
                    fontSize: "16px",
                    fontWeight: 900,
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {patient.email}
                </p>
              </div>

              <div style={smallCardStyle}>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  Total de consultas
                </p>
                <p
                  style={{
                    color: "#111827",
                    fontSize: "34px",
                    fontWeight: 900,
                    margin: 0,
                  }}
                >
                  {patient.totalAppointments}
                </p>
              </div>

              <div style={smallCardStyle}>
                <p
                  style={{
                    color: "#065f46",
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  Agendadas
                </p>
                <p
                  style={{
                    color: "#065f46",
                    fontSize: "34px",
                    fontWeight: 900,
                    margin: 0,
                  }}
                >
                  {patient.scheduledAppointments}
                </p>
              </div>

              <div style={smallCardStyle}>
                <p
                  style={{
                    color: "#b91c1c",
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  Canceladas
                </p>
                <p
                  style={{
                    color: "#b91c1c",
                    fontSize: "34px",
                    fontWeight: 900,
                    margin: 0,
                  }}
                >
                  {patient.cancelledAppointments}
                </p>
              </div>
            </div>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "14px",
                }}
              >
                Próxima consulta
              </h2>

              {patient.nextAppointment ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    {patient.nextAppointment.title}
                  </p>

                  <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                    <strong>Início:</strong>{" "}
                    {formatDate(patient.nextAppointment.dateTime)}
                  </p>

                  {patient.nextAppointment.endDateTime && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Fim:</strong>{" "}
                      {formatDate(patient.nextAppointment.endDateTime)}
                    </p>
                  )}

                  {patient.nextAppointment.location && (
                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Local:</strong> {patient.nextAppointment.location}
                    </p>
                  )}

                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <p
                        style={{
                          color: "#111827",
                          fontWeight: 900,
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <i className={getPaymentIcon(patient.nextAppointment.paymentStatus)}></i>
                        Controle financeiro
                      </p>

                      <span
                        style={{
                          ...getPaymentStatusStyle(
                            patient.nextAppointment.paymentStatus,
                          ),
                          borderRadius: "999px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getPaymentStatusLabel(
                          patient.nextAppointment.paymentStatus,
                        )}
                      </span>
                    </div>

                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Valor:</strong>{" "}
                      {formatCurrency(patient.nextAppointment.paymentAmount)}
                    </p>

                    {patient.nextAppointment.paidAt && (
                      <p style={{ color: "#065f46", marginBottom: "6px" }}>
                        <strong>Pago em:</strong>{" "}
                        {formatDate(patient.nextAppointment.paidAt)}
                      </p>
                    )}

                    {patient.nextAppointment.paymentNote && (
                      <p style={{ color: "#4b5563", marginBottom: 0 }}>
                        <strong>Observação:</strong>{" "}
                        {patient.nextAppointment.paymentNote}
                      </p>
                    )}
                  </div>

                  {patient.nextAppointment.googleEventLink && (
                    <a
                      href={patient.nextAppointment.googleEventLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      Abrir no Google Calendar
                    </a>
                  )}
                </div>
              ) : (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Este paciente não possui consulta futura agendada.
                </p>
              )}
            </section>
          </>
        )}

        {activeTab === "APPOINTMENTS" && (
          <section style={cardStyle}>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#111827",
                marginBottom: "14px",
              }}
            >
              Histórico de consultas
            </h2>

            {patient.appointments.length === 0 ? (
              <p style={{ color: "#6b7280", margin: 0 }}>
                Nenhuma consulta vinculada a este paciente.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {patient.appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 800,
                          color: "#111827",
                          margin: 0,
                        }}
                      >
                        {appointment.title}
                      </p>

                      <span
                        style={{
                          backgroundColor:
                            appointment.status === "CANCELLED"
                              ? "#fef2f2"
                              : "#ecfdf5",
                          color:
                            appointment.status === "CANCELLED"
                              ? "#b91c1c"
                              : "#065f46",
                          border:
                            appointment.status === "CANCELLED"
                              ? "1px solid #fecaca"
                              : "1px solid #a7f3d0",
                          borderRadius: "999px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {appointment.status === "CANCELLED"
                          ? "Cancelada"
                          : "Agendada"}
                      </span>
                    </div>

                    <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                      <strong>Início:</strong>{" "}
                      {formatDate(appointment.dateTime)}
                    </p>

                    {appointment.endDateTime && (
                      <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Fim:</strong>{" "}
                        {formatDate(appointment.endDateTime)}
                      </p>
                    )}

                    {appointment.location && (
                      <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                        <strong>Local:</strong> {appointment.location}
                      </p>
                    )}

                    {appointment.status === "CANCELLED" &&
                      appointment.cancelledAt && (
                        <p style={{ color: "#4b5563", marginBottom: "6px" }}>
                          <strong>Cancelada em:</strong>{" "}
                          {formatDate(appointment.cancelledAt)}
                        </p>
                      )}

                    {appointment.status === "CANCELLED" &&
                      appointment.cancellationReason && (
                        <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                          <strong>Motivo do cancelamento:</strong>{" "}
                          {appointment.cancellationReason}
                        </p>
                      )}

                    <div
                      style={{
                        marginTop: "12px",
                        marginBottom: "12px",
                        padding: "12px",
                        borderRadius: "12px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginBottom: "8px",
                        }}
                      >
                        <p
                          style={{
                            color: "#111827",
                            fontWeight: 900,
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <i className={getPaymentIcon(appointment.paymentStatus)}></i>
                          Controle financeiro
                        </p>

                        <span
                          style={{
                            ...getPaymentStatusStyle(appointment.paymentStatus),
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getPaymentStatusLabel(appointment.paymentStatus)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginBottom: "4px",
                              fontWeight: 800,
                            }}
                          >
                            Valor
                          </p>
                          <p style={{ color: "#111827", margin: 0 }}>
                            {formatCurrency(appointment.paymentAmount)}
                          </p>
                        </div>

                        <div>
                          <p
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginBottom: "4px",
                              fontWeight: 800,
                            }}
                          >
                            Pago em
                          </p>
                          <p style={{ color: "#111827", margin: 0 }}>
                            {appointment.paidAt
                              ? formatDate(appointment.paidAt)
                              : "--"}
                          </p>
                        </div>

                        <div>
                          <p
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginBottom: "4px",
                              fontWeight: 800,
                            }}
                          >
                            Registro
                          </p>
                          <p style={{ color: "#111827", margin: 0 }}>
                            {appointment.paymentStatus === "EXEMPT"
                              ? "Sem cobrança"
                              : appointment.paymentStatus === "PAID"
                                ? "Quitado"
                                : "Em aberto"}
                          </p>
                        </div>
                      </div>

                      {appointment.paymentNote && (
                        <p
                          style={{
                            color: "#4b5563",
                            marginTop: "10px",
                            marginBottom: 0,
                          }}
                        >
                          <strong>Observação:</strong>{" "}
                          {appointment.paymentNote}
                        </p>
                      )}
                    </div>

                    {appointment.googleEventLink && (
                      <a
                        href={appointment.googleEventLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#2563eb",
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        Abrir no Google Calendar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "CHECKINS" && (
          <section style={cardStyle}>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Checklists pré-sessão
            </h2>

            <p style={{ color: "#6b7280", marginBottom: "18px" }}>
              Respostas enviadas pelo paciente antes dos atendimentos. Use estas
              informações para se preparar para a sessão.
            </p>

            {checkinError && (
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
                {checkinError}
              </div>
            )}

            {loadingCheckins ? (
              <p style={{ color: "#6b7280", margin: 0 }}>
                Carregando checklists...
              </p>
            ) : checkins.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <p
                  style={{
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  Nenhum checklist respondido
                </p>

                <p style={{ color: "#6b7280", margin: 0 }}>
                  Quando o paciente responder um checklist pré-sessão, as
                  informações aparecerão aqui.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
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
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            color: "#111827",
                            fontWeight: 800,
                            fontSize: "18px",
                            marginBottom: "6px",
                          }}
                        >
                          {checkin.appointment.title}
                        </p>

                        <p style={{ color: "#6b7280", margin: 0 }}>
                          Consulta em {formatDate(checkin.appointment.dateTime)}
                        </p>
                      </div>

                      <span
                        style={{
                          backgroundColor: "#ecfdf5",
                          color: "#065f46",
                          border: "1px solid #a7f3d0",
                          borderRadius: "999px",
                          padding: "5px 10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Respondido
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "10px",
                        marginBottom: "14px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "12px",
                        }}
                      >
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "4px",
                          }}
                        >
                          Humor
                        </p>
                        <p
                          style={{
                            color: "#111827",
                            fontSize: "22px",
                            fontWeight: 800,
                            margin: 0,
                          }}
                        >
                          {checkin.moodLevel ?? "--"}/10
                        </p>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "12px",
                        }}
                      >
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "4px",
                          }}
                        >
                          Ansiedade
                        </p>
                        <p
                          style={{
                            color: "#111827",
                            fontSize: "22px",
                            fontWeight: 800,
                            margin: 0,
                          }}
                        >
                          {checkin.anxietyLevel ?? "--"}/10
                        </p>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "12px",
                        }}
                      >
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "4px",
                          }}
                        >
                          Sono
                        </p>
                        <p
                          style={{
                            color: "#111827",
                            fontSize: "22px",
                            fontWeight: 800,
                            margin: 0,
                          }}
                        >
                          {checkin.sleepLevel ?? "--"}/10
                        </p>
                      </div>
                    </div>

                    {checkin.mainConcern && (
                      <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                        <strong>Principal preocupação:</strong>{" "}
                        {checkin.mainConcern}
                      </p>
                    )}

                    {checkin.importantEvents && (
                      <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                        <strong>Acontecimentos importantes:</strong>{" "}
                        {checkin.importantEvents}
                      </p>
                    )}

                    {checkin.topicsToDiscuss && (
                      <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                        <strong>Temas que deseja abordar:</strong>{" "}
                        {checkin.topicsToDiscuss}
                      </p>
                    )}

                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        marginTop: "12px",
                        marginBottom: 0,
                      }}
                    >
                      Enviado em {formatDate(checkin.createdAt)}
                      {checkin.updatedAt !== checkin.createdAt
                        ? ` · Atualizado em ${formatDate(checkin.updatedAt)}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {activeTab === "TASKS" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "20px",
            }}
          >
            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Nova tarefa
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Registre uma tarefa terapêutica para o paciente acompanhar na
                própria área.
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

              <form noValidate onSubmit={handleCreateTask}>
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Título
                  </label>

                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex.: Registrar pensamentos automáticos"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Descrição
                  </label>

                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Explique brevemente o que o paciente deve realizar."
                    rows={5}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Prazo
                  </label>

                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Consulta relacionada
                  </label>

                  <select
                    value={taskAppointmentId}
                    onChange={(e) => setTaskAppointmentId(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    <option value="">Sem consulta vinculada</option>

                    {appointmentOptions.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.title || "Consulta"} —{" "}
                        {formatDate(appointment.dateTime)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingTask}
                  style={{
                    ...buttonPrimaryStyle,
                    width: "100%",
                    opacity: savingTask ? 0.7 : 1,
                    cursor: savingTask ? "not-allowed" : "pointer",
                  }}
                >
                  {savingTask ? "Salvando..." : "Criar tarefa"}
                </button>
              </form>
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Tarefas terapêuticas
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Acompanhe as tarefas combinadas com o paciente e seus status.
              </p>

              {loadingTasks ? (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Carregando tarefas...
                </p>
              ) : tasks.length === 0 ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    Nenhuma tarefa registrada
                  </p>

                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Crie uma tarefa terapêutica para que ela apareça na área do
                    paciente.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
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
                          <p
                            style={{
                              color: "#111827",
                              fontWeight: 800,
                              fontSize: "18px",
                              marginBottom: "6px",
                            }}
                          >
                            {task.title}
                          </p>

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
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getTaskStatusLabel(task.status)}
                        </span>
                      </div>

                      {task.description && (
                        <p style={{ color: "#4b5563", marginBottom: "10px" }}>
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

                      {task.completedAt && (
                        <p style={{ color: "#065f46", marginBottom: "8px" }}>
                          <strong>Concluída em:</strong>{" "}
                          {formatDate(task.completedAt)}
                        </p>
                      )}

                      {task.cancelledAt && (
                        <p style={{ color: "#b91c1c", marginBottom: "8px" }}>
                          <strong>Cancelada em:</strong>{" "}
                          {formatDate(task.cancelledAt)}
                        </p>
                      )}

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                          marginTop: "8px",
                          marginBottom: "12px",
                        }}
                      >
                        Criada em {formatDate(task.createdAt)}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {task.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTaskStatus(task.id, "COMPLETED")
                            }
                            disabled={updatingTaskId === task.id}
                            style={{
                              backgroundColor: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #a7f3d0",
                              borderRadius: "10px",
                              padding: "10px 12px",
                              fontWeight: 800,
                              cursor:
                                updatingTaskId === task.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: updatingTaskId === task.id ? 0.7 : 1,
                            }}
                          >
                            Marcar concluída
                          </button>
                        )}

                        {task.status !== "PENDING" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTaskStatus(task.id, "PENDING")
                            }
                            disabled={updatingTaskId === task.id}
                            style={buttonSecondaryStyle}
                          >
                            Reabrir
                          </button>
                        )}

                        {task.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTaskStatus(task.id, "CANCELLED")
                            }
                            disabled={updatingTaskId === task.id}
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "10px",
                              padding: "10px 12px",
                              fontWeight: 800,
                              cursor:
                                updatingTaskId === task.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: updatingTaskId === task.id ? 0.7 : 1,
                            }}
                          >
                            Cancelar tarefa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}


        {activeTab === "MATERIALS" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "20px",
            }}
          >
            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Novo material
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Envie um material psicoeducativo para o paciente acessar na
                própria área.
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

              <form noValidate onSubmit={handleCreateMaterial}>
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Título
                  </label>

                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="Ex.: Exercício de respiração diafragmática"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Categoria
                  </label>

                  <input
                    type="text"
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value)}
                    placeholder="Ex.: Ansiedade, sono, rotina, psicoeducação"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Descrição
                  </label>

                  <textarea
                    value={materialDescription}
                    onChange={(e) => setMaterialDescription(e.target.value)}
                    placeholder="Explique brevemente por que esse material foi enviado."
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Link externo
                  </label>

                  <input
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    placeholder="Ex.: https://..."
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Conteúdo textual
                  </label>

                  <textarea
                    value={materialContent}
                    onChange={(e) => setMaterialContent(e.target.value)}
                    placeholder="Cole aqui uma orientação, exercício ou conteúdo psicoeducativo."
                    rows={6}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingMaterial}
                  style={{
                    ...buttonPrimaryStyle,
                    width: "100%",
                    opacity: savingMaterial ? 0.7 : 1,
                    cursor: savingMaterial ? "not-allowed" : "pointer",
                  }}
                >
                  {savingMaterial ? "Enviando..." : "Enviar material"}
                </button>
              </form>
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Materiais enviados
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Acompanhe os materiais psicoeducativos disponibilizados para o
                paciente.
              </p>

              {loadingMaterials ? (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Carregando materiais...
                </p>
              ) : materials.length === 0 ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    Nenhum material enviado
                  </p>

                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Envie um material para que ele apareça na área do paciente.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
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
                          <p
                            style={{
                              color: "#111827",
                              fontWeight: 800,
                              fontSize: "18px",
                              marginBottom: "6px",
                            }}
                          >
                            {material.title}
                          </p>

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
                              : "#eff6ff",
                            color: material.viewedAt ? "#065f46" : "#1d4ed8",
                            border: material.viewedAt
                              ? "1px solid #a7f3d0"
                              : "1px solid #bfdbfe",
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {material.viewedAt ? "Visualizado" : "Enviado"}
                        </span>
                      </div>

                      {material.description && (
                        <p style={{ color: "#4b5563", marginBottom: "10px" }}>
                          {material.description}
                        </p>
                      )}

                      {material.url && (
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#2563eb",
                            fontWeight: 800,
                            textDecoration: "none",
                            display: "inline-block",
                            marginBottom: "10px",
                          }}
                        >
                          Abrir link do material
                        </a>
                      )}

                      {material.content && (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "12px",
                            color: "#4b5563",
                            whiteSpace: "pre-wrap",
                            marginTop: "4px",
                            marginBottom: "10px",
                          }}
                        >
                          {material.content}
                        </div>
                      )}

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                          marginTop: "8px",
                          marginBottom: 0,
                        }}
                      >
                        Enviado em {formatDate(material.createdAt)}
                        {material.viewedAt
                          ? ` · Visualizado em ${formatDate(material.viewedAt)}`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}


        {activeTab === "MESSAGES" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "20px",
            }}
          >
            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                Nova mensagem
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Envie uma orientação ou recado para o paciente. As mensagens
                ficam visíveis na área do paciente.
              </p>

              {messageError && (
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
                  {messageError}
                </div>
              )}

              <form noValidate onSubmit={handleSendMessage}>
                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Mensagem
                  </label>

                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Ex.: Olá! Não esqueça de realizar a tarefa combinada antes da próxima sessão."
                    rows={8}
                    maxLength={2000}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />

                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginTop: "6px",
                      marginBottom: 0,
                    }}
                  >
                    {messageContent.length}/2000 caracteres
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage}
                  style={{
                    ...buttonPrimaryStyle,
                    width: "100%",
                    opacity: sendingMessage ? 0.7 : 1,
                    cursor: sendingMessage ? "not-allowed" : "pointer",
                  }}
                >
                  {sendingMessage ? "Enviando..." : "Enviar mensagem"}
                </button>
              </form>

              <div
                style={{
                  marginTop: "18px",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "14px",
                  padding: "14px",
                  color: "#1e40af",
                  lineHeight: 1.5,
                  fontSize: "14px",
                }}
              >
                Este canal é assíncrono: as mensagens ficam registradas no
                sistema, mas não funcionam como chat em tempo real.
              </div>
            </section>

            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "26px",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Histórico de mensagens
                  </h2>

                  <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                    Acompanhe as mensagens trocadas com este paciente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadMessages}
                  disabled={loadingMessages}
                  style={buttonSecondaryStyle}
                >
                  {loadingMessages ? "Atualizando..." : "Atualizar"}
                </button>
              </div>

              {loadingMessages ? (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Carregando mensagens...
                </p>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    Nenhuma mensagem registrada
                  </p>

                  <p style={{ color: "#6b7280", margin: 0 }}>
                    Quando uma mensagem for enviada ou respondida pelo paciente,
                    ela aparecerá aqui.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    maxHeight: "560px",
                    overflow: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {messages.map((message) => {
                    const isPsychologist =
                      message.senderRole === "PSYCHOLOGIST";

                    return (
                      <div
                        key={message.id}
                        style={{
                          display: "flex",
                          justifyContent: isPsychologist
                            ? "flex-end"
                            : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "78%",
                            backgroundColor: isPsychologist
                              ? "#2563eb"
                              : "#ffffff",
                            color: isPsychologist ? "#ffffff" : "#111827",
                            border: isPsychologist
                              ? "1px solid #2563eb"
                              : "1px solid #e5e7eb",
                            borderRadius: isPsychologist
                              ? "16px 16px 4px 16px"
                              : "16px 16px 16px 4px",
                            padding: "12px 14px",
                            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "12px",
                              fontWeight: 900,
                              marginBottom: "6px",
                              color: isPsychologist ? "#dbeafe" : "#2563eb",
                            }}
                          >
                            {isPsychologist ? "Psicólogo" : "Paciente"}
                          </p>

                          <p
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.5,
                              marginBottom: "8px",
                            }}
                          >
                            {message.content}
                          </p>

                          <p
                            style={{
                              fontSize: "11px",
                              margin: 0,
                              color: isPsychologist ? "#dbeafe" : "#6b7280",
                            }}
                          >
                            {formatDate(message.createdAt)}
                            {isPsychologist && message.readByPatientAt
                              ? ` · Lida pelo paciente em ${formatDate(
                                  message.readByPatientAt,
                                )}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "NOTES" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "20px",
            }}
          >
            <section id="note-form" style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                {editingNoteId ? "Editar anotação" : "Nova anotação"}
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Estas anotações são internas e não ficam visíveis para o
                paciente.
              </p>

              {noteError && (
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
                  {noteError}
                </div>
              )}

              <form noValidate onSubmit={handleCreateOrUpdateNote}>
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Título
                  </label>

                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Ex.: Registro da sessão"
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Consulta relacionada
                  </label>

                  <select
                    value={selectedAppointmentId}
                    onChange={(e) => setSelectedAppointmentId(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    <option value="">
                      Sem vínculo com consulta específica
                    </option>

                    {appointmentOptions.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.title} — {formatDate(appointment.dateTime)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#111827",
                      marginBottom: "8px",
                    }}
                  >
                    Anotação
                  </label>

                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Escreva aqui as observações do atendimento..."
                    rows={8}
                    style={{
                      width: "100%",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    style={{
                      ...buttonPrimaryStyle,
                      opacity: savingNote ? 0.7 : 1,
                      cursor: savingNote ? "not-allowed" : "pointer",
                    }}
                    disabled={savingNote}
                  >
                    {savingNote
                      ? "Salvando..."
                      : editingNoteId
                        ? "Atualizar anotação"
                        : "Salvar anotação"}
                  </button>

                  <button
                    type="button"
                    style={buttonSecondaryStyle}
                    onClick={resetNoteForm}
                    disabled={savingNote}
                  >
                    {editingNoteId ? "Cancelar edição" : "Limpar"}
                  </button>
                </div>
              </form>
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                {currentNoteFilterInfo.title}
              </h2>

              <p style={{ color: "#6b7280", marginBottom: "18px" }}>
                Histórico de registros criados pelo psicólogo para este
                paciente.
              </p>

              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.08))",
                  border: "1px solid #bfdbfe",
                  borderRadius: "18px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "240px" }}>
                    <p
                      style={{
                        color: "#1e3a8a",
                        fontWeight: 900,
                        fontSize: "17px",
                        marginBottom: "6px",
                      }}
                    >
                      Resumo para prontuário com apoio de IA
                    </p>

                    <p
                      style={{
                        color: "#1e40af",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      Gere uma versão organizada das anotações ativas deste
                      paciente. O texto é apenas uma sugestão e deve ser
                      revisado pelo psicólogo antes de qualquer registro formal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateProntuarioSummary}
                    disabled={generatingSummary || notes.length === 0}
                    style={{
                      ...buttonPrimaryStyle,
                      minWidth: "230px",
                      opacity: generatingSummary || notes.length === 0 ? 0.7 : 1,
                      cursor:
                        generatingSummary || notes.length === 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {generatingSummary
                      ? "Gerando resumo..."
                      : "Gerar resumo para prontuário"}
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                    borderRadius: "12px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
                  Este recurso não substitui o julgamento clínico profissional,
                  não deve gerar diagnósticos automaticamente e precisa ser
                  revisado antes de uso em prontuário.
                </div>

                {generatedSummary && (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #dbeafe",
                      borderRadius: "14px",
                      padding: "16px",
                      marginTop: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            color: "#111827",
                            fontWeight: 900,
                            marginBottom: "4px",
                          }}
                        >
                          Resultado gerado
                        </p>

                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "13px",
                            margin: 0,
                          }}
                        >
                          {summarySourceNotesCount > 0
                            ? `${summarySourceNotesCount} anotações utilizadas`
                            : "Anotações utilizadas"}
                          {summaryGeneratedAt
                            ? ` · Gerado em ${formatDate(summaryGeneratedAt)}`
                            : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyProntuarioSummary}
                        style={buttonSecondaryStyle}
                      >
                        Copiar resumo
                      </button>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "14px",
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.65,
                        maxHeight: "520px",
                        overflow: "auto",
                      }}
                    >
                      {generatedSummary}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { label: "Ativas", value: "ACTIVE" },
                  { label: "Arquivadas", value: "ARCHIVED" },
                  { label: "Todas", value: "ALL" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setNoteFilter(filter.value as NoteFilter)}
                    style={{
                      border:
                        noteFilter === filter.value
                          ? "1px solid #2563eb"
                          : "1px solid #d1d5db",
                      backgroundColor:
                        noteFilter === filter.value ? "#eff6ff" : "#fff",
                      color:
                        noteFilter === filter.value ? "#1d4ed8" : "#374151",
                      borderRadius: "999px",
                      padding: "8px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {loadingNotes ? (
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Carregando anotações...
                </p>
              ) : notes.length === 0 ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 800,
                      color: "#111827",
                      marginBottom: "6px",
                    }}
                  >
                    {currentNoteFilterInfo.emptyTitle}
                  </p>

                  <p style={{ color: "#6b7280", margin: 0 }}>
                    {currentNoteFilterInfo.emptyDescription}
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "16px",
                        backgroundColor: note.archived ? "#f9fafb" : "#f8fafc",
                        opacity: note.archived ? 0.85 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          marginBottom: "8px",
                        }}
                      >
                        <p
                          style={{
                            fontWeight: 800,
                            color: "#111827",
                            margin: 0,
                          }}
                        >
                          {note.title || "Anotação sem título"}
                        </p>

                        <span
                          style={{
                            backgroundColor: note.archived
                              ? "#f3f4f6"
                              : "#ecfdf5",
                            color: note.archived ? "#374151" : "#065f46",
                            border: note.archived
                              ? "1px solid #d1d5db"
                              : "1px solid #a7f3d0",
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {note.archived ? "Arquivada" : "Ativa"}
                        </span>
                      </div>

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                          marginBottom: "10px",
                        }}
                      >
                        Criada em {formatDate(note.createdAt)}
                        {note.updatedAt !== note.createdAt
                          ? ` · Atualizada em ${formatDate(note.updatedAt)}`
                          : ""}
                      </p>

                      {note.archived && note.archivedAt && (
                        <p
                          style={{
                            color: "#6b7280",
                            fontSize: "13px",
                            marginBottom: "10px",
                          }}
                        >
                          Arquivada em {formatDate(note.archivedAt)}
                        </p>
                      )}

                      {note.appointment && (
                        <div
                          style={{
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 800,
                            display: "inline-block",
                            marginBottom: "10px",
                          }}
                        >
                          Consulta: {note.appointment.title} —{" "}
                          {formatDate(note.appointment.dateTime)}
                        </div>
                      )}

                      <p
                        style={{
                          color: "#374151",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                          marginBottom: "14px",
                        }}
                      >
                        {note.content}
                      </p>

                      {!note.archived && (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleEditNote(note)}
                            style={{
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "10px",
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setNoteToArchive({
                                id: note.id,
                                title: note.title || "Anotação sem título",
                              })
                            }
                            style={{
                              backgroundColor: "#fef2f2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "10px",
                              padding: "9px 12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Arquivar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {noteToArchive && (
        <div
          onClick={() => setNoteToArchive(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1001,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#111827",
                marginBottom: "10px",
              }}
            >
              Arquivar anotação?
            </h2>

            <p
              style={{
                color: "#4b5563",
                marginBottom: "18px",
                lineHeight: 1.5,
              }}
            >
              A anotação <strong>{noteToArchive.title}</strong> será arquivada e
              deixará de aparecer na lista principal. Ela não será apagada do
              banco.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setNoteToArchive(null)}
                style={buttonSecondaryStyle}
                disabled={archivingNoteId === noteToArchive.id}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmArchiveNote}
                disabled={archivingNoteId === noteToArchive.id}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor:
                    archivingNoteId === noteToArchive.id
                      ? "not-allowed"
                      : "pointer",
                  opacity: archivingNoteId === noteToArchive.id ? 0.7 : 1,
                }}
              >
                {archivingNoteId === noteToArchive.id
                  ? "Arquivando..."
                  : "Confirmar arquivamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
