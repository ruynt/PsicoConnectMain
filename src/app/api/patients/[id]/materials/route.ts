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

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed || null;
}

async function getPsychologistFromToken(req: NextRequest) {
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
      psychologist: null,
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
      psychologist: null,
    };
  }

  return {
    error: null,
    psychologist,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
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
          materials: [],
        },
        { status: 403 },
      );
    }

    const materials = await prisma.patientMaterial.findMany({
      where: {
        patientId,
        psychologistId: psychologist.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      materials: materials.map((material) => ({
        id: material.id,
        title: material.title,
        description: material.description || "",
        category: material.category || "",
        url: material.url || "",
        content: material.content || "",
        viewedAt: material.viewedAt?.toISOString() || null,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar materiais psicoeducativos:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar materiais."),
        materials: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: patientId } = await context.params;

    const { error, psychologist } = await getPsychologistFromToken(req);

    if (error || !psychologist) {
      return error;
    }

    const body = await req.json();

    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const category = normalizeText(body.category);
    const url = normalizeText(body.url);
    const content = normalizeText(body.content);

    if (!title) {
      return NextResponse.json(
        { error: "O título do material é obrigatório." },
        { status: 400 },
      );
    }

    if (!url && !content) {
      return NextResponse.json(
        {
          error:
            "Informe pelo menos um link ou um conteúdo textual para o material.",
        },
        { status: 400 },
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
        { error: "Você não possui vínculo ativo com este paciente." },
        { status: 403 },
      );
    }

    const material = await prisma.patientMaterial.create({
      data: {
        title,
        description,
        category,
        url,
        content,
        patientId,
        psychologistId: psychologist.id,
      },
    });

    return NextResponse.json({
      message: "Material psicoeducativo enviado com sucesso.",
      material: {
        id: material.id,
        title: material.title,
        description: material.description || "",
        category: material.category || "",
        url: material.url || "",
        content: material.content || "",
        viewedAt: material.viewedAt?.toISOString() || null,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao criar material psicoeducativo:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao criar material."),
      },
      { status: 500 },
    );
  }
}
