"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

  async function loadMessages() {
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

      if (!selectedPsychologistId) {
        const firstPsychologistId =
          loadedMessages[0]?.psychologistId || loadedPsychologists[0]?.id || "";

        setSelectedPsychologistId(firstPsychologistId);
      }
    } catch (error: any) {
      setError(error.message || "Erro ao carregar mensagens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

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
    } catch (error: any) {
      showFeedback("error", error.message || "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  const pageStyle = {
    padding: "36px",
    paddingBottom: "72px",
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
      <div
        style={{
          minHeight: "calc(100vh - 48px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 0,
          background: "#ffffff",
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

  return (
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

        <div style={{ position: "relative", zIndex: 1 }}>
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
              marginBottom: "14px",
            }}
          >
            <i className="fa-solid fa-envelope"></i>
          </div>

          <p
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
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "20px",
        }}
      >
        <aside style={cardStyle}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {psychologists.map((psychologist) => {
                const isSelected = psychologist.id === selectedPsychologistId;

                return (
                  <button
                    key={psychologist.id}
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
                    <p style={{ color: "#5272a6", margin: 0, fontSize: "13px" }}>
                      {psychologist.crp ? `CRP: ${psychologist.crp}` : psychologist.email}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section style={cardStyle}>
          <div
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

            <button type="button" onClick={loadMessages} style={buttonSecondaryStyle}>
              Atualizar
            </button>
          </div>

          <div
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
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredMessages.map((message) => {
                  const isPatientMessage = message.senderRole === "PATIENT";

                  return (
                    <div
                      key={message.id}
                      style={{
                        display: "flex",
                        justifyContent: isPatientMessage ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
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

          <form noValidate onSubmit={handleSendMessage}>
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
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Digite sua resposta ou dúvida para o profissional..."
              rows={4}
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "12px 14px",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                marginBottom: "12px",
              }}
            />

            <div
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
    </div>
  );
}
