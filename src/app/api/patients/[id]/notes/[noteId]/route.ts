import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

async function getPsychologistFromToken(req: NextRequest) {
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
        { error: "Psicólogo não encontrado." },
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

async function validateAppointmentLink(
  appointmentId: string | null,
  patientId: string,
  psychologistId: string,
) {
  if (!appointmentId) {
    return {
      error: null,
    };
  }

  const appointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
  });

  if (!appointment) {
    return {
      error: NextResponse.json(
        { error: "Consulta não encontrada." },
        { status: 404 },
      ),
    };
  }

  if (
    appointment.patientId !== patientId ||
    appointment.psychologistId !== psychologistId
  ) {
    return {
      error: NextResponse.json(
        { error: "Consulta não pertence a este paciente ou psicólogo." },
        { status: 403 },
      ),
    };
  }

  return {
    error: null,
  };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    const { id, noteId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const patientAccess = await checkPatientAccess(id, psychologist.id);

    if (!patientAccess) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      );
    }

    const note = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        patientId: id,
        psychologistId: psychologist.id,
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Anotação não encontrada." },
        { status: 404 },
      );
    }

    const body = await req.json();

    const { title, content, appointmentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "O conteúdo da anotação é obrigatório." },
        { status: 400 },
      );
    }

    const normalizedAppointmentId = appointmentId || null;

    const appointmentValidation = await validateAppointmentLink(
      normalizedAppointmentId,
      id,
      psychologist.id,
    );

    if (appointmentValidation.error) {
      return appointmentValidation.error;
    }

    const updatedNote = await prisma.sessionNote.update({
      where: {
        id: note.id,
      },
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        appointmentId: normalizedAppointmentId,
      },
    });

    return NextResponse.json({
      message: "Anotação atualizada com sucesso.",
      note: {
        id: updatedNote.id,
        title: updatedNote.title || "",
        content: updatedNote.content,
        archived: updatedNote.archived,
        archivedAt: updatedNote.archivedAt?.toISOString() || null,
        patientId: updatedNote.patientId,
        appointmentId: updatedNote.appointmentId,
        createdAt: updatedNote.createdAt.toISOString(),
        updatedAt: updatedNote.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar anotação:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao atualizar anotação."),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    const { id, noteId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const patientAccess = await checkPatientAccess(id, psychologist.id);

    if (!patientAccess) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      );
    }

    const note = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        patientId: id,
        psychologistId: psychologist.id,
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Anotação não encontrada." },
        { status: 404 },
      );
    }

    if (note.archived) {
      return NextResponse.json(
        { error: "Esta anotação já está arquivada." },
        { status: 400 },
      );
    }

    const archivedNote = await prisma.sessionNote.update({
      where: {
        id: note.id,
      },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Anotação arquivada com sucesso.",
      note: {
        id: archivedNote.id,
        title: archivedNote.title || "",
        content: archivedNote.content,
        archived: archivedNote.archived,
        archivedAt: archivedNote.archivedAt?.toISOString() || null,
        patientId: archivedNote.patientId,
        appointmentId: archivedNote.appointmentId,
        createdAt: archivedNote.createdAt.toISOString(),
        updatedAt: archivedNote.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao arquivar anotação:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao arquivar anotação."),
      },
      { status: 500 },
    );
  }
}
