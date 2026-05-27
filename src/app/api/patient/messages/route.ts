import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

function mapMessage(message: any) {
  return {
    id: message.id,
    content: message.content,
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

function mapPsychologistLink(link: any) {
  return {
    id: link.psychologist.id,
    name: link.psychologist.user.name,
    email: link.psychologist.user.email,
    crp: link.psychologist.crp,
  };
}

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", messages: [], psychologists: [] },
      { status: 403 },
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
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
  } catch (error: any) {
    console.error("Erro ao listar mensagens do paciente:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao listar mensagens do paciente.",
        messages: [],
        psychologists: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();

    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    let psychologistId =
      typeof body?.psychologistId === "string" ? body.psychologistId : "";

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

    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    if (!psychologistId) {
      const onlyLink = await prisma.psychologistPatient.findFirst({
        where: {
          patientId: patient.id,
          active: true,
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
        patientId: patient.id,
        psychologistId,
        active: true,
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
        content,
        senderRole: "PATIENT",
        patientId: patient.id,
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

    return NextResponse.json(
      {
        message: mapMessage(message),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Erro ao enviar mensagem do paciente:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao enviar mensagem.",
      },
      { status: 500 },
    );
  }
}
