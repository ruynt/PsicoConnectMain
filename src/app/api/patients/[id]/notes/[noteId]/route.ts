import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

type RouteContext = {
  params: Promise<{
    id: string;
    noteId: string;
  }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function mapNote(note: {
  id: string;
  title: string | null;
  content: string;
  archived: boolean;
  archivedAt: Date | null;
  patientId: string;
  appointmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment?: {
    id: string;
    title: string | null;
    dateTime: Date;
    status: string;
  } | null;
}) {
  return {
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

  const patientAccess = await prisma.patient.findFirst({
    where: {
      id: patientId,
      psychologistLinks: {
        some: {
          psychologistId: psychologist.id,
          active: true,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!patientAccess) {
    return {
      error: NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
    patient: patientAccess,
  };
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

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId,
      psychologistId,
    },
    select: {
      id: true,
    },
  });

  if (!appointment) {
    return {
      error: NextResponse.json(
        { error: "Consulta não encontrada para este paciente." },
        { status: 404 },
      ),
    };
  }

  return {
    error: null,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId, noteId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const note = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        patientId: auth.patient.id,
        psychologistId: auth.psychologist.id,
      },
      select: {
        id: true,
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Anotação não encontrada." },
        { status: 404 },
      );
    }

    const body = await req.json();

    const title = normalizeText(body.title);
    const content = normalizeText(body.content);
    const appointmentId = normalizeText(body.appointmentId);

    if (!content) {
      return NextResponse.json(
        { error: "O conteúdo da anotação é obrigatório." },
        { status: 400 },
      );
    }

    if (title && title.length > 120) {
      return NextResponse.json(
        { error: "O título deve ter no máximo 120 caracteres." },
        { status: 400 },
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: "O conteúdo deve ter no máximo 10000 caracteres." },
        { status: 400 },
      );
    }

    const appointmentValidation = await validateAppointmentLink(
      appointmentId,
      auth.patient.id,
      auth.psychologist.id,
    );

    if (appointmentValidation.error) {
      return appointmentValidation.error;
    }

    const updatedNote = await prisma.sessionNote.update({
      where: {
        id: note.id,
      },
      data: {
        title,
        content,
        appointmentId,
      },
    });

    return NextResponse.json({
      message: "Anotação atualizada com sucesso.",
      note: mapNote(updatedNote),
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

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId, noteId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const note = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        patientId: auth.patient.id,
        psychologistId: auth.psychologist.id,
      },
      select: {
        id: true,
        archived: true,
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
      note: mapNote(archivedNote),
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