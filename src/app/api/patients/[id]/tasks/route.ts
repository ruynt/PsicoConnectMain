import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

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

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(`${value}T00:00:00-03:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function mapTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: string;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  appointment?: {
    id: string;
    title: string | null;
    dateTime: Date;
  } | null;
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    dueDate: task.dueDate?.toISOString() || null,
    status: task.status,
    completedAt: task.completedAt?.toISOString() || null,
    cancelledAt: task.cancelledAt?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    appointment: task.appointment
      ? {
          id: task.appointment.id,
          title: task.appointment.title || "Consulta",
          dateTime: task.appointment.dateTime.toISOString(),
        }
      : null,
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
      psychologistId: psychologist.id,
      patientId,
      active: true,
    },
    select: {
      id: true,
    },
  });

  if (!patientLink) {
    return {
      error: NextResponse.json(
        { error: "Você não possui vínculo ativo com este paciente." },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return NextResponse.json(
        { error: "Você não possui vínculo ativo com este paciente.", tasks: [] },
        { status: auth.error.status },
      );
    }

    const tasks = await prisma.therapeuticTask.findMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
      },
      include: {
        appointment: {
          select: {
            id: true,
            title: true,
            dateTime: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      tasks: tasks.map(mapTask),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar tarefas terapêuticas:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar tarefas."),
        tasks: [],
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
    const description = normalizeText(body.description);
    const dueDate = normalizeDate(body.dueDate);
    const appointmentId = normalizeText(body.appointmentId);

    if (!title) {
      return NextResponse.json(
        { error: "O título da tarefa é obrigatório." },
        { status: 400 },
      );
    }

    if (title.length > 120) {
      return NextResponse.json(
        { error: "O título deve ter no máximo 120 caracteres." },
        { status: 400 },
      );
    }

    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: "A descrição deve ter no máximo 1000 caracteres." },
        { status: 400 },
      );
    }

    if (body.dueDate && !dueDate) {
      return NextResponse.json(
        { error: "Informe uma data válida para o prazo da tarefa." },
        { status: 400 },
      );
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId,
          psychologistId: auth.psychologist.id,
        },
        select: {
          id: true,
        },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Consulta vinculada não encontrada para este paciente." },
          { status: 404 },
        );
      }
    }

    const task = await prisma.therapeuticTask.create({
      data: {
        title,
        description,
        dueDate,
        patientId,
        psychologistId: auth.psychologist.id,
        appointmentId,
      },
    });

    return NextResponse.json({
      message: "Tarefa terapêutica criada com sucesso.",
      task: mapTask(task),
    });
  } catch (error: unknown) {
    console.error("Erro ao criar tarefa terapêutica:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao criar tarefa."),
      },
      { status: 500 },
    );
  }
}