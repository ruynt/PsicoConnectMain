"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type CrpOption = {
  state: string;
  region: string;
  label: string;
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

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [nomeError, setNomeError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [senhaError, setSenhaError] = useState("");
  const [confirmarSenhaError, setConfirmarSenhaError] = useState("");
  const [crpStateError, setCrpStateError] = useState("");
  const [crpNumberError, setCrpNumberError] = useState("");

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

  function handleCrpNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setCrpNumber(value);
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setApiError("");
    setNomeError("");
    setEmailError("");
    setSenhaError("");
    setConfirmarSenhaError("");
    setCrpStateError("");
    setCrpNumberError("");

    let isValid = true;

    if (nome.trim() === "") {
      setNomeError("Por favor, preencha seu nome.");
      isValid = false;
    }

    if (email.trim() === "") {
      setEmailError("Por favor, preencha o campo de email.");
      isValid = false;
    }

    if (senha.length < 8) {
      setSenhaError("A senha deve ter no mínimo 8 caracteres.");
      isValid = false;
    }

    if (senha !== confirmarSenha) {
      setConfirmarSenhaError("As senhas não coincidem.");
      isValid = false;
    }

    if (role === "psicologo") {
      if (!crpState || !selectedCrp) {
        setCrpStateError("Selecione o estado/regional do CRP.");
        isValid = false;
      }

      if (!/^\d{4,8}$/.test(crpNumber)) {
        setCrpNumberError("Informe apenas o número do CRP, sem o prefixo regional. Ex: 123456.");
        isValid = false;
      }
    }

    if (!isValid) {
      setIsLoading(false);
      setApiError("Dados inválidos. Verifique os campos.");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "Dados inválidos. Verifique os campos.");

        if (data.details) {
          data.details.name?.forEach((err: string) => setNomeError(err));
          data.details.email?.forEach((err: string) => setEmailError(err));
          data.details.password?.forEach((err: string) => setSenhaError(err));
          data.details.confirmPassword?.forEach((err: string) =>
            setConfirmarSenhaError(err),
          );
          data.details.role?.forEach((err: string) => setApiError(err));
          data.details.crp?.forEach((err: string) => setCrpNumberError(err));
          data.details.crpState?.forEach((err: string) => setCrpStateError(err));
          data.details.crpNumber?.forEach((err: string) => setCrpNumberError(err));
        }
      } else {
        setApiError(data.message || "Registro concluído! Verifique o seu email.");
      }
    } catch {
      setApiError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const isSuccessMessage =
    apiError.startsWith("Registro") || apiError.startsWith("Email");

  return (
    <main className="public-page-wrapper signup-page">
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

          <h2>Criar Conta</h2>
          {apiError && (
            <small
              style={{
                color: isSuccessMessage ? "green" : "#D93025",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              {apiError}
            </small>
          )}

          <form id="cadastro-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="nome">Nome</label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? "error" : ""}
              required
            />
            <small id="email-error" className="error-message">
              {emailError}
            </small>

            <label htmlFor="senha">Senha (mín. 8 caracteres)</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
              onChange={(e) => setConfirmarSenha(e.target.value)}
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
                onChange={(e) => setRole(e.target.value)}
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
                onChange={(e) => setRole(e.target.value)}
              />
              <label htmlFor="role-psicologo" className="radio-label">
                Psicólogo
              </label>
            </div>

            <div
              id="crp-field"
              className={role === "psicologo" ? "hidden-field visible" : "hidden-field"}
            >
              <label htmlFor="crpState">Estado/Regional do CRP</label>
              <select
                id="crpState"
                name="crpState"
                value={crpState}
                onChange={(e) => setCrpState(e.target.value)}
                className={crpStateError ? "error" : ""}
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: crpStateError ? "1px solid #d93025" : "1px solid #dcdcdc",
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

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Aguarde..." : "Cadastrar"}
            </button>
          </form>

          <div className="separator">ou</div>

          <Link href="/login" className="btn-secondary">
            Já tenho uma conta
          </Link>
        </div>
      </div>
    </main>
  );
}
