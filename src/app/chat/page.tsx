"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

const CHAT_API_URL = "http://localhost:8000/api/chat";

const quickSuggestions = [
  "Como posso usar a agenda?",
  "Como funcionam as tarefas terapêuticas?",
  "Como enviar materiais para um paciente?",
  "Como organizar anotações de sessão?",
];

const formatTimestamp = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ChatBotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: Date.now(),
      text:
        "Olá! Sou o assistente virtual da PsicoConnect. Estou aqui para ajudar com agendamentos ou tirar dúvidas.",
      sender: "bot",
      timestamp: formatTimestamp(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

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
    const textarea = document.getElementById(
      "message-input",
    ) as HTMLTextAreaElement | null;

    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight + 2, 100);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

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
      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha na API.`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.reply || "Desculpe, não consegui obter uma resposta da IA.",
        sender: "bot",
        timestamp: formatTimestamp(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: Message = {
        id: Date.now() + 1,
        text:
          "Erro: Não foi possível conectar ao bot. Verifique se o servidor (porta 8000) está rodando e se o CORS está configurado.",
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
          <div className="icon">
            <i className="fa-solid fa-robot" />
          </div>

          <div className="chat-header-title">
            <h2>Assistente PsicoConnect</h2>
            <p>Como posso te ajudar hoje?</p>
          </div>
        </header>

        <div className="chat-content-wrapper">
          <div
            className="chat-messages"
            id="chat-messages"
            ref={chatMessagesRef}
            onScroll={handleScroll}
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender} break-words`}>
                <div>
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>

                <span className="timestamp">{msg.timestamp}</span>
              </div>
            ))}

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

        <p className="side-panel-description">
          Use perguntas rápidas para testar o assistente durante a apresentação.
        </p>

        <div className="suggestion-list">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(undefined, suggestion)}
              disabled={isLoading}
              className="suggestion-button"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="side-alert warning">
          <strong>Importante:</strong> o assistente oferece apoio informativo e
          não substitui avaliação profissional, supervisão clínica ou tomada de
          decisão técnica.
        </div>

        <div className="side-alert info">
          <strong>Status:</strong> para responder, o backend precisa estar
          rodando em <code>localhost:8000</code>.
        </div>
      </aside>

      <style>{`
        .chat-page-shell {
          width: 100%;
          height: calc(100vh - 48px);
          min-height: 620px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 20px;
          background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 45%, #ffffff 100%);
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
          box-shadow: 0 14px 38px rgba(28, 75, 179, 0.10);
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 16px 12px;
          flex-shrink: 0;
          background-color: #ffffff;
        }

        .chat-header .icon {
          font-size: 41px;
          color: #ffffff;
          background-color: #528cff;
          border-radius: 50%;
          margin-right: 4px;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .chat-header-title {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .chat-header-title h2 {
          font-size: 28px;
          font-weight: 700;
          color: #001e5e;
          font-family: "Montserrat", sans-serif;
          line-height: 1.1;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
          margin: 0;
        }

        .chat-header-title p {
          font-size: 16px;
          color: #000000;
          font-family: "Inter", sans-serif;
          margin-top: 2px;
          white-space: normal;
          word-break: break-word;
        }

        .chat-content-wrapper {
          flex-grow: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background-color: #cde3fe;
          margin: 40px 32px 32px;
          border-radius: 30px;
          width: calc(100% - 64px);
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .chat-messages {
          flex-grow: 1;
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
          font-size: 19px;
          font-family: "Inter", sans-serif;
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
        }

        .message.bot .timestamp {
          align-self: flex-end;
        }

        .message.user {
          background-color: #528cff;
          color: #ffffff;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
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

        .chat-input-area {
          display: flex;
          background-color: transparent;
          flex-shrink: 0;
          padding: 24px 32px 32px 32px;
          align-items: flex-end;
        }

        .chat-input-area textarea {
          flex-grow: 1;
          border: none;
          background-color: #ffffff;
          padding: 16px 24px;
          border-radius: 30px;
          font-size: 15px;
          line-height: 1.4;
          outline: none;
          resize: none;
          font-family: "Inter", sans-serif;
          max-height: 100px;
          overflow-y: auto;
          margin-right: 16px;
          box-sizing: border-box;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        }

        .chat-input-area textarea::placeholder {
          color: #999;
          font-family: "Inter", sans-serif;
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

        .chat-messages::-webkit-scrollbar,
        .chat-input-area textarea::-webkit-scrollbar,
        .chat-side-panel::-webkit-scrollbar {
          width: 8px;
        }

        .chat-messages::-webkit-scrollbar-track,
        .chat-input-area textarea::-webkit-scrollbar-track,
        .chat-side-panel::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 4px;
        }

        .chat-messages::-webkit-scrollbar-thumb,
        .chat-input-area textarea::-webkit-scrollbar-thumb,
        .chat-side-panel::-webkit-scrollbar-thumb {
          background-color: rgba(0, 30, 94, 0.3);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover,
        .chat-input-area textarea::-webkit-scrollbar-thumb:hover,
        .chat-side-panel::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 30, 94, 0.5);
        }

        .chat-messages,
        .chat-input-area textarea,
        .chat-side-panel {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 30, 94, 0.5) transparent;
        }

        .chat-side-panel {
          height: 100%;
          min-height: 0;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #d6e4ff;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 14px 38px rgba(28, 75, 179, 0.10);
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

        @media (max-width: 1120px) {
          .chat-page-shell {
            grid-template-columns: 1fr;
          }

          .chat-side-panel {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .chat-page-shell {
            height: calc(100vh - 24px);
            min-height: 600px;
          }

          .chat-content-wrapper {
            margin: 24px 16px 16px;
            width: calc(100% - 32px);
          }

          .message {
            max-width: 84%;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
