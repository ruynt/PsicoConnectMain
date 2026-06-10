import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

function normalizeScaleValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  if (numberValue < 0 || numberValue > 10) {
    return null;
  }

  return numberValue;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeAppointmentId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

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
}) {
  return {
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
  };
}

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", checkin: null },
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
        { error: "Paciente não encontrado.", checkin: null },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

function validateTextLength(label: string, value: string | null, max: number) {
  if (value && value.length > max) {
    return NextResponse.json(
      { error: `${label} deve ter no máximo ${max} caracteres.` },
      { status: 400 },
    );
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const appointmentId = normalizeAppointmentId(
      searchParams.get("appointmentId"),
    );

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório.", checkin: null },
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
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Consulta não encontrada para este paciente.", checkin: null },
        { status: 404 },
      );
    }

    const checkin = await prisma.preSessionCheckin.findUnique({
      where: {
        appointmentId_patientId: {
          appointmentId: appointment.id,
          patientId: auth.patient.id,
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
      },
    });

    return NextResponse.json({
      checkin: checkin ? mapCheckin(checkin) : null,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar checklist pré-sessão:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao buscar checklist."),
        checkin: null,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();

    const appointmentId = normalizeAppointmentId(body?.appointmentId);

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório." },
        { status: 400 },
      );
    }

    const mainConcern = normalizeText(body?.mainConcern);
    const importantEvents = normalizeText(body?.importantEvents);
    const topicsToDiscuss = normalizeText(body?.topicsToDiscuss);

    const mainConcernError = validateTextLength(
      "A preocupação principal",
      mainConcern,
      1000,
    );

    if (mainConcernError) {
      return mainConcernError;
    }

    const importantEventsError = validateTextLength(
      "Os acontecimentos importantes",
      importantEvents,
      1000,
    );

    if (importantEventsError) {
      return importantEventsError;
    }

    const topicsToDiscussError = validateTextLength(
      "Os assuntos para discutir",
      topicsToDiscuss,
      1000,
    );

    if (topicsToDiscussError) {
      return topicsToDiscussError;
    }

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
        { error: "Não é possível responder checklist de consulta cancelada." },
        { status: 400 },
      );
    }

    const checkin = await prisma.preSessionCheckin.upsert({
      where: {
        appointmentId_patientId: {
          appointmentId: appointment.id,
          patientId: auth.patient.id,
        },
      },
      update: {
        moodLevel: normalizeScaleValue(body?.moodLevel),
        anxietyLevel: normalizeScaleValue(body?.anxietyLevel),
        sleepLevel: normalizeScaleValue(body?.sleepLevel),
        mainConcern,
        importantEvents,
        topicsToDiscuss,
      },
      create: {
        appointmentId: appointment.id,
        patientId: auth.patient.id,
        moodLevel: normalizeScaleValue(body?.moodLevel),
        anxietyLevel: normalizeScaleValue(body?.anxietyLevel),
        sleepLevel: normalizeScaleValue(body?.sleepLevel),
        mainConcern,
        importantEvents,
        topicsToDiscuss,
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
      },
    });

    return NextResponse.json({
      message: "Checklist pré-sessão salvo com sucesso.",
      checkin: mapCheckin(checkin),
    });
  } catch (error: unknown) {
    console.error("Erro ao salvar checklist pré-sessão:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao salvar checklist."),
      },
      { status: 500 },
    );
  }
}