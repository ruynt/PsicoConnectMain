import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText, encryptSensitiveText } from "@/lib/encryption";

type Params = {
  params: Promise<{
    appointmentId: string;
  }>;
};

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

function normalizeReason(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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
    title: decryptNullableSensitiveText(appointment.title) || "Consulta",
    dateTime: appointment.dateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    status: appointment.status,
    confirmationStatus: appointment.confirmationStatus,
    confirmedAt: appointment.confirmedAt?.toISOString() || null,
    cancellationRequestedAt:
      appointment.cancellationRequestedAt?.toISOString() || null,
    cancellationRequestReason:
      decryptNullableSensitiveText(appointment.cancellationRequestReason) || null,
    cancellationRequestStatus: appointment.cancellationRequestStatus || null,
  };
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { appointmentId } = await context.params;
    const body = await req.json();

    const reason = normalizeReason(body?.reason);

    if (!reason) {
      return NextResponse.json(
        { error: "Informe o motivo da solicitação de cancelamento." },
        { status: 400 },
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        { error: "O motivo deve ter no máximo 1000 caracteres." },
        { status: 400 },
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        status: true,
        dateTime: true,
        endDateTime: true,
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

    if (isAppointmentCompleted(appointment)) {
      return NextResponse.json(
        { error: "Não é possível solicitar cancelamento de uma consulta finalizada." },
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
        cancellationRequestReason: encryptSensitiveText(reason),
        cancellationRequestStatus: "PENDING",
        confirmedAt: null,
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
    console.error("Erro ao solicitar cancelamento:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao solicitar cancelamento."),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: Params) {
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
        confirmationStatus: true,
        dateTime: true,
        endDateTime: true,
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

    if (isAppointmentCompleted(appointment)) {
      return NextResponse.json(
        { error: "Não é possível alterar solicitação de uma consulta finalizada." },
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
    console.error("Erro ao cancelar solicitação de cancelamento:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao cancelar solicitação de cancelamento.",
        ),
      },
      { status: 500 },
    );
  }
}