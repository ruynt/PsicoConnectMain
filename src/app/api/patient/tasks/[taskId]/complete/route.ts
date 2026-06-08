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

export async function PATCH(req: NextRequest, context: RouteContext) {
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