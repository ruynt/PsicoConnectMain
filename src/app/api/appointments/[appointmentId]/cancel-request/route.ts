import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

type Params = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export async function PATCH(req: NextRequest, context: Params) {
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
    const body = await req.json();

    const action = String(body?.action || "")
      .trim()
      .toUpperCase();
    const rejectionReason = String(body?.rejectionReason || "").trim();

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida. Use APPROVE ou REJECT." },
        { status: 400 },
      );
    }

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
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    if (
      appointment.confirmationStatus !== "CANCELLATION_REQUESTED" ||
      appointment.cancellationRequestStatus !== "PENDING"
    ) {
      return NextResponse.json(
        {
          error:
            "Esta consulta não possui uma solicitação de cancelamento pendente.",
        },
        { status: 400 },
      );
    }

    if (action === "APPROVE") {
      const updatedAppointment = await prisma.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason:
            appointment.cancellationRequestReason ||
            "Cancelamento solicitado pelo paciente e aprovado pelo psicólogo.",
          cancellationRequestStatus: "APPROVED",
          confirmationStatus: "CANCELLATION_REQUESTED",
        },
      });

      return NextResponse.json({
        message: "Solicitação de cancelamento aprovada com sucesso.",
        appointment: {
          id: updatedAppointment.id,
          title: updatedAppointment.title || "Consulta",
          dateTime: updatedAppointment.dateTime.toISOString(),
          endDateTime: updatedAppointment.endDateTime?.toISOString() || null,
          status: updatedAppointment.status,
          confirmationStatus: updatedAppointment.confirmationStatus,
          confirmedAt: updatedAppointment.confirmedAt?.toISOString() || null,
          cancellationReason: updatedAppointment.cancellationReason || null,
          cancelledAt: updatedAppointment.cancelledAt?.toISOString() || null,
          cancellationRequestedAt:
            updatedAppointment.cancellationRequestedAt?.toISOString() || null,
          cancellationRequestReason:
            updatedAppointment.cancellationRequestReason || null,
          cancellationRequestStatus:
            updatedAppointment.cancellationRequestStatus || null,
          patient: {
            id: appointment.patientId,
            name: appointment.patient.user.name,
            email: appointment.patient.user.email,
          },
        },
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        confirmationStatus: "PENDING",
        cancellationRequestStatus: "REJECTED",
        cancellationRequestReason: appointment.cancellationRequestReason,
        cancellationRequestedAt: appointment.cancellationRequestedAt,
        cancellationReason: rejectionReason || null,
        cancelledAt: null,
      },
    });

    return NextResponse.json({
      message: "Solicitação de cancelamento rejeitada com sucesso.",
      appointment: {
        id: updatedAppointment.id,
        title: updatedAppointment.title || "Consulta",
        dateTime: updatedAppointment.dateTime.toISOString(),
        endDateTime: updatedAppointment.endDateTime?.toISOString() || null,
        status: updatedAppointment.status,
        confirmationStatus: updatedAppointment.confirmationStatus,
        confirmedAt: updatedAppointment.confirmedAt?.toISOString() || null,
        cancellationReason: updatedAppointment.cancellationReason || null,
        cancelledAt: updatedAppointment.cancelledAt?.toISOString() || null,
        cancellationRequestedAt:
          updatedAppointment.cancellationRequestedAt?.toISOString() || null,
        cancellationRequestReason:
          updatedAppointment.cancellationRequestReason || null,
        cancellationRequestStatus:
          updatedAppointment.cancellationRequestStatus || null,
        patient: {
          id: appointment.patientId,
          name: appointment.patient.user.name,
          email: appointment.patient.user.email,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao analisar solicitação de cancelamento:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao analisar solicitação de cancelamento.",
      },
      { status: 500 },
    );
  }
}
