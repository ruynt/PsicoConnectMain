import { Resend } from "resend";
import prisma from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const emailFrom =
  process.env.EMAIL_FROM || "PsicoConnect <nao-responda@psicoconnect.site>";

function getBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  return url.replace(/\/+$/, "");
}

function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function generateVerificationToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { email },
  });

  const verificationToken = await prisma.verificationToken.create({
    data: {
      email,
      token,
      expiresAt: expires,
    },
  });

  return verificationToken;
}

export async function sendVerificationEmail(email: string, token: string) {
  const confirmLink = `${getBaseUrl()}/api/confirm-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2>Confirme o seu e-mail</h2>

      <p>Obrigado por se cadastrar no PsicoConnect.</p>

      <p>Clique no botão abaixo para confirmar o seu e-mail e concluir seu cadastro:</p>

      <a
        href="${confirmLink}"
        style="
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-weight: bold;
        "
      >
        Confirmar e-mail
      </a>
      
      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: "Confirme o seu e-mail - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "confirm-email" }],
    });

    console.log("Email de verificação enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de verificação:", error);
    throw error;
  }
}

type AppointmentEmailPayload = {
  patientEmail: string;
  patientName: string;
  psychologistName?: string | null;
  title: string;
  startDateTime: Date | string;
  endDateTime?: Date | string | null;
  location?: string | null;
  description?: string | null;
  googleEventLink?: string | null;
};

type AppointmentCancelledEmailPayload = AppointmentEmailPayload & {
  cancellationReason?: string | null;
};

export async function sendAppointmentCreatedEmail({
  patientEmail,
  patientName,
  psychologistName,
  title,
  startDateTime,
  endDateTime,
  location,
  description,
  googleEventLink,
}: AppointmentEmailPayload) {
  const safePatientName = escapeHtml(patientName);
  const safePsychologistName = escapeHtml(
    psychologistName || "Profissional responsável",
  );
  const safeTitle = escapeHtml(title || "Consulta");
  const safeLocation = escapeHtml(location || "Não informado");
  const safeDescription = escapeHtml(description || "");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Consulta agendada</h2>

      <p>Olá, ${safePatientName}.</p>

      <p>
        Uma consulta foi agendada para você no PsicoConnect pelo profissional responsável.
      </p>

      <p>
        Confira abaixo os detalhes do atendimento:
      </p>

      <div style="
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin: 18px 0;
      ">
        <p><strong>Consulta:</strong> ${safeTitle}</p>
        <p><strong>Profissional:</strong> ${safePsychologistName}</p>
        <p><strong>Início:</strong> ${formatDateTime(startDateTime)}</p>
        <p><strong>Fim:</strong> ${formatDateTime(endDateTime)}</p>
        <p><strong>Local:</strong> ${safeLocation}</p>
        ${
          safeDescription
            ? `<p><strong>Observações:</strong> ${safeDescription}</p>`
            : ""
        }
      </div>

      ${
        googleEventLink
          ? `
            <a
              href="${googleEventLink}"
              style="
                display: inline-block;
                background: #2563eb;
                color: white;
                text-decoration: none;
                padding: 12px 18px;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              Abrir no Google Calendar
            </a>
          `
          : ""
      }

      <p style="margin-top: 20px;">
        Caso precise remarcar ou tenha alguma dúvida, entre em contato diretamente com o profissional responsável.
      </p>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: patientEmail,
      subject: "Consulta agendada - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "appointment-created" }],
    });

    console.log("Email de consulta agendada enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de consulta agendada:", error);
    throw error;
  }
}

export async function sendAppointmentCancelledEmail({
  patientEmail,
  patientName,
  psychologistName,
  title,
  startDateTime,
  endDateTime,
  location,
  cancellationReason,
}: AppointmentCancelledEmailPayload) {
  const safePatientName = escapeHtml(patientName);
  const safePsychologistName = escapeHtml(
    psychologistName || "Profissional responsável",
  );
  const safeTitle = escapeHtml(title || "Consulta");
  const safeLocation = escapeHtml(location || "Não informado");
  const safeCancellationReason = escapeHtml(cancellationReason || "");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Consulta cancelada</h2>

      <p>Olá, ${safePatientName}.</p>

      <p>
        Uma consulta que estava agendada para você foi cancelada pelo profissional responsável.
      </p>

      <p>
        Confira abaixo os detalhes do atendimento cancelado:
      </p>

      <div style="
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 16px;
        margin: 18px 0;
      ">
        <p><strong>Consulta:</strong> ${safeTitle}</p>
        <p><strong>Profissional:</strong> ${safePsychologistName}</p>
        <p><strong>Início:</strong> ${formatDateTime(startDateTime)}</p>
        <p><strong>Fim:</strong> ${formatDateTime(endDateTime)}</p>
        <p><strong>Local:</strong> ${safeLocation}</p>
        ${
          safeCancellationReason
            ? `<p><strong>Motivo informado:</strong> ${safeCancellationReason}</p>`
            : ""
        }
      </div>

      <p>
        Caso precise de mais informações ou deseje remarcar, entre em contato diretamente com o profissional responsável.
      </p>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: patientEmail,
      subject: "Consulta cancelada - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "appointment-cancelled" }],
    });

    console.log("Email de consulta cancelada enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de consulta cancelada:", error);
    throw error;
  }
}

export async function sendAppointmentReminderEmail({
  patientEmail,
  patientName,
  psychologistName,
  title,
  startDateTime,
  endDateTime,
  location,
  description,
  googleEventLink,
}: AppointmentEmailPayload) {
  const safePatientName = escapeHtml(patientName);
  const safePsychologistName = escapeHtml(
    psychologistName || "Profissional responsável",
  );
  const safeTitle = escapeHtml(title || "Consulta");
  const safeLocation = escapeHtml(location || "Não informado");
  const safeDescription = escapeHtml(description || "");
  const patientAppointmentsLink = `${getBaseUrl()}/minhas-consultas`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Lembrete de consulta</h2>

      <p>Olá, ${safePatientName}.</p>

      <p>
        Este é um lembrete da sua consulta agendada no PsicoConnect.
      </p>

      <div style="
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        padding: 16px;
        margin: 18px 0;
      ">
        <p><strong>Consulta:</strong> ${safeTitle}</p>
        <p><strong>Profissional:</strong> ${safePsychologistName}</p>
        <p><strong>Início:</strong> ${formatDateTime(startDateTime)}</p>
        <p><strong>Fim:</strong> ${formatDateTime(endDateTime)}</p>
        <p><strong>Local:</strong> ${safeLocation}</p>
        ${
          safeDescription
            ? `<p><strong>Observações:</strong> ${safeDescription}</p>`
            : ""
        }
      </div>

      <p>
        Acesse o PsicoConnect para confirmar presença, consultar os detalhes da sessão
        ou solicitar cancelamento, se necessário.
      </p>

      <a
        href="${patientAppointmentsLink}"
        style="
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-weight: bold;
          margin-right: 8px;
        "
      >
        Abrir minhas consultas
      </a>

      ${
        googleEventLink
          ? `
            <a
              href="${googleEventLink}"
              style="
                display: inline-block;
                background: #eff6ff;
                color: #1d4ed8;
                text-decoration: none;
                padding: 12px 18px;
                border-radius: 8px;
                font-weight: bold;
                border: 1px solid #bfdbfe;
              "
            >
              Abrir no Google Calendar
            </a>
          `
          : ""
      }

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: patientEmail,
      subject: "Lembrete de consulta - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "appointment-reminder" }],
    });

    console.log("Email de lembrete de consulta enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de lembrete de consulta:", error);
    throw error;
  }
}

type CrpVerificationEmailPayload = {
  to: string;
  name: string | null;
  crp?: string | null;
  crpState?: string | null;
  crpRegion?: string | null;
  crpNumber?: string | null;
};

type CrpRejectedEmailPayload = CrpVerificationEmailPayload & {
  reason: string;
};

function formatCrpDetails({
  crp,
  crpState,
  crpRegion,
  crpNumber,
}: Pick<
  CrpVerificationEmailPayload,
  "crp" | "crpState" | "crpRegion" | "crpNumber"
>) {
  const safeCrp = escapeHtml(crp || "Não informado");
  const safeCrpState = escapeHtml(crpState || "Não informado");
  const safeCrpRegion = escapeHtml(
    crpRegion ? `CRP-${crpRegion}` : "Não informado",
  );
  const safeCrpNumber = escapeHtml(crpNumber || "Não informado");

  return `
    <div style="
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      margin: 18px 0;
    ">
      <p><strong>CRP completo:</strong> ${safeCrp}</p>
      <p><strong>Estado:</strong> ${safeCrpState}</p>
      <p><strong>Regional:</strong> ${safeCrpRegion}</p>
      <p><strong>Número de registro:</strong> ${safeCrpNumber}</p>
    </div>
  `;
}

export async function sendCrpApprovedEmail({
  to,
  name,
  crp,
  crpState,
  crpRegion,
  crpNumber,
}: CrpVerificationEmailPayload) {
  const safeName = escapeHtml(name || "profissional");
  const loginLink = `${getBaseUrl()}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Cadastro profissional aprovado</h2>

      <p>Olá, ${safeName}.</p>

      <p>
        Seu cadastro profissional no PsicoConnect foi aprovado após a verificação do CRP.
      </p>

      ${formatCrpDetails({ crp, crpState, crpRegion, crpNumber })}

      <p>
        A partir de agora, você já pode acessar sua área profissional, gerenciar agenda,
        pacientes e demais recursos disponíveis na plataforma.
      </p>

      <a
        href="${loginLink}"
        style="
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-weight: bold;
        "
      >
        Acessar PsicoConnect
      </a>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject: "Cadastro profissional aprovado - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "crp-approved" }],
    });

    console.log("Email de CRP aprovado enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de CRP aprovado:", error);
    throw error;
  }
}

export async function sendCrpRejectedEmail({
  to,
  name,
  crp,
  crpState,
  crpRegion,
  crpNumber,
  reason,
}: CrpRejectedEmailPayload) {
  const safeName = escapeHtml(name || "profissional");
  const safeReason = escapeHtml(
    reason || "Não foi informado um motivo específico.",
  );
  const loginLink = `${getBaseUrl()}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Cadastro profissional não aprovado</h2>

      <p>Olá, ${safeName}.</p>

      <p>
        Seu cadastro profissional no PsicoConnect não foi aprovado no momento após a análise do CRP.
      </p>

      ${formatCrpDetails({ crp, crpState, crpRegion, crpNumber })}

      <div style="
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 16px;
        margin: 18px 0;
      ">
        <p style="margin-top: 0;"><strong>Motivo informado pela administração:</strong></p>
        <p style="margin-bottom: 0;">${safeReason}</p>
      </div>

      <p>
        Revise os dados cadastrados e, se necessário, entre em contato com a equipe responsável
        para solicitar uma nova análise.
      </p>

      <a
        href="${loginLink}"
        style="
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-weight: bold;
        "
      >
        Acessar PsicoConnect
      </a>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject: "Cadastro profissional não aprovado - PsicoConnect",
      html,
      headers: {
        "X-Auto-Response-Suppress": "All",
      },
      tags: [{ name: "category", value: "crp-rejected" }],
    });

    console.log("Email de CRP rejeitado enviado:", result);
    return result;
  } catch (error) {
    console.error("Erro ao enviar email de CRP rejeitado:", error);
    throw error;
  }
}