import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import type { Prisma } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptSensitiveText, encryptSensitiveText } from "@/lib/encryption";
import { logAuditEvent } from "@/lib/audit-log";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type PatientMessage = Prisma.PatientMessageGetPayload<Record<string, never>>;

function mapMessage(message: PatientMessage) {
  return {
    id: message.id,
    content: decryptSensitiveText(message.content),
    senderRole: message.senderRole,
    patientId: message.patientId,
    psychologistId: message.psychologistId,
    readByPatientAt: message.readByPatientAt?.toISOString() || null,
    readByPsychologistAt:
      message.readByPsychologistAt?.toISOString() || null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
}

async function getAuthorizedPsychologist(req: NextRequest, patientId: string) {
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
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      ),
    };
  }

  const patientLink = await prisma.psychologistPatient.findFirst({
    where: {
      patientId,
      psychologistId: psychologist.id,
      active: true,
    },
    select: {
      id: true,
    },
  });

  if (!patientLink) {
    return {
      error: NextResponse.json(
        { error: "Você não tem acesso às mensagens deste paciente." },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
    actorUserId: String(token.id),
    actorRole: token.role,
  };
}

function parseMessageContent(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: patientId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return NextResponse.json(
        {
          error: "Acesso não autorizado.",
          messages: [],
        },
        { status: auth.error.status },
      );
    }

    await prisma.patientMessage.updateMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
        senderRole: "PATIENT",
        readByPsychologistAt: null,
      },
      data: {
        readByPsychologistAt: new Date(),
      },
    });

    const messages = await prisma.patientMessage.findMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      messages: messages.map(mapMessage),
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
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const { id: patientId } = await context.params;
    const body = await req.json();

    const content = parseMessageContent(body?.content);

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

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const message = await prisma.patientMessage.create({
      data: {
        content: encryptSensitiveText(content),
        senderRole: "PSYCHOLOGIST",
        patientId,
        psychologistId: auth.psychologist.id,
        readByPsychologistAt: new Date(),
      },
    });

    await logAuditEvent({
      action: "PSYCHOLOGIST_MESSAGE_SENT",
      entityType: "PatientMessage",
      entityId: message.id,
      actorUserId: auth.actorUserId,
      actorRole: auth.actorRole,
      request: req,
      metadata: {
        patientId,
        psychologistId: auth.psychologist.id,
      },
    });

    return NextResponse.json(
      {
        message: mapMessage(message),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar mensagem para paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao enviar mensagem para o paciente.",
        ),
      },
      { status: 500 },
    );
  }
}