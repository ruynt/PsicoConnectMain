import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function mapMessage(message: any) {
  return {
    id: message.id,
    content: message.content,
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

export async function GET(req: NextRequest, context: Params) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", messages: [] },
      { status: 403 },
    );
  }

  try {
    const { id: patientId } = await context.params;

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado.", messages: [] },
        { status: 404 },
      );
    }

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        patientId,
        psychologistId: psychologist.id,
        active: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        {
          error: "Você não tem acesso às mensagens deste paciente.",
          messages: [],
        },
        { status: 403 },
      );
    }

    await prisma.patientMessage.updateMany({
      where: {
        patientId,
        psychologistId: psychologist.id,
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
        psychologistId: psychologist.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      messages: messages.map(mapMessage),
    });
  } catch (error: any) {
    console.error("Erro ao listar mensagens do paciente:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao listar mensagens do paciente.",
        messages: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: Params) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const { id: patientId } = await context.params;
    const body = await req.json();

    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

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

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        patientId,
        psychologistId: psychologist.id,
        active: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      );
    }

    const message = await prisma.patientMessage.create({
      data: {
        content,
        senderRole: "PSYCHOLOGIST",
        patientId,
        psychologistId: psychologist.id,
        readByPsychologistAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: mapMessage(message),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Erro ao enviar mensagem para paciente:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao enviar mensagem para o paciente.",
      },
      { status: 500 },
    );
  }
}