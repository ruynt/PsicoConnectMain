import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function mapCheckin(checkin: {
  id: string;
  appointmentId: string;
  patientId: string;
  moodLevel: number | null;
  anxietyLevel: number | null;
  sleepLevel: number | null;
  mainConcern: string | null;
  importantEvents: string | null;
  topicsToDiscuss: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment: {
    id: string;
    title: string | null;
    dateTime: Date;
    endDateTime: Date | null;
    status: string;
    location: string | null;
  };
}) {
  return {
    id: checkin.id,
    appointmentId: checkin.appointmentId,
    patientId: checkin.patientId,
    moodLevel: checkin.moodLevel,
    anxietyLevel: checkin.anxietyLevel,
    sleepLevel: checkin.sleepLevel,
    mainConcern: decryptNullableSensitiveText(checkin.mainConcern),
    importantEvents: decryptNullableSensitiveText(checkin.importantEvents),
    topicsToDiscuss: decryptNullableSensitiveText(checkin.topicsToDiscuss),
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
  };
}

async function getAuthorizedPsychologist(req: NextRequest, patientId: string) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", checkins: [] },
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
        { error: "Psicólogo não encontrado.", checkins: [] },
        { status: 404 },
      ),
    };
  }

  const patientLink = await prisma.psychologistPatient.findFirst({
    where: {
      psychologistId: psychologist.id,
      patientId,
      active: true,
    },
    select: {
      id: true,
    },
  });

  if (!patientLink) {
    return {
      error: NextResponse.json(
        {
          error: "Você não possui vínculo ativo com este paciente.",
          checkins: [],
        },
        { status: 403 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    if (!patientId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório.", checkins: [] },
        { status: 400 },
      );
    }

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const checkins = await prisma.preSessionCheckin.findMany({
      where: {
        patientId,
        appointment: {
          psychologistId: auth.psychologist.id,
        },
      },
      select: {
        id: true,
        appointmentId: true,
        patientId: true,
        moodLevel: true,
        anxietyLevel: true,
        sleepLevel: true,
        mainConcern: true,
        importantEvents: true,
        topicsToDiscuss: true,
        createdAt: true,
        updatedAt: true,
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
      checkins: checkins.map(mapCheckin),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar checklists do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao listar checklists do paciente.",
        ),
        checkins: [],
      },
      { status: 500 },
    );
  }
}