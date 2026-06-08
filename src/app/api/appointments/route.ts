import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", events: [] },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "SCHEDULED";

    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado.", events: [] },
        { status: 404 },
      );
    }

    const statusFilter =
      status === "ALL"
        ? {}
        : status === "CANCELLED"
          ? { status: "CANCELLED" as const }
          : { status: "SCHEDULED" as const };

    const appointments = await prisma.appointment.findMany({
      where: {
        psychologistId: psychologist.id,
        ...statusFilter,
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
        dateTime: status === "CANCELLED" ? "desc" : "asc",
      },
    });

    const events = appointments.map((appointment) => ({
      id: appointment.googleEventId || appointment.id,
      appointmentId: appointment.id,
      title: appointment.title || "Consulta",
      description: appointment.description || "",
      start: appointment.dateTime.toISOString(),
      end: appointment.endDateTime?.toISOString() || null,
      location: appointment.location || "",
      htmlLink: appointment.googleEventLink || "",
      status: appointment.status,

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
    }));

    return NextResponse.json({
      events,
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
