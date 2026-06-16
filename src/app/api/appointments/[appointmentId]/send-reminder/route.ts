import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { sendAppointmentReminderEmail } from "../../../../../lib/emails";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

type Params = {
  params: Promise<{
    appointmentId: string;
  }>;
};

async function getAuthorizedPsychologist(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const { appointmentId } = await context.params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        psychologistId: auth.psychologist.id,
      },
      select: {
        id: true,
        patientId: true,
        title: true,
        description: true,
        location: true,
        dateTime: true,
        endDateTime: true,
        googleEventLink: true,
        status: true,
        patient: {
          select: {
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
      psychologistName: auth.psychologist.user.name,
      title: decryptNullableSensitiveText(appointment.title) || "Consulta",
      startDateTime: appointment.dateTime,
      endDateTime: appointment.endDateTime,
      location: decryptNullableSensitiveText(appointment.location),
      description: decryptNullableSensitiveText(appointment.description),
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
      select: {
        id: true,
        title: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        reminderEmailSentAt: true,
        lastReminderSentAt: true,
      },
    });

    return NextResponse.json({
      message: "Lembrete enviado por e-mail com sucesso.",
      appointment: {
        id: updatedAppointment.id,
        title: decryptNullableSensitiveText(updatedAppointment.title) || "Consulta",
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
        error: getErrorMessage(
          error,
          "Erro interno ao enviar lembrete de consulta por e-mail.",
        ),
      },
      { status: 500 },
    );
  }
}
