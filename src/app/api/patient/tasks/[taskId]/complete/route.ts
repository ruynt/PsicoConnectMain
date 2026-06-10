import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

type RouteContext = {
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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { taskId } = await context.params;

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
        { error: "Tarefa não encontrada." },
        { status: 404 },
      );
    }

    if (task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Não é possível concluir uma tarefa cancelada." },
        { status: 400 },
      );
    }

    const updatedTask = await prisma.therapeuticTask.update({
      where: {
        id: task.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        cancelledAt: null,
      },
    });

    return NextResponse.json({
      message: "Tarefa marcada como concluída.",
      task: mapTask(updatedTask),
    });
  } catch (error: unknown) {
    console.error("Erro ao concluir tarefa:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao concluir tarefa."),
      },
      { status: 500 },
    );
  }
}