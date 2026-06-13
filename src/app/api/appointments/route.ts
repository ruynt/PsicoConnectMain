import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

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

async function getAuthorizedPsychologist(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", events: [] },
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
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado.", events: [] },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
  };
}

function mapAppointmentToEvent(appointment: {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  dateTime: Date;
  endDateTime: Date | null;
  googleEventId: string | null;
  googleEventLink: string | null;
  status: string;
  patientId: string;
  patient: {
    user: {
      name: string;
      email: string;
    };
  };
  cancellationReason: string | null;
  cancelledAt: Date | null;
  confirmationStatus: string;
  confirmedAt: Date | null;
  cancellationRequestedAt: Date | null;
  cancellationRequestReason: string | null;
  cancellationRequestStatus: string | null;
  lastReminderSentAt: Date | null;
  reminderEmailSentAt: Date | null;
  paymentStatus: string;
  paymentAmount: unknown;
  paymentNote: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: appointment.googleEventId || appointment.id,
    appointmentId: appointment.id,
    title: appointment.title || "Consulta",
    description: appointment.description || "",
    start: appointment.dateTime.toISOString(),
    end: appointment.endDateTime?.toISOString() || null,
    location: appointment.location || "",
    htmlLink: appointment.googleEventLink || "",
    status: appointment.status,
    isCompleted: isAppointmentCompleted(appointment),

    patientId: appointment.patientId,
    patientName: appointment.patient.user.name,
    patientEmail: appointment.patient.user.email,

    googleEventId: appointment.googleEventId || "",

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
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "SCHEDULED";
    const now = new Date();

    const statusFilter =
      status === "ALL"
        ? {}
        : status === "CANCELLED"
          ? { status: "CANCELLED" as const }
          : status === "COMPLETED"
            ? {
                status: "SCHEDULED" as const,
                OR: [
                  { endDateTime: { lt: now } },
                  { endDateTime: null, dateTime: { lt: now } },
                ],
              }
            : {
                status: "SCHEDULED" as const,
                OR: [
                  { endDateTime: { gte: now } },
                  { endDateTime: null, dateTime: { gte: now } },
                ],
              };

    const appointments = await prisma.appointment.findMany({
      where: {
        psychologistId: auth.psychologist.id,
        ...statusFilter,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        dateTime: true,
        endDateTime: true,
        googleEventId: true,
        googleEventLink: true,
        status: true,
        patientId: true,
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
      },
      orderBy: {
        dateTime:
          status === "CANCELLED" || status === "COMPLETED" ? "desc" : "asc",
      },
    });

    return NextResponse.json({
      events: appointments.map(mapAppointmentToEvent),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar consultas:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar consultas."),
        events: [],
      },
      { status: 500 },
    );
  }
}
