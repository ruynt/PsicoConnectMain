import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

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

function normalizeAction(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

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

function mapAppointment(
  appointment: {
    id: string;
    title: string | null;
    dateTime: Date;
    endDateTime: Date | null;
    status: string;
    confirmationStatus: string;
    confirmedAt: Date | null;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    cancellationRequestedAt: Date | null;
    cancellationRequestReason: string | null;
    cancellationRequestStatus: string | null;
  },
  patient: {
    id: string;
    name: string;
    email: string;
  },
) {
  return {
    id: appointment.id,
    title: appointment.title || "Consulta",
    dateTime: appointment.dateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    status: appointment.status,
    confirmationStatus: appointment.confirmationStatus,
    confirmedAt: appointment.confirmedAt?.toISOString() || null,
    cancellationReason: appointment.cancellationReason || null,
    cancelledAt: appointment.cancelledAt?.toISOString() || null,
    cancellationRequestedAt:
      appointment.cancellationRequestedAt?.toISOString() || null,
    cancellationRequestReason: appointment.cancellationRequestReason || null,
    cancellationRequestStatus: appointment.cancellationRequestStatus || null,
    patient,
  };
}

export async function PATCH(req: NextRequest, context: Params) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const { appointmentId } = await context.params;
    const body = await req.json();

    const action = normalizeAction(body?.action);
    const rejectionReason = normalizeText(body?.rejectionReason);

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Ação inválida. Use APPROVE ou REJECT." },
        { status: 400 },
      );
    }

    if (rejectionReason.length > 1000) {
      return NextResponse.json(
        { error: "O motivo da rejeição deve ter no máximo 1000 caracteres." },
        { status: 400 },
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        psychologistId: auth.psychologist.id,
      },
      select: {
        id: true,
        patientId: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        confirmationStatus: true,
        cancellationRequestStatus: true,
        cancellationRequestReason: true,
        cancellationRequestedAt: true,
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
        { error: "Esta consulta já está cancelada." },
        { status: 400 },
      );
    }

    if (isAppointmentCompleted(appointment)) {
      return NextResponse.json(
        { error: "Não é possível analisar cancelamento de uma consulta finalizada." },
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

    const patient = {
      id: appointment.patientId,
      name: appointment.patient.user.name,
      email: appointment.patient.user.email,
    };

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
        select: {
          id: true,
          title: true,
          dateTime: true,
          endDateTime: true,
          status: true,
          confirmationStatus: true,
          confirmedAt: true,
          cancellationReason: true,
          cancelledAt: true,
          cancellationRequestedAt: true,
          cancellationRequestReason: true,
          cancellationRequestStatus: true,
        },
      });

      return NextResponse.json({
        message: "Solicitação de cancelamento aprovada com sucesso.",
        appointment: mapAppointment(updatedAppointment, patient),
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
      select: {
        id: true,
        title: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        confirmationStatus: true,
        confirmedAt: true,
        cancellationReason: true,
        cancelledAt: true,
        cancellationRequestedAt: true,
        cancellationRequestReason: true,
        cancellationRequestStatus: true,
      },
    });

    return NextResponse.json({
      message: "Solicitação de cancelamento rejeitada com sucesso.",
      appointment: mapAppointment(updatedAppointment, patient),
    });
  } catch (error: unknown) {
    console.error("Erro ao analisar solicitação de cancelamento:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao analisar solicitação de cancelamento.",
        ),
      },
      { status: 500 },
    );
  }
}