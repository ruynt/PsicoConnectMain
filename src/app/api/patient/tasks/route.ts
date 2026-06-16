import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", tasks: [] },
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
        { error: "Paciente não encontrado.", tasks: [] },
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
  psychologistId: string;
  psychologist: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
  appointment: {
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
    psychologist: {
      id: task.psychologist.id || task.psychologistId,
      name: task.psychologist.user.name,
      email: task.psychologist.user.email,
    },
    appointment: task.appointment
      ? {
          id: task.appointment.id,
          title: decryptNullableSensitiveText(task.appointment.title) || "Consulta",
          dateTime: task.appointment.dateTime.toISOString(),
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const tasks = await prisma.therapeuticTask.findMany({
      where: {
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        status: true,
        completedAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        psychologistId: true,
        psychologist: {
          select: {
            id: true,
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
      tasks: tasks.map(mapTask),
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