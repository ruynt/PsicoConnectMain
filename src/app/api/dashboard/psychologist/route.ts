import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import type { Prisma } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sevenDaysFromNow() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(23, 59, 59, 999);
  return date;
}

function next24HoursFromNow() {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date;
}

type DashboardAppointment = Prisma.AppointmentGetPayload<{
  include: {
    patient: {
      include: {
        user: {
          select: {
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

function mapDashboardAppointment(appointment: DashboardAppointment) {
  return {
    id: appointment.id,
    title: decryptNullableSensitiveText(appointment.title) || "Consulta",
    dateTime: appointment.dateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    location: decryptNullableSensitiveText(appointment.location),
    patientId: appointment.patientId,
    patientName: appointment.patient.user.name,
    patientEmail: appointment.patient.user.email,
    confirmationStatus: appointment.confirmationStatus,
    confirmedAt: appointment.confirmedAt?.toISOString() || null,
    cancellationRequestStatus: appointment.cancellationRequestStatus || null,
    reminderEmailSentAt: appointment.reminderEmailSentAt?.toISOString() || null,
    lastReminderSentAt: appointment.lastReminderSentAt?.toISOString() || null,
  };
}

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    const now = new Date();

    const [
      activePatientsCount,
      todayAppointments,
      nextAppointment,
      upcoming24hAppointments,
      pendingCancellationRequests,
      confirmedAppointmentsCount,
      pendingConfirmationAppointmentsCount,
      cancellationRequestedAppointmentsCount,
      scheduledAppointmentsCount,
      cancelledAppointmentsThisMonthCount,
      recentCancelledAppointments,
      recentCheckins,
      recentNotes,
      pendingTasksCount,
      completedTasksCount,
      dueSoonTasks,
      recentTasks,
      materialsCount,
      viewedMaterialsCount,
      unviewedMaterialsCount,
      recentMaterials,
    ] = await Promise.all([
      prisma.psychologistPatient.count({
        where: {
          psychologistId: psychologist.id,
          active: true,
        },
      }),

      prisma.appointment.findMany({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          dateTime: {
            gte: startOfToday(),
            lte: endOfToday(),
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dateTime: "asc",
        },
      }),

      prisma.appointment.findFirst({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          dateTime: {
            gte: now,
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dateTime: "asc",
        },
      }),

      prisma.appointment.findMany({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          dateTime: {
            gte: now,
            lte: next24HoursFromNow(),
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dateTime: "asc",
        },
      }),

      prisma.appointment.findMany({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          confirmationStatus: "CANCELLATION_REQUESTED",
          cancellationRequestStatus: "PENDING",
          dateTime: {
            gte: now,
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dateTime: "asc",
        },
      }),

      prisma.appointment.count({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          confirmationStatus: "CONFIRMED",
          dateTime: {
            gte: now,
          },
        },
      }),

      prisma.appointment.count({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          confirmationStatus: "PENDING",
          dateTime: {
            gte: now,
          },
        },
      }),

      prisma.appointment.count({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          confirmationStatus: "CANCELLATION_REQUESTED",
          cancellationRequestStatus: "PENDING",
          dateTime: {
            gte: now,
          },
        },
      }),

      prisma.appointment.count({
        where: {
          psychologistId: psychologist.id,
          status: "SCHEDULED",
          dateTime: {
            gte: now,
          },
        },
      }),

      prisma.appointment.count({
        where: {
          psychologistId: psychologist.id,
          status: "CANCELLED",
          cancelledAt: {
            gte: startOfMonth(),
          },
        },
      }),

      prisma.appointment.findMany({
        where: {
          psychologistId: psychologist.id,
          status: "CANCELLED",
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          cancelledAt: "desc",
        },
        take: 5,
      }),

      prisma.preSessionCheckin.findMany({
        where: {
          appointment: {
            psychologistId: psychologist.id,
          },
        },
        include: {
          patient: {
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
              status: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      }),

      prisma.sessionNote.findMany({
        where: {
          psychologistId: psychologist.id,
          archived: false,
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      }),

      prisma.therapeuticTask.count({
        where: {
          psychologistId: psychologist.id,
          status: "PENDING",
        },
      }),

      prisma.therapeuticTask.count({
        where: {
          psychologistId: psychologist.id,
          status: "COMPLETED",
        },
      }),

      prisma.therapeuticTask.findMany({
        where: {
          psychologistId: psychologist.id,
          status: "PENDING",
          dueDate: {
            gte: startOfToday(),
            lte: sevenDaysFromNow(),
          },
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 5,
      }),

      prisma.therapeuticTask.findMany({
        where: {
          psychologistId: psychologist.id,
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
      }),

      prisma.patientMaterial.count({
        where: {
          psychologistId: psychologist.id,
        },
      }),

      prisma.patientMaterial.count({
        where: {
          psychologistId: psychologist.id,
          viewedAt: {
            not: null,
          },
        },
      }),

      prisma.patientMaterial.count({
        where: {
          psychologistId: psychologist.id,
          viewedAt: null,
        },
      }),

      prisma.patientMaterial.findMany({
        where: {
          psychologistId: psychologist.id,
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

    const recommendations: string[] = [];

    if (upcoming24hAppointments.length > 0) {
      recommendations.push(
        `${upcoming24hAppointments.length} consulta(s) acontecerão nas próximas 24h.`,
      );
    }

    if (pendingCancellationRequests.length > 0) {
      recommendations.push(
        `${pendingCancellationRequests.length} solicitação(ões) de cancelamento aguardam sua análise.`,
      );
    }

    if (todayAppointments.length > 0) {
      recommendations.push(
        `Você possui ${todayAppointments.length} consulta(s) agendada(s) para hoje.`,
      );
    }

    if (recentCheckins.length > 0) {
      recommendations.push(
        `Há ${recentCheckins.length} checklist(s) pré-sessão recente(s) para revisar.`,
      );
    }

    if (pendingTasksCount > 0) {
      recommendations.push(
        `Há ${pendingTasksCount} tarefa(s) terapêutica(s) pendente(s) entre seus pacientes.`,
      );
    }

    if (dueSoonTasks.length > 0) {
      recommendations.push(
        `${dueSoonTasks.length} tarefa(s) possuem prazo nos próximos 7 dias.`,
      );
    }

    if (unviewedMaterialsCount > 0) {
      recommendations.push(
        `${unviewedMaterialsCount} material(is) psicoeducativo(s) ainda não foram visualizados pelos pacientes.`,
      );
    }

    if (cancelledAppointmentsThisMonthCount > 0) {
      recommendations.push(
        `${cancelledAppointmentsThisMonthCount} consulta(s) foram canceladas neste mês.`,
      );
    }

    if (!nextAppointment) {
      recommendations.push("Você ainda não possui próxima consulta agendada.");
    }

    return NextResponse.json({
      psychologist: {
        id: psychologist.id,
        name: psychologist.user.name,
        email: psychologist.user.email,
      },
      metrics: {
        activePatientsCount,
        todayAppointmentsCount: todayAppointments.length,
        scheduledAppointmentsCount,
        confirmedAppointmentsCount,
        pendingConfirmationAppointmentsCount,
        cancellationRequestedAppointmentsCount,
        pendingCancellationRequestsCount: pendingCancellationRequests.length,
        cancelledAppointmentsThisMonthCount,
        recentCheckinsCount: recentCheckins.length,
        recentNotesCount: recentNotes.length,
        pendingTasksCount,
        completedTasksCount,
        dueSoonTasksCount: dueSoonTasks.length,
        materialsCount,
        viewedMaterialsCount,
        unviewedMaterialsCount,
      },
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            title: decryptNullableSensitiveText(nextAppointment.title) || "Consulta",
            dateTime: nextAppointment.dateTime.toISOString(),
            endDateTime: nextAppointment.endDateTime?.toISOString() || null,
            location: decryptNullableSensitiveText(nextAppointment.location),
            patientId: nextAppointment.patientId,
            patientName: nextAppointment.patient.user.name,
            patientEmail: nextAppointment.patient.user.email,
            confirmationStatus: nextAppointment.confirmationStatus,
            confirmedAt: nextAppointment.confirmedAt?.toISOString() || null,
            cancellationRequestStatus:
              nextAppointment.cancellationRequestStatus || null,
          }
        : null,
      upcoming24hAppointments: upcoming24hAppointments.map(
        mapDashboardAppointment,
      ),
      todayAppointments: todayAppointments.map(mapDashboardAppointment),
      pendingCancellationRequests: pendingCancellationRequests.map(
        (appointment) => ({
          id: appointment.id,
          title: decryptNullableSensitiveText(appointment.title) || "Consulta",
          dateTime: appointment.dateTime.toISOString(),
          endDateTime: appointment.endDateTime?.toISOString() || null,
          location: decryptNullableSensitiveText(appointment.location),
          patientId: appointment.patientId,
          patientName: appointment.patient.user.name,
          patientEmail: appointment.patient.user.email,
          confirmationStatus: appointment.confirmationStatus,
          cancellationRequestedAt:
            appointment.cancellationRequestedAt?.toISOString() || null,
          cancellationRequestReason: decryptNullableSensitiveText(
            appointment.cancellationRequestReason,
          ),
          cancellationRequestStatus:
            appointment.cancellationRequestStatus || null,
        }),
      ),
      recentCancelledAppointments: recentCancelledAppointments.map(
        (appointment) => ({
          id: appointment.id,
          title: decryptNullableSensitiveText(appointment.title) || "Consulta",
          dateTime: appointment.dateTime.toISOString(),
          cancelledAt: appointment.cancelledAt?.toISOString() || null,
          cancellationReason: decryptNullableSensitiveText(
            appointment.cancellationReason,
          ),
          patientId: appointment.patientId,
          patientName: appointment.patient.user.name,
        }),
      ),
      recentCheckins: recentCheckins.map((checkin) => ({
        id: checkin.id,
        patientId: checkin.patientId,
        patientName: checkin.patient.user.name,
        appointmentId: checkin.appointmentId,
        appointmentTitle:
          decryptNullableSensitiveText(checkin.appointment.title) || "Consulta",
        appointmentDateTime: checkin.appointment.dateTime.toISOString(),
        moodLevel: checkin.moodLevel,
        anxietyLevel: checkin.anxietyLevel,
        sleepLevel: checkin.sleepLevel,
        mainConcern: decryptNullableSensitiveText(checkin.mainConcern),
        importantEvents: decryptNullableSensitiveText(checkin.importantEvents),
        topicsToDiscuss: decryptNullableSensitiveText(checkin.topicsToDiscuss),
        updatedAt: checkin.updatedAt.toISOString(),
      })),
      recentNotes: recentNotes.map((note) => ({
        id: note.id,
        patientId: note.patientId,
        patientName: note.patient.user.name,
        title: decryptNullableSensitiveText(note.title) || "Anotação sem título",
        updatedAt: note.updatedAt.toISOString(),
      })),
      dueSoonTasks: dueSoonTasks.map((task) => ({
        id: task.id,
        patientId: task.patientId,
        patientName: task.patient.user.name,
        title: decryptNullableSensitiveText(task.title) || "Tarefa",
        description: decryptNullableSensitiveText(task.description),
        dueDate: task.dueDate?.toISOString() || null,
        status: task.status,
        updatedAt: task.updatedAt.toISOString(),
      })),
      recentTasks: recentTasks.map((task) => ({
        id: task.id,
        patientId: task.patientId,
        patientName: task.patient.user.name,
        title: decryptNullableSensitiveText(task.title) || "Tarefa",
        description: decryptNullableSensitiveText(task.description),
        dueDate: task.dueDate?.toISOString() || null,
        status: task.status,
        completedAt: task.completedAt?.toISOString() || null,
        cancelledAt: task.cancelledAt?.toISOString() || null,
        updatedAt: task.updatedAt.toISOString(),
      })),
      recentMaterials: recentMaterials.map((material) => ({
        id: material.id,
        patientId: material.patientId,
        patientName: material.patient.user.name,
        title: decryptNullableSensitiveText(material.title) || "Material",
        description: decryptNullableSensitiveText(material.description),
        category: decryptNullableSensitiveText(material.category),
        url: decryptNullableSensitiveText(material.url),
        viewedAt: material.viewedAt?.toISOString() || null,
        createdAt: material.createdAt.toISOString(),
      })),
      recommendations,
    });
  } catch (error: unknown) {
    console.error("Erro ao carregar dashboard do psicólogo:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao carregar dashboard."),
      },
      { status: 500 },
    );
  }
}
