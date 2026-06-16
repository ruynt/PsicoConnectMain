import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../lib/prisma";
import {
  decryptSensitiveText,
  encryptSensitiveText,
} from "@/lib/encryption";

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
    select: {
      id: true,
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
    select: {
      id: true,
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

function parseGeneratedAt(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseSourceNotesCount(value: unknown) {
  if (typeof value !== "number") {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function mapSummary(summary: {
  id: string;
  title: string | null;
  content: string;
  patientId: string;
  psychologistId: string;
  sourceNotesCount: number | null;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...summary,
    title: summary.title ? decryptSensitiveText(summary.title) : "Resumo para prontuário",
    content: decryptSensitiveText(summary.content),
    generatedAt: summary.generatedAt?.toISOString() || null,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.updatedAt.toISOString(),
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
      summaries: summaries.map(mapSummary),
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

    const sourceNotesCount = parseSourceNotesCount(body.sourceNotesCount);
    const generatedAt = parseGeneratedAt(body.generatedAt);

    const summary = await prisma.patientSummary.create({
      data: {
        title: encryptSensitiveText(title),
        content: encryptSensitiveText(content),
        patientId,
        psychologistId: auth.psychologist.id,
        sourceNotesCount,
        generatedAt,
      },
    });

    return NextResponse.json({
      summary: mapSummary(summary),
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