import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";

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

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const { appointmentId } = await context.params;

    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado." },
        { status: 404 },
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: patient.id,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada para este paciente." },
        { status: 404 },
      );
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Não é possível confirmar uma consulta cancelada." },
        { status: 400 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        confirmationStatus: "CONFIRMED",
        confirmedAt: new Date(),
        cancellationRequestedAt: null,
        cancellationRequestReason: null,
        cancellationRequestStatus: null,
      },
    });

    return NextResponse.json({
      appointment: {
        id: updatedAppointment.id,
        title: updatedAppointment.title,
        dateTime: updatedAppointment.dateTime.toISOString(),
        endDateTime: updatedAppointment.endDateTime?.toISOString() || null,
        status: updatedAppointment.status,
        confirmationStatus: updatedAppointment.confirmationStatus,
        confirmedAt: updatedAppointment.confirmedAt?.toISOString() || null,
        cancellationRequestedAt:
          updatedAppointment.cancellationRequestedAt?.toISOString() || null,
        cancellationRequestReason:
          updatedAppointment.cancellationRequestReason || null,
        cancellationRequestStatus:
          updatedAppointment.cancellationRequestStatus || null,
      },
    });
  } catch (error: any) {
    console.error("Erro ao confirmar presença:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao confirmar presença.",
      },
      { status: 500 },
    );
  }
}
