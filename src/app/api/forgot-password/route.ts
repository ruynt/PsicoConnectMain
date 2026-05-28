import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import prisma from "../../../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl(req: NextRequest) {
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;

  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";

  return `${protocol}://${host}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendPasswordResetEmail({
  email,
  name,
  resetLink,
}: {
  email: string;
  name: string;
  resetLink: string;
}) {
  const emailFrom = process.env.RESEND_FROM || "PsicoConnect <onboarding@resend.dev>";
  const safeName = escapeHtml(name || "usuário");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; line-height: 1.5;">
      <h2 style="margin-bottom: 12px; color: #001e5e;">Redefinição de senha</h2>

      <p>Olá, ${safeName}.</p>

      <p>Recebemos uma solicitação para redefinir sua senha no PsicoConnect.</p>

      <p>Clique no botão abaixo para criar uma nova senha:</p>

      <a
        href="${resetLink}"
        style="
          display: inline-block;
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-weight: bold;
          margin: 12px 0;
        "
      >
        Redefinir senha
      </a>

      <p>Este link expira em 1 hora e só pode ser usado uma vez.</p>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Se você não solicitou esta alteração, ignore este e-mail.
      </p>

      <p style="margin-top: 20px; color: #4b5563; font-size: 14px;">
        Esta é uma mensagem automática do PsicoConnect. Não responda este e-mail.
      </p>
    </div>
  `;

  return resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Redefinição de senha - PsicoConnect",
    html,
    headers: {
      "X-Auto-Response-Suppress": "All",
    },
    tags: [{ name: "category", value: "password-reset" }],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail cadastrado." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Resposta genérica para não revelar se o e-mail existe ou não.
    const genericResponse = NextResponse.json({
      message:
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.",
    });

    if (!user) {
      return genericResponse;
    }

    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetLink = `${getBaseUrl(req)}/reset-password/${token}`;

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetLink,
    });

    return genericResponse;
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);

    return NextResponse.json(
      { error: "Não foi possível solicitar a recuperação de senha." },
      { status: 500 },
    );
  }
}
