import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

type Params = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(req: NextRequest, context: Params) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const { taskId } = await context.params;
    const body = await req.json();

    const status = body?.status;

    if (!["PENDING", "COMPLETED"].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status inválido. O paciente só pode marcar a tarefa como pendente ou concluída.",
        },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const task = await prisma.therapeuticTask.findFirst({
      where: {
        id: taskId,
        patientId: patient.id,
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
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description || "",
        dueDate: updatedTask.dueDate?.toISOString() || null,
        status: updatedTask.status,
        completedAt: updatedTask.completedAt?.toISOString() || null,
        cancelledAt: updatedTask.cancelledAt?.toISOString() || null,
        createdAt: updatedTask.createdAt.toISOString(),
        updatedAt: updatedTask.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar tarefa do paciente:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao atualizar tarefa.",
      },
      { status: 500 },
    );
  }
}
