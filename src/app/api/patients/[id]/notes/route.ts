import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

async function getPsychologistFromToken(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", notes: [] },
        { status: 403 },
      ),
      psychologist: null,
    };
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado.", notes: [] },
        { status: 404 },
      ),
      psychologist: null,
    };
  }

  return {
    error: null,
    psychologist,
  };
}

async function checkPatientAccess(patientId: string, psychologistId: string) {
  const patientAccess = await prisma.patient.findFirst({
    where: {
      id: patientId,
      psychologistLinks: {
        some: {
          psychologistId,
          active: true,
        },
      },
    },
  });

  return patientAccess;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "ACTIVE";

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado.", notes: [] },
        { status: 404 },
      );
    }

    const patientAccess = await checkPatientAccess(id, psychologist.id);

    if (!patientAccess) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente.", notes: [] },
        { status: 403 },
      );
    }

    const archivedFilter =
      statusParam === "ALL"
        ? {}
        : statusParam === "ARCHIVED"
          ? { archived: true }
          : { archived: false };

    const notes = await prisma.sessionNote.findMany({
      where: {
        patientId: id,
        psychologistId: psychologist.id,
        ...archivedFilter,
      },
      include: {
        appointment: {
          select: {
            id: true,
            title: true,
            dateTime: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        id: note.id,
        title: note.title || "",
        content: note.content,
        archived: note.archived,
        archivedAt: note.archivedAt?.toISOString() || null,
        patientId: note.patientId,
        appointmentId: note.appointmentId,
        appointment: note.appointment
          ? {
              id: note.appointment.id,
              title: note.appointment.title || "Consulta",
              dateTime: note.appointment.dateTime.toISOString(),
              status: note.appointment.status,
            }
          : null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Erro ao listar anotações:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao listar anotações.",
        notes: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const body = await req.json();

    const { title, content, appointmentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "O conteúdo da anotação é obrigatório." },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const patientAccess = await checkPatientAccess(id, psychologist.id);

    if (!patientAccess) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      );
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: appointmentId,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Consulta não encontrada." },
          { status: 404 },
        );
      }

      if (
        appointment.patientId !== patient.id ||
        appointment.psychologistId !== psychologist.id
      ) {
        return NextResponse.json(
          { error: "Consulta não pertence a este paciente ou psicólogo." },
          { status: 403 },
        );
      }
    }

    const note = await prisma.sessionNote.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        patientId: patient.id,
        psychologistId: psychologist.id,
        appointmentId: appointmentId || null,
        archived: false,
        archivedAt: null,
      },
    });

    return NextResponse.json({
      message: "Anotação salva com sucesso.",
      note: {
        id: note.id,
        title: note.title || "",
        content: note.content,
        archived: note.archived,
        archivedAt: note.archivedAt?.toISOString() || null,
        patientId: note.patientId,
        appointmentId: note.appointmentId,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar anotação:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao criar anotação.",
      },
      { status: 500 },
    );
  }
}
