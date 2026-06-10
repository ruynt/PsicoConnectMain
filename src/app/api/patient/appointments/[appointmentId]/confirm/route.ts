import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

type Params = {
  params: Promise<{
    appointmentId: string;
  }>;
};

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
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
        { error: "Paciente não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

function mapAppointment(appointment: {
  id: string;
  title: string | null;
  dateTime: Date;
  endDateTime: Date | null;
  status: string;
  confirmationStatus: string;
  confirmedAt: Date | null;
  cancellationRequestedAt: Date | null;
  cancellationRequestReason: string | null;
  cancellationRequestStatus: string | null;
}) {
  return {
    id: appointment.id,
    title: appointment.title || "Consulta",
    dateTime: appointment.dateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    status: appointment.status,
    confirmationStatus: appointment.confirmationStatus,
    confirmedAt: appointment.confirmedAt?.toISOString() || null,
    cancellationRequestedAt:
      appointment.cancellationRequestedAt?.toISOString() || null,
    cancellationRequestReason: appointment.cancellationRequestReason || null,
    cancellationRequestStatus: appointment.cancellationRequestStatus || null,
  };
}

export async function PATCH(req: NextRequest, context: Params) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { appointmentId } = await context.params;

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        status: true,
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
      select: {
        id: true,
        title: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        confirmationStatus: true,
        confirmedAt: true,
        cancellationRequestedAt: true,
        cancellationRequestReason: true,
        cancellationRequestStatus: true,
      },
    });

    return NextResponse.json({
      appointment: mapAppointment(updatedAppointment),
    });
  } catch (error: unknown) {
    console.error("Erro ao confirmar presença:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao confirmar presença."),
      },
      { status: 500 },
    );
  }
}