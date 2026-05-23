import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", appointments: [] },
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
        { error: "Paciente não encontrado.", appointments: [] },
        { status: 404 },
      );
    }

    const appointments = await prisma.appointment.findMany({
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
        preSessionCheckins: {
          where: {
            patientId: patient.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        dateTime: "asc",
      },
    });

    return NextResponse.json({
      appointments: appointments.map((appointment) => {
        const checkin = appointment.preSessionCheckins[0] || null;

        return {
          id: appointment.id,
          title: appointment.title || "Consulta",
          description: appointment.description || "",
          location: appointment.location || "",
          dateTime: appointment.dateTime.toISOString(),
          endDateTime: appointment.endDateTime?.toISOString() || null,

          status: appointment.status,
          googleEventLink: appointment.googleEventLink || "",

          cancellationReason: appointment.cancellationReason || null,
          cancelledAt: appointment.cancelledAt?.toISOString() || null,

          confirmationStatus: appointment.confirmationStatus,
          confirmedAt: appointment.confirmedAt?.toISOString() || null,

          cancellationRequestedAt:
            appointment.cancellationRequestedAt?.toISOString() || null,
          cancellationRequestReason:
            appointment.cancellationRequestReason || null,
          cancellationRequestStatus:
            appointment.cancellationRequestStatus || null,

          lastReminderSentAt:
            appointment.lastReminderSentAt?.toISOString() || null,
          reminderEmailSentAt:
            appointment.reminderEmailSentAt?.toISOString() || null,

          createdAt: appointment.createdAt.toISOString(),
          updatedAt: appointment.updatedAt.toISOString(),

          psychologist: {
            id: appointment.psychologistId,
            name: appointment.psychologist.user.name,
            email: appointment.psychologist.user.email,
          },

          preSessionCheckin: checkin
            ? {
                id: checkin.id,
                moodLevel: checkin.moodLevel,
                anxietyLevel: checkin.anxietyLevel,
                sleepLevel: checkin.sleepLevel,
                mainConcern: checkin.mainConcern || "",
                importantEvents: checkin.importantEvents || "",
                topicsToDiscuss: checkin.topicsToDiscuss || "",
                createdAt: checkin.createdAt.toISOString(),
                updatedAt: checkin.updatedAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    console.error("Erro ao listar consultas do paciente:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao listar consultas do paciente.",
        appointments: [],
      },
      { status: 500 },
    );
  }
}
