import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import type { Prisma, TherapeuticTaskStatus } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText, encryptNullableSensitiveText } from "@/lib/encryption";

type RouteContext = {
  params: Promise<{
    id: string;
    taskId: string;
  }>;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function parseDueDate(value: unknown) {
  if (value === null || value === "") {
    return {
      valid: true,
      date: null,
    };
  }

  if (typeof value !== "string") {
    return {
      valid: false,
      date: null,
    };
  }

  const date = new Date(`${value}T00:00:00-03:00`);

  if (Number.isNaN(date.getTime())) {
    return {
      valid: false,
      date: null,
    };
  }

  return {
    valid: true,
    date,
  };
}

function isValidStatus(value: unknown): value is TherapeuticTaskStatus {
  return value === "PENDING" || value === "COMPLETED" || value === "CANCELLED";
}

function mapTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  status: TherapeuticTaskStatus;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
        { error: "Você não possui vínculo ativo com este paciente." },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId, taskId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();

    const existingTask = await prisma.therapeuticTask.findFirst({
      where: {
        id: taskId,
        patientId,
        psychologistId: auth.psychologist.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Tarefa não encontrada para este paciente." },
        { status: 404 },
      );
    }

    const data: Prisma.TherapeuticTaskUpdateInput = {};

    if (body.title !== undefined) {
      const title = normalizeText(body.title);

      if (!title) {
        return NextResponse.json(
          { error: "O título da tarefa não pode ficar vazio." },
          { status: 400 },
        );
      }

      if (title.length > 120) {
        return NextResponse.json(
          { error: "O título deve ter no máximo 120 caracteres." },
          { status: 400 },
        );
      }

      data.title = encryptNullableSensitiveText(title) || "Tarefa";
    }

    if (body.description !== undefined) {
      const description = normalizeText(body.description);

      if (description && description.length > 1000) {
        return NextResponse.json(
          { error: "A descrição deve ter no máximo 1000 caracteres." },
          { status: 400 },
        );
      }

      data.description = encryptNullableSensitiveText(description);
    }

    if (body.dueDate !== undefined) {
      const dueDate = parseDueDate(body.dueDate);

      if (!dueDate.valid) {
        return NextResponse.json(
          { error: "Informe uma data válida para o prazo da tarefa." },
          { status: 400 },
        );
      }

      data.dueDate = dueDate.date;
    }

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json(
          { error: "Status inválido para a tarefa." },
          { status: 400 },
        );
      }

      const now = new Date();

      data.status = body.status;

      if (body.status === "COMPLETED") {
        data.completedAt = now;
        data.cancelledAt = null;
      }

      if (body.status === "CANCELLED") {
        data.cancelledAt = now;
        data.completedAt = null;
      }

      if (body.status === "PENDING") {
        data.completedAt = null;
        data.cancelledAt = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado informado para atualizar." },
        { status: 400 },
      );
    }

    const task = await prisma.therapeuticTask.update({
      where: {
        id: existingTask.id,
      },
      data,
    });

    return NextResponse.json({
      message: "Tarefa atualizada com sucesso.",
      task: mapTask(task),
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar tarefa terapêutica:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao atualizar tarefa."),
      },
      { status: 500 },
    );
  }
}