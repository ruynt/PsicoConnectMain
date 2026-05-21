import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import type { Prisma, TherapeuticTaskStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    id: string;
    taskId: string;
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

function isValidStatus(value: unknown): value is TherapeuticTaskStatus {
  return value === "PENDING" || value === "COMPLETED" || value === "CANCELLED";
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId, taskId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const body = await req.json();

    const existingTask = await prisma.therapeuticTask.findFirst({
      where: {
        id: taskId,
        patientId,
        psychologistId: psychologist.id,
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

      data.title = title;
    }

    if (body.description !== undefined) {
      data.description = normalizeText(body.description);
    }

    if (body.dueDate !== undefined) {
      data.dueDate = normalizeDate(body.dueDate);
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

    const task = await prisma.therapeuticTask.update({
      where: {
        id: taskId,
      },
      data,
    });

    return NextResponse.json({
      message: "Tarefa atualizada com sucesso.",
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
    console.error("Erro ao atualizar tarefa terapêutica:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao atualizar tarefa.",
      },
      { status: 500 },
    );
  }
}