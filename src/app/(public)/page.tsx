"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing-home">
      <section className="landing-hero-area">
        <header className="landing-topbar">
          <div className="landing-brand">
            <Image
              src="/logo.png"
              alt="Logo PsicoConnect"
              width={64}
              height={64}
              className="landing-brand-logo"
              priority
            />
            <div className="landing-brand-text">
              <span>Psico</span>
              <span>Connect</span>
            </div>
          </div>

          <nav className="landing-menu">
            <a href="#inicio">Início</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#sobre">Sobre</a>
          </nav>

          <Link href="/login" className="landing-login-btn">
            Entrar
          </Link>
        </header>

        <div id="inicio" className="landing-hero-content">
          <h1>
            Conecte-se
            <br />
            com a sua saúde
          </h1>

          <div className="landing-hero-buttons">
            <Link href="/signup?role=PATIENT" className="landing-main-btn">
              Sou Paciente
            </Link>

            <Link href="/signup?role=PSYCHOLOGIST" className="landing-main-btn">
              Sou Psicólogo
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-intro-section">
        <h2>Descubra como funciona!</h2>
        <p>
          O PsicoConnect organiza o acompanhamento psicológico em um ambiente
          digital com consultas, tarefas, materiais, mensagens e apoio por IA.
        </p>
      </section>

      <section id="como-funciona" className="landing-cards-section">
        <div className="landing-card-block">
          <div
            className="landing-icon-circle"
            style={{ backgroundColor: "#ffffff" }}
          >
            <i
              className="fa-regular fa-calendar-check"
              style={{ color: "#528cff" }}
            ></i>
          </div>
          <h3>Para Pacientes</h3>
          <p>
            Acompanhe seu vínculo com o psicólogo, veja suas consultas futuras e
            acesse tarefas, materiais e mensagens enviados pelo profissional.
          </p>
          <ul>
            <li>Visualize psicólogos vinculados</li>
            <li>Acompanhe consultas agendadas</li>
            <li>Acesse tarefas e materiais recebidos</li>
          </ul>
        </div>

        <div className="landing-card-block">
          <div
            className="landing-icon-circle"
            style={{ backgroundColor: "#ffffff" }}
          >
            <Image
              src="/psicobot_icon_white.png"
              alt=""
              aria-hidden="true"
              width={42}
              height={42}
              style={{
                objectFit: "contain",
                filter:
                  "brightness(0) saturate(100%) invert(53%) sepia(94%) saturate(2690%) hue-rotate(202deg) brightness(101%) contrast(101%)",
              }}
            />
          </div>
          <h3>PsicoBot</h3>
          <p>
            Use o assistente para tirar dúvidas sobre o sistema, consultar
            informações permitidas e receber apoio na organização do
            acompanhamento.
          </p>
          <ul>
            <li>Respostas diferentes por tipo de usuário</li>
            <li>Consulta segura a dados autorizados</li>
            <li>IA como apoio, não como substituição clínica</li>
          </ul>
        </div>

        <div className="landing-card-block">
          <div
            className="landing-icon-circle"
            style={{ backgroundColor: "#ffffff" }}
          >
            <i
              className="fa-regular fa-clipboard"
              style={{ color: "#528cff" }}
            ></i>
          </div>
          <h3>Para Psicólogos</h3>
          <p>
            Gerencie pacientes vinculados, consultas, tarefas, materiais,
            mensagens, anotações internas e resumos privados para prontuário.
          </p>
          <ul>
            <li>Organize pacientes e agenda</li>
            <li>Registre anotações internas</li>
            <li>Revise e salve resumos privados</li>
          </ul>
        </div>
      </section>

      <section id="sobre" className="landing-about-section">
        <div className="landing-about-content">
          <div className="landing-about-text">
            <span className="landing-section-tag">Sobre o projeto</span>
            <h2>PsicoConnect</h2>
            <p>
              O PsicoConnect é uma aplicação web acadêmica desenvolvida para
              apoiar a prática psicológica por meio da organização de
              informações, comunicação entre psicólogo e paciente e recursos de
              inteligência artificial integrados ao sistema.
            </p>
            <p>
              A plataforma não substitui o trabalho do psicólogo. O PsicoBot e
              os resumos gerados por IA funcionam apenas como apoio à
              organização das informações, sempre exigindo revisão profissional
              antes de qualquer uso clínico ou registro formal.
            </p>
            <p>
              O acesso aos dados respeita o papel do usuário: pacientes acessam
              apenas suas próprias informações, psicólogos acessam somente
              pacientes vinculados e pessoas autorizadas pela operação da
              plataforma atuam apenas quando necessário para fins técnicos,
              operacionais, de segurança ou legais.
            </p>
          </div>

          <div className="landing-about-highlights">
            <div className="landing-highlight-box">
              <i className="fa-solid fa-user-doctor"></i>
              <span>Vínculo seguro entre pacientes e psicólogos</span>
            </div>

            <div className="landing-highlight-box">
              <i className="fa-solid fa-calendar-days"></i>
              <span>Consultas, tarefas e materiais em um só lugar</span>
            </div>

            <div className="landing-highlight-box">
              <i className="fa-solid fa-lock"></i>
              <span>IA com controle de acesso e revisão profissional</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer-bar">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <strong>PsicoConnect</strong>
            <span>Projeto acadêmico de tecnologia e saúde mental.</span>
          </div>

          <div className="landing-footer-links">
            <a href="#inicio">Início</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#sobre">Sobre</a>
            <Link href="/legal">Termos e Privacidade</Link>
          </div>
        </div>

        <div className="landing-footer-copy">
          © 2026 PsicoConnect - Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}