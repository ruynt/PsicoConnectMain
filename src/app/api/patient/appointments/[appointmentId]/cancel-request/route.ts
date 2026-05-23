import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";

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

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  try {
    const { appointmentId } = await context.params;
    const body = await req.json();

    const reason = String(body?.reason || "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Informe o motivo da solicitação de cancelamento." },
        { status: 400 },
      );
    }

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
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        confirmationStatus: "CANCELLATION_REQUESTED",
        cancellationRequestedAt: new Date(),
        cancellationRequestReason: reason,
        cancellationRequestStatus: "PENDING",
        confirmedAt: null,
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
    console.error("Erro ao solicitar cancelamento:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao solicitar cancelamento.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: Params) {
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
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    if (appointment.confirmationStatus !== "CANCELLATION_REQUESTED") {
      return NextResponse.json(
        {
          error: "Não há solicitação de cancelamento ativa para esta consulta.",
        },
        { status: 400 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        confirmationStatus: "PENDING",
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
    console.error("Erro ao cancelar solicitação de cancelamento:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao cancelar solicitação de cancelamento.",
      },
      { status: 500 },
    );
  }
}
