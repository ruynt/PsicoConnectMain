import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText, encryptNullableSensitiveText } from "@/lib/encryption";
import {
  optionalScaleNumber,
  optionalTrimmedString,
  parseJsonBody,
  requiredUuidString,
} from "@/lib/api-validation";

function normalizeAppointmentId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

const checkinSchema = z.object({
  appointmentId: requiredUuidString(
    "ID da consulta é obrigatório.",
    "ID da consulta inválido.",
  ),
  moodLevel: optionalScaleNumber("Informe um valor entre 0 e 10."),
  anxietyLevel: optionalScaleNumber("Informe um valor entre 0 e 10."),
  sleepLevel: optionalScaleNumber("Informe um valor entre 0 e 10."),
  mainConcern: optionalTrimmedString(
    1000,
    "A preocupação principal deve ter no máximo 1000 caracteres.",
  ),
  importantEvents: optionalTrimmedString(
    1000,
    "Os acontecimentos importantes devem ter no máximo 1000 caracteres.",
  ),
  topicsToDiscuss: optionalTrimmedString(
    1000,
    "Os assuntos para discutir devem ter no máximo 1000 caracteres.",
  ),
});

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
    mainConcern: decryptNullableSensitiveText(checkin.mainConcern),
    importantEvents: decryptNullableSensitiveText(checkin.importantEvents),
    topicsToDiscuss: decryptNullableSensitiveText(checkin.topicsToDiscuss),
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

    const parsedBody = await parseJsonBody(req, checkinSchema);

    if (parsedBody.error) {
      return parsedBody.error;
    }

    const body = parsedBody.data;
    const appointmentId = body.appointmentId;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório." },
        { status: 400 },
      );
    }

    const mainConcern = body.mainConcern;
    const importantEvents = body.importantEvents;
    const topicsToDiscuss = body.topicsToDiscuss;

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
        { error: "Não é possível responder checklist de consulta cancelada." },
        { status: 400 },
      );
    }

    if (isAppointmentCompleted(appointment)) {
      return NextResponse.json(
        { error: "Não é possível responder checklist de consulta finalizada." },
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
        moodLevel: body.moodLevel,
        anxietyLevel: body.anxietyLevel,
        sleepLevel: body.sleepLevel,
        mainConcern: encryptNullableSensitiveText(mainConcern),
        importantEvents: encryptNullableSensitiveText(importantEvents),
        topicsToDiscuss: encryptNullableSensitiveText(topicsToDiscuss),
      },
      create: {
        appointmentId: appointment.id,
        patientId: auth.patient.id,
        moodLevel: body.moodLevel,
        anxietyLevel: body.anxietyLevel,
        sleepLevel: body.sleepLevel,
        mainConcern: encryptNullableSensitiveText(mainConcern),
        importantEvents: encryptNullableSensitiveText(importantEvents),
        topicsToDiscuss: encryptNullableSensitiveText(topicsToDiscuss),
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