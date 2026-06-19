import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import type { Prisma } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptSensitiveText, encryptSensitiveText } from "@/lib/encryption";
import {
  optionalUuidString,
  parseJsonBody,
  requiredTrimmedString,
} from "@/lib/api-validation";
import { logAuditEvent } from "@/lib/audit-log";

type PatientMessageWithPsychologist = Prisma.PatientMessageGetPayload<{
  include: {
    psychologist: {
      include: {
        user: {
          select: {
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

type PsychologistLinkWithUser = Prisma.PsychologistPatientGetPayload<{
  include: {
    psychologist: {
      include: {
        user: {
          select: {
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

function mapMessage(message: PatientMessageWithPsychologist) {
  return {
    id: message.id,
    content: decryptSensitiveText(message.content),
    senderRole: message.senderRole,
    patientId: message.patientId,
    psychologistId: message.psychologistId,
    readByPatientAt: message.readByPatientAt?.toISOString() || null,
    readByPsychologistAt: message.readByPsychologistAt?.toISOString() || null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    psychologist: message.psychologist
      ? {
          id: message.psychologist.id,
          name: message.psychologist.user.name,
          email: message.psychologist.user.email,
        }
      : null,
  };
}

function mapPsychologistLink(link: PsychologistLinkWithUser) {
  return {
    id: link.psychologist.id,
    name: link.psychologist.user.name,
    email: link.psychologist.user.email,
    crp: link.psychologist.crp,
  };
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
    actorUserId: String(token.id),
    actorRole: token.role,
  };
}

const patientMessageSchema = z.object({
  content: requiredTrimmedString(
    2000,
    "Escreva uma mensagem antes de enviar.",
    "A mensagem deve ter no máximo 2000 caracteres.",
  ),
  psychologistId: optionalUuidString("Profissional inválido."),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return NextResponse.json(
        {
          error: "Acesso não autorizado.",
          messages: [],
          psychologists: [],
        },
        { status: auth.error.status },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id: auth.patient.id,
      },
      include: {
        psychologistLinks: {
          where: {
            active: true,
          },
          include: {
            psychologist: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado.", messages: [], psychologists: [] },
        { status: 404 },
      );
    }

    await prisma.patientMessage.updateMany({
      where: {
        patientId: patient.id,
        senderRole: "PSYCHOLOGIST",
        readByPatientAt: null,
      },
      data: {
        readByPatientAt: new Date(),
      },
    });

    const messages = await prisma.patientMessage.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        psychologist: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      messages: messages.map(mapMessage),
      psychologists: patient.psychologistLinks.map(mapPsychologistLink),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar mensagens do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao listar mensagens do paciente.",
        ),
        messages: [],
        psychologists: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const parsedBody = await parseJsonBody(req, patientMessageSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const content = body.content;
    let psychologistId = body.psychologistId || "";

    if (!content) {
      return NextResponse.json(
        { error: "Escreva uma mensagem antes de enviar." },
        { status: 400 },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "A mensagem deve ter no máximo 2000 caracteres." },
        { status: 400 },
      );
    }

    if (!psychologistId) {
      const onlyLink = await prisma.psychologistPatient.findFirst({
        where: {
          patientId: auth.patient.id,
          active: true,
        },
        select: {
          psychologistId: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      psychologistId = onlyLink?.psychologistId || "";
    }

    if (!psychologistId) {
      return NextResponse.json(
        { error: "Profissional não informado." },
        { status: 400 },
      );
    }

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        patientId: auth.patient.id,
        psychologistId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        { error: "Você não está vinculado a este profissional." },
        { status: 403 },
      );
    }

    const message = await prisma.patientMessage.create({
      data: {
        content: encryptSensitiveText(content),
        senderRole: "PATIENT",
        patientId: auth.patient.id,
        psychologistId,
        readByPatientAt: new Date(),
      },
      include: {
        psychologist: {
          include: {
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

    await logAuditEvent({
      action: "PATIENT_MESSAGE_SENT",
      entityType: "PatientMessage",
      entityId: message.id,
      actorUserId: auth.actorUserId,
      actorRole: auth.actorRole,
      targetUserId: auth.actorUserId,
      request: req,
      metadata: {
        patientId: auth.patient.id,
        psychologistId,
      },
    });

    return NextResponse.json(
      {
        message: mapMessage(message),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar mensagem do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao enviar mensagem."),
      },
      { status: 500 },
    );
  }
}