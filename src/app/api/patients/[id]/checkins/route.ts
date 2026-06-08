import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", checkins: [] },
      { status: 403 },
    );
  }

  try {
    const { id: patientId } = await context.params;

    if (!patientId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório.", checkins: [] },
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
        { error: "Psicólogo não encontrado.", checkins: [] },
        { status: 404 },
      );
    }

    const patientLink = await prisma.psychologistPatient.findFirst({
      where: {
        psychologistId: psychologist.id,
        patientId,
        active: true,
      },
    });

    if (!patientLink) {
      return NextResponse.json(
        {
          error: "Você não possui vínculo ativo com este paciente.",
          checkins: [],
        },
        { status: 403 },
      );
    }

    const checkins = await prisma.preSessionCheckin.findMany({
      where: {
        patientId,
        appointment: {
          psychologistId: psychologist.id,
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            title: true,
            dateTime: true,
            endDateTime: true,
            status: true,
            location: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      checkins: checkins.map((checkin) => ({
        id: checkin.id,
        appointmentId: checkin.appointmentId,
        patientId: checkin.patientId,
        moodLevel: checkin.moodLevel,
        anxietyLevel: checkin.anxietyLevel,
        sleepLevel: checkin.sleepLevel,
        mainConcern: checkin.mainConcern || "",
        importantEvents: checkin.importantEvents || "",
        topicsToDiscuss: checkin.topicsToDiscuss || "",
        createdAt: checkin.createdAt.toISOString(),
        updatedAt: checkin.updatedAt.toISOString(),
        appointment: {
          id: checkin.appointment.id,
          title: checkin.appointment.title || "Consulta",
          dateTime: checkin.appointment.dateTime.toISOString(),
          endDateTime: checkin.appointment.endDateTime?.toISOString() || null,
          status: checkin.appointment.status,
          location: checkin.appointment.location || "",
        },
      })),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar checklists do paciente:", error);

    return NextResponse.json(
      {
        error:
          getErrorMessage(error, "Erro interno ao listar checklists do paciente."),
        checkins: [],
      },
      { status: 500 },
    );
  }
}
