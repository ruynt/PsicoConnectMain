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

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", checkin: null },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório.", checkin: null },
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
        { error: "Paciente não encontrado.", checkin: null },
        { status: 404 },
      );
    }

    const checkin = await prisma.preSessionCheckin.findUnique({
      where: {
        appointmentId_patientId: {
          appointmentId,
          patientId: patient.id,
        },
      },
    });

    return NextResponse.json({
      checkin: checkin
        ? {
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
          }
        : null,
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
    const body = await req.json();

    const {
      appointmentId,
      moodLevel,
      anxietyLevel,
      sleepLevel,
      mainConcern,
      importantEvents,
      topicsToDiscuss,
    } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "ID da consulta é obrigatório." },
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
        { error: "Não é possível responder checklist de consulta cancelada." },
        { status: 400 },
      );
    }

    const checkin = await prisma.preSessionCheckin.upsert({
      where: {
        appointmentId_patientId: {
          appointmentId: appointment.id,
          patientId: patient.id,
        },
      },
      update: {
        moodLevel: normalizeScaleValue(moodLevel),
        anxietyLevel: normalizeScaleValue(anxietyLevel),
        sleepLevel: normalizeScaleValue(sleepLevel),
        mainConcern: normalizeText(mainConcern),
        importantEvents: normalizeText(importantEvents),
        topicsToDiscuss: normalizeText(topicsToDiscuss),
      },
      create: {
        appointmentId: appointment.id,
        patientId: patient.id,
        moodLevel: normalizeScaleValue(moodLevel),
        anxietyLevel: normalizeScaleValue(anxietyLevel),
        sleepLevel: normalizeScaleValue(sleepLevel),
        mainConcern: normalizeText(mainConcern),
        importantEvents: normalizeText(importantEvents),
        topicsToDiscuss: normalizeText(topicsToDiscuss),
      },
    });

    return NextResponse.json({
      message: "Checklist pré-sessão salvo com sucesso.",
      checkin: {
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
      },
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
