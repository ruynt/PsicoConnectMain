import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import type { TherapeuticTaskStatus } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";

type Params = {
  params: Promise<{
    taskId: string;
  }>;
};

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  }

  const patient = await prisma.patient.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
    },
  });

  if (!patient) {
    return {
      error: NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

function parsePatientTaskStatus(value: unknown): TherapeuticTaskStatus | null {
  if (value === "PENDING" || value === "COMPLETED") {
    return value;
  }

  return null;
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
    title: task.title,
    description: task.description || "",
    dueDate: task.dueDate?.toISOString() || null,
    status: task.status,
    completedAt: task.completedAt?.toISOString() || null,
    cancelledAt: task.cancelledAt?.toISOString() || null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest, context: Params) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { taskId } = await context.params;
    const body = await req.json();

    const status = parsePatientTaskStatus(body?.status);

    if (!status) {
      return NextResponse.json(
        {
          error:
            "Status inválido. O paciente só pode marcar a tarefa como pendente ou concluída.",
        },
        { status: 400 },
      );
    }

    const task = await prisma.therapeuticTask.findFirst({
      where: {
        id: taskId,
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Tarefa não encontrada para este paciente." },
        { status: 404 },
      );
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Tarefas canceladas pelo psicólogo não podem ser reabertas pelo paciente.",
        },
        { status: 400 },
      );
    }

    const updatedTask = await prisma.therapeuticTask.update({
      where: {
        id: task.id,
      },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        cancelledAt: null,
      },
    });

    return NextResponse.json({
      task: mapTask(updatedTask),
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar tarefa do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao atualizar tarefa."),
      },
      { status: 500 },
    );
  }
}