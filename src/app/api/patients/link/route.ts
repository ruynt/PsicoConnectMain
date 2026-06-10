import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
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
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do paciente." },
        { status: 400 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        patient: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Paciente não encontrado. Peça para o paciente se cadastrar primeiro.",
        },
        { status: 404 },
      );
    }

    if (user.role !== "PATIENT" || !user.patient) {
      return NextResponse.json(
        { error: "O e-mail informado não pertence a uma conta de paciente." },
        { status: 400 },
      );
    }

    const link = await prisma.psychologistPatient.upsert({
      where: {
        psychologistId_patientId: {
          psychologistId: auth.psychologist.id,
          patientId: user.patient.id,
        },
      },
      update: {
        active: true,
      },
      create: {
        psychologistId: auth.psychologist.id,
        patientId: user.patient.id,
        active: true,
      },
      select: {
        id: true,
        psychologistId: true,
        patientId: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Paciente vinculado com sucesso.",
      link,
      patient: {
        id: user.patient.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao vincular paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao vincular paciente."),
      },
      { status: 500 },
    );
  }
}
