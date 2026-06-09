"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Feedback = {
  type: "success" | "error";
  message: string;
};

type ResetPasswordResponse = {
  error?: string;
  message?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível redefinir a senha.";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const router = useRouter();
  const params = useParams();

  const token = String(params?.token || "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!token || token === "undefined") {
      setFeedback({
        type: "error",
        message: "Token de redefinição inválido.",
      });
      return;
    }

    if (password.length < 6) {
      setFeedback({
        type: "error",
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "As senhas não coincidem.",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as ResetPasswordResponse;

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível redefinir a senha.");
      }

      setFeedback({
        type: "success",
        message: data.message || "Senha redefinida com sucesso.",
      });

      setTimeout(() => {
        router.push("/login?reset=success");
      }, 1000);
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
            Crie uma
            <br />
            nova senha
            <br />
            segura.
          </p>
        </div>

        <div className="login-panel-right">
          <div className="public-top-actions">
            <Link href="/login" className="back-home-btn">
              <i className="fa-solid fa-arrow-left"></i>
              Voltar para o login
            </Link>
          </div>

          <h2>Redefinir senha</h2>

          <p
            style={{
              color: "#374151",
              lineHeight: 1.6,
              marginBottom: "18px",
            }}
          >
            Digite sua nova senha abaixo. O link de recuperação é temporário e
            só pode ser usado uma vez.
          </p>

          {feedback && (
            <small
              style={{
                color: feedback.type === "success" ? "#047857" : "#D93025",
                marginBottom: "15px",
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              {feedback.message}
            </small>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="senha">Nova senha</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <small className="error-message"></small>

            <label htmlFor="confirmar-senha">Confirmar nova senha</label>
            <input
              type="password"
              id="confirmar-senha"
              name="confirmar-senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <small className="error-message"></small>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}