import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;

  const date = new Date(`${value}T00:00:00-03:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

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

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        psychologistId: psychologist.id,
        patientId,
        active: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        { error: "Você não possui vínculo ativo com este paciente.", tasks: [] },
        { status: 403 },
      );
    }

    const tasks = await prisma.therapeuticTask.findMany({
      where: {
        patientId,
        psychologistId: psychologist.id,
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
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      tasks: tasks.map((task) => ({
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
      })),
    });
  } catch (error: any) {
    console.error("Erro ao listar tarefas terapêuticas:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao listar tarefas.",
        tasks: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
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

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        psychologistId: psychologist.id,
        patientId,
        active: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        { error: "Você não possui vínculo ativo com este paciente." },
        { status: 403 },
      );
    }

    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId,
          psychologistId: psychologist.id,
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
        psychologistId: psychologist.id,
        appointmentId,
      },
    });

    return NextResponse.json({
      message: "Tarefa terapêutica criada com sucesso.",
      task: {
        id: task.id,
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate?.toISOString() || null,
        status: task.status,
        completedAt: task.completedAt?.toISOString() || null,
        cancelledAt: task.cancelledAt?.toISOString() || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar tarefa terapêutica:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao criar tarefa.",
      },
      { status: 500 },
    );
  }
}