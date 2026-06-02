import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getAuthorizedPsychologist(req: NextRequest, patientId: string) {
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
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      ),
    };
  }

  const patientLink = await prisma.psychologistPatient.findFirst({
    where: {
      patientId,
      psychologistId: psychologist.id,
      active: true,
    },
  });

  if (!patientLink) {
    return {
      error: NextResponse.json(
        { error: "Paciente não vinculado a este psicólogo." },
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

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const summaries = await prisma.patientSummary.findMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      summaries,
    });
  } catch (error) {
    console.error("Erro ao listar resumos do paciente:", error);

    return NextResponse.json(
      { error: "Erro interno ao listar resumos do paciente." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Resumo para prontuário";

    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "O conteúdo do resumo é obrigatório." },
        { status: 400 },
      );
    }

    const sourceNotesCount =
      typeof body.sourceNotesCount === "number" ? body.sourceNotesCount : null;

    const generatedAt = body.generatedAt ? new Date(body.generatedAt) : null;

    const summary = await prisma.patientSummary.create({
      data: {
        title,
        content,
        patientId,
        psychologistId: auth.psychologist.id,
        sourceNotesCount,
        generatedAt,
      },
    });

    return NextResponse.json({
      summary,
      message: "Resumo salvo com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao salvar resumo do paciente:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar resumo do paciente." },
      { status: 500 },
    );
  }
}