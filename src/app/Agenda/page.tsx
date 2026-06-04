"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CalendarEvent = {
  id: string;
  appointmentId?: string;
  title: string;
  description: string;
  start: string | null;
  end: string | null;
  location: string;
  htmlLink: string;
  status?: string;
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  googleEventId?: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  confirmationStatus?: "PENDING" | "CONFIRMED" | "CANCELLATION_REQUESTED";
  confirmedAt?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationRequestReason?: string | null;
  cancellationRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  lastReminderSentAt?: string | null;
  reminderEmailSentAt?: string | null;
  paymentStatus?: "PENDING" | "PAID" | "EXEMPT";
  paymentAmount?: number | null;
  paymentNote?: string | null;
  paidAt?: string | null;
};

type PatientOption = {
  id: string;
  name: string;
  email: string;
};

type AppointmentStatusFilter = "SCHEDULED" | "CANCELLED" | "ALL";
type PaymentStatus = "PENDING" | "PAID" | "EXEMPT";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

const pageStyle = {
  padding: "36px",
  paddingBottom: "120px",
  minHeight: "calc(100vh - 48px)",
  background:
    "radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%), #f8fafc",
  borderRadius: "32px",
  overflow: "visible",
} as const;

const cardStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.94)",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
} as const;

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#fff",
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
  gap: "8px",
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
} as const;

const dangerButtonStyle = {
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "14px",
} as const;

export default function AgendaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");

  const userRole = (session?.user as any)?.role;
  const isPsychologist = userRole === "PSYCHOLOGIST";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState("");
  const [loadingGoogleStatus, setLoadingGoogleStatus] = useState(false);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [appointmentStatusFilter, setAppointmentStatusFilter] =
    useState<AppointmentStatusFilter>("SCHEDULED");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentStartTime, setAppointmentStartTime] = useState("");
  const [appointmentEndTime, setAppointmentEndTime] = useState("");
  const [appointmentLocation, setAppointmentLocation] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");

  const [savingAppointment, setSavingAppointment] = useState(false);
  const [cancelingAppointmentId, setCancelingAppointmentId] = useState("");
  const [reviewingCancellationId, setReviewingCancellationId] = useState("");
  const [sendingReminderId, setSendingReminderId] = useState("");
  const [updatingPaymentId, setUpdatingPaymentId] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>(
    {},
  );
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [expandedPaymentId, setExpandedPaymentId] = useState("");

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [formError, setFormError] = useState("");
  const [handledPatientFromUrl, setHandledPatientFromUrl] = useState(false);

  const [appointmentToCancel, setAppointmentToCancel] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const statusInfo = {
    SCHEDULED: {
      label: "Agendadas",
      cardTitle: "Consultas agendadas",
      sectionTitle: "Próximos horários",
      emptyTitle: "Nenhuma consulta agendada",
      emptyDescription:
        "Quando houver consultas futuras cadastradas no sistema, elas aparecerão aqui. Para criar novas consultas sincronizadas, conecte o Google Calendar.",
    },
    CANCELLED: {
      label: "Canceladas",
      cardTitle: "Consultas canceladas",
      sectionTitle: "Consultas canceladas",
      emptyTitle: "Nenhuma consulta cancelada",
      emptyDescription:
        "As consultas canceladas aparecerão aqui para acompanhamento do histórico.",
    },
    ALL: {
      label: "Todas",
      cardTitle: "Consultas encontradas",
      sectionTitle: "Histórico de consultas",
      emptyTitle: "Nenhuma consulta encontrada",
      emptyDescription:
        "Quando houver consultas cadastradas no sistema, elas aparecerão aqui, mesmo que não tenham sido criadas pelo Google Calendar.",
    },
  };

  const currentStatusInfo = statusInfo[appointmentStatusFilter];

  async function loadEvents() {
    if (status !== "authenticated") {
      setEvents([]);
      return;
    }

    if (!isPsychologist) {
      setEvents([]);
      setEventsError("A agenda é exclusiva para psicólogos.");
      return;
    }

    try {
      setLoadingEvents(true);
      setEventsError("");

      const response = await fetch(
        `/api/appointments?status=${appointmentStatusFilter}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Sua sessão não está autorizada ou expirou. Saia da conta e entre novamente.",
          );
        }

        if (response.status === 403) {
          throw new Error("Apenas psicólogos podem acessar a agenda.");
        }

        throw new Error(data?.error || "Erro ao carregar consultas.");
      }

      setEvents(data.events || []);
    } catch (error: any) {
      setEventsError(error.message || "Erro ao carregar consultas.");
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadPatients() {
    if (status !== "authenticated" || !isPsychologist) {
      setPatients([]);
      return;
    }

    try {
      setLoadingPatients(true);

      const response = await fetch("/api/patients", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Não foi possível carregar seus pacientes. Verifique se você entrou como psicólogo.",
          );
        }

        throw new Error(data?.error || "Erro ao carregar pacientes.");
      }

      setPatients(data.patients || []);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setLoadingPatients(false);
    }
  }

  async function loadGoogleStatus() {
    if (status !== "authenticated" || !isPsychologist) {
      setGoogleConnected(false);
      setGoogleCalendarEmail("");
      return;
    }

    try {
      setLoadingGoogleStatus(true);

      const response = await fetch("/api/google-calendar/status", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setGoogleConnected(false);
        setGoogleCalendarEmail("");
        return;
      }

      setGoogleConnected(Boolean(data.connected));
      setGoogleCalendarEmail(data.calendarEmail || "");
    } catch (error) {
      console.error("Erro ao carregar status do Google Calendar:", error);
      setGoogleConnected(false);
      setGoogleCalendarEmail("");
    } finally {
      setLoadingGoogleStatus(false);
    }
  }


  useEffect(() => {
    loadEvents();
  }, [status, isPsychologist, googleConnected, appointmentStatusFilter]);

  useEffect(() => {
    loadPatients();
  }, [status, isPsychologist]);

  useEffect(() => {
    loadGoogleStatus();
  }, [status, isPsychologist]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (!patientIdFromUrl || handledPatientFromUrl || patients.length === 0) {
      return;
    }

    const patientExists = patients.some(
      (patient) => patient.id === patientIdFromUrl,
    );

    if (!patientExists) {
      showFeedback(
        "error",
        "Paciente não encontrado na sua lista de vínculos.",
      );
      setHandledPatientFromUrl(true);
      return;
    }

    setSelectedPatientId(patientIdFromUrl);

    if (googleConnected) {
      setIsModalOpen(true);
    } else {
      showFeedback(
        "info",
        "Paciente selecionado. Conecte o Google Calendar para criar um horário sincronizado.",
      );
    }

    setHandledPatientFromUrl(true);
  }, [patientIdFromUrl, handledPatientFromUrl, patients, googleConnected]);

  const nextEvent = useMemo(() => {
    const scheduledEvents = events
      .filter((event) => event.status !== "CANCELLED" && event.start)
      .sort(
        (a, b) =>
          new Date(a.start || "").getTime() -
          new Date(b.start || "").getTime(),
      );

    return scheduledEvents.length > 0 ? scheduledEvents[0] : null;
  }, [events]);

  const googleSyncedEvents = useMemo(
    () => events.filter((event) => event.googleEventId || event.htmlLink).length,
    [events],
  );

  const systemOnlyEvents = events.length - googleSyncedEvents;

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "--";

    const date = new Date(dateString);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }

  function formatCurrency(value: number | null | undefined) {
    if (value === null || value === undefined) return "Não informado";

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  function getAppointmentId(event: CalendarEvent) {
    return event.appointmentId || event.id;
  }

  function getPaymentLabel(status: CalendarEvent["paymentStatus"]) {
    if (status === "PAID") return "Pago";
    if (status === "EXEMPT") return "Isento";
    return "Pendente";
  }

  function getPaymentStyle(status: CalendarEvent["paymentStatus"]) {
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

  function getPaymentDraftAmount(event: CalendarEvent) {
    const appointmentId = getAppointmentId(event);
    const typedAmount = paymentAmounts[appointmentId];

    if (typedAmount !== undefined) return typedAmount;

    return event.paymentAmount !== null && event.paymentAmount !== undefined
      ? String(event.paymentAmount).replace(".", ",")
      : "";
  }

  function getPaymentDraftNote(event: CalendarEvent) {
    const appointmentId = getAppointmentId(event);
    const typedNote = paymentNotes[appointmentId];

    if (typedNote !== undefined) return typedNote;

    return event.paymentNote || "";
  }

  function getConfirmationLabel(event: CalendarEvent) {
    if (event.status === "CANCELLED") return "Consulta cancelada";

    if (
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    ) {
      return "Cancelamento solicitado";
    }

    if (event.confirmationStatus === "CONFIRMED") return "Presença confirmada";
    if (event.cancellationRequestStatus === "REJECTED") {
      return "Solicitação rejeitada";
    }

    return "Aguardando confirmação";
  }

  function getConfirmationStyle(event: CalendarEvent) {
    if (event.status === "CANCELLED") {
      return {
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    if (
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    ) {
      return {
        backgroundColor: "#fffbeb",
        color: "#92400e",
        border: "1px solid #fde68a",
      };
    }

    if (event.confirmationStatus === "CONFIRMED") {
      return {
        backgroundColor: "#ecfdf5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }

    if (event.cancellationRequestStatus === "REJECTED") {
      return {
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      backgroundColor: "#f8fafc",
      color: "#475569",
      border: "1px solid #e2e8f0",
    };
  }

  function isCancellationRequestPending(event: CalendarEvent) {
    return (
      event.status !== "CANCELLED" &&
      event.confirmationStatus === "CANCELLATION_REQUESTED" &&
      event.cancellationRequestStatus === "PENDING"
    );
  }

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });

    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  }

  function resetForm() {
    setAppointmentTitle("");
    setAppointmentDate("");
    setAppointmentStartTime("");
    setAppointmentEndTime("");
    setAppointmentLocation("");
    setAppointmentDescription("");
    setSelectedPatientId("");
    setFormError("");
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function handleOpenModal() {
    if (!googleConnected) {
      showFeedback(
        "info",
        "As consultas já cadastradas aparecem normalmente. Para criar um novo horário sincronizado, conecte o Google Calendar.",
      );
      return;
    }

    setIsModalOpen(true);
  }


  function handleConnectGoogle() {
    window.location.href = "/api/google-calendar/connect";
  }

  async function handleDisconnectGoogle() {
    try {
      setDisconnectingGoogle(true);

      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível desconectar o Google Calendar.",
        );
      }

      setGoogleConnected(false);
      setGoogleCalendarEmail("");
      await loadGoogleStatus();

      showFeedback("success", "Google Calendar desconectado com sucesso.");
    } catch (error: any) {
      showFeedback(
        "error",
        error?.message || "Não foi possível desconectar o Google Calendar.",
      );
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!googleConnected) {
      setFormError("Conecte o Google Calendar antes de criar uma consulta.");
      return;
    }

    if (!appointmentTitle.trim()) {
      setFormError("Informe um título para a consulta.");
      return;
    }

    if (!selectedPatientId) {
      setFormError("Selecione um paciente para criar a consulta.");
      return;
    }

    if (!appointmentDate) {
      setFormError("Informe a data da consulta.");
      return;
    }

    if (!appointmentStartTime) {
      setFormError("Informe a hora inicial da consulta.");
      return;
    }

    if (!appointmentEndTime) {
      setFormError("Informe a hora final da consulta.");
      return;
    }

    const startDateTime = new Date(
      `${appointmentDate}T${appointmentStartTime}:00`,
    );
    const endDateTime = new Date(`${appointmentDate}T${appointmentEndTime}:00`);

    if (endDateTime <= startDateTime) {
      setFormError("A hora final deve ser maior que a hora inicial.");
      return;
    }

    try {
      setSavingAppointment(true);

      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: appointmentTitle,
          date: appointmentDate,
          startTime: appointmentStartTime,
          endTime: appointmentEndTime,
          location: appointmentLocation,
          description: appointmentDescription,
          patientId: selectedPatientId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao criar consulta.");
      }

      await loadEvents();
      handleCloseModal();

      showFeedback(
        data?.emailWarning ? "info" : "success",
        data?.message ||
          "Consulta criada com sucesso. O paciente foi notificado por e-mail.",
      );
    } catch (error: any) {
      setFormError(error.message || "Erro ao criar consulta.");
    } finally {
      setSavingAppointment(false);
    }
  }

  function handleCancelAppointment(appointmentId?: string, title?: string) {
    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    setCancellationReason("");
    setAppointmentToCancel({
      id: appointmentId,
      title: title || "Consulta",
    });
  }

  function closeCancelModal() {
    setAppointmentToCancel(null);
    setCancellationReason("");
  }

  async function confirmCancelAppointment() {
    if (!appointmentToCancel) return;

    try {
      setCancelingAppointmentId(appointmentToCancel.id);

      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointmentToCancel.id,
          cancellationReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao cancelar consulta.");
      }

      await loadEvents();
      closeCancelModal();

      showFeedback(
        data?.emailWarning ? "info" : "success",
        data?.message ||
          "Consulta cancelada com sucesso. O paciente foi notificado por e-mail.",
      );
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao cancelar consulta.");
    } finally {
      setCancelingAppointmentId("");
    }
  }

  async function handleReviewCancellationRequest(
    appointmentId: string | undefined,
    action: "APPROVE" | "REJECT",
  ) {
    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    try {
      setReviewingCancellationId(`${appointmentId}-${action}`);

      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel-request`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao analisar solicitação de cancelamento.",
        );
      }

      await loadEvents();

      showFeedback(
        "success",
        data?.message ||
          (action === "APPROVE"
            ? "Solicitação de cancelamento aprovada."
            : "Solicitação de cancelamento rejeitada."),
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao analisar solicitação de cancelamento.",
      );
    } finally {
      setReviewingCancellationId("");
    }
  }

  function canSendReminder(event: CalendarEvent) {
    if (!getAppointmentId(event)) return false;
    if (event.status === "CANCELLED") return false;
    if (!event.start) return false;

    return new Date(event.start) > new Date();
  }

  async function handleSendReminder(appointmentId: string | undefined) {
    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    try {
      setSendingReminderId(appointmentId);

      const response = await fetch(
        `/api/appointments/${appointmentId}/send-reminder`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao enviar lembrete por e-mail.");
      }

      await loadEvents();

      showFeedback(
        "success",
        data?.message || "Lembrete enviado por e-mail com sucesso.",
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao enviar lembrete por e-mail.",
      );
    } finally {
      setSendingReminderId("");
    }
  }

  async function handleUpdatePayment(
    event: CalendarEvent,
    paymentStatus: PaymentStatus,
  ) {
    const appointmentId = getAppointmentId(event);

    if (!appointmentId) {
      showFeedback("error", "Consulta inválida.");
      return;
    }

    const draftAmount = getPaymentDraftAmount(event);
    const draftNote = getPaymentDraftNote(event);

    try {
      setUpdatingPaymentId(`${appointmentId}-${paymentStatus}`);

      const response = await fetch(
        `/api/appointments/${appointmentId}/payment`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentStatus,
            paymentAmount: draftAmount || null,
            paymentNote: draftNote || "",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar pagamento.");
      }

      await loadEvents();

      showFeedback(
        "success",
        data?.message || "Pagamento atualizado com sucesso.",
      );
    } catch (error: any) {
      showFeedback(
        "error",
        error.message || "Erro ao atualizar pagamento da consulta.",
      );
    } finally {
      setUpdatingPaymentId("");
    }
  }

  function renderBadge(
    label: string,
    style: Record<string, string | number>,
    icon?: string,
  ) {
    return (
      <span
        style={{
          ...style,
          borderRadius: "999px",
          padding: "5px 10px",
          fontSize: "12px",
          fontWeight: 900,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
        }}
      >
        {icon && <i className={icon}></i>}
        {label}
      </span>
    );
  }

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "32px",
          background: "#f8fbff",
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

  if (status === "unauthenticated") {
    return (
      <div style={pageStyle}>
        <section style={cardStyle}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 900,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            Redirecionando para o login...
          </h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Entre novamente para acessar sua agenda.
          </p>
        </section>
      </div>
    );
  }

  if (!isPsychologist) {
    return (
      <div style={pageStyle}>
        <section
          style={{
            ...cardStyle,
            display: "flex",
            gap: "18px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-lock"></i>
          </div>

          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: "8px",
              }}
            >
              Agenda exclusiva para psicólogos
            </h1>
            <p style={{ color: "#64748b", lineHeight: 1.6, margin: 0 }}>
              Esta tela é destinada ao gerenciamento de consultas pelo
              psicólogo. Entre com uma conta de psicólogo para acessar a agenda
              e criar novos horários.
            </p>
          </div>
        </section>
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
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "300px" }}>
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
                }}
              >
                <i className="fa-solid fa-calendar-days"></i>
                Agenda integrada
              </span>

              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  marginBottom: "10px",
                }}
              >
                Agenda do Psicólogo
              </h1>

              <p
                style={{
                  fontSize: "18px",
                  color: "#dbeafe",
                  maxWidth: "820px",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                Organize atendimentos, acompanhe horários, notifique pacientes
                por e-mail e mantenha sua agenda sincronizada com o Google
                Calendar quando necessário.
              </p>
            </div>

            <button
              type="button"
              style={{
                ...buttonPrimaryStyle,
                background: "#ffffff",
                color: "#1d4ed8",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
              }}
              onClick={handleOpenModal}
            >
              <i className="fa-solid fa-plus"></i>
              {googleConnected ? "Novo horário" : "Conectar para criar"}
            </button>
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
              borderRadius: "16px",
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
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          {[
            {
              title: currentStatusInfo.cardTitle,
              value: events.length,
              description:
                appointmentStatusFilter === "SCHEDULED"
                  ? "Total de consultas futuras agendadas."
                  : appointmentStatusFilter === "CANCELLED"
                    ? "Total de consultas canceladas no histórico."
                    : "Total de consultas exibidas no filtro atual.",
              icon: "fa-solid fa-calendar-check",
              color: "#eff6ff",
            },
            {
              title: "Próxima consulta",
              value: nextEvent ? formatDate(nextEvent.start) : "--",
              description: nextEvent
                ? nextEvent.title
                : "A próxima consulta aparecerá aqui quando houver agendamentos.",
              icon: "fa-solid fa-clock",
              color: "#ecfdf5",
            },
            {
              title: "Google Calendar",
              value: googleConnected ? "Conectado" : "Não conectado",
              description: googleConnected
                ? "Novos horários podem ser sincronizados com o Google."
                : "A conexão é necessária apenas para criar eventos no Google.",
              icon: "fa-brands fa-google",
              color: "#f5f3ff",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                ...cardStyle,
                minHeight: "150px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: "-24px",
                  top: "-24px",
                  width: "94px",
                  height: "94px",
                  borderRadius: "999px",
                  backgroundColor: item.color,
                }}
              />
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "14px",
                  backgroundColor: item.color,
                  color: "#1d4ed8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  marginBottom: "14px",
                }}
              >
                <i className={item.icon}></i>
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "10px",
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: typeof item.value === "number" ? "34px" : "22px",
                  fontWeight: 900,
                  color:
                    item.title === "Google Calendar" && googleConnected
                      ? "#065f46"
                      : "#0f172a",
                  marginBottom: "8px",
                }}
              >
                {item.value}
              </div>
              <div style={{ color: "#6b7280", fontSize: "14px", lineHeight: 1.45 }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
          }}
        >
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "18px",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    color: "#111827",
                    marginBottom: "6px",
                  }}
                >
                  {currentStatusInfo.sectionTitle}
                </h2>
                <p style={{ color: "#6b7280", margin: 0 }}>
                  Acompanhe suas consultas e mantenha o histórico organizado.
                </p>
              </div>

              <button
                type="button"
                onClick={loadEvents}
                disabled={loadingEvents}
                style={{
                  ...buttonSecondaryStyle,
                  opacity: loadingEvents ? 0.7 : 1,
                  cursor: loadingEvents ? "not-allowed" : "pointer",
                }}
              >
                <i className="fa-solid fa-rotate"></i>
                {loadingEvents ? "Atualizando..." : "Atualizar"}
              </button>
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
                { label: "Agendadas", value: "SCHEDULED" },
                { label: "Canceladas", value: "CANCELLED" },
                { label: "Todas", value: "ALL" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    setAppointmentStatusFilter(
                      filter.value as AppointmentStatusFilter,
                    )
                  }
                  style={{
                    border:
                      appointmentStatusFilter === filter.value
                        ? "1px solid #2563eb"
                        : "1px solid #d1d5db",
                    backgroundColor:
                      appointmentStatusFilter === filter.value ? "#eff6ff" : "#fff",
                    color:
                      appointmentStatusFilter === filter.value ? "#1d4ed8" : "#374151",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {loadingEvents ? (
              <EmptyState
                icon="fa-solid fa-spinner"
                title="Carregando consultas..."
                description="Buscando os agendamentos salvos no sistema."
              />
            ) : eventsError ? (
              <div
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "16px",
                  padding: "18px",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {eventsError}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon="fa-solid fa-calendar-xmark"
                title={currentStatusInfo.emptyTitle}
                description={currentStatusInfo.emptyDescription}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {events.map((event) => {
                  const appointmentId = getAppointmentId(event);
                  const isGoogleSynced = Boolean(event.googleEventId || event.htmlLink);
                  const isCancelled = event.status === "CANCELLED";
                  const isExpandedPayment = expandedPaymentId === appointmentId;

                  return (
                    <article
                      key={event.id}
                      style={{
                        border: isCancelled ? "1px solid #fecaca" : "1px solid #e5e7eb",
                        borderRadius: "18px",
                        padding: "18px",
                        backgroundColor: isCancelled ? "#fff7f7" : "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "14px",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: "19px",
                              fontWeight: 900,
                              color: "#111827",
                              marginBottom: "8px",
                            }}
                          >
                            {event.title || "Consulta"}
                          </h3>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {renderBadge(
                              isCancelled ? "Cancelada" : "Agendada",
                              isCancelled
                                ? {
                                    backgroundColor: "#fef2f2",
                                    color: "#b91c1c",
                                    border: "1px solid #fecaca",
                                  }
                                : {
                                    backgroundColor: "#ecfdf5",
                                    color: "#065f46",
                                    border: "1px solid #a7f3d0",
                                  },
                              isCancelled
                                ? "fa-solid fa-circle-xmark"
                                : "fa-solid fa-circle-check",
                            )}

                            {renderBadge(
                              isGoogleSynced
                                ? "Sistema + Google Calendar"
                                : "Somente no sistema",
                              isGoogleSynced
                                ? {
                                    backgroundColor: "#eef2ff",
                                    color: "#3730a3",
                                    border: "1px solid #c7d2fe",
                                  }
                                : {
                                    backgroundColor: "#ffffff",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                  },
                              isGoogleSynced ? "fa-brands fa-google" : "fa-solid fa-database",
                            )}

                            {renderBadge(
                              getConfirmationLabel(event),
                              getConfirmationStyle(event),
                              isCancellationRequestPending(event)
                                ? "fa-solid fa-clock"
                                : event.confirmationStatus === "CONFIRMED"
                                  ? "fa-solid fa-circle-check"
                                  : "fa-solid fa-circle-info",
                            )}
                          </div>
                        </div>

                        {event.patientId && (
                          <button
                            type="button"
                            onClick={() => router.push(`/pacientes/${event.patientId}`)}
                            style={{ ...buttonSecondaryStyle, padding: "10px 13px" }}
                          >
                            <i className="fa-solid fa-user"></i>
                            Ver paciente
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: "10px",
                          marginTop: "14px",
                          marginBottom: "12px",
                        }}
                      >
                        {event.patientName && (
                          <InfoLine
                            icon="fa-solid fa-user"
                            label="Paciente"
                            value={`${event.patientName}${event.patientEmail ? ` — ${event.patientEmail}` : ""}`}
                          />
                        )}
                        <InfoLine
                          icon="fa-solid fa-calendar-day"
                          label="Início"
                          value={formatDate(event.start)}
                        />
                        {event.end && (
                          <InfoLine
                            icon="fa-solid fa-hourglass-end"
                            label="Fim"
                            value={formatDate(event.end)}
                          />
                        )}
                        {event.location && (
                          <InfoLine
                            icon="fa-solid fa-location-dot"
                            label="Local"
                            value={event.location}
                          />
                        )}
                      </div>

                      {event.description && (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            padding: "12px 14px",
                            color: "#4b5563",
                            lineHeight: 1.55,
                            marginBottom: "12px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <strong>Descrição:</strong> {event.description}
                        </div>
                      )}

                      {isCancelled && (event.cancelledAt || event.cancellationReason) && (
                        <div
                          style={{
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "14px",
                            padding: "12px 14px",
                            color: "#7f1d1d",
                            lineHeight: 1.55,
                            marginBottom: "12px",
                          }}
                        >
                          {event.cancelledAt && (
                            <p style={{ margin: "0 0 6px" }}>
                              <strong>Cancelada em:</strong> {formatDate(event.cancelledAt)}
                            </p>
                          )}
                          {event.cancellationReason && (
                            <p style={{ margin: 0 }}>
                              <strong>Motivo:</strong> {event.cancellationReason}
                            </p>
                          )}
                        </div>
                      )}

                      {isCancellationRequestPending(event) && (
                        <div
                          style={{
                            backgroundColor: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: "16px",
                            padding: "14px",
                            marginTop: "12px",
                            marginBottom: "12px",
                          }}
                        >
                          <p
                            style={{
                              color: "#92400e",
                              fontWeight: 900,
                              marginBottom: "8px",
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            Solicitação de cancelamento pendente
                          </p>

                          {event.cancellationRequestedAt && (
                            <p style={{ color: "#78350f", marginBottom: "8px" }}>
                              <strong>Solicitada em:</strong>{" "}
                              {formatDate(event.cancellationRequestedAt)}
                            </p>
                          )}

                          {event.cancellationRequestReason && (
                            <div
                              style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #fde68a",
                                borderRadius: "12px",
                                padding: "12px",
                                color: "#4b5563",
                                marginBottom: "12px",
                                lineHeight: 1.5,
                              }}
                            >
                              <strong>Motivo informado:</strong>{" "}
                              {event.cancellationRequestReason}
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleReviewCancellationRequest(appointmentId, "APPROVE")
                              }
                              disabled={reviewingCancellationId === `${appointmentId}-APPROVE`}
                              style={{
                                backgroundColor: "#dc2626",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "12px",
                                padding: "10px 14px",
                                fontWeight: 800,
                                cursor:
                                  reviewingCancellationId === `${appointmentId}-APPROVE`
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  reviewingCancellationId === `${appointmentId}-APPROVE`
                                    ? 0.7
                                    : 1,
                              }}
                            >
                              {reviewingCancellationId === `${appointmentId}-APPROVE`
                                ? "Aprovando..."
                                : "Aprovar cancelamento"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleReviewCancellationRequest(appointmentId, "REJECT")
                              }
                              disabled={reviewingCancellationId === `${appointmentId}-REJECT`}
                              style={{ ...buttonSecondaryStyle, padding: "10px 14px" }}
                            >
                              {reviewingCancellationId === `${appointmentId}-REJECT`
                                ? "Rejeitando..."
                                : "Rejeitar solicitação"}
                            </button>
                          </div>
                        </div>
                      )}

                      {canSendReminder(event) && (
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #dbeafe",
                            borderRadius: "16px",
                            padding: "14px",
                            marginTop: "12px",
                            marginBottom: "12px",
                          }}
                        >
                          <p
                            style={{
                              color: "#1d4ed8",
                              fontWeight: 900,
                              marginBottom: "8px",
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <i className="fa-solid fa-envelope"></i>
                            Lembrete por e-mail
                          </p>

                          <p style={{ color: "#4b5563", lineHeight: 1.5, marginBottom: "12px" }}>
                            Envie um lembrete para o paciente com os dados da consulta e orientação
                            para confirmar presença ou solicitar cancelamento no PsicoConnect.
                          </p>

                          {event.reminderEmailSentAt && (
                            <p
                              style={{
                                color: "#065f46",
                                fontSize: "13px",
                                fontWeight: 800,
                                marginBottom: "12px",
                              }}
                            >
                              Último lembrete enviado em {formatDate(event.reminderEmailSentAt)}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendReminder(appointmentId)}
                            disabled={sendingReminderId === appointmentId}
                            style={{
                              ...buttonSecondaryStyle,
                              padding: "10px 14px",
                              opacity: sendingReminderId === appointmentId ? 0.7 : 1,
                              cursor: sendingReminderId === appointmentId ? "not-allowed" : "pointer",
                            }}
                          >
                            {sendingReminderId === appointmentId
                              ? "Enviando..."
                              : event.reminderEmailSentAt
                                ? "Reenviar lembrete por e-mail"
                                : "Enviar lembrete por e-mail"}
                          </button>
                        </div>
                      )}

                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "16px",
                          padding: "14px",
                          marginTop: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                color: "#0f172a",
                                fontWeight: 900,
                                marginBottom: "6px",
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <i className="fa-solid fa-money-bill-wave"></i>
                              Controle financeiro
                            </p>

                            <p style={{ color: "#4b5563", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                              <strong>Valor:</strong> {formatCurrency(event.paymentAmount)}
                              {event.paidAt ? (
                                <>
                                  {" "}· <strong>Pago em:</strong> {formatDate(event.paidAt)}
                                </>
                              ) : null}
                              {event.paymentNote ? (
                                <>
                                  <br />
                                  <strong>Obs.:</strong> {event.paymentNote}
                                </>
                              ) : null}
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            {renderBadge(getPaymentLabel(event.paymentStatus), getPaymentStyle(event.paymentStatus))}

                            <button
                              type="button"
                              onClick={() => {
                                setExpandedPaymentId((current) =>
                                  current === appointmentId ? "" : appointmentId,
                                );
                              }}
                              style={{ ...buttonSecondaryStyle, padding: "9px 12px", fontSize: "13px" }}
                            >
                              {isExpandedPayment ? "Fechar" : "Gerenciar pagamento"}
                            </button>
                          </div>
                        </div>

                        {isExpandedPayment && (
                          <div
                            style={{
                              borderTop: "1px solid #e5e7eb",
                              marginTop: "14px",
                              paddingTop: "14px",
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "12px",
                                color: "#475569",
                                fontSize: "13px",
                                lineHeight: 1.5,
                                marginBottom: "12px",
                              }}
                            >
                              Use este campo como controle interno de pagamento da consulta. Em
                              caso de pacote ou avaliação paga à vista, marque como isenta ou paga
                              e detalhe na observação.
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(120px, 180px) 1fr",
                                gap: "10px",
                                marginBottom: "12px",
                              }}
                            >
                              <div>
                                <Label>Valor</Label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={getPaymentDraftAmount(event)}
                                  onChange={(e) =>
                                    setPaymentAmounts((current) => ({
                                      ...current,
                                      [appointmentId]: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex.: 150,00"
                                  style={inputStyle}
                                />
                              </div>

                              <div>
                                <Label>Observação</Label>
                                <input
                                  type="text"
                                  value={getPaymentDraftNote(event)}
                                  onChange={(e) =>
                                    setPaymentNotes((current) => ({
                                      ...current,
                                      [appointmentId]: e.target.value,
                                    }))
                                  }
                                  placeholder="Ex.: Pago via Pix, incluído em pacote, cortesia..."
                                  style={inputStyle}
                                />
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              {[
                                { label: "Marcar pago", value: "PAID", style: { backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" } },
                                { label: "Marcar isento", value: "EXEMPT", style: { backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" } },
                                { label: "Voltar pendente", value: "PENDING", style: { backgroundColor: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" } },
                              ].map((button) => {
                                const paymentStatus = button.value as PaymentStatus;
                                const loadingKey = `${appointmentId}-${paymentStatus}`;

                                if (paymentStatus === "PENDING" && event.paymentStatus === "PENDING") {
                                  return null;
                                }

                                return (
                                  <button
                                    key={button.value}
                                    type="button"
                                    onClick={() => handleUpdatePayment(event, paymentStatus)}
                                    disabled={updatingPaymentId === loadingKey}
                                    style={{
                                      ...button.style,
                                      borderRadius: "10px",
                                      padding: "10px 12px",
                                      fontWeight: 900,
                                      cursor:
                                        updatingPaymentId === loadingKey ? "not-allowed" : "pointer",
                                      opacity: updatingPaymentId === loadingKey ? 0.7 : 1,
                                    }}
                                  >
                                    {updatingPaymentId === loadingKey ? "Salvando..." : button.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...buttonSecondaryStyle, textDecoration: "none" }}
                          >
                            <i className="fa-brands fa-google"></i>
                            Abrir no Google Calendar
                          </a>
                        )}

                        {!isCancelled && !isCancellationRequestPending(event) && (
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(appointmentId, event.title)}
                            disabled={cancelingAppointmentId === appointmentId}
                            style={{
                              ...dangerButtonStyle,
                              opacity: cancelingAppointmentId === appointmentId ? 0.7 : 1,
                              cursor: cancelingAppointmentId === appointmentId ? "not-allowed" : "pointer",
                            }}
                          >
                            {cancelingAppointmentId === appointmentId ? "Cancelando..." : "Cancelar consulta"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "14px",
                }}
              >
                Integração
              </h2>

              <p style={{ color: "#4b5563", marginBottom: "18px", lineHeight: 1.55 }}>
                {googleConnected
                  ? "Sua conta Google está conectada. Ao criar um novo horário por esta tela, a consulta será salva no sistema e também enviada ao Google Calendar."
                  : "A lista de consultas usa os dados salvos no sistema. Conecte sua conta Google apenas quando quiser criar horários sincronizados com o Calendar."}
              </p>

              {googleConnected ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      backgroundColor: "#ecfdf5",
                      color: "#065f46",
                      border: "1px solid #a7f3d0",
                      borderRadius: "14px",
                      padding: "12px 18px",
                      fontWeight: 900,
                      fontSize: "14px",
                      width: "100%",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    Google Calendar conectado
                  </div>

                  {googleCalendarEmail && (
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 700,
                        lineHeight: 1.4,
                        margin: 0,
                        textAlign: "center",
                        wordBreak: "break-word",
                      }}
                    >
                      Conta conectada: {googleCalendarEmail}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    disabled={disconnectingGoogle}
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      border: "1px solid #d1d5db",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      fontWeight: 800,
                      cursor: disconnectingGoogle ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      width: "100%",
                      opacity: disconnectingGoogle ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <i className="fa-solid fa-link-slash"></i>
                    {disconnectingGoogle ? "Desconectando..." : "Desconectar"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{ ...buttonSecondaryStyle, width: "100%" }}
                  onClick={handleConnectGoogle}
                >
                  <i className="fa-brands fa-google"></i>
                  Conectar com Google Calendar
                </button>
              )}
            </section>

            <section style={cardStyle}>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#0f172a",
                  marginBottom: "12px",
                }}
              >
                Origem das consultas
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <InfoLine
                  icon="fa-solid fa-database"
                  label="Somente no sistema"
                  value={`${systemOnlyEvents} consulta(s)`}
                />
                <InfoLine
                  icon="fa-brands fa-google"
                  label="Sincronizadas"
                  value={`${googleSyncedEvents} consulta(s)`}
                />
              </div>

            </section>
          </aside>
        </div>

        <div style={{ height: "90px" }} aria-hidden="true" />
      </div>

      {appointmentToCancel && (
        <Modal onClose={closeCancelModal} maxWidth="520px" zIndex={1001}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#0f172a",
              marginBottom: "10px",
            }}
          >
            Cancelar consulta?
          </h2>

          <p style={{ color: "#4b5563", marginBottom: "18px", lineHeight: 1.5 }}>
            A consulta <strong>{appointmentToCancel.title}</strong> será cancelada no
            sistema e, se estiver sincronizada, também será removida do Google Calendar.
          </p>

          <div style={{ marginBottom: "18px" }}>
            <Label>Motivo do cancelamento</Label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Opcional. Ex.: Remarcação por conflito de horário."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>
              Se preenchido, esse motivo será enviado ao paciente no e-mail de cancelamento.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={closeCancelModal}
              style={{
                backgroundColor: "#fff",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              disabled={cancelingAppointmentId === appointmentToCancel.id}
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={confirmCancelAppointment}
              disabled={cancelingAppointmentId === appointmentToCancel.id}
              style={{
                backgroundColor: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 700,
                cursor:
                  cancelingAppointmentId === appointmentToCancel.id ? "not-allowed" : "pointer",
                opacity: cancelingAppointmentId === appointmentToCancel.id ? 0.7 : 1,
              }}
            >
              {cancelingAppointmentId === appointmentToCancel.id
                ? "Cancelando..."
                : "Confirmar cancelamento"}
            </button>
          </div>
        </Modal>
      )}

      {isModalOpen && (
        <Modal onClose={handleCloseModal} maxWidth="720px" zIndex={1000}>
          <div style={{ marginBottom: "22px" }}>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 900,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Novo horário
            </h2>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Preencha os dados da consulta para criar o agendamento no sistema e no
              Google Calendar.
            </p>
          </div>

          {formError && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "16px",
                fontWeight: 700,
              }}
            >
              {formError}
            </div>
          )}

          <form noValidate onSubmit={handleSubmitAppointment}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Label>Título</Label>
                <input
                  type="text"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="Ex.: Sessão com paciente"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Label>Paciente</Label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">
                    {loadingPatients
                      ? "Carregando pacientes..."
                      : patients.length === 0
                        ? "Nenhum paciente cadastrado"
                        : "Selecione um paciente"}
                  </option>

                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} — {patient.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Data</Label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Local</Label>
                <input
                  type="text"
                  value={appointmentLocation}
                  onChange={(e) => setAppointmentLocation(e.target.value)}
                  placeholder="Ex.: Atendimento online"
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Hora inicial</Label>
                <input
                  type="time"
                  value={appointmentStartTime}
                  onChange={(e) => setAppointmentStartTime(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <Label>Hora final</Label>
                <input
                  type="time"
                  value={appointmentEndTime}
                  onChange={(e) => setAppointmentEndTime(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Label>Descrição</Label>
                <textarea
                  value={appointmentDescription}
                  onChange={(e) => setAppointmentDescription(e.target.value)}
                  placeholder="Observações sobre o atendimento"
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  backgroundColor: "#fff",
                  color: "#1f2937",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                style={{
                  ...buttonPrimaryStyle,
                  opacity: savingAppointment || patients.length === 0 ? 0.7 : 1,
                  cursor:
                    savingAppointment || patients.length === 0 ? "not-allowed" : "pointer",
                }}
                disabled={savingAppointment || patients.length === 0}
              >
                {savingAppointment ? "Salvando..." : "Salvar horário"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontWeight: 800,
        color: "#111827",
        marginBottom: "8px",
      }}
    >
      {children}
    </label>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "13px",
        padding: "11px 12px",
        minWidth: 0,
      }}
    >
      <p
        style={{
          color: "#64748b",
          fontSize: "12px",
          fontWeight: 900,
          marginBottom: "5px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
        }}
      >
        <i className={icon}></i>
        {label}
      </p>
      <p
        style={{
          color: "#111827",
          fontWeight: 800,
          margin: 0,
          wordBreak: "break-word",
          lineHeight: 1.4,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "28px",
        backgroundColor: "#f8fafc",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "54px",
          height: "54px",
          borderRadius: "18px",
          backgroundColor: "#eff6ff",
          color: "#1d4ed8",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          marginBottom: "14px",
        }}
      >
        <i className={icon}></i>
      </div>
      <p style={{ fontWeight: 900, color: "#111827", marginBottom: "6px" }}>
        {title}
      </p>
      <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

function Modal({
  children,
  onClose,
  maxWidth,
  zIndex,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth: string;
  zIndex: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          padding: "30px",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
          border: "1px solid #e5e7eb",
        }}
      >
        {children}
      </div>
    </div>
  );
}
