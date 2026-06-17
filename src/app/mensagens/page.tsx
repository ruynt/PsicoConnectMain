"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/errorUtils";
import PsicoPageSkeleton from "@/components/PsicoPageSkeleton";

type MessageSenderRole = "PSYCHOLOGIST" | "PATIENT";

type LinkedPsychologist = {
  id: string;
  name: string;
  email: string;
  crp?: string;
};

type PatientMessage = {
  id: string;
  content: string;
  senderRole: MessageSenderRole;
  patientId: string;
  psychologistId: string;
  readByPatientAt: string | null;
  readByPsychologistAt: string | null;
  createdAt: string;
  updatedAt: string;
  psychologist: LinkedPsychologist | null;
};

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

export default function PatientMessagesPage() {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [psychologists, setPsychologists] = useState<LinkedPsychologist[]>([]);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState("");
  const [messageContent, setMessageContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/patient/messages", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao carregar mensagens.");
      }

      const loadedPsychologists = data.psychologists || [];
      const loadedMessages = data.messages || [];

      setPsychologists(loadedPsychologists);
      setMessages(loadedMessages);

      const firstPsychologistId =
        loadedMessages[0]?.psychologistId || loadedPsychologists[0]?.id || "";

      setSelectedPsychologistId((currentPsychologistId) =>
        currentPsychologistId || firstPsychologistId,
      );
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Erro ao carregar mensagens."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const filteredMessages = useMemo(() => {
    if (!selectedPsychologistId) return messages;

    return messages.filter(
      (message) => message.psychologistId === selectedPsychologistId,
    );
  }, [messages, selectedPsychologistId]);

  const selectedPsychologist = useMemo(() => {
    return psychologists.find(
      (psychologist) => psychologist.id === selectedPsychologistId,
    );
  }, [psychologists, selectedPsychologistId]);

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

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();

    const content = messageContent.trim();

    if (!content) {
      showFeedback("error", "Escreva uma mensagem antes de enviar.");
      return;
    }

    if (!selectedPsychologistId) {
      showFeedback("error", "Selecione um profissional antes de enviar.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch("/api/patient/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          psychologistId: selectedPsychologistId,
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
      showFeedback("error", getErrorMessage(error, "Erro ao enviar mensagem."));
    } finally {
      setSending(false);
    }
  }

  const pageStyle = {
    padding: "36px",
    paddingBottom: "150px",
    minHeight: "calc(100vh - 48px)",
    background: "#ffffff",
    borderRadius: 0,
    overflow: "visible",
  } as const;

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 10px 28px rgba(0, 30, 94, 0.06)",
    border: "1px solid #e6edf7",
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
      <PsicoPageSkeleton
        variant="messages"
        title="Carregando mensagens"
        subtitle="Buscando conversas e histórico de comunicação."
      />
    );
  }

  return (
    <div className="messages-page" style={pageStyle}>
      <section
        className="messages-hero"
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

        <div className="messages-hero-content" style={{ position: "relative", zIndex: 1 }}>
          <div
            className="messages-hero-icon"
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
              marginBottom: "14px",
            }}
          >
            <i className="fa-solid fa-envelope"></i>
          </div>

          <p
            className="messages-hero-pill"
            style={{
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "6px",
              opacity: 0.92,
            }}
          >
            Canal interno
          </p>

          <div
            className="messages-hero-title"
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
            Mensagens
          </div>

          <p
            className="messages-hero-description"
            style={{
              fontSize: "18px",
              color: "#ffffff",
              maxWidth: "820px",
              opacity: 0.92,
              margin: 0,
            }}
          >
            Converse com o profissional responsável, acompanhe orientações e
            responda mensagens enviadas dentro do PsicoConnect.
          </p>
        </div>
      </section>

      {feedback && (
        <div
          className={`messages-feedback messages-feedback-${feedback.type}`}
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

      {error && (
        <div
          style={{
            ...cardStyle,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 800,
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="messages-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "20px",
        }}
      >
        <aside className="messages-sidebar-card" style={cardStyle}>
          <h2
            style={{
              color: "#001e5e",
              fontSize: "22px",
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            Profissional
          </h2>

          <p style={{ color: "#5272a6", marginBottom: "18px" }}>
            Selecione o profissional vinculado para visualizar ou responder a
            conversa.
          </p>

          {psychologists.length === 0 ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "14px",
                backgroundColor: "#f8fbff",
              }}
            >
              <p
                style={{
                  color: "#001e5e",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                Nenhum profissional vinculado
              </p>
              <p style={{ color: "#5272a6", margin: 0 }}>
                Quando houver um vínculo ativo, as mensagens aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="messages-professional-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {psychologists.map((psychologist) => {
                const isSelected = psychologist.id === selectedPsychologistId;

                return (
                  <button
                    key={psychologist.id}
                    className="messages-professional-button"
                    type="button"
                    onClick={() => setSelectedPsychologistId(psychologist.id)}
                    style={{
                      textAlign: "left",
                      border: isSelected ? "1px solid #2563eb" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                      color: isSelected ? "#1d4ed8" : "#102a56",
                      borderRadius: "14px",
                      padding: "14px",
                      cursor: "pointer",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 900,
                        color: isSelected ? "#1d4ed8" : "#001e5e",
                        marginBottom: "4px",
                      }}
                    >
                      {psychologist.name}
                    </p>
                    <p className="messages-form-hint" style={{ color: "#5272a6", margin: 0, fontSize: "13px" }}>
                      {psychologist.crp ? `CRP: ${psychologist.crp}` : psychologist.email}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="messages-chat-card" style={cardStyle}>
          <div
            className="messages-chat-header"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  color: "#001e5e",
                  fontSize: "26px",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}
              >
                {selectedPsychologist
                  ? `Conversa com ${selectedPsychologist.name}`
                  : "Conversa"}
              </h2>

              <p style={{ color: "#5272a6", margin: 0 }}>
                Este espaço não substitui atendimento emergencial. Use para
                orientações e acompanhamentos combinados com o profissional.
              </p>
            </div>

            <button className="messages-refresh-button" type="button" onClick={loadMessages} style={buttonSecondaryStyle}>
              Atualizar
            </button>
          </div>

          <div
            className="messages-thread"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              backgroundColor: "#f8fbff",
              padding: "16px",
              minHeight: "360px",
              maxHeight: "520px",
              overflow: "auto",
              marginBottom: "18px",
            }}
          >
            {filteredMessages.length === 0 ? (
              <div
                className="messages-empty-state"
                style={{
                  height: "320px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: "#5272a6",
                }}
              >
                <div>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "18px",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      margin: "0 auto 12px",
                    }}
                  >
                    <i className="fa-solid fa-comments"></i>
                  </div>
                  <p style={{ fontWeight: 900, color: "#001e5e", marginBottom: "6px" }}>
                    Nenhuma mensagem ainda
                  </p>
                  <p style={{ margin: 0 }}>
                    Envie uma mensagem para iniciar a conversa com o profissional.
                  </p>
                </div>
              </div>
            ) : (
              <div className="messages-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredMessages.map((message) => {
                  const isPatientMessage = message.senderRole === "PATIENT";

                  return (
                    <div
                      key={message.id}
                      className={`messages-row ${isPatientMessage ? "is-patient" : "is-psychologist"}`}
                      style={{
                        display: "flex",
                        justifyContent: isPatientMessage ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        className={`messages-bubble ${isPatientMessage ? "is-patient" : "is-psychologist"}`}
                        style={{
                          maxWidth: "78%",
                          backgroundColor: isPatientMessage ? "#2563eb" : "#ffffff",
                          color: isPatientMessage ? "#ffffff" : "#102a56",
                          border: isPatientMessage ? "1px solid #2563eb" : "1px solid #e5e7eb",
                          borderRadius: isPatientMessage
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          padding: "12px 14px",
                          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "12px",
                            fontWeight: 900,
                            marginBottom: "6px",
                            color: isPatientMessage ? "#dbeafe" : "#1d4ed8",
                          }}
                        >
                          {isPatientMessage
                            ? "Você"
                            : message.psychologist?.name || "Profissional"}
                        </p>

                        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, marginBottom: "8px" }}>
                          {message.content}
                        </p>

                        <p
                          style={{
                            fontSize: "11px",
                            margin: 0,
                            color: isPatientMessage ? "#dbeafe" : "#5272a6",
                            textAlign: "right",
                          }}
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form className="messages-form" noValidate onSubmit={handleSendMessage}>
            <label
              style={{
                display: "block",
                color: "#001e5e",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              Escrever mensagem
            </label>

            <textarea
              className="messages-textarea"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Digite sua resposta ou dúvida para o profissional..."
              rows={2}
              style={{
                width: "100%",
                minHeight: "72px",
                maxHeight: "140px",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "10px 14px",
                fontSize: "14px",
                lineHeight: 1.45,
                outline: "none",
                resize: "vertical",
                marginBottom: "10px",
              }}
            />

            <div
              className="messages-form-footer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <p style={{ color: "#5272a6", margin: 0, fontSize: "13px" }}>
                Evite enviar informações urgentes por aqui. Em situações de risco,
                procure atendimento de emergência.
              </p>

              <button
                className="messages-send-button"
                type="submit"
                disabled={sending || !selectedPsychologistId}
                style={{
                  ...buttonPrimaryStyle,
                  opacity: sending || !selectedPsychologistId ? 0.7 : 1,
                  cursor: sending || !selectedPsychologistId ? "not-allowed" : "pointer",
                }}
              >
                {sending ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          </form>
        </section>
      </div>


      <style>{`
        .messages-page {
          width: 100%;
        }

        .messages-hero {
          isolation: isolate;
        }

        .messages-hero-content {
          padding-right: 92px;
        }

        .messages-hero-icon {
          position: absolute !important;
          top: 0;
          right: 0;
          margin-bottom: 0 !important;
          z-index: 2;
        }

        .messages-hero-title,
        .messages-hero-title *,
        .messages-hero-pill,
        .messages-hero-description {
          color: #ffffff !important;
        }

        .messages-layout {
          align-items: start;
        }

        .messages-sidebar-card,
        .messages-chat-card {
          min-width: 0;
        }

        .messages-professional-button {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .messages-professional-button:hover {
          transform: translateY(-1px);
        }

        .messages-thread {
          scrollbar-width: thin;
          scrollbar-color: #bfdbfe transparent;
        }

        .messages-bubble {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .messages-form-footer {
          align-items: flex-start;
        }

        .messages-form-hint {
          flex: 1 1 260px;
          line-height: 1.45;
        }

        .messages-textarea {
          min-height: 72px !important;
          max-height: 140px !important;
        }

        @media (max-width: 1180px) {
          .messages-layout {
            grid-template-columns: 280px 1fr !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 900px) {
          .messages-page {
            padding: 20px !important;
            padding-bottom: 130px !important;
          }

          .messages-hero {
            padding: 24px !important;
            border-radius: 24px !important;
          }

          .messages-hero-title {
            font-size: 34px !important;
          }

          .messages-layout {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .messages-sidebar-card,
          .messages-chat-card {
            padding: 20px !important;
            border-radius: 20px !important;
          }

          .messages-professional-list {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .messages-thread {
            min-height: 420px !important;
            max-height: 58dvh !important;
          }
        }

        @media (max-width: 640px) {
          .messages-page {
            padding: 16px !important;
            padding-bottom: 120px !important;
          }

          .messages-hero {
            padding: 18px !important;
            border-radius: 22px !important;
            margin-bottom: 16px !important;
          }

          .messages-hero-content {
            padding-right: 54px !important;
          }

          .messages-hero-icon {
            width: 42px !important;
            height: 42px !important;
            border-radius: 14px !important;
            font-size: 18px !important;
          }

          .messages-hero-pill {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin-bottom: 10px !important;
          }

          .messages-hero-title {
            font-size: 26px !important;
            line-height: 1.08 !important;
            margin-bottom: 0 !important;
          }

          .messages-hero-description {
            display: none !important;
          }

          .messages-sidebar-card,
          .messages-chat-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .messages-sidebar-card > p {
            display: none !important;
          }

          .messages-sidebar-card h2,
          .messages-chat-header h2 {
            font-size: 22px !important;
            line-height: 1.15 !important;
          }

          .messages-professional-list {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .messages-professional-button {
            padding: 12px !important;
            border-radius: 14px !important;
          }

          .messages-chat-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            margin-bottom: 14px !important;
          }

          .messages-chat-header p {
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .messages-refresh-button {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }

          .messages-thread {
            min-height: 360px !important;
            max-height: 52dvh !important;
            padding: 12px !important;
            border-radius: 16px !important;
            margin-bottom: 14px !important;
          }

          .messages-empty-state {
            height: 260px !important;
            padding: 0 10px !important;
          }

          .messages-bubble {
            max-width: 92% !important;
            padding: 11px 13px !important;
            border-radius: 16px !important;
          }

          .messages-bubble p {
            font-size: 13px !important;
          }

          .messages-form label {
            font-size: 14px !important;
          }

          .messages-textarea {
            min-height: 72px !important;
            max-height: 130px !important;
            padding: 10px 12px !important;
          }

          .messages-form-footer {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .messages-form-hint {
            flex: initial !important;
            font-size: 12px !important;
          }

          .messages-send-button {
            width: 100% !important;
            padding: 11px 14px !important;
            box-shadow: none !important;
          }
        }

        @media (max-width: 420px) {
          .messages-hero-title {
            font-size: 24px !important;
          }

          .messages-sidebar-card,
          .messages-chat-card {
            padding: 14px !important;
          }

          .messages-thread {
            min-height: 330px !important;
          }

          .messages-bubble {
            max-width: 96% !important;
          }
        }
      `}</style>


      <div style={{ height: "90px" }} aria-hidden="true" />
    </div>
  );
}
