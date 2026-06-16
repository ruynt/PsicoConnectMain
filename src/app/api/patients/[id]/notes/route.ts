import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import {
  decryptNullableSensitiveText,
  decryptSensitiveText,
  encryptNullableSensitiveText,
  encryptSensitiveText,
} from "@/lib/encryption";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function getArchivedFilter(statusParam: string | null) {
  if (statusParam === "ALL") {
    return undefined;
  }

  if (statusParam === "ARCHIVED") {
    return true;
  }

  return false;
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
  appointment: {
    id: string;
    title: string | null;
    dateTime: Date;
    status: string;
  } | null;
}) {
  return {
    id: note.id,
    title: decryptNullableSensitiveText(note.title),
    content: decryptSensitiveText(note.content),
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
        { error: "Acesso não autorizado.", notes: [] },
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
        { error: "Psicólogo não encontrado.", notes: [] },
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
        { error: "Você não tem acesso a este paciente.", notes: [] },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
    patient: patientAccess,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const { searchParams } = new URL(req.url);
    const archived = getArchivedFilter(searchParams.get("status"));

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const notes = await prisma.sessionNote.findMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
        ...(archived === undefined ? {} : { archived }),
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
      notes: notes.map(mapNote),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar anotações:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar anotações."),
        notes: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
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

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId: auth.patient.id,
          psychologistId: auth.psychologist.id,
        },
        select: {
          id: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Consulta não encontrada para este paciente." },
          { status: 404 },
        );
      }
    }

    const note = await prisma.sessionNote.create({
      data: {
        title: encryptNullableSensitiveText(title),
        content: encryptSensitiveText(content),
        patientId: auth.patient.id,
        psychologistId: auth.psychologist.id,
        appointmentId,
        archived: false,
        archivedAt: null,
      },
    });

    return NextResponse.json({
      message: "Anotação salva com sucesso.",
      note: {
        id: note.id,
        title: decryptNullableSensitiveText(note.title),
        content: decryptSensitiveText(note.content),
        archived: note.archived,
        archivedAt: note.archivedAt?.toISOString() || null,
        patientId: note.patientId,
        appointmentId: note.appointmentId,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao criar anotação:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao criar anotação."),
      },
      { status: 500 },
    );
  }
}