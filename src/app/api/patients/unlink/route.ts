import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

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
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório." },
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

    const link = await prisma.psychologistPatient.findUnique({
      where: {
        psychologistId_patientId: {
          psychologistId: psychologist.id,
          patientId,
        },
      },
    });

    if (!link || !link.active) {
      return NextResponse.json(
        { error: "Este paciente não está vinculado a você." },
        { status: 404 },
      );
    }

    const updatedLink = await prisma.psychologistPatient.update({
      where: {
        id: link.id,
      },
      data: {
        active: false,
      },
    });

    return NextResponse.json({
      message: "Paciente desvinculado com sucesso.",
      link: updatedLink,
    });
  } catch (error: unknown) {
    console.error("Erro ao desvincular paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao desvincular paciente."),
      },
      { status: 500 },
    );
  }
}
