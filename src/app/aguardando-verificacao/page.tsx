"use client";

import { signOut } from "next-auth/react";

export default function AguardandoVerificacaoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef5ff 0%, #ffffff 45%, #f8fbff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "760px",
          backgroundColor: "#ffffff",
          borderRadius: "28px",
          padding: "42px",
          boxShadow: "0 24px 70px rgba(0, 30, 94, 0.12)",
          border: "1px solid #dbe7ff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            margin: "0 auto 22px",
            boxShadow: "0 14px 28px rgba(37, 99, 235, 0.24)",
          }}
        >
          <i className="fa-solid fa-user-shield"></i>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: "999px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 900,
            marginBottom: "18px",
          }}
        >
          <i className="fa-solid fa-clock"></i>
          Cadastro profissional em análise
        </span>

        <h1
          style={{
            color: "#001e5e",
            fontSize: "38px",
            fontWeight: 900,
            lineHeight: 1.08,
            marginBottom: "14px",
          }}
        >
          Seu CRP está aguardando verificação
        </h1>

        <p
          style={{
            color: "#5272a6",
            fontSize: "17px",
            lineHeight: 1.7,
            maxWidth: "620px",
            margin: "0 auto 26px",
          }}
        >
          Recebemos seu cadastro como psicólogo(a). Para proteger pacientes e
          garantir o uso responsável da plataforma, o acesso à área profissional
          será liberado após a verificação do CRP informado.
        </p>

        <div
          style={{
            backgroundColor: "#f8fbff",
            border: "1px solid #dbe7ff",
            borderRadius: "20px",
            padding: "20px",
            textAlign: "left",
            marginBottom: "26px",
          }}
        >
          <h2
            style={{
              color: "#001e5e",
              fontSize: "18px",
              fontWeight: 900,
              marginBottom: "12px",
            }}
          >
            O que acontece agora?
          </h2>

          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              color: "#5272a6",
              fontSize: "15px",
              lineHeight: 1.5,
            }}
          >
            <li>
              <strong style={{ color: "#001e5e" }}>1.</strong> Seus dados foram
              recebidos pelo PsicoConnect.
            </li>
            <li>
              <strong style={{ color: "#001e5e" }}>2.</strong> O CRP informado
              será conferido pela equipe responsável.
            </li>
            <li>
              <strong style={{ color: "#001e5e" }}>3.</strong> Após a aprovação,
              o acesso ao dashboard, agenda e pacientes será liberado.
            </li>
          </ul>
        </div>

        <p
          style={{
            color: "#64748b",
            fontSize: "14px",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Caso haja alguma inconsistência no cadastro, entre em contato com a
          equipe responsável pelo projeto para revisão das informações.
        </p>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "#ffffff",
            border: "none",
            borderRadius: "14px",
            padding: "13px 22px",
            fontWeight: 900,
            cursor: "pointer",
            fontSize: "15px",
            boxShadow: "0 12px 26px rgba(37, 99, 235, 0.22)",
          }}
        >
          Sair e voltar ao login
        </button>
      </section>
    </main>
  );
}
