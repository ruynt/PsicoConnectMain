import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

type AdminSession = {
  user?: {
    id?: string;
    role?: string;
  };
};

async function requireAdmin() {
  const session = (await getServerSession(authConfig)) as AdminSession | null;

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return {
    userId: session.user.id || null,
  };
}

async function getEmailFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailFromQuery = searchParams.get("email")?.trim().toLowerCase();

  if (emailFromQuery) {
    return emailFromQuery;
  }

  const body = await request.json().catch(() => ({}));
  const emailFromBody = String(body?.email || "").trim().toLowerCase();

  return emailFromBody || null;
}

async function deleteUserByEmail(email: string, currentAdminId: string | null) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      psychologist: {
        select: { id: true },
      },
      patient: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      ),
    };
  }

  if (user.id === currentAdminId) {
    return {
      error: NextResponse.json(
        { error: "Você não pode excluir a própria conta administrativa." },
        { status: 400 },
      ),
    };
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

    if (adminCount <= 1) {
      return {
        error: NextResponse.json(
          { error: "Não é possível excluir o último administrador." },
          { status: 400 },
        ),
      };
    }
  }

  const patientId = user.patient?.id || null;
  const psychologistId = user.psychologist?.id || null;

  await prisma.$transaction(async (tx) => {
    if (patientId) {
      await tx.patientMessage.deleteMany({ where: { patientId } });
      await tx.patientSummary.deleteMany({ where: { patientId } });
      await tx.patientMaterial.deleteMany({ where: { patientId } });
      await tx.therapeuticTask.deleteMany({ where: { patientId } });
      await tx.preSessionCheckin.deleteMany({ where: { patientId } });
      await tx.sessionNote.deleteMany({ where: { patientId } });
      await tx.psychologistPatient.deleteMany({ where: { patientId } });
      await tx.appointment.deleteMany({ where: { patientId } });
      await tx.patient.delete({ where: { id: patientId } });
    }

    if (psychologistId) {
      await tx.patientMessage.deleteMany({ where: { psychologistId } });
      await tx.patientSummary.deleteMany({ where: { psychologistId } });
      await tx.patientMaterial.deleteMany({ where: { psychologistId } });
      await tx.therapeuticTask.deleteMany({ where: { psychologistId } });

      await tx.preSessionCheckin.deleteMany({
        where: {
          appointment: {
            psychologistId,
          },
        },
      });

      await tx.sessionNote.deleteMany({ where: { psychologistId } });
      await tx.psychologistPatient.deleteMany({ where: { psychologistId } });
      await tx.appointment.deleteMany({ where: { psychologistId } });
      await tx.psychologist.delete({ where: { id: psychologistId } });
    }

    await tx.verificationToken.deleteMany({ where: { email: user.email } });
    await tx.passwordResetToken.deleteMany({ where: { email: user.email } });
    await tx.user.delete({ where: { id: user.id } });
  });

  return {
    userId: user.id,
  };
}

async function handleDelete(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const email = await getEmailFromRequest(request);

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do usuário." },
        { status: 400 },
      );
    }

    const result = await deleteUserByEmail(email, admin.userId);

    if ("error" in result) {
      return result.error;
    }

    return NextResponse.json({
      ok: true,
      message: "Usuário excluído com sucesso.",
      userId: result.userId,
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir o usuário." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  return handleDelete(request);
}

export async function POST(request: Request) {
  return handleDelete(request);
}

export async function GET() {
  return NextResponse.json(
    { error: "Método não permitido. Use DELETE ou POST autenticado." },
    { status: 405 },
  );
}
