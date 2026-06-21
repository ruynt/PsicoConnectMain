import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText, encryptNullableSensitiveText } from "@/lib/encryption";
import {
  optionalTrimmedString,
  optionalUuidString,
  parseJsonBody,
  requiredTrimmedString,
} from "@/lib/api-validation";
import { logAuditEvent } from "@/lib/audit-log";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

const createTaskSchema = z.object({
  title: requiredTrimmedString(
    120,
    "O título da tarefa é obrigatório.",
    "O título deve ter no máximo 120 caracteres.",
  ),
  description: optionalTrimmedString(
    1000,
    "A descrição deve ter no máximo 1000 caracteres.",
  ),
  dueDate: optionalTrimmedString(
    10,
    "Informe uma data válida para o prazo da tarefa.",
  ),
  appointmentId: optionalUuidString(
    "Consulta vinculada inválida.",
  ),
});

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
    title: decryptNullableSensitiveText(task.title) || "Tarefa",
    description: decryptNullableSensitiveText(task.description),
    dueDate: task.dueDate?.toISOString() || null,
    status: task.status,
    completedAt: task.completedAt?.toISOString() || null,
    cancelledAt: task.cancelledAt?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    appointment: task.appointment
      ? {
          id: task.appointment.id,
          title: decryptNullableSensitiveText(task.appointment.title) || "Consulta",
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
      status: "APPROVED",
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
    actorUserId: String(token.id),
    actorRole: token.role,
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

    const parsedBody = await parseJsonBody(req, createTaskSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const title = body.title;
    const description = body.description;
    const dueDate = normalizeDate(body.dueDate);
    const appointmentId = body.appointmentId;

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
        title: encryptNullableSensitiveText(title) || "Tarefa",
        description: encryptNullableSensitiveText(description),
        dueDate,
        patientId,
        psychologistId: auth.psychologist.id,
        appointmentId,
      },
    });

    await logAuditEvent({
      action: "THERAPEUTIC_TASK_CREATED",
      entityType: "TherapeuticTask",
      entityId: task.id,
      actorUserId: auth.actorUserId,
      actorRole: auth.actorRole,
      request: req,
      metadata: {
        patientId,
        psychologistId: auth.psychologist.id,
        appointmentId,
        hasDueDate: Boolean(dueDate),
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
