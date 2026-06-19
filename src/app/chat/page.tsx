"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";

import { readApiErrorMessage } from "@/lib/client-api-error";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

const CHAT_API_URL = "/api/psicobot";

const roleSuggestions = {
  ADMIN: [
    {
      label: "Resumo dos usuários",
      prompt: "Mostre um resumo dos usuários",
    },
    {
      label: "CRPs pendentes",
      prompt: "Mostre os CRPs pendentes",
    },
    {
      label: "Usuários recentes",
      prompt: "Mostre os usuários recentes",
    },
    {
      label: "Como usar o admin",
      prompt: "Como funciona a área administrativa?",
    },
  ],
  PSYCHOLOGIST: [
    {
      label: "Listar meus pacientes",
      prompt: "Liste meus pacientes",
    },
    {
      label: "Resumir paciente",
      prompt: "Resuma o paciente ",
    },
    {
      label: "Tarefas do paciente",
      prompt: "Mostre as tarefas do paciente ",
    },
    {
      label: "Consultas do paciente",
      prompt: "Mostre as próximas consultas do paciente ",
    },
  ],
  PATIENT: [
    {
      label: "Meu acompanhamento",
      prompt: "Resuma meu acompanhamento",
    },
    {
      label: "Minhas consultas",
      prompt: "Quais são minhas próximas consultas?",
    },
    {
      label: "Tarefas pendentes",
      prompt: "Quais tarefas estão pendentes?",
    },
    {
      label: "Meus psicólogos",
      prompt: "Quais psicólogos estão vinculados a mim?",
    },
  ],
  UNKNOWN: [
    {
      label: "Usar o PsicoConnect",
      prompt: "Como usar o PsicoConnect?",
    },
    {
      label: "Editar perfil",
      prompt: "Como editar meu perfil?",
    },
    {
      label: "Usar agenda",
      prompt: "Como usar a agenda?",
    },
    {
      label: "Mensagens",
      prompt: "Como funcionam as mensagens?",
    },
  ],
};

const roleDescriptions = {
  ADMIN:
    "Perguntas rápidas de leitura para acompanhar usuários e verificações de CRP.",
  PSYCHOLOGIST:
    "Perguntas rápidas para consultar pacientes vinculados e dados do acompanhamento.",
  PATIENT:
    "Perguntas rápidas para consultar suas consultas, tarefas, materiais e psicólogos vinculados.",
  UNKNOWN:
    "Perguntas rápidas para testar o PsicoBot durante a apresentação.",
};

const formatTimestamp = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });


const GENERIC_BOT_ERROR_MESSAGE =
  "Não consegui responder agora. Tente novamente em instantes.";

const GENERIC_AI_ERROR_MESSAGE =
  "Não consegui processar essa solicitação no momento. Você pode tentar reformular a pergunta ou tentar novamente em alguns instantes.";

function getSafeBotReply(reply?: string) {
  const fallbackMessage =
    "Desculpe, não consegui obter uma resposta agora. Tente novamente em instantes.";

  if (!reply || typeof reply !== "string") {
    return fallbackMessage;
  }

  const normalizedReply = reply.toLowerCase();

  const technicalErrorTerms = [
    "backend",
    "porta 8000",
    "porta 3000",
    "localhost",
    "falha na api",
    "não foi possível conectar ao psicobot",
    "projeto principal está rodando",
    "não consegui conectar ao backend",
    "fetch failed",
    "networkerror",
    "failed to fetch",
    "connect econnrefused",
    "erro 500",
    "erro 502",
    "erro 503",
    "erro 504",
  ];

  const hasTechnicalError = technicalErrorTerms.some((term) =>
    normalizedReply.includes(term),
  );

  if (hasTechnicalError) {
    return GENERIC_AI_ERROR_MESSAGE;
  }

  return reply;
}

function getRoleWelcomeMessage(role: string) {
  if (role === "ADMIN") {
    return "Olá! Sou o PsicoBot. Posso ajudar com usuários, CRPs pendentes, usuários recentes e orientações sobre a área administrativa do PsicoConnect.";
  }

  if (role === "PSYCHOLOGIST") {
    return "Olá! Sou o PsicoBot. Posso ajudar a consultar seus pacientes vinculados, próximas consultas, tarefas, materiais, checklists, mensagens e também responder dúvidas sobre o uso do PsicoConnect.";
  }

  if (role === "PATIENT") {
    return "Olá! Sou o PsicoBot. Posso ajudar você a acompanhar suas consultas, tarefas, materiais, mensagens, psicólogos vinculados e explicar como usar o PsicoConnect.";
  }

  return "Olá! Sou o PsicoBot, assistente virtual da PsicoConnect. Posso ajudar com o uso do sistema e dúvidas informativas.";
}

export default function ChatBotPage() {
  const { data: session } = useSession();

  const userRole =
    ((session?.user as { role?: string } | undefined)?.role || "UNKNOWN")
      .toUpperCase();

  const quickSuggestions =
    roleSuggestions[userRole as keyof typeof roleSuggestions] ||
    roleSuggestions.UNKNOWN;

  const sidePanelDescription =
    roleDescriptions[userRole as keyof typeof roleDescriptions] ||
    roleDescriptions.UNKNOWN;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now(),
      text: getRoleWelcomeMessage(userRole),
      sender: "bot",
      timestamp: formatTimestamp(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    setMessages((currentMessages) => {
      if (currentMessages.length !== 1 || currentMessages[0]?.sender !== "bot") {
        return currentMessages;
      }

      return [
        {
          ...currentMessages[0],
          text: getRoleWelcomeMessage(userRole),
        },
      ];
    });
  }, [userRole]);

  function resetConversation() {
    if (isLoading) return;

    setMessages([
      {
        id: Date.now(),
        text: getRoleWelcomeMessage(userRole),
        sender: "bot",
        timestamp: formatTimestamp(),
      },
    ]);
    setInput("");

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const scrollToBottom = (smooth = true) => {
    const chatElement = chatMessagesRef.current;

    if (!chatElement) return;

    chatElement.scrollTo({
      top: chatElement.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;

    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    const chatElement = chatMessagesRef.current;

    if (chatElement) {
      chatElement.addEventListener("scroll", handleScroll);
      return () => chatElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    const textarea = inputRef.current;

    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight + 2, 100);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return;

    setInput(prompt);

    setTimeout(() => {
      const textarea = inputRef.current;

      if (!textarea) return;

      textarea.focus();
      textarea.setSelectionRange(prompt.length, prompt.length);
    }, 0);
  };

  const sendMessage = async (e?: React.FormEvent, suggestion?: string) => {
    e?.preventDefault();

    const currentInput = (suggestion || input).trim();

    if (currentInput === "" || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: currentInput,
      sender: "user",
      timestamp: formatTimestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const recentHistory = [...messages, userMessage].slice(-8).map((message) => ({
        sender: message.sender,
        text: message.text,
      }));

      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          role: userRole,
          history: recentHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiErrorMessage(
            response,
            "Não foi possível enviar sua mensagem ao PsicoBot.",
          ),
        );
      }

      const data = await response.json();

      const botMessage: Message = {
        id: Date.now() + 1,
        text: getSafeBotReply(data.reply),
        sender: "bot",
        timestamp: formatTimestamp(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: unknown) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: error instanceof Error ? error.message : GENERIC_BOT_ERROR_MESSAGE,
        sender: "bot",
        timestamp: formatTimestamp(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-page-shell">
      <main className="chat-panel-wrapper">
        <header className="chat-header">
          <div className="icon psicobot-header-icon">
            <Image
              src="/psicobot_icon_white.png"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
            />
          </div>

          <div className="chat-header-title">
            <h2>Assistente PsicoConnect</h2>
            <p>Como posso te ajudar hoje?</p>
          </div>

          <button
            type="button"
            className="clear-chat-button"
            onClick={resetConversation}
            disabled={isLoading}
            title="Limpar conversa desta sessão"
            aria-label="Limpar conversa desta sessão"
          >
            <svg
              className="clear-chat-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M14.8 3.5a2.2 2.2 0 0 1 3.1 0l2.6 2.6a2.2 2.2 0 0 1 0 3.1l-7.8 7.8-5.7-5.7 7.8-7.8Z" />
              <path d="M5.7 12.6l5.7 5.7-1.1 1.1c-.7.7-1.6 1.1-2.6 1.1H3.8c-.4 0-.7-.3-.7-.7v-3.9c0-1 .4-1.9 1.1-2.6l1.5-.7Z" />
              <path d="M11.8 20.5h8.1c.5 0 .9-.4.9-.9s-.4-.9-.9-.9h-6.3l-1.8 1.8Z" />
            </svg>
            <span className="clear-chat-label">Limpar conversa</span>
          </button>
        </header>

        <div className="chat-mobile-suggestions-panel">
          <div className="chat-mobile-suggestions-heading">
            <div className="side-panel-icon">
              <i className="fa-solid fa-lightbulb" />
            </div>

            <div>
              <h2>Sugestões</h2>
              <p className="side-panel-description">{sidePanelDescription}</p>
            </div>
          </div>

          <div className="suggestion-list">
            {quickSuggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => handleSuggestionClick(suggestion.prompt)}
                disabled={isLoading}
                className="suggestion-button"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-content-wrapper">
          <div
            className="chat-messages"
            id="chat-messages"
            ref={chatMessagesRef}
            onScroll={handleScroll}
          >
            {messages.map((msg) => {
              const isBotMessage = msg.sender === "bot";

              return (
                <div key={msg.id} className={`message-row ${msg.sender}`}>
                  <div className={`message ${msg.sender} break-words`}>
                    {isBotMessage && (
                      <span className="bot-message-mini-icon" aria-hidden="true">
                        <Image
                          src="/psicobot_icon_white.png"
                          alt=""
                          width={13}
                          height={13}
                        />
                      </span>
                    )}

                    <div>
                      <ReactMarkdown
                        components={{
                          a: ({ href, title, children }) => (
                            <a
                              href={href}
                              title={title}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    <span className="timestamp">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="message bot">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <footer className="chat-input-area">
            <textarea
              ref={inputRef}
              id="message-input"
              placeholder="Digite sua mensagem aqui..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  sendMessage(e);
                }
              }}
              disabled={isLoading}
            />

            <button
              id="send-button"
              type="button"
              onClick={() => sendMessage()}
              disabled={isLoading || input.trim() === ""}
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </footer>

          <button
            id="scroll-down-button"
            className={showScrollButton ? "" : "hidden"}
            onClick={() => scrollToBottom(true)}
            type="button"
          >
            <i className="fa-solid fa-arrow-down" />
          </button>
        </div>
      </main>

      <aside className="chat-side-panel">
        <div className="side-panel-icon">
          <i className="fa-solid fa-lightbulb" />
        </div>

        <h2>Sugestões</h2>

        <p className="side-panel-description">{sidePanelDescription}</p>

        <div className="suggestion-list">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              disabled={isLoading}
              className="suggestion-button"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <div className="side-alert warning">
          <strong>Importante:</strong> o PsicoBot oferece apoio informativo e
          não substitui avaliação profissional, supervisão clínica ou tomada de
          decisão técnica.
        </div>
      </aside>

      <style>{`
        .chat-page-shell {
          width: 100%;
          height: calc(100vh - 48px);
          min-height: 620px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 16px;
          background: #ffffff;
          box-shadow: none;
          border: none;
          overflow: hidden;
          box-sizing: border-box;
          border-radius: 28px;
        }

        .chat-panel-wrapper {
          min-width: 0;
          min-height: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: none;
          border: none;
        }

        .chat-header {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 14px;
          border: none;
          border-radius: 26px;
          padding: 22px 170px 22px 24px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #1d4ed8, #3b82f6 55%, #60a5fa);
          box-shadow: 0 18px 42px rgba(37, 99, 235, 0.16);
          color: #ffffff;
        }

        .chat-header::before {
          content: "";
          position: absolute;
          right: -70px;
          top: -90px;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          pointer-events: none;
        }

        .chat-header::after {
          content: "";
          position: absolute;
          right: 130px;
          bottom: -120px;
          width: 190px;
          height: 190px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.10);
          pointer-events: none;
        }

        .chat-header .icon,
        .chat-header-title,
        .clear-chat-button {
          position: relative;
          z-index: 1;
        }

        .chat-header .icon {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.26);
          border-radius: 18px;
          margin-right: 0;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .chat-header .psicobot-header-icon img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 2px 4px rgba(0, 30, 94, 0.18));
        }

        .chat-header-title {
          min-width: 0;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .chat-header-title h2 {
          font-size: 34px;
          font-weight: 900;
          color: #ffffff !important;
          font-family: var(--font-montserrat), sans-serif;
          line-height: 1.05;
          letter-spacing: -0.03em;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
          margin: 0;
        }

        .chat-header-title p {
          font-size: 16px;
          color: #dbeafe !important;
          font-family: var(--font-inter), sans-serif;
          margin-top: 4px;
          white-space: normal;
          word-break: break-word;
        }

        .clear-chat-button {
          position: absolute;
          right: 22px;
          top: 22px;
          min-width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.30);
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
          border-radius: 999px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.18s ease;
          white-space: nowrap;
          backdrop-filter: blur(8px);
          box-shadow: none;
        }

        .clear-chat-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.22);
          border-color: rgba(255, 255, 255, 0.42);
          color: #ffffff;
        }

        .clear-chat-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .clear-chat-icon {
          width: 16px;
          height: 16px;
          display: block;
          flex: 0 0 16px;
          fill: currentColor;
        }

        .chat-content-wrapper {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background-color: #cde3fe;
          margin: 24px 32px 32px;
          border-radius: 30px;
          width: calc(100% - 64px);
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .chat-messages {
          flex: 1 1 auto;
          min-height: 0;
          padding: 32px 32px 0 32px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          padding: 14px 20px;
          border-radius: 18px;
          max-width: 60%;
          line-height: 1.4;
          font-size: 17px;
          font-family: var(--font-inter), sans-serif;
          font-weight: 500;
          overflow-wrap: break-word;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .message.bot {
          background-color: #ffffff;
          color: #333;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
          max-width: 70%;
        }

        .message.bot .timestamp {
          align-self: flex-end;
        }

        .message.user {
          background-color: #528cff;
          color: #ffffff;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
          max-width: 48%;
        }

        .message.user .timestamp {
          align-self: flex-end;
          color: #e0e0e0;
        }

        .message.bot a {
          color: #1c4bb3;
          text-decoration: underline;
        }

        .message.bot a:hover {
          color: #528cff;
        }

        .message p {
          margin: 0 0 8px;
        }

        .message p:last-child {
          margin-bottom: 0;
        }

        .message ul,
        .message ol {
          margin: 8px 0 8px 22px;
          padding: 0;
        }

        .message li {
          margin: 4px 0;
        }

        .message strong {
          font-weight: 800;
          color: inherit;
        }

        .chat-input-area {
          display: flex;
          background-color: transparent;
          flex-shrink: 0;
          padding: 24px 32px 32px 32px;
          align-items: flex-end;
        }

        .chat-input-area textarea {
          flex-grow: 1;
          min-height: 46px;
          max-height: 92px;
          border: none;
          background-color: #ffffff;
          padding: 13px 22px;
          border-radius: 30px;
          font-size: 15px;
          line-height: 1.35;
          outline: none;
          resize: none;
          font-family: var(--font-inter), sans-serif;
          overflow-y: hidden;
          margin-right: 16px;
          box-sizing: border-box;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
          display: block;
        }

        .chat-input-area textarea::placeholder {
          color: #999;
          font-family: var(--font-inter), sans-serif;
        }

        .chat-input-area button {
          background-color: #528cff;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          font-size: 20px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .chat-input-area button:hover {
          background-color: #001e5e;
        }

        .chat-input-area button:disabled {
          background-color: #a9c1f7;
          cursor: not-allowed;
        }

        .chat-input-area button:active {
          background-color: #528cff;
          transform: scale(0.98);
        }

        .timestamp {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
        }

        .message.bot .typing-indicator {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px;
          white-space: nowrap;
          background: transparent;
          padding: 0;
          margin: 0;
          box-shadow: none;
          border-radius: 0;
        }

        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #999;
          border-radius: 50%;
          display: inline-block !important;
          animation: bounce 1.3s infinite ease-in-out;
          margin: 0;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: -1.1s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: -0.9s;
        }

        .message.bot:has(.typing-indicator) {
          padding: 20px 14px;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }

          40% {
            transform: scale(1);
          }
        }

        #scroll-down-button {
          position: absolute;
          bottom: 85px;
          right: 30px;
          background-color: #528cff;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          opacity: 1;
          transition: opacity 0.3s ease, transform 0.3s ease;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #scroll-down-button.hidden {
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
        }

        .chat-messages::-webkit-scrollbar {
          width: 8px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 4px;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background-color: rgba(0, 30, 94, 0.3);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 30, 94, 0.5);
        }

        .chat-messages {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 30, 94, 0.5) transparent;
        }

        .chat-side-panel {
          height: 100%;
          min-height: 0;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #eef4ff;
          border-radius: 22px;
          padding: 22px;
          box-shadow: none;
          color: #102a56;
          box-sizing: border-box;
        }

        .side-panel-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: #eaf2ff;
          border: 1px solid #bfd5ff;
          color: #1c4bb3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-bottom: 16px;
        }

        .chat-side-panel h2 {
          color: #102a56;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .side-panel-description {
          color: #5272a6;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 18px;
        }

        .suggestion-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 18px;
        }

        .suggestion-button {
          text-align: left;
          background: #f7faff;
          color: #102a56;
          border: 1px solid #d6e4ff;
          border-radius: 14px;
          padding: 12px 13px;
          font-weight: 700;
          line-height: 1.35;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .suggestion-button:hover:not(:disabled) {
          background: #eaf2ff;
          border-color: #bfd5ff;
          color: #1c4bb3;
          transform: translateY(-1px);
        }

        .suggestion-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .side-alert {
          border-radius: 16px;
          padding: 14px;
          font-size: 14px;
          line-height: 1.5;
          margin-top: 12px;
        }

        .side-alert.warning {
          background: #fff8e8;
          border: 1px solid #f8da8d;
          color: #8a5b00;
        }

        .side-alert.info {
          background: #eaf2ff;
          border: 1px solid #bfd5ff;
          color: #1c4bb3;
        }

        .side-alert code {
          background: rgba(255, 255, 255, 0.55);
          border-radius: 6px;
          padding: 1px 5px;
          font-weight: 700;
        }

        .chat-mobile-suggestions-panel {
          display: none;
        }

        @media (max-width: 1280px) {
          .chat-page-shell {
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 14px;
          }

          .chat-content-wrapper {
            margin: 24px 22px 24px;
            width: calc(100% - 44px);
          }

          .message.bot {
            max-width: 76%;
          }

          .message.user {
            max-width: 58%;
          }
        }

        @media (max-width: 1120px) {
          .chat-page-shell {
            height: calc(100dvh - 48px);
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-radius: 24px;
          }

          .chat-panel-wrapper {
            flex: 1 1 auto;
            min-height: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .chat-side-panel {
            display: none;
          }

          .chat-header {
            flex-shrink: 0;
            padding: 22px 150px 22px 22px;
            border-radius: 24px;
          }

          .chat-header-title h2 {
            font-size: 30px;
          }

          .chat-mobile-suggestions-panel {
            display: block;
            flex-shrink: 0;
            padding: 12px 14px 0;
            background: #ffffff;
          }

          .chat-mobile-suggestions-heading {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
          }

          .chat-mobile-suggestions-heading .side-panel-icon {
            display: flex;
            width: 36px;
            height: 36px;
            border-radius: 12px;
            font-size: 15px;
            margin: 0;
          }

          .chat-mobile-suggestions-heading h2 {
            color: #102a56;
            font-size: 18px;
            line-height: 1.1;
            font-weight: 800;
            margin: 0 0 2px;
          }

          .chat-mobile-suggestions-heading .side-panel-description {
            display: block;
            color: #5272a6;
            font-size: 12px;
            line-height: 1.35;
            margin: 0;
          }

          .chat-mobile-suggestions-panel .suggestion-list {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            margin: 0;
          }

          .chat-mobile-suggestions-panel .suggestion-button {
            padding: 9px 10px;
            border-radius: 12px;
            font-size: 12px;
            line-height: 1.2;
            text-align: center;
          }

          .chat-content-wrapper {
            flex: 1 1 auto;
            min-height: 0;
            height: auto;
            margin: 12px 14px 0;
            width: calc(100% - 28px);
            border-radius: 22px 22px 0 0;
          }

          .chat-messages {
            flex: 1 1 auto;
            min-height: 0;
          }

          .chat-input-area {
            flex-shrink: 0;
          }
        }

        @media (max-width: 900px) {
          .chat-page-shell {
            height: calc(100dvh - 42px);
            border-radius: 22px;
          }

          .chat-header {
            padding: 20px 74px 20px 18px;
            border-radius: 22px;
            gap: 10px;
          }

          .chat-header .icon {
            width: 50px;
            height: 50px;
            border-radius: 16px;
          }

          .chat-header .psicobot-header-icon img {
            width: 34px;
            height: 34px;
          }

          .chat-header-title h2 {
            font-size: 25px;
          }

          .chat-header-title p {
            font-size: 14px;
          }

          .clear-chat-button {
            right: 18px;
            top: 18px;
          }

          .chat-content-wrapper {
            margin: 12px 14px 0;
            width: calc(100% - 28px);
            border-radius: 22px 22px 0 0;
          }

          .chat-messages {
            padding: 20px 18px 0;
            gap: 10px;
          }

          .message {
            font-size: 15px;
            padding: 12px 15px;
            border-radius: 16px;
          }

          .message.bot {
            max-width: 82%;
          }

          .message.user {
            max-width: 72%;
          }

          .chat-input-area {
            padding: 16px 18px 18px;
          }

          .chat-input-area textarea {
            min-height: 44px;
            max-height: 84px;
            padding: 12px 16px;
            border-radius: 22px;
            margin-right: 10px;
            font-size: 14px;
            overflow-y: hidden;
          }

          .chat-input-area button {
            width: 46px;
            height: 46px;
            font-size: 17px;
          }

          #scroll-down-button {
            bottom: 72px;
            right: 20px;
            width: 36px;
            height: 36px;
            font-size: 15px;
          }
        }

        @media (max-width: 640px) {
          .chat-page-shell {
            height: calc(100dvh - 38px);
            min-height: 0;
            border-radius: 20px;
          }

          .chat-header {
            padding: 16px 62px 16px 14px;
            border-radius: 20px;
            gap: 9px;
            align-items: center;
          }

          .chat-header .icon {
            width: 44px;
            height: 44px;
            border-radius: 14px;
          }

          .chat-header .psicobot-header-icon img {
            width: 30px;
            height: 30px;
          }

          .chat-header-title h2 {
            font-size: 20px;
            line-height: 1.08;
          }

          .chat-header-title p {
            font-size: 12.5px;
          }

          .clear-chat-button {
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 38px;
            height: 38px;
            min-width: 38px;
            padding: 0;
            border-radius: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .clear-chat-label {
            display: none;
          }

          .clear-chat-icon {
            width: 17px;
            height: 17px;
            flex-basis: 17px;
            margin: 0;
          }

          .chat-mobile-suggestions-panel {
            padding: 10px 12px 0;
          }

          .chat-mobile-suggestions-heading {
            grid-template-columns: auto 1fr;
            gap: 9px;
            margin-bottom: 8px;
          }

          .chat-mobile-suggestions-heading .side-panel-icon {
            display: flex;
            width: 32px;
            height: 32px;
            border-radius: 11px;
            font-size: 14px;
          }

          .chat-mobile-suggestions-heading h2 {
            font-size: 16px;
          }

          .chat-mobile-suggestions-heading .side-panel-description {
            display: none;
          }

          .chat-mobile-suggestions-panel .suggestion-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .chat-mobile-suggestions-panel .suggestion-button {
            padding: 8px 9px;
            border-radius: 11px;
            font-size: 11.5px;
          }

          .chat-content-wrapper {
            margin: 10px 10px 0;
            width: calc(100% - 20px);
            border-radius: 18px 18px 0 0;
          }

          .chat-messages {
            padding: 14px 12px 0;
            gap: 9px;
          }

          .message,
          .message.bot,
          .message.user {
            max-width: 92%;
            font-size: 13.5px;
            line-height: 1.4;
            padding: 10px 12px;
            border-radius: 14px;
          }

          .message p {
            margin-bottom: 6px;
          }

          .message ul,
          .message ol {
            margin: 6px 0 6px 18px;
          }

          .timestamp {
            font-size: 10px;
          }

          .chat-input-area {
            padding: 10px 12px 12px;
            align-items: flex-end;
          }

          .chat-input-area textarea {
            min-height: 42px;
            max-height: 78px;
            padding: 11px 14px;
            border-radius: 18px;
            margin-right: 8px;
            font-size: 13.5px;
            overflow-y: hidden;
          }

          .chat-input-area button {
            width: 42px;
            height: 42px;
            font-size: 15px;
          }

          #scroll-down-button {
            bottom: 58px;
            right: 14px;
            width: 34px;
            height: 34px;
            font-size: 14px;
          }
        }

        @media (max-width: 420px) {
          .chat-page-shell {
            height: calc(100dvh - 34px);
          }

          .chat-header {
            padding: 14px 58px 14px 12px;
          }

          .chat-header-title h2 {
            font-size: 18px;
          }

          .chat-content-wrapper {
            margin: 8px 8px 0;
            width: calc(100% - 16px);
          }

          .chat-messages {
            padding: 12px 10px 0;
          }

          .message,
          .message.bot,
          .message.user {
            max-width: 95%;
            font-size: 13px;
            padding: 9px 11px;
          }

          .chat-input-area {
            padding: 9px 10px 10px;
          }

          .suggestion-button {
            font-size: 11px;
            padding: 7px 8px;
          }
        }

        /* Balões com canto de origem e ícone sutil do PsicoBot */
        .message-row {
          display: flex;
          width: 100%;
          align-items: flex-end;
        }

        .message-row.bot {
          justify-content: flex-start;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message {
          position: relative;
        }

        .message.bot {
          padding-left: 42px;
          border-bottom-left-radius: 4px !important;
        }

        .message.user {
          border-bottom-right-radius: 4px !important;
        }

        .bot-message-mini-icon {
          position: absolute;
          left: 14px;
          top: 14px;
          width: 18px;
          height: 18px;
          border-radius: 7px;
          background: #eef4ff;
          border: 1px solid #dbeafe;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.86;
          pointer-events: none;
          overflow: hidden;
        }

        .bot-message-mini-icon img {
          width: 13px;
          height: 13px;
          object-fit: contain;
          opacity: 0.72;
          filter:
            grayscale(1)
            brightness(0.55)
            contrast(0.9);
        }

        .message.bot:has(.typing-indicator) {
          padding-left: 14px;
        }

        .message.bot:has(.typing-indicator) .bot-message-mini-icon {
          display: none;
        }

        @media (max-width: 640px) {
          .message.bot {
            padding-left: 34px !important;
            border-bottom-left-radius: 4px !important;
          }

          .message.user {
            border-bottom-right-radius: 4px !important;
          }

          .bot-message-mini-icon {
            left: 10px;
            top: 10px;
            width: 16px;
            height: 16px;
            border-radius: 6px;
          }

          .bot-message-mini-icon img {
            width: 11px;
            height: 11px;
          }

          .message.bot:has(.typing-indicator) {
            padding-left: 12px !important;
          }
        }

        @media (max-width: 420px) {
          .message.bot {
            padding-left: 32px !important;
          }

          .bot-message-mini-icon {
            left: 9px;
            top: 9px;
            width: 15px;
            height: 15px;
          }

          .bot-message-mini-icon img {
            width: 10px;
            height: 10px;
          }
        }


        /* Correção: botão limpar conversa não desce no toque mobile */
        .clear-chat-button,
        .clear-chat-button:hover,
        .clear-chat-button:active,
        .clear-chat-button:focus,
        .clear-chat-button:focus-visible {
          margin: 0 !important;
          line-height: 1 !important;
        }

        @media (max-width: 640px) {
          .clear-chat-button,
          .clear-chat-button:hover,
          .clear-chat-button:active,
          .clear-chat-button:focus,
          .clear-chat-button:focus-visible {
            position: absolute !important;
            right: 12px !important;
            top: 50% !important;
            bottom: auto !important;
            left: auto !important;
            transform: translateY(-50%) !important;
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            min-height: 38px !important;
            max-width: 38px !important;
            max-height: 38px !important;
            padding: 0 !important;
            border-radius: 13px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 0 0 38px !important;
            align-self: center !important;
            margin: 0 !important;
            line-height: 1 !important;
            vertical-align: middle !important;
          }

          .clear-chat-button:active {
            transform: translateY(-50%) scale(0.98) !important;
          }

          .clear-chat-icon {
            position: static !important;
            width: 17px !important;
            height: 17px !important;
            min-width: 17px !important;
            min-height: 17px !important;
            max-width: 17px !important;
            max-height: 17px !important;
            flex: 0 0 17px !important;
            margin: 0 !important;
            display: block !important;
            transform: none !important;
          }
        }

        @media (max-width: 420px) {
          .clear-chat-button,
          .clear-chat-button:hover,
          .clear-chat-button:active,
          .clear-chat-button:focus,
          .clear-chat-button:focus-visible {
            right: 10px !important;
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            min-height: 36px !important;
            max-width: 36px !important;
            max-height: 36px !important;
            flex-basis: 36px !important;
          }

          .clear-chat-icon {
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            max-width: 16px !important;
            max-height: 16px !important;
            flex-basis: 16px !important;
          }
        }

      `}</style>
    </div>
  );
}
