"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function getLoginErrorMessage(error: string | null | undefined) {
  if (!error) return "";

  if (
    error === "CredentialsSignin" ||
    error === "INVALID_CREDENTIALS" ||
    error.includes("INVALID_CREDENTIALS") ||
    error.includes("Email ou senha") ||
    error.includes("Nenhum utilizador") ||
    error.includes("senha")
  ) {
    return "Email ou senha inválidos.";
  }

  if (
    error === "EMAIL_NOT_VERIFIED" ||
    error.includes("EMAIL_NOT_VERIFIED") ||
    error.includes("verifique")
  ) {
    return "Verifique seu e-mail antes de acessar a plataforma.";
  }

  if (
    error === "ACCOUNT_INCOMPLETE" ||
    error.includes("ACCOUNT_INCOMPLETE")
  ) {
    return "Conta incompleta. Entre em contato com o suporte.";
  }

  return "Não foi possível concluir o login. Tente novamente.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const reset = searchParams.get("reset");

    if (reset === "success") {
      setApiError("Senha redefinida com sucesso. Faça login com a nova senha.");
      return;
    }

    if (error) {
      setApiError(getLoginErrorMessage(error));
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setApiError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setApiError(getLoginErrorMessage(result.error));
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      setApiError(
        "Não foi possível conectar ao servidor no momento. Tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isSuccessMessage = apiError.includes("sucesso");
  const hasError = Boolean(apiError) && !isSuccessMessage;

  return (
    <main className="public-page-wrapper login-page">
      <div className="login-container">
        <div className="login-panel-left">
          <div className="logo-container">
            <img src="/logo.png" alt="Logo PsicoConnect" className="logo-img" />
            <h1>
              Psico
              <br />
              Connect
            </h1>
          </div>

          <p className="tagline">
            Um espaço
            <br />
            seguro para sua
            <br />
            saúde mental.
          </p>
        </div>

        <div className="login-panel-right">
          <div className="public-top-actions">
            <Link href="/" className="back-home-btn">
              <i className="fa-solid fa-arrow-left"></i>
              Voltar para a home
            </Link>
          </div>

          <h2>Entrar</h2>

          {apiError && (
            <small
              style={{
                color: isSuccessMessage ? "#047857" : "#D93025",
                marginBottom: "15px",
                textAlign: "center",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {apiError}
            </small>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={hasError ? "error" : ""}
              required
            />
            <small id="email-error" className="error-message"></small>

            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={hasError ? "error" : ""}
              required
            />
            <small id="senha-error" className="error-message"></small>

            <Link href="/forgot-password" className="forgot-password">
              Esqueceu sua senha?
            </Link>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Aguarde..." : "Entrar"}
            </button>
          </form>

          <div className="separator">ou</div>

          <Link href="/signup" className="btn-secondary">
            Cadastrar-se
          </Link>
        </div>
      </div>
    </main>
  );
}