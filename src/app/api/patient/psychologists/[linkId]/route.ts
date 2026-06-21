import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { logAuditEvent } from "@/lib/audit-log";

type RouteContext = {
  params: Promise<{
    linkId: string;
  }>;
};

function normalizeAction(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!patient) {
    return {
      error: NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
    token,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { linkId } = await context.params;
    const body = await req.json();
    const action = normalizeAction(body.action);

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { error: "Informe uma ação válida: accept ou reject." },
        { status: 400 },
      );
    }

    const link = await prisma.psychologistPatient.findFirst({
      where: {
        id: linkId,
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        status: true,
        active: true,
        patientId: true,
        psychologistId: true,
        psychologist: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Solicitação de vínculo não encontrada." },
        { status: 404 },
      );
    }

    if (link.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta solicitação já foi respondida." },
        { status: 409 },
      );
    }

    const now = new Date();
    const accepted = action === "accept";

    const updatedLink = await prisma.psychologistPatient.update({
      where: {
        id: link.id,
      },
      data: {
        active: accepted,
        status: accepted ? "APPROVED" : "REJECTED",
        respondedAt: now,
        rejectedAt: accepted ? null : now,
      },
      select: {
        id: true,
        active: true,
        status: true,
        requestedAt: true,
        respondedAt: true,
        rejectedAt: true,
        psychologistId: true,
        patientId: true,
      },
    });

    await logAuditEvent({
      action: accepted ? "PATIENT_LINK_ACCEPTED" : "PATIENT_LINK_REJECTED",
      entityType: "PsychologistPatient",
      entityId: updatedLink.id,
      actorUserId: String(auth.token.id),
      actorRole: auth.token.role,
      targetUserId: link.psychologist.userId,
      request: req,
      metadata: {
        psychologistId: updatedLink.psychologistId,
        patientId: updatedLink.patientId,
        status: updatedLink.status,
      },
    });

    return NextResponse.json({
      message: accepted
        ? `Vínculo com ${link.psychologist.user.name} aceito com sucesso.`
        : `Solicitação de ${link.psychologist.user.name} recusada.`,
      link: updatedLink,
    });
  } catch (error: unknown) {
    console.error("Erro ao responder solicitação de vínculo:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao responder solicitação de vínculo.",
        ),
      },
      { status: 500 },
    );
  }
}
