import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

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
    const paymentNote =
      typeof body?.paymentNote === "string" ? body.paymentNote.trim() : "";

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
    });

    return NextResponse.json({
      message: "Pagamento atualizado com sucesso.",
      appointment: {
        id: updatedAppointment.id,
        title: updatedAppointment.title || "Consulta",
        dateTime: updatedAppointment.dateTime.toISOString(),
        endDateTime: updatedAppointment.endDateTime?.toISOString() || null,
        status: updatedAppointment.status,
        paymentStatus: updatedAppointment.paymentStatus,
        paymentAmount: updatedAppointment.paymentAmount
          ? Number(updatedAppointment.paymentAmount)
          : null,
        paymentNote: updatedAppointment.paymentNote,
        paidAt: updatedAppointment.paidAt?.toISOString() || null,
        patient: {
          id: appointment.patientId,
          name: appointment.patient.user.name,
          email: appointment.patient.user.email,
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar pagamento da consulta:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao atualizar pagamento da consulta.",
      },
      { status: 500 },
    );
  }
}
