import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { logAuditEvent } from "@/lib/audit-log";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
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
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
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
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do paciente." },
        { status: 400 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        patient: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Paciente não encontrado. Peça para o paciente se cadastrar primeiro.",
        },
        { status: 404 },
      );
    }

    if (user.role !== "PATIENT" || !user.patient) {
      return NextResponse.json(
        { error: "O e-mail informado não pertence a uma conta de paciente." },
        { status: 400 },
      );
    }

    const existingLink = await prisma.psychologistPatient.findUnique({
      where: {
        psychologistId_patientId: {
          psychologistId: auth.psychologist.id,
          patientId: user.patient.id,
        },
      },
      select: {
        id: true,
        active: true,
        status: true,
      },
    });

    if (existingLink?.active && existingLink.status === "APPROVED") {
      return NextResponse.json(
        { error: "Este paciente já está vinculado a você." },
        { status: 409 },
      );
    }

    if (existingLink?.status === "PENDING") {
      return NextResponse.json(
        {
          error:
            "Já existe uma solicitação de vínculo pendente para este paciente.",
        },
        { status: 409 },
      );
    }

    const link = existingLink
      ? await prisma.psychologistPatient.update({
          where: {
            id: existingLink.id,
          },
          data: {
            active: false,
            status: "PENDING",
            requestedAt: new Date(),
            respondedAt: null,
            rejectedAt: null,
          },
          select: {
            id: true,
            psychologistId: true,
            patientId: true,
            active: true,
            status: true,
            requestedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await prisma.psychologistPatient.create({
          data: {
            psychologistId: auth.psychologist.id,
            patientId: user.patient.id,
            active: false,
            status: "PENDING",
          },
          select: {
            id: true,
            psychologistId: true,
            patientId: true,
            active: true,
            status: true,
            requestedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    await logAuditEvent({
      action: "PATIENT_LINK_REQUESTED",
      entityType: "PsychologistPatient",
      entityId: link.id,
      actorUserId: String(auth.token.id),
      actorRole: auth.token.role,
      targetUserId: user.id,
      request: req,
      metadata: {
        psychologistId: auth.psychologist.id,
        patientId: user.patient.id,
        patientEmail: user.email,
        status: link.status,
      },
    });

    return NextResponse.json({
      message:
        "Solicitação enviada. O paciente precisa aceitar o vínculo antes de você acessar os dados dele.",
      link,
      patient: {
        id: user.patient.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao solicitar vínculo com paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao solicitar vínculo."),
      },
      { status: 500 },
    );
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const linkId = typeof body.linkId === "string" ? body.linkId.trim() : "";

    if (!linkId) {
      return NextResponse.json(
        { error: "ID da solicitação é obrigatório." },
        { status: 400 },
      );
    }

    const existingLink = await prisma.psychologistPatient.findUnique({
      where: {
        id: linkId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!existingLink || existingLink.psychologistId !== auth.psychologist.id) {
      return NextResponse.json(
        { error: "Solicitação não encontrada." },
        { status: 404 },
      );
    }

    if (existingLink.status !== "PENDING") {
      return NextResponse.json(
        { error: "Apenas solicitações pendentes podem ser canceladas." },
        { status: 409 },
      );
    }

    const updatedLink = await prisma.psychologistPatient.update({
      where: {
        id: existingLink.id,
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
        requestedAt: true,
        respondedAt: true,
        rejectedAt: true,
      },
    });

    await logAuditEvent({
      action: "PATIENT_LINK_CANCELLED",
      entityType: "PsychologistPatient",
      entityId: updatedLink.id,
      actorUserId: String(auth.token.id),
      actorRole: auth.token.role,
      targetUserId: existingLink.patient.user.id,
      request: req,
      metadata: {
        psychologistId: updatedLink.psychologistId,
        patientId: updatedLink.patientId,
        patientEmail: existingLink.patient.user.email,
        status: updatedLink.status,
      },
    });

    return NextResponse.json({
      message: "Solicitação de vínculo cancelada com sucesso.",
      link: updatedLink,
    });
  } catch (error: unknown) {
    console.error("Erro ao cancelar solicitação de vínculo:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao cancelar solicitação de vínculo.",
        ),
      },
      { status: 500 },
    );
  }
}
