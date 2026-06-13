import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import type { Prisma } from "@prisma/client";
import { getErrorMessage } from "@/lib/errorUtils";

type PatientAppointment = Prisma.AppointmentGetPayload<{
  select: {
    id: true;
    title: true;
    description: true;
    location: true;
    dateTime: true;
    endDateTime: true;
    status: true;
    googleEventLink: true;

    cancellationReason: true;
    cancelledAt: true;

    confirmationStatus: true;
    confirmedAt: true;

    cancellationRequestedAt: true;
    cancellationRequestReason: true;
    cancellationRequestStatus: true;

    lastReminderSentAt: true;
    reminderEmailSentAt: true;

    paymentStatus: true;
    paymentAmount: true;
    paymentNote: true;
    paidAt: true;

    createdAt: true;
    updatedAt: true;

    psychologist: {
      select: {
        id: true;
        crp: true;
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

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", appointments: [] },
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
        { error: "Paciente não encontrado.", appointments: [] },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

function getAppointmentEndReference(appointment: {
  dateTime: Date;
  endDateTime: Date | null;
}) {
  return appointment.endDateTime || appointment.dateTime;
}

function isAppointmentCompleted(appointment: {
  dateTime: Date;
  endDateTime: Date | null;
  status: string;
}) {
  return (
    appointment.status !== "CANCELLED" &&
    getAppointmentEndReference(appointment).getTime() < Date.now()
  );
}

function mapAppointment(appointment: PatientAppointment) {
  return {
    id: appointment.id,
    title: appointment.title || "Consulta",
    description: appointment.description || "",
    location: appointment.location || "",
    dateTime: appointment.dateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    status: appointment.status,
    isCompleted: isAppointmentCompleted(appointment),
    googleEventLink: appointment.googleEventLink || "",

    cancellationReason: appointment.cancellationReason || null,
    cancelledAt: appointment.cancelledAt?.toISOString() || null,

    confirmationStatus: appointment.confirmationStatus,
    confirmedAt: appointment.confirmedAt?.toISOString() || null,

    cancellationRequestedAt:
      appointment.cancellationRequestedAt?.toISOString() || null,
    cancellationRequestReason: appointment.cancellationRequestReason || null,
    cancellationRequestStatus: appointment.cancellationRequestStatus || null,

    lastReminderSentAt: appointment.lastReminderSentAt?.toISOString() || null,
    reminderEmailSentAt: appointment.reminderEmailSentAt?.toISOString() || null,

    paymentStatus: appointment.paymentStatus,
    paymentAmount:
      appointment.paymentAmount !== null && appointment.paymentAmount !== undefined
        ? Number(appointment.paymentAmount)
        : null,
    paymentNote: appointment.paymentNote || null,
    paidAt: appointment.paidAt?.toISOString() || null,

    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),

    psychologist: {
      id: appointment.psychologist.id,
      name: appointment.psychologist.user.name,
      email: appointment.psychologist.user.email,
      crp: appointment.psychologist.crp,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        googleEventLink: true,

        cancellationReason: true,
        cancelledAt: true,

        confirmationStatus: true,
        confirmedAt: true,

        cancellationRequestedAt: true,
        cancellationRequestReason: true,
        cancellationRequestStatus: true,

        lastReminderSentAt: true,
        reminderEmailSentAt: true,

        paymentStatus: true,
        paymentAmount: true,
        paymentNote: true,
        paidAt: true,

        createdAt: true,
        updatedAt: true,

        psychologist: {
          select: {
            id: true,
            crp: true,
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
    });

    return NextResponse.json({
      appointments: appointments.map(mapAppointment),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar consultas do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao listar consultas do paciente.",
        ),
        appointments: [],
      },
      { status: 500 },
    );
  }
}