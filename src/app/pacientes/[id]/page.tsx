"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/errorUtils";

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

  profileImageUrl?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  bio?: string | null;

  socialName?: string | null;
  birthDate?: string | null;
  contactPreference?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  patientNotes?: string | null;

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

type PatientSummary = {
  id: string;
  title: string | null;
  content: string;
  patientId: string;
  psychologistId: string;
  sourceNotesCount: number | null;
  generatedAt: string | null;
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
  | "PRONTUARIO"
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
  const [summaries, setSummaries] = useState<PatientSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingGeneratedSummary, setSavingGeneratedSummary] = useState(false);
  const [updatingSummaryId, setUpdatingSummaryId] = useState("");
  const [deletingSummaryId, setDeletingSummaryId] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [archivingNoteId, setArchivingNoteId] = useState("");

  const [error, setError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [checkinError, setCheckinError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [summaryError, setSummaryError] = useState("");
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
  const [editingSummaryId, setEditingSummaryId] = useState("");
  const [editingSummaryTitle, setEditingSummaryTitle] = useState("");
  const [editingSummaryContent, setEditingSummaryContent] = useState("");
  const [expandedSummaryId, setExpandedSummaryId] = useState("");
  const [isPatientInfoExpanded, setIsPatientInfoExpanded] = useState(false);

  const [noteToArchive, setNoteToArchive] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [summaryToDelete, setSummaryToDelete] = useState<{
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
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Erro ao carregar paciente."));
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
    } catch (error: unknown) {
      setNoteError(getErrorMessage(error, "Erro ao carregar anotações."));
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
    } catch (error: unknown) {
      setCheckinError(getErrorMessage(error, "Erro ao carregar checklists."));
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
    } catch (error: unknown) {
      setTaskError(getErrorMessage(error, "Erro ao carregar tarefas."));
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
    } catch (error: unknown) {
      setMaterialError(getErrorMessage(error, "Erro ao carregar materiais."));
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
    } catch (error: unknown) {
      setMessageError(getErrorMessage(error, "Erro ao carregar mensagens."));
    } finally {
      setLoadingMessages(false);
    }
  }


  async function loadSummaries() {
    try {
      setLoadingSummaries(true);
      setSummaryError("");

      const response = await fetch(`/api/patients/${patientId}/summaries`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar resumos salvos.");
      }

      setSummaries(data.summaries || []);
    } catch (error: unknown) {
      setSummaryError(getErrorMessage(error, "Erro ao carregar resumos salvos."));
    } finally {
      setLoadingSummaries(false);
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

  useEffect(() => {
    if (patientId) {
      loadSummaries();
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

  function getTextValue(value: string | null | undefined) {
    const trimmedValue = value?.trim();

    return trimmedValue || "Não informado";
  }

  function getPatientDisplayName() {
    return patient?.socialName?.trim() || patient?.name || "Paciente";
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  }

  function onlyDigits(value: string | null | undefined) {
    return (value || "").replace(/\D/g, "");
  }

  function formatPhone(value: string | null | undefined) {
    const digits = onlyDigits(value);

    if (!digits) return "Não informado";

    const withoutCountryCode =
      digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

    if (withoutCountryCode.length === 11) {
      return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(
        2,
        7,
      )}-${withoutCountryCode.slice(7)}`;
    }

    if (withoutCountryCode.length === 10) {
      return `(${withoutCountryCode.slice(0, 2)}) ${withoutCountryCode.slice(
        2,
        6,
      )}-${withoutCountryCode.slice(6)}`;
    }

    return value || "Não informado";
  }


  function formatBirthDate(dateString: string | null | undefined) {
    if (!dateString) return "Não informado";

    return formatDateOnly(dateString);
  }

  function formatCurrency(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return "Não informado";
    }

    const numericValue =
      typeof value === "number"
        ? value
        : Number(String(value).replace(",", "."));

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
    } catch (error: unknown) {
      setNoteError(getErrorMessage(error, "Erro ao salvar anotação."));
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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao arquivar anotação."));
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

      const response = await fetch(
        `/api/patients/${patientId}/generate-summary`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar resumo para prontuário.");
      }

      setGeneratedSummary(data.summary || "");
      setSummaryGeneratedAt(data.generatedAt || "");
      setSummarySourceNotesCount(data.sourceNotesCount || 0);
      showFeedback("success", "Resumo para prontuário gerado com sucesso.");
    } catch (error: unknown) {
      showFeedback(
        "error",
        getErrorMessage(error, "Erro ao gerar resumo para prontuário."),
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


  async function handleSaveGeneratedSummary() {
    if (!generatedSummary.trim()) {
      showFeedback("error", "Revise ou escreva o resumo antes de salvar.");
      return;
    }

    try {
      setSavingGeneratedSummary(true);
      setSummaryError("");

      const response = await fetch(`/api/patients/${patientId}/summaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Resumo para prontuário",
          content: generatedSummary,
          sourceNotesCount: summarySourceNotesCount,
          generatedAt: summaryGeneratedAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao salvar resumo.");
      }

      setGeneratedSummary("");
      setSummaryGeneratedAt("");
      setSummarySourceNotesCount(0);
      await loadSummaries();
      showFeedback("success", "Resumo salvo com sucesso.");
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao salvar resumo."));
    } finally {
      setSavingGeneratedSummary(false);
    }
  }

  function handleStartEditSummary(summary: PatientSummary) {
    setEditingSummaryId(summary.id);
    setEditingSummaryTitle(summary.title || "Resumo para prontuário");
    setEditingSummaryContent(summary.content);
    setExpandedSummaryId(summary.id);
  }

  function handleCancelEditSummary() {
    setEditingSummaryId("");
    setEditingSummaryTitle("");
    setEditingSummaryContent("");
  }

  async function handleUpdateSavedSummary(summaryId: string) {
    if (!editingSummaryContent.trim()) {
      showFeedback("error", "O resumo não pode ficar vazio.");
      return;
    }

    try {
      setUpdatingSummaryId(summaryId);

      const response = await fetch(
        `/api/patients/${patientId}/summaries/${summaryId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editingSummaryTitle,
            content: editingSummaryContent,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar resumo.");
      }

      await loadSummaries();
      handleCancelEditSummary();
      showFeedback("success", "Resumo atualizado com sucesso.");
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao atualizar resumo."));
    } finally {
      setUpdatingSummaryId("");
    }
  }

  function handleDeleteSavedSummary(summaryId: string, title?: string | null) {
    setSummaryToDelete({
      id: summaryId,
      title: title?.trim() || "Resumo para prontuário",
    });
  }

  async function confirmDeleteSavedSummary() {
    if (!summaryToDelete) return;

    try {
      setDeletingSummaryId(summaryToDelete.id);

      const response = await fetch(
        `/api/patients/${patientId}/summaries/${summaryToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao apagar resumo.");
      }

      if (editingSummaryId === summaryToDelete.id) {
        handleCancelEditSummary();
      }

      if (expandedSummaryId === summaryToDelete.id) {
        setExpandedSummaryId("");
      }

      await loadSummaries();
      setSummaryToDelete(null);
      showFeedback("success", "Resumo apagado com sucesso.");
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao apagar resumo."));
    } finally {
      setDeletingSummaryId("");
    }
  }

  async function handleCopySavedSummary(content: string) {
    try {
      await navigator.clipboard.writeText(content);
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
    } catch (error: unknown) {
      setTaskError(getErrorMessage(error, "Erro ao criar tarefa terapêutica."));
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

      const response = await fetch(
        `/api/patients/${patientId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

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
    } catch (error: unknown) {
      showFeedback("error", getErrorMessage(error, "Erro ao atualizar tarefa."));
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
    } catch (error: unknown) {
      setMaterialError(getErrorMessage(error, "Erro ao enviar material."));
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
    } catch (error: unknown) {
      setMessageError(getErrorMessage(error, "Erro ao enviar mensagem."));
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
    paddingBottom: "150px",
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
      <div className="patient-detail-page" style={pageStyle}>
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
            <div style={{ flex: 1, minWidth: "320px" }}>
              <Link
                href="/pacientes"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#dbeafe",
                  fontWeight: 800,
                  textDecoration: "none",
                  marginBottom: "16px",
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
                Voltar para pacientes
              </Link>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                {patient.profileImageUrl ? (
                  <img
                    src={patient.profileImageUrl}
                    alt={`Foto de ${getPatientDisplayName()}`}
                    style={{
                      width: "86px",
                      height: "86px",
                      borderRadius: "24px",
                      objectFit: "cover",
                      border: "3px solid rgba(255, 255, 255, 0.78)",
                      boxShadow: "0 16px 34px rgba(15, 23, 42, 0.22)",
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "86px",
                      height: "86px",
                      borderRadius: "24px",
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                      border: "3px solid rgba(255, 255, 255, 0.32)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "30px",
                      fontWeight: 900,
                      color: "#ffffff",
                      boxShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
                    }}
                  >
                    {getInitials(getPatientDisplayName()) || "P"}
                  </div>
                )}

                <div style={{ minWidth: "240px" }}>
                  <p
                    style={{
                      color: "#dbeafe",
                      fontSize: "13px",
                      fontWeight: 900,
                      marginBottom: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-address-card"></i>
                    Perfil do paciente
                  </p>

                  <h1
                    style={{
                      fontSize: "44px",
                      fontWeight: 900,
                      lineHeight: 1.05,
                      margin: 0,
                    }}
                  >
                    {getPatientDisplayName()}
                  </h1>

                  {patient.socialName &&
                    patient.socialName !== patient.name && (
                      <p
                        style={{
                          color: "#dbeafe",
                          fontSize: "14px",
                          fontWeight: 700,
                          marginTop: "6px",
                          marginBottom: 0,
                        }}
                      >
                        Nome civil: {patient.name}
                      </p>
                    )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  maxWidth: "960px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    backgroundColor: "rgba(255, 255, 255, 0.16)",
                    border: "1px solid rgba(255, 255, 255, 0.24)",
                    color: "#ffffff",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 800,
                    maxWidth: "100%",
                  }}
                >
                  <i className="fa-solid fa-envelope"></i>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {patient.email}
                  </span>
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    backgroundColor: "rgba(255, 255, 255, 0.16)",
                    border: "1px solid rgba(255, 255, 255, 0.24)",
                    color: "#ffffff",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  <i className="fa-brands fa-whatsapp"></i>
                  {formatPhone(patient.phone)}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    backgroundColor: "rgba(255, 255, 255, 0.16)",
                    border: "1px solid rgba(255, 255, 255, 0.24)",
                    color: "#ffffff",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  <i className="fa-solid fa-location-dot"></i>
                  {patient.city || patient.state
                    ? `${patient.city || "Cidade não informada"}${
                        patient.state ? `/${patient.state}` : ""
                      }`
                    : "Cidade/UF não informado"}
                </span>
              </div>
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

        <section
          className="patient-info-card"
          style={{
            ...cardStyle,
            marginBottom: "24px",
            padding: "26px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-70px",
              top: "-70px",
              width: "190px",
              height: "190px",
              borderRadius: "999px",
              backgroundColor: "#eff6ff",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              className="patient-info-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
                marginBottom: isPatientInfoExpanded ? "18px" : 0,
              }}
            >
              <div>
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
                    fontSize: "12px",
                    fontWeight: 900,
                    marginBottom: "10px",
                  }}
                >
                  <i className="fa-solid fa-address-card"></i>
                  Perfil do paciente
                </span>

                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#0f172a",
                    marginBottom: "6px",
                  }}
                >
                  Dados principais do paciente
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Informações preenchidas pelo paciente na tela de perfil para
                  facilitar contato, identificação e acompanhamento.
                </p>
              </div>

              <div className="patient-info-actions">
                <span
                  className="patient-info-updated-badge"
                  style={{
                    backgroundColor: "#f8fafc",
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 900,
                  }}
                >
                  Atualizado pelo próprio paciente
                </span>

                <button
                  type="button"
                  className="patient-info-toggle"
                  onClick={() =>
                    setIsPatientInfoExpanded((currentValue) => !currentValue)
                  }
                >
                  <i
                    className={`fa-solid ${
                      isPatientInfoExpanded ? "fa-chevron-up" : "fa-chevron-down"
                    }`}
                  ></i>
                  {isPatientInfoExpanded ? "Ocultar" : "Exibir"}
                </button>
              </div>
            </div>

            {isPatientInfoExpanded && (
              <>
                <div className="patient-info-grid">
                  {[
                    {
                      label: "E-mail",
                      value: patient.email,
                      icon: "fa-solid fa-envelope",
                    },
                    {
                      label: "Telefone",
                      value: formatPhone(patient.phone),
                      icon: "fa-solid fa-phone",
                    },
                    {
                      label: "Nascimento",
                      value: formatBirthDate(patient.birthDate),
                      icon: "fa-solid fa-cake-candles",
                    },
                    {
                      label: "Cidade/UF",
                      value:
                        patient.city || patient.state
                          ? `${patient.city || "Cidade não informada"}${
                              patient.state ? `/${patient.state}` : ""
                            }`
                          : "Não informado",
                      icon: "fa-solid fa-location-dot",
                    },
                    {
                      label: "Preferência de contato",
                      value: getTextValue(patient.contactPreference),
                      icon: "fa-solid fa-comments",
                    },
                    {
                      label: "Cadastro",
                      value: formatDateOnly(patient.createdAt),
                      icon: "fa-solid fa-calendar-plus",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="patient-info-mini-card"
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "14px",
                      }}
                    >
                      <p
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 900,
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                        }}
                      >
                        <i className={item.icon}></i>
                        {item.label}
                      </p>

                      <p
                        style={{
                          color: "#0f172a",
                          fontWeight: 900,
                          margin: 0,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="patient-info-extra-grid">
                  <div
                    style={{
                      backgroundColor: "#fff7ed",
                      border: "1px solid #fed7aa",
                      borderRadius: "16px",
                      padding: "14px",
                    }}
                  >
                    <p
                      style={{
                        color: "#9a3412",
                        fontSize: "12px",
                        fontWeight: 900,
                        marginBottom: "6px",
                      }}
                    >
                      Contato de emergência
                    </p>

                    <p
                      style={{
                        color: "#0f172a",
                        fontWeight: 900,
                        marginBottom: "4px",
                      }}
                    >
                      {getTextValue(patient.emergencyContactName)}
                    </p>

                    <p style={{ color: "#475569", margin: 0 }}>
                      {formatPhone(patient.emergencyContactPhone)}
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "14px",
                    }}
                  >
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        fontWeight: 900,
                        marginBottom: "6px",
                      }}
                    >
                      Observações do perfil
                    </p>

                    <p
                      style={{
                        color: "#475569",
                        lineHeight: 1.5,
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {getTextValue(patient.patientNotes || patient.bio)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <div
          className="patient-tabs"
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Resumo",
              value: "SUMMARY",
              icon: "fa-solid fa-chart-simple",
            },
            {
              label: "Consultas",
              value: "APPOINTMENTS",
              icon: "fa-solid fa-calendar-days",
            },
            {
              label: "Anotações",
              value: "NOTES",
              icon: "fa-solid fa-pen-to-square",
            },
            {
              label: "Prontuário",
              value: "PRONTUARIO",
              icon: "fa-solid fa-file-lines",
            },
            {
              label: "Checklists",
              value: "CHECKINS",
              icon: "fa-solid fa-clipboard-check",
            },
            {
              label: "Tarefas",
              value: "TASKS",
              icon: "fa-solid fa-list-check",
            },
            {
              label: "Materiais",
              value: "MATERIALS",
              icon: "fa-solid fa-book-open",
            },
            {
              label: "Mensagens",
              value: "MESSAGES",
              icon: "fa-solid fa-comments",
            },
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
              className="patient-summary-grid"
              style={{
                display: "grid",
                gap: "20px",
                marginBottom: "28px",
              }}
            >
              <div className="patient-small-card" style={smallCardStyle}>
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

              <div className="patient-small-card" style={smallCardStyle}>
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

              <div className="patient-small-card" style={smallCardStyle}>
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

              <div className="patient-small-card" style={smallCardStyle}>
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

            <section className="patient-content-card" style={cardStyle}>
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
                        <i
                          className={getPaymentIcon(
                            patient.nextAppointment.paymentStatus,
                          )}
                        ></i>
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
          <section className="patient-content-card" style={cardStyle}>
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
                          <i
                            className={getPaymentIcon(
                              appointment.paymentStatus,
                            )}
                          ></i>
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
                        className="patient-payment-mini-grid"
                        style={{
                          display: "grid",
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
                          <strong>Observação:</strong> {appointment.paymentNote}
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

        {activeTab === "PRONTUARIO" && (
          <section className="patient-content-card" style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div style={{ flex: 1, minWidth: "260px" }}>
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
                    fontSize: "12px",
                    fontWeight: 900,
                    marginBottom: "10px",
                  }}
                >
                  <i className="fa-solid fa-file-lines"></i>
                  Área privada do psicólogo
                </span>

                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  Prontuário e resumos salvos
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Gere, revise e salve resumos de apoio ao registro profissional
                  a partir das anotações internas do paciente.
                </p>
              </div>
            </div>

            <div
              className="patient-prontuario-info-grid"
              style={{
                display: "grid",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    color: "#0f172a",
                    fontWeight: 900,
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fa-solid fa-user-lock"></i>
                  Acesso restrito
                </p>
                <p style={{ color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                  Estes resumos ficam disponíveis apenas para o psicólogo
                  vinculado a este paciente.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "16px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    color: "#9a3412",
                    fontWeight: 900,
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Revisão obrigatória
                </p>
                <p style={{ color: "#9a3412", margin: 0, lineHeight: 1.5 }}>
                  O texto gerado por IA é apenas um rascunho e deve ser revisado
                  antes de qualquer uso clínico ou registro formal.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "16px",
                  padding: "14px",
                }}
              >
                <p
                  style={{
                    color: "#166534",
                    fontWeight: 900,
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="fa-solid fa-eye-slash"></i>
                  Invisível ao paciente
                </p>
                <p style={{ color: "#166534", margin: 0, lineHeight: 1.5 }}>
                  O paciente não vê estes resumos na área dele e o PsicoBot do
                  paciente não consulta este conteúdo.
                </p>
              </div>
            </div>

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
                      paciente. Revise e edite o texto antes de salvar. Os
                      resumos salvos são privados do psicólogo e ficam reunidos
                      nesta aba.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateProntuarioSummary}
                    disabled={generatingSummary}
                    style={{
                      ...buttonPrimaryStyle,
                      minWidth: "230px",
                      opacity: generatingSummary ? 0.7 : 1,
                      cursor: generatingSummary ? "not-allowed" : "pointer",
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
                  revisado antes de uso em prontuário. O paciente não vê estes
                  resumos, nem pela tela do paciente nem pelo PsicoBot.
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
                          Rascunho gerado para revisão
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

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleCopyProntuarioSummary}
                          style={buttonSecondaryStyle}
                        >
                          Copiar rascunho
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveGeneratedSummary}
                          disabled={savingGeneratedSummary}
                          style={{
                            ...buttonPrimaryStyle,
                            opacity: savingGeneratedSummary ? 0.7 : 1,
                            cursor: savingGeneratedSummary
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          {savingGeneratedSummary
                            ? "Salvando..."
                            : "Salvar resumo"}
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={generatedSummary}
                      onChange={(e) => setGeneratedSummary(e.target.value)}
                      rows={14}
                      style={{
                        width: "100%",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "14px",
                        color: "#374151",
                        lineHeight: 1.65,
                        outline: "none",
                        resize: "vertical",
                        fontSize: "14px",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                )}

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
                        Resumos salvos
                      </p>

                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "13px",
                          margin: 0,
                        }}
                      >
                        Resumos revisados e salvos pelo psicólogo. Eles não são
                        exibidos para o paciente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadSummaries}
                      disabled={loadingSummaries}
                      style={buttonSecondaryStyle}
                    >
                      {loadingSummaries ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>

                  {summaryError && (
                    <div
                      style={{
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        borderRadius: "12px",
                        padding: "12px 14px",
                        marginBottom: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {summaryError}
                    </div>
                  )}

                  {loadingSummaries ? (
                    <p style={{ color: "#6b7280", margin: 0 }}>
                      Carregando resumos salvos...
                    </p>
                  ) : summaries.length === 0 ? (
                    <div
                      className="patient-list-item"
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
                        Nenhum resumo salvo
                      </p>

                      <p style={{ color: "#6b7280", margin: 0 }}>
                        Gere um resumo, revise o texto e clique em “Salvar
                        resumo” para manter uma versão nesta tela.
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
                      {summaries.map((summary) => {
                        const isEditingSummary = editingSummaryId === summary.id;
                        const isExpandedSummary = expandedSummaryId === summary.id;
                        const previewText = summary.content
                          .replace(/\s+/g, " ")
                          .trim();

                        return (
                          <div
                            key={summary.id}
                            onClick={() => {
                              if (!isEditingSummary) {
                                setExpandedSummaryId(
                                  isExpandedSummary ? "" : summary.id,
                                );
                              }
                            }}
                            style={{
                              border: isExpandedSummary
                                ? "1px solid #bfdbfe"
                                : "1px solid #e5e7eb",
                              borderRadius: "14px",
                              padding: "13px 14px",
                              backgroundColor: isExpandedSummary
                                ? "#eff6ff"
                                : "#f8fafc",
                              cursor: isEditingSummary ? "default" : "pointer",
                              transition: "0.18s ease",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: "240px" }}>
                                {isEditingSummary ? (
                                  <input
                                    type="text"
                                    value={editingSummaryTitle}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setEditingSummaryTitle(e.target.value)
                                    }
                                    style={{
                                      width: "100%",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "10px",
                                      padding: "10px 12px",
                                      fontWeight: 900,
                                      color: "#111827",
                                      outline: "none",
                                      marginBottom: "8px",
                                    }}
                                  />
                                ) : (
                                  <p
                                    style={{
                                      color: "#111827",
                                      fontWeight: 900,
                                      marginBottom: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <i className="fa-solid fa-file-lines"></i>
                                    {summary.title || "Resumo para prontuário"}
                                  </p>
                                )}

                                <p
                                  style={{
                                    color: "#6b7280",
                                    fontSize: "12px",
                                    margin: 0,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  Salvo em {formatDate(summary.createdAt)}
                                  {summary.updatedAt !== summary.createdAt
                                    ? ` · Atualizado em ${formatDate(
                                        summary.updatedAt,
                                      )}`
                                    : ""}
                                  {summary.sourceNotesCount
                                    ? ` · ${summary.sourceNotesCount} anotações utilizadas`
                                    : ""}
                                </p>

                                {!isEditingSummary && !isExpandedSummary && (
                                  <p
                                    style={{
                                      color: "#475569",
                                      fontSize: "13px",
                                      lineHeight: 1.5,
                                      marginTop: "8px",
                                      marginBottom: 0,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {previewText || "Resumo sem conteúdo."}
                                  </p>
                                )}
                              </div>

                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {isEditingSummary ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSavedSummary(summary.id)
                                      }
                                      disabled={updatingSummaryId === summary.id}
                                      style={{
                                        ...buttonPrimaryStyle,
                                        padding: "8px 11px",
                                      }}
                                    >
                                      {updatingSummaryId === summary.id
                                        ? "Salvando..."
                                        : "Salvar"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCancelEditSummary}
                                      style={{
                                        ...buttonSecondaryStyle,
                                        padding: "8px 11px",
                                      }}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedSummaryId(
                                          isExpandedSummary ? "" : summary.id,
                                        )
                                      }
                                      style={{
                                        ...buttonSecondaryStyle,
                                        padding: "8px 11px",
                                      }}
                                    >
                                      {isExpandedSummary ? "Ocultar" : "Ver resumo"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartEditSummary(summary)
                                      }
                                      style={{
                                        ...buttonSecondaryStyle,
                                        padding: "8px 11px",
                                      }}
                                    >
                                      Editar
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopySavedSummary(summary.content)
                                      }
                                      style={{
                                        ...buttonSecondaryStyle,
                                        padding: "8px 11px",
                                      }}
                                    >
                                      Copiar
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteSavedSummary(
                                          summary.id,
                                          summary.title,
                                        )
                                      }
                                      disabled={deletingSummaryId === summary.id}
                                      style={{
                                        backgroundColor: "#fef2f2",
                                        color: "#b91c1c",
                                        border: "1px solid #fecaca",
                                        borderRadius: "10px",
                                        padding: "8px 11px",
                                        fontWeight: 800,
                                        cursor:
                                          deletingSummaryId === summary.id
                                            ? "not-allowed"
                                            : "pointer",
                                        opacity:
                                          deletingSummaryId === summary.id
                                            ? 0.7
                                            : 1,
                                      }}
                                    >
                                      {deletingSummaryId === summary.id
                                        ? "Apagando..."
                                        : "Apagar"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isEditingSummary ? (
                              <textarea
                                value={editingSummaryContent}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setEditingSummaryContent(e.target.value)
                                }
                                rows={12}
                                style={{
                                  width: "100%",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "12px",
                                  padding: "12px 14px",
                                  fontSize: "14px",
                                  outline: "none",
                                  resize: "vertical",
                                  color: "#374151",
                                  lineHeight: 1.65,
                                  fontFamily: "inherit",
                                  marginTop: "12px",
                                  backgroundColor: "#ffffff",
                                }}
                              />
                            ) : isExpandedSummary ? (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #dbeafe",
                                  borderRadius: "12px",
                                  padding: "14px",
                                  color: "#374151",
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.65,
                                  maxHeight: "360px",
                                  overflow: "auto",
                                  marginTop: "12px",
                                }}
                              >
                                {summary.content}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>


          </section>
        )}

        {activeTab === "CHECKINS" && (
          <section className="patient-content-card" style={cardStyle}>
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
                    className="patient-list-item"
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
                      className="patient-checkin-level-grid"
                      style={{
                        display: "grid",
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
            className="patient-two-column-grid"
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            <section className="patient-content-card" style={cardStyle}>
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

                <div className="patient-message-input-wrapper" style={{ marginBottom: "18px" }}>
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

            <section className="patient-content-card" style={cardStyle}>
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
            className="patient-two-column-grid"
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            <section className="patient-content-card" style={cardStyle}>
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

            <section className="patient-content-card" style={cardStyle}>
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
            className="patient-two-column-grid patient-message-grid"
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            <section className="patient-content-card patient-form-card patient-message-form-card" style={cardStyle}>
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
                    className="patient-message-compose-textarea"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Ex.: Olá! Não esqueça de realizar a tarefa combinada antes da próxima sessão."
                    rows={3}
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
                    className="patient-message-counter"
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
                  className="patient-message-send-button"
                  disabled={sendingMessage}
                  style={{
                    ...buttonPrimaryStyle,
                    width: "100%",
                    opacity: sendingMessage ? 0.7 : 1,
                    cursor: sendingMessage ? "not-allowed" : "pointer",
                    gap: "8px",
                  }}
                >
                  <i
                    className={
                      sendingMessage
                        ? "fa-solid fa-spinner fa-spin"
                        : "fa-solid fa-paper-plane"
                    }
                  ></i>
                  <span className="patient-message-send-text">
                    {sendingMessage ? "Enviando..." : "Enviar mensagem"}
                  </span>
                </button>
              </form>

              <div className="patient-message-mobile-note">
                <i className="fa-solid fa-circle-info"></i>
                Mensagem assíncrona
              </div>

              <div
                className="patient-message-note"
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

            <section className="patient-content-card patient-message-history-card" style={cardStyle}>
              <div
                className="patient-message-history-header"
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
                  className="patient-message-list"
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
                        className={`patient-chat-row ${
                          isPsychologist ? "psychologist" : "patient"
                        }`}
                        style={{
                          display: "flex",
                          justifyContent: isPsychologist
                            ? "flex-end"
                            : "flex-start",
                        }}
                      >
                        <div
                          className={`patient-chat-bubble ${
                            isPsychologist ? "psychologist" : "patient"
                          }`}
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
            className="patient-two-column-grid"
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            <section id="note-form" className="patient-content-card patient-form-card" style={cardStyle}>
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

              <p style={{ color: "#6b7280", marginBottom: "12px" }}>
                Registre observações clínicas e informações de acompanhamento
                do paciente.
              </p>

              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1e40af",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  marginBottom: "18px",
                  fontSize: "13px",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                <i className="fa-solid fa-lock" style={{ marginRight: "8px" }}></i>
                Estas anotações são internas, ficam visíveis apenas para o
                psicólogo e não aparecem para o paciente nem no PsicoBot do
                paciente.
              </div>

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

            <section className="patient-content-card" style={cardStyle}>
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


        <style>{`
          .patient-detail-page {
            width: 100%;
          }

          .patient-info-card,
          .patient-content-card,
          .patient-small-card,
          .patient-list-item {
            min-width: 0;
          }

          .patient-info-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .patient-info-toggle {
            border: 1px solid #bfdbfe;
            background: #eff6ff;
            color: #1d4ed8;
            border-radius: 999px;
            padding: 7px 11px;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            line-height: 1;
          }

          .patient-info-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-bottom: 16px !important;
          }

          .patient-info-extra-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .patient-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 20px !important;
          }

          .patient-prontuario-info-grid,
          .patient-checkin-level-grid,
          .patient-payment-mini-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .patient-two-column-grid {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) !important;
          }

          .patient-detail-page input,
          .patient-detail-page select {
            min-height: 42px !important;
            padding: 9px 12px !important;
            line-height: 1.25 !important;
          }

          .patient-detail-page textarea {
            padding: 10px 12px !important;
            line-height: 1.45 !important;
          }

          .patient-detail-page textarea:placeholder-shown {
            min-height: 72px !important;
            height: 72px !important;
          }

          .patient-detail-page input:placeholder-shown {
            min-height: 40px !important;
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }

          @media (max-width: 1180px) {
            .patient-detail-page {
              padding: 28px !important;
              padding-bottom: 130px !important;
            }

            .patient-summary-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              gap: 12px !important;
              margin-bottom: 18px !important;
            }

            .patient-small-card {
              min-height: 112px !important;
              padding: 16px !important;
              border-radius: 18px !important;
            }

            .patient-info-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }

            .patient-two-column-grid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 900px) {
            .patient-detail-page {
              padding: 20px !important;
              padding-bottom: 120px !important;
              border-radius: 24px !important;
            }

            .patient-info-card,
            .patient-content-card {
              padding: 20px !important;
              border-radius: 20px !important;
            }

            .patient-info-card {
              margin-bottom: 18px !important;
            }

            .patient-info-header {
              align-items: flex-start !important;
            }

            .patient-info-card h2,
            .patient-content-card h2 {
              font-size: 23px !important;
              line-height: 1.12 !important;
            }

            .patient-info-card p,
            .patient-content-card p {
              font-size: 14px !important;
              line-height: 1.45 !important;
            }

            .patient-info-actions {
              justify-content: flex-start;
            }

            .patient-info-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }

            .patient-info-extra-grid {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }

            .patient-info-mini-card {
              padding: 12px !important;
              border-radius: 14px !important;
            }

            .patient-tabs {
              gap: 8px !important;
              margin-bottom: 18px !important;
            }

            .patient-tabs button {
              padding: 9px 12px !important;
              font-size: 12.5px !important;
              gap: 6px !important;
            }

            .patient-summary-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              gap: 9px !important;
              margin-bottom: 16px !important;
            }

            .patient-small-card {
              min-height: 92px !important;
              padding: 12px !important;
              border-radius: 16px !important;
            }

            .patient-small-card p:first-child {
              font-size: 11px !important;
              line-height: 1.08 !important;
              margin-bottom: 5px !important;
            }

            .patient-small-card p:last-child {
              font-size: 21px !important;
              line-height: 1.1 !important;
            }

            .patient-small-card:first-child p:last-child {
              font-size: 12px !important;
            }

            .patient-prontuario-info-grid,
            .patient-checkin-level-grid,
            .patient-payment-mini-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 8px !important;
            }

            .patient-prontuario-info-grid > div,
            .patient-checkin-level-grid > div,
            .patient-payment-mini-grid > div {
              padding: 11px !important;
              border-radius: 13px !important;
            }

            .patient-checkin-level-grid p:last-child {
              font-size: 20px !important;
            }

            .patient-list-item {
              padding: 14px !important;
              border-radius: 14px !important;
            }

            .patient-detail-page input,
            .patient-detail-page select {
              min-height: 40px !important;
              padding: 8px 11px !important;
              font-size: 13px !important;
            }

            .patient-detail-page textarea:placeholder-shown {
              min-height: 66px !important;
              height: 66px !important;
            }
          }

          @media (max-width: 640px) {
            .patient-detail-page {
              padding: 16px !important;
              padding-bottom: 110px !important;
              border-radius: 20px !important;
            }

            .patient-info-card,
            .patient-content-card {
              padding: 16px !important;
              border-radius: 18px !important;
            }

            .patient-info-card h2,
            .patient-content-card h2 {
              font-size: 21px !important;
            }

            .patient-info-card > div:first-child {
              display: none !important;
            }

            .patient-info-card > div:nth-child(2) {
              position: relative !important;
            }

            .patient-info-card p {
              font-size: 13px !important;
            }

            .patient-info-updated-badge {
              display: none !important;
            }

            .patient-info-toggle {
              padding: 6px 10px !important;
              font-size: 11.5px !important;
            }

            .patient-info-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
              margin-bottom: 10px !important;
            }

            .patient-info-mini-card {
              padding: 10px !important;
              border-radius: 13px !important;
            }

            .patient-info-mini-card p:first-child {
              font-size: 10px !important;
              margin-bottom: 4px !important;
            }

            .patient-info-mini-card p:last-child {
              font-size: 12px !important;
            }

            .patient-tabs {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 7px !important;
            }

            .patient-tabs button {
              width: 100% !important;
              justify-content: center !important;
              padding: 9px 8px !important;
              font-size: 11.5px !important;
              border-radius: 12px !important;
            }

            .patient-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
              margin-bottom: 14px !important;
            }

            .patient-small-card {
              min-height: 82px !important;
              padding: 10px !important;
              border-radius: 15px !important;
            }

            .patient-small-card p:first-child {
              font-size: 10px !important;
            }

            .patient-small-card p:last-child {
              font-size: 20px !important;
            }

            .patient-small-card:first-child p:last-child {
              font-size: 11.5px !important;
            }

            .patient-prontuario-info-grid {
              grid-template-columns: 1fr !important;
            }

            .patient-checkin-level-grid,
            .patient-payment-mini-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 7px !important;
            }

            .patient-checkin-level-grid > div,
            .patient-payment-mini-grid > div {
              padding: 9px !important;
            }

            .patient-checkin-level-grid p:first-child,
            .patient-payment-mini-grid p:first-child {
              font-size: 10px !important;
            }

            .patient-checkin-level-grid p:last-child {
              font-size: 18px !important;
            }

            .patient-detail-page input,
            .patient-detail-page select {
              min-height: 38px !important;
              padding: 7px 10px !important;
              font-size: 12.5px !important;
              border-radius: 10px !important;
            }

            .patient-detail-page textarea {
              padding: 8px 10px !important;
              font-size: 12.5px !important;
              border-radius: 10px !important;
            }

            .patient-detail-page textarea:placeholder-shown {
              min-height: 58px !important;
              height: 58px !important;
            }

            .patient-content-card button,
            .patient-content-card a {
              max-width: 100% !important;
            }
          }

          @media (max-width: 430px) {
            .patient-summary-grid,
            .patient-info-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 7px !important;
            }

            .patient-small-card {
              min-height: 78px !important;
              padding: 9px !important;
            }

            .patient-checkin-level-grid,
            .patient-payment-mini-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }
          }

          /* Ajuste final: mensagens em formato de chat e inputs vazios mais finos */
          .patient-detail-page textarea:placeholder-shown {
            min-height: 54px !important;
            height: 54px !important;
          }

          .patient-detail-page textarea:focus:placeholder-shown {
            min-height: 76px !important;
            height: 76px !important;
          }

          .patient-message-compose-textarea {
            min-height: 88px !important;
            height: 88px !important;
            max-height: 180px !important;
            overflow-y: auto !important;
          }

          .patient-message-compose-textarea:placeholder-shown {
            min-height: 54px !important;
            height: 54px !important;
          }

          .patient-message-compose-textarea:focus:placeholder-shown {
            min-height: 76px !important;
            height: 76px !important;
          }

          .patient-message-send-button i {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          @media (max-width: 900px) {
            .patient-message-grid {
              display: flex !important;
              flex-direction: column !important;
              gap: 12px !important;
            }

            .patient-message-history-card {
              order: 1 !important;
            }

            .patient-message-form-card {
              order: 2 !important;
            }
          }

          @media (max-width: 640px) {
            .patient-message-grid {
              gap: 10px !important;
            }

            .patient-message-history-card {
              display: flex !important;
              flex-direction: column !important;
              min-height: 420px !important;
              max-height: 58vh !important;
              padding: 12px !important;
              background: #cde3fe !important;
              border-color: #bfdbfe !important;
              overflow: hidden !important;
            }

            .patient-message-history-header {
              flex: 0 0 auto !important;
              align-items: center !important;
              margin-bottom: 10px !important;
            }

            .patient-message-history-header h2 {
              font-size: 18px !important;
              margin-bottom: 0 !important;
            }

            .patient-message-history-header p {
              display: none !important;
            }

            .patient-message-history-header button {
              width: auto !important;
              padding: 7px 10px !important;
              border-radius: 999px !important;
              font-size: 11.5px !important;
              white-space: nowrap !important;
            }

            .patient-message-list {
              flex: 1 1 auto !important;
              max-height: none !important;
              min-height: 0 !important;
              overflow-y: auto !important;
              padding: 4px 4px 8px !important;
              gap: 10px !important;
              border-radius: 16px !important;
              background: transparent !important;
            }

            .patient-chat-row {
              width: 100% !important;
            }

            .patient-chat-bubble {
              max-width: 86% !important;
              padding: 10px 12px !important;
              border-radius: 16px !important;
              font-size: 13px !important;
              line-height: 1.45 !important;
            }

            .patient-chat-bubble.psychologist {
              border-bottom-right-radius: 4px !important;
            }

            .patient-chat-bubble.patient {
              border-bottom-left-radius: 4px !important;
            }

            .patient-chat-bubble p:first-child {
              font-size: 10.5px !important;
              margin-bottom: 4px !important;
            }

            .patient-chat-bubble p:nth-child(2) {
              margin-bottom: 6px !important;
            }

            .patient-chat-bubble p:last-child {
              font-size: 10px !important;
            }

            .patient-message-form-card {
              padding: 12px !important;
              border-radius: 20px !important;
            }

            .patient-message-form-card h2,
            .patient-message-form-card > p,
            .patient-message-note,
            .patient-message-input-wrapper label,
            .patient-message-counter {
              display: none !important;
            }

            .patient-message-form-card form {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) 44px !important;
              gap: 8px !important;
              align-items: end !important;
            }

            .patient-message-input-wrapper {
              margin: 0 !important;
              min-width: 0 !important;
            }

            .patient-message-compose-textarea,
            .patient-message-compose-textarea:placeholder-shown,
            .patient-message-compose-textarea:focus:placeholder-shown {
              min-height: 44px !important;
              height: 44px !important;
              max-height: 110px !important;
              border-radius: 18px !important;
              padding: 11px 14px !important;
              font-size: 13px !important;
              line-height: 1.35 !important;
              resize: none !important;
              overflow-y: auto !important;
            }

            .patient-message-send-button {
              width: 44px !important;
              height: 44px !important;
              min-width: 44px !important;
              min-height: 44px !important;
              padding: 0 !important;
              border-radius: 999px !important;
              box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2) !important;
            }

            .patient-message-send-button i {
              font-size: 15px !important;
              margin: 0 !important;
            }

            .patient-message-send-text {
              display: none !important;
            }

            .patient-detail-page textarea:placeholder-shown {
              min-height: 48px !important;
              height: 48px !important;
            }

            .patient-detail-page textarea:focus:placeholder-shown {
              min-height: 64px !important;
              height: 64px !important;
            }
          }

          @media (max-width: 430px) {
            .patient-message-history-card {
              min-height: 390px !important;
              max-height: 56vh !important;
            }

            .patient-message-compose-textarea,
            .patient-message-compose-textarea:placeholder-shown,
            .patient-message-compose-textarea:focus:placeholder-shown {
              min-height: 42px !important;
              height: 42px !important;
              padding: 10px 13px !important;
            }

            .patient-message-send-button {
              width: 42px !important;
              height: 42px !important;
              min-width: 42px !important;
              min-height: 42px !important;
            }
          }


          /* Ajuste final: input mobile sem exemplo, sem scroll vazio e aviso assíncrono */
          .patient-message-mobile-note {
            display: none;
          }

          @media (max-width: 640px) {
            .patient-message-form-card {
              position: relative !important;
              padding-top: 38px !important;
            }

            .patient-message-mobile-note {
              position: absolute;
              top: 10px;
              right: 12px;
              display: inline-flex !important;
              align-items: center;
              justify-content: center;
              gap: 5px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1d4ed8;
              border-radius: 999px;
              padding: 5px 9px;
              font-size: 10.5px;
              font-weight: 900;
              line-height: 1;
              z-index: 2;
              white-space: nowrap;
            }

            .patient-message-mobile-note i {
              font-size: 10px;
            }

            .patient-message-note {
              display: none !important;
            }

            .patient-message-compose-textarea::placeholder {
              color: transparent !important;
            }

            .patient-message-compose-textarea,
            .patient-message-compose-textarea:placeholder-shown,
            .patient-message-compose-textarea:focus:placeholder-shown {
              min-height: 42px !important;
              height: 42px !important;
              max-height: 104px !important;
              padding: 10px 13px !important;
              overflow-y: hidden !important;
              scrollbar-width: none !important;
            }

            .patient-message-compose-textarea::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }

            .patient-message-compose-textarea:not(:placeholder-shown) {
              min-height: 42px !important;
              height: auto !important;
              overflow-y: auto !important;
              scrollbar-width: thin !important;
            }

            .patient-message-compose-textarea:not(:placeholder-shown)::-webkit-scrollbar {
              display: initial !important;
              width: 6px !important;
            }

            .patient-message-form-card form {
              grid-template-columns: minmax(0, 1fr) 42px !important;
              align-items: center !important;
            }

            .patient-message-send-button {
              width: 42px !important;
              height: 42px !important;
              min-width: 42px !important;
              min-height: 42px !important;
            }
          }

          @media (max-width: 430px) {
            .patient-message-form-card {
              padding-top: 36px !important;
            }

            .patient-message-mobile-note {
              top: 9px;
              right: 10px;
              padding: 5px 8px;
              font-size: 10px;
            }

            .patient-message-compose-textarea,
            .patient-message-compose-textarea:placeholder-shown,
            .patient-message-compose-textarea:focus:placeholder-shown {
              min-height: 40px !important;
              height: 40px !important;
              max-height: 96px !important;
              padding: 9px 12px !important;
            }

            .patient-message-send-button {
              width: 40px !important;
              height: 40px !important;
              min-width: 40px !important;
              min-height: 40px !important;
            }

            .patient-message-form-card form {
              grid-template-columns: minmax(0, 1fr) 40px !important;
            }
          }

        `}</style>


        <div style={{ height: "90px" }} aria-hidden="true" />
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

      {summaryToDelete && (
        <div
          onClick={() => {
            if (deletingSummaryId !== summaryToDelete.id) {
              setSummaryToDelete(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1002,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "500px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                marginBottom: "16px",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h2
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#111827",
                marginBottom: "10px",
              }}
            >
              Apagar resumo salvo?
            </h2>

            <p
              style={{
                color: "#4b5563",
                marginBottom: "18px",
                lineHeight: 1.5,
              }}
            >
              O resumo <strong>{summaryToDelete.title}</strong> será apagado
              permanentemente desta tela. Essa ação não poderá ser desfeita.
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
                onClick={() => setSummaryToDelete(null)}
                style={buttonSecondaryStyle}
                disabled={deletingSummaryId === summaryToDelete.id}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmDeleteSavedSummary}
                disabled={deletingSummaryId === summaryToDelete.id}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor:
                    deletingSummaryId === summaryToDelete.id
                      ? "not-allowed"
                      : "pointer",
                  opacity: deletingSummaryId === summaryToDelete.id ? 0.7 : 1,
                }}
              >
                {deletingSummaryId === summaryToDelete.id
                  ? "Apagando..."
                  : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
