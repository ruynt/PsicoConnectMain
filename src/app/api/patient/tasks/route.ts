import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", tasks: [] },
      { status: 403 },
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado.", tasks: [] },
        { status: 404 },
      );
    }

    const tasks = await prisma.therapeuticTask.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        psychologist: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            dateTime: true,
          },
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
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
        psychologist: {
          id: task.psychologistId,
          name: task.psychologist.user.name,
          email: task.psychologist.user.email,
        },
        appointment: task.appointment
          ? {
              id: task.appointment.id,
              title: task.appointment.title || "Consulta",
              dateTime: task.appointment.dateTime.toISOString(),
            }
          : null,
      })),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar tarefas do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar tarefas."),
        tasks: [],
      },
      { status: 500 },
    );
  }
}