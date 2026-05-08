import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do paciente." },
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
        { error: "Psicólogo não encontrado para este usuário." },
        { status: 404 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        patient: true,
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
          psychologistId: psychologist.id,
          patientId: user.patient.id,
        },
      },
      update: {
        active: true,
      },
      create: {
        psychologistId: psychologist.id,
        patientId: user.patient.id,
        active: true,
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
  } catch (error: any) {
    console.error("Erro ao vincular paciente:", error);

    return NextResponse.json(
      {
        error: error?.message || "Erro interno ao vincular paciente.",
      },
      { status: 500 },
    );
  }
}
