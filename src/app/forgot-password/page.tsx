"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type Feedback = {
  type: "success" | "error";
  message: string;
};

type ForgotPasswordResponse = {
  error?: string;
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível solicitar a recuperação de senha.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFeedback({ type: "error", message: "Informe o e-mail cadastrado." });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = (await response.json()) as ForgotPasswordResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível solicitar a recuperação de senha.",
        );
      }

      setFeedback({
        type: "success",
        message:
          data.message ||
          "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
      });

      setEmail("");
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="public-page-wrapper login-page">
      <div className="login-container">
        <div className="login-panel-left">
          <div className="logo-container">
            <Image
              src="/logo.png"
              alt="Logo PsicoConnect"
              width={130}
              height={130}
              className="logo-img"
              priority
            />
            <h1>
              Psico
              <br />
              Connect
            </h1>
          </div>

          <p className="tagline">
            Recupere seu
            <br />
            acesso com
            <br />
            segurança.
          </p>
        </div>

        <div className="login-panel-right">
          <div className="public-top-actions">
            <Link href="/login" className="back-home-btn">
              <i className="fa-solid fa-arrow-left"></i>
              Voltar para o login
            </Link>
          </div>

          <h2>Recuperar senha</h2>

          <p style={{ color: "#374151", lineHeight: 1.6, marginBottom: "18px" }}>
            Informe o e-mail cadastrado. Enviaremos um link temporário para você
            criar uma nova senha.
          </p>

          {feedback && (
            <small
              style={{
                color: feedback.type === "success" ? "#047857" : "#D93025",
                marginBottom: "15px",
                textAlign: "center",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {feedback.message}
            </small>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Email</label>

            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <small id="email-error" className="error-message"></small>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>

          <div className="separator">ou</div>

          <Link href="/login" className="btn-secondary">
            Voltar para entrar
          </Link>
        </div>
      </div>
    </main>
  );
}