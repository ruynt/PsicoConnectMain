import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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
    const { id } = await context.params;

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    const patientAccess = await prisma.patient.findFirst({
      where: {
        id,
        psychologistLinks: {
          some: {
            psychologistId: psychologist.id,
            active: true,
          },
        },
      },
    });

    if (!patientAccess) {
      return NextResponse.json(
        { error: "Você não tem acesso a este paciente." },
        { status: 403 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          },
        },
        appointments: {
          where: {
            psychologistId: psychologist.id,
          },
          orderBy: {
            dateTime: "desc",
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const now = new Date();

    const scheduledAppointments = patient.appointments.filter(
      (appointment) => appointment.status === "SCHEDULED",
    );

    const cancelledAppointments = patient.appointments.filter(
      (appointment) => appointment.status === "CANCELLED",
    );

    const nextAppointment = scheduledAppointments
      .filter((appointment) => appointment.dateTime >= now)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0];

    function mapAppointment(
      appointment: (typeof patient.appointments)[number],
    ) {
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

        paymentStatus: appointment.paymentStatus,
        paymentAmount: appointment.paymentAmount
          ? Number(appointment.paymentAmount)
          : null,
        paymentNote: appointment.paymentNote || null,
        paidAt: appointment.paidAt?.toISOString() || null,

        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      };
    }

    return NextResponse.json({
      patient: {
        id: patient.id,
        name: patient.user.name,
        email: patient.user.email,
        createdAt: patient.user.createdAt.toISOString(),
        totalAppointments: patient.appointments.length,
        scheduledAppointments: scheduledAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        nextAppointment: nextAppointment
          ? mapAppointment(nextAppointment)
          : null,
        appointments: patient.appointments.map(mapAppointment),
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar paciente:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao buscar paciente.",
      },
      { status: 500 },
    );
  }
}
