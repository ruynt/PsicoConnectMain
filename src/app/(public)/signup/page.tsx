"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  isPasswordLongEnough,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "@/lib/password-policy";

type CrpOption = {
  state: string;
  region: string;
  label: string;
};

type ApiResponse = {
  ok?: boolean;
  warning?: boolean;
  message?: string;
  error?: string;
  details?: Record<string, string[] | undefined>;
};

const CRP_OPTIONS: CrpOption[] = [
  { state: "AC", region: "24", label: "AC - Acre / CRP-24" },
  { state: "AL", region: "15", label: "AL - Alagoas / CRP-15" },
  { state: "AP", region: "10", label: "AP - Amapá / CRP-10" },
  { state: "AM", region: "20", label: "AM - Amazonas / CRP-20" },
  { state: "BA", region: "03", label: "BA - Bahia / CRP-03" },
  { state: "CE", region: "11", label: "CE - Ceará / CRP-11" },
  { state: "DF", region: "01", label: "DF - Distrito Federal / CRP-01" },
  { state: "ES", region: "16", label: "ES - Espírito Santo / CRP-16" },
  { state: "GO", region: "09", label: "GO - Goiás / CRP-09" },
  { state: "MA", region: "22", label: "MA - Maranhão / CRP-22" },
  { state: "MT", region: "18", label: "MT - Mato Grosso / CRP-18" },
  { state: "MS", region: "14", label: "MS - Mato Grosso do Sul / CRP-14" },
  { state: "MG", region: "04", label: "MG - Minas Gerais / CRP-04" },
  { state: "PA", region: "10", label: "PA - Pará / CRP-10" },
  { state: "PB", region: "13", label: "PB - Paraíba / CRP-13" },
  { state: "PR", region: "08", label: "PR - Paraná / CRP-08" },
  { state: "PE", region: "02", label: "PE - Pernambuco / CRP-02" },
  { state: "PI", region: "21", label: "PI - Piauí / CRP-21" },
  { state: "RJ", region: "05", label: "RJ - Rio de Janeiro / CRP-05" },
  { state: "RN", region: "17", label: "RN - Rio Grande do Norte / CRP-17" },
  { state: "RS", region: "07", label: "RS - Rio Grande do Sul / CRP-07" },
  { state: "RO", region: "24", label: "RO - Rondônia / CRP-24" },
  { state: "RR", region: "20", label: "RR - Roraima / CRP-20" },
  { state: "SC", region: "12", label: "SC - Santa Catarina / CRP-12" },
  { state: "SP", region: "06", label: "SP - São Paulo / CRP-06" },
  { state: "SE", region: "19", label: "SE - Sergipe / CRP-19" },
  { state: "TO", region: "23", label: "TO - Tocantins / CRP-23" },
];

export default function SignupPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [role, setRole] = useState("paciente");
  const [crpState, setCrpState] = useState("");
  const [crpNumber, setCrpNumber] = useState("");

  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedSensitiveAi, setAcceptedSensitiveAi] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [apiMessageType, setApiMessageType] = useState<"success" | "error">(
    "error",
  );

  const [nomeError, setNomeError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [senhaError, setSenhaError] = useState("");
  const [confirmarSenhaError, setConfirmarSenhaError] = useState("");
  const [crpStateError, setCrpStateError] = useState("");
  const [crpNumberError, setCrpNumberError] = useState("");
  const [acceptedLegalError, setAcceptedLegalError] = useState("");
  const [acceptedSensitiveAiError, setAcceptedSensitiveAiError] = useState("");

  const searchParams = useSearchParams();

  const selectedCrp = CRP_OPTIONS.find((option) => option.state === crpState);
  const crpRegion = selectedCrp?.region || "";
  const fullCrp = crpRegion && crpNumber ? `${crpRegion}/${crpNumber}` : "";

  useEffect(() => {
    const roleParam = searchParams.get("role");

    if (roleParam === "PATIENT") {
      setRole("paciente");
    }

    if (roleParam === "PSYCHOLOGIST") {
      setRole("psicologo");
    }
  }, [searchParams]);

  function resetErrors() {
    setApiMessage("");
    setApiMessageType("error");
    setNomeError("");
    setEmailError("");
    setSenhaError("");
    setConfirmarSenhaError("");
    setCrpStateError("");
    setCrpNumberError("");
    setAcceptedLegalError("");
    setAcceptedSensitiveAiError("");
  }

  function handleCrpNumberChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 8);
    setCrpNumber(value);

    if (crpNumberError) {
      setCrpNumberError("");
    }
  }

  function applyApiFieldErrors(details?: Record<string, string[] | undefined>) {
    if (!details) return;

    if (details.name?.[0]) setNomeError(details.name[0]);
    if (details.email?.[0]) setEmailError(details.email[0]);
    if (details.password?.[0]) setSenhaError(details.password[0]);
    if (details.confirmPassword?.[0]) {
      setConfirmarSenhaError(details.confirmPassword[0]);
    }

    if (details.role?.[0]) setApiMessage(details.role[0]);
    if (details.crp?.[0]) setCrpNumberError(details.crp[0]);
    if (details.crpState?.[0]) setCrpStateError(details.crpState[0]);
    if (details.crpNumber?.[0]) setCrpNumberError(details.crpNumber[0]);

    if (details.acceptedLegal?.[0]) {
      setAcceptedLegalError(details.acceptedLegal[0]);
    }

    if (details.acceptedSensitiveAi?.[0]) {
      setAcceptedSensitiveAiError(details.acceptedSensitiveAi[0]);
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    resetErrors();

    let isValid = true;

    if (nome.trim() === "") {
      setNomeError("Por favor, preencha seu nome.");
      isValid = false;
    }

    if (email.trim() === "") {
      setEmailError("Por favor, preencha o campo de email.");
      isValid = false;
    }

    if (!isPasswordLongEnough(senha)) {
      setSenhaError(PASSWORD_MIN_LENGTH_MESSAGE);
      isValid = false;
    }

    if (confirmarSenha.trim() === "") {
      setConfirmarSenhaError("Por favor, confirme sua senha.");
      isValid = false;
    } else if (senha !== confirmarSenha) {
      setConfirmarSenhaError("As senhas não coincidem.");
      isValid = false;
    }

    if (role === "psicologo") {
      if (!crpState || !selectedCrp) {
        setCrpStateError("Selecione o estado/regional do CRP.");
        isValid = false;
      }

      if (!/^\d{4,8}$/.test(crpNumber)) {
        setCrpNumberError(
          "Informe apenas o número do CRP, sem o prefixo regional. Ex: 123456.",
        );
        isValid = false;
      }
    }

    if (!acceptedLegal) {
      setAcceptedLegalError(
        "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
      );
      isValid = false;
    }

    if (!acceptedSensitiveAi) {
      setAcceptedSensitiveAiError(
        "Você precisa autorizar o tratamento de dados sensíveis e compreender os limites da Inteligência Artificial.",
      );
      isValid = false;
    }

    if (!isValid) {
      setIsLoading(false);
      setApiMessage("Verifique os campos destacados antes de continuar.");
      setApiMessageType("error");
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          email,
          password: senha,
          confirmPassword: confirmarSenha,
          role: role.toUpperCase(),
          crp: role === "psicologo" ? fullCrp : "",
          crpRegion: role === "psicologo" ? crpRegion : "",
          crpState: role === "psicologo" ? crpState : "",
          crpNumber: role === "psicologo" ? crpNumber : "",
          acceptedLegal,
          acceptedSensitiveAi,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setApiMessage(
          data.error ||
            "Não foi possível concluir o cadastro. Confira os dados e tente novamente.",
        );
        setApiMessageType("error");
        applyApiFieldErrors(data.details);
        return;
      }

      setApiMessage(
        data.message ||
          "Cadastro concluído! Verifique seu e-mail para ativar sua conta.",
      );
      setApiMessageType("success");
    } catch {
      setApiMessage(
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      );
      setApiMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="public-page-wrapper signup-page">
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
            Um espaço
            <br />
            seguro para sua
            <br />
            saúde mental.
          </p>
        </div>

        <div className="login-panel-right signup-panel-right">
          <div className="signup-fixed-top">
            <div className="public-top-actions">
              <Link href="/" className="back-home-btn">
                <i className="fa-solid fa-arrow-left"></i>
                Voltar para a home
              </Link>
            </div>

            <h2>Criar Conta</h2>

            {apiMessage && (
              <small
                style={{
                  display: "block",
                  color: apiMessageType === "success" ? "#15803d" : "#D93025",
                  backgroundColor:
                    apiMessageType === "success" ? "#ecfdf3" : "#fef2f2",
                  border:
                    apiMessageType === "success"
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  textAlign: "center",
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
                {apiMessage}
              </small>
            )}
          </div>

          <form
            id="cadastro-form"
            className="signup-form-layout"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="signup-form-scroll">
              <label htmlFor="nome">Nome</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={nome}
                onChange={(event) => {
                  setNome(event.target.value);
                  if (nomeError) setNomeError("");
                }}
                className={nomeError ? "error" : ""}
                required
              />
              <small id="nome-error" className="error-message">
                {nomeError}
              </small>

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError("");
                }}
                className={emailError ? "error" : ""}
                required
              />
              <small id="email-error" className="error-message">
                {emailError}
              </small>

              <label htmlFor="senha">Senha (mín. {PASSWORD_MIN_LENGTH} caracteres)</label>
              <input
                type="password"
                id="senha"
                name="senha"
                value={senha}
                onChange={(event) => {
                  setSenha(event.target.value);
                  if (senhaError) setSenhaError("");
                }}
                className={senhaError ? "error" : ""}
                required
              />
              <small id="senha-error" className="error-message">
                {senhaError}
              </small>

              <label htmlFor="confirmar-senha">Confirmar Senha</label>
              <input
                type="password"
                id="confirmar-senha"
                name="confirmar-senha"
                value={confirmarSenha}
                onChange={(event) => {
                  setConfirmarSenha(event.target.value);
                  if (confirmarSenhaError) setConfirmarSenhaError("");
                }}
                className={confirmarSenhaError ? "error" : ""}
                required
              />
              <small id="confirmar-senha-error" className="error-message">
                {confirmarSenhaError}
              </small>

              <label>Você é:</label>
              <div className="role-selector">
                <input
                  type="radio"
                  id="role-paciente"
                  name="role"
                  value="paciente"
                  checked={role === "paciente"}
                  onChange={(event) => setRole(event.target.value)}
                />
                <label htmlFor="role-paciente" className="radio-label">
                  Paciente
                </label>

                <input
                  type="radio"
                  id="role-psicologo"
                  name="role"
                  value="psicologo"
                  checked={role === "psicologo"}
                  onChange={(event) => setRole(event.target.value)}
                />
                <label htmlFor="role-psicologo" className="radio-label">
                  Psicólogo
                </label>
              </div>

              <div
                id="crp-field"
                className={
                  role === "psicologo" ? "hidden-field visible" : "hidden-field"
                }
              >
                <label htmlFor="crpState">Estado/Regional do CRP</label>
                <select
                  id="crpState"
                  name="crpState"
                  value={crpState}
                  onChange={(event) => {
                    setCrpState(event.target.value);
                    if (crpStateError) setCrpStateError("");
                  }}
                  className={crpStateError ? "error" : ""}
                  style={{
                    width: "100%",
                    padding: "12px 15px",
                    border: crpStateError
                      ? "1px solid #d93025"
                      : "1px solid #dcdcdc",
                    borderRadius: "8px",
                    marginBottom: "3px",
                    fontSize: "15px",
                    outlineColor: "#528cff",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="">Selecione o estado/regional</option>
                  {CRP_OPTIONS.map((option) => (
                    <option key={option.state} value={option.state}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small id="crp-state-error" className="error-message">
                  {crpStateError}
                </small>

                <label htmlFor="crpNumber">Número do CRP</label>
                <input
                  type="text"
                  id="crpNumber"
                  name="crpNumber"
                  value={crpNumber}
                  onChange={handleCrpNumberChange}
                  className={crpNumberError ? "error" : ""}
                  maxLength={8}
                  placeholder="Ex: 123456"
                />
                <small id="crp-number-error" className="error-message">
                  {crpNumberError}
                </small>

                {fullCrp && (
                  <small
                    style={{
                      display: "block",
                      color: "#001e5e",
                      fontWeight: 700,
                      marginTop: "2px",
                      marginBottom: "8px",
                    }}
                  >
                    CRP completo: {fullCrp}
                  </small>
                )}
              </div>

              <div className="signup-legal-box">
                <label htmlFor="acceptedLegal" className="signup-check-label">
                  <input
                    type="checkbox"
                    id="acceptedLegal"
                    checked={acceptedLegal}
                    onChange={(event) => {
                      setAcceptedLegal(event.target.checked);
                      if (acceptedLegalError) setAcceptedLegalError("");
                    }}
                  />

                  <span>
                    Li e aceito os{" "}
                    <Link
                      href="/termos-de-uso"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/politica-de-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Política de Privacidade
                    </Link>{" "}
                    do PsicoConnect.
                  </span>
                </label>

                {acceptedLegalError && (
                  <small className="signup-check-error">
                    {acceptedLegalError}
                  </small>
                )}

                <label
                  htmlFor="acceptedSensitiveAi"
                  className="signup-check-label"
                >
                  <input
                    type="checkbox"
                    id="acceptedSensitiveAi"
                    checked={acceptedSensitiveAi}
                    onChange={(event) => {
                      setAcceptedSensitiveAi(event.target.checked);
                      if (acceptedSensitiveAiError) {
                        setAcceptedSensitiveAiError("");
                      }
                    }}
                  />

                  <span>
                    Autorizo o tratamento de{" "}
                    <Link
                      href="/legal#dados-sensiveis"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      dados pessoais sensíveis
                    </Link>{" "}
                    necessários para uso da plataforma e compreendo os limites da{" "}
                    <Link
                      href="/legal#ia"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Inteligência Artificial
                    </Link>{" "}
                    no PsicoConnect.
                  </span>
                </label>

                {acceptedSensitiveAiError && (
                  <small className="signup-check-error">
                    {acceptedSensitiveAiError}
                  </small>
                )}
              </div>
            </div>

            <div className="signup-form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Aguarde..." : "Cadastrar"}
              </button>

              <div className="separator">ou</div>

              <Link href="/login" className="btn-secondary">
                Já tenho uma conta
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}