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

type PaymentStatus = "PENDING" | "PAID" | "EXEMPT";

function isValidPaymentStatus(status: unknown): status is PaymentStatus {
  return status === "PENDING" || status === "PAID" || status === "EXEMPT";
}

function normalizeAmount(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(numericValue)) {
    throw new Error("Valor de pagamento inválido.");
  }

  if (numericValue < 0) {
    throw new Error("O valor da consulta não pode ser negativo.");
  }

  return numericValue;
}

function normalizePaymentNote(value: unknown) {
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
    paymentStatus: string;
    paymentAmount: unknown;
    paymentNote: string | null;
    paidAt: Date | null;
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
    paymentStatus: appointment.paymentStatus,
    paymentAmount:
      appointment.paymentAmount !== null && appointment.paymentAmount !== undefined
        ? Number(appointment.paymentAmount)
        : null,
    paymentNote: appointment.paymentNote,
    paidAt: appointment.paidAt?.toISOString() || null,
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

    const paymentStatus = body?.paymentStatus;

    if (!isValidPaymentStatus(paymentStatus)) {
      return NextResponse.json(
        {
          error: "Status de pagamento inválido. Use PENDING, PAID ou EXEMPT.",
        },
        { status: 400 },
      );
    }

    const paymentAmount = normalizeAmount(body?.paymentAmount);
    const paymentNote = normalizePaymentNote(body?.paymentNote);

    if (paymentNote.length > 500) {
      return NextResponse.json(
        { error: "A observação do pagamento deve ter no máximo 500 caracteres." },
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

    if (appointment.status === "CANCELLED" && paymentStatus === "PAID") {
      return NextResponse.json(
        {
          error:
            "Não é possível marcar como paga uma consulta cancelada. Use pendente ou isenta.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        paymentStatus,
        paymentAmount,
        paymentNote: paymentNote || null,
        paidAt: paymentStatus === "PAID" ? now : null,
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        endDateTime: true,
        status: true,
        paymentStatus: true,
        paymentAmount: true,
        paymentNote: true,
        paidAt: true,
      },
    });

    return NextResponse.json({
      message: "Pagamento atualizado com sucesso.",
      appointment: mapAppointment(updatedAppointment, {
        id: appointment.patientId,
        name: appointment.patient.user.name,
        email: appointment.patient.user.email,
      }),
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar pagamento da consulta:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao atualizar pagamento da consulta.",
        ),
      },
      { status: 500 },
    );
  }
}
