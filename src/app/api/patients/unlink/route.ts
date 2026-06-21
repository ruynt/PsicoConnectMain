import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { logAuditEvent } from "@/lib/audit-log";

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function getAuthorizedPsychologist(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
    token,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const patientId = normalizeText(body.patientId);

    if (!patientId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório." },
        { status: 400 },
      );
    }

    const link = await prisma.psychologistPatient.findUnique({
      where: {
        psychologistId_patientId: {
          psychologistId: auth.psychologist.id,
          patientId,
        },
      },
      select: {
        id: true,
        active: true,
        status: true,
      },
    });

    if (!link || !link.active || link.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Este paciente não está vinculado a você." },
        { status: 404 },
      );
    }

    const updatedLink = await prisma.psychologistPatient.update({
      where: {
        id: link.id,
      },
      data: {
        active: false,
        status: "REJECTED",
        respondedAt: new Date(),
        rejectedAt: new Date(),
      },
      select: {
        id: true,
        psychologistId: true,
        patientId: true,
        active: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAuditEvent({
      action: "PATIENT_UNLINKED",
      entityType: "PsychologistPatient",
      entityId: updatedLink.id,
      actorUserId: String(auth.token.id),
      actorRole: auth.token.role,
      request: req,
      metadata: {
        psychologistId: updatedLink.psychologistId,
        patientId: updatedLink.patientId,
        status: updatedLink.status,
      },
    });

    return NextResponse.json({
      message: "Paciente desvinculado com sucesso.",
      link: updatedLink,
    });
  } catch (error: unknown) {
    console.error("Erro ao desvincular paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao desvincular paciente."),
      },
      { status: 500 },
    );
  }
}
