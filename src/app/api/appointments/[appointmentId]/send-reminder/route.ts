import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { sendAppointmentReminderEmail } from "../../../../../lib/emails";
import { getErrorMessage } from "@/lib/errorUtils";

type Params = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export async function POST(req: NextRequest, context: Params) {
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
    const { appointmentId } = await context.params;

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

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
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
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada para este psicólogo." },
        { status: 404 },
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Não é possível enviar lembrete de uma consulta cancelada." },
        { status: 400 },
      );
    }

    const now = new Date();

    if (appointment.dateTime < now) {
      return NextResponse.json(
        { error: "Não é possível enviar lembrete de uma consulta passada." },
        { status: 400 },
      );
    }

    await sendAppointmentReminderEmail({
      patientEmail: appointment.patient.user.email,
      patientName: appointment.patient.user.name,
      psychologistName: psychologist.user.name,
      title: appointment.title || "Consulta",
      startDateTime: appointment.dateTime,
      endDateTime: appointment.endDateTime,
      location: appointment.location || "",
      description: appointment.description || "",
      googleEventLink: appointment.googleEventLink || "",
    });

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        reminderEmailSentAt: now,
        lastReminderSentAt: now,
      },
    });

    return NextResponse.json({
      message: "Lembrete enviado por e-mail com sucesso.",
      appointment: {
        id: updatedAppointment.id,
        title: updatedAppointment.title || "Consulta",
        dateTime: updatedAppointment.dateTime.toISOString(),
        endDateTime: updatedAppointment.endDateTime?.toISOString() || null,
        status: updatedAppointment.status,
        reminderEmailSentAt:
          updatedAppointment.reminderEmailSentAt?.toISOString() || null,
        lastReminderSentAt:
          updatedAppointment.lastReminderSentAt?.toISOString() || null,
        patient: {
          id: appointment.patientId,
          name: appointment.patient.user.name,
          email: appointment.patient.user.email,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao enviar lembrete de consulta:", error);

    return NextResponse.json(
      {
        error:
          getErrorMessage(error, "Erro interno ao enviar lembrete de consulta por e-mail."),
      },
      { status: 500 },
    );
  }
}
