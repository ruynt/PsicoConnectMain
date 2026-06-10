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
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeUrl(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const urlWithProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(urlWithProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function mapMaterial(material: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  url: string | null;
  content: string | null;
  viewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: material.id,
    title: material.title,
    description: material.description || "",
    category: material.category || "",
    url: material.url || "",
    content: material.content || "",
    viewedAt: material.viewedAt?.toISOString() || null,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
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
        { error: "Você não possui vínculo ativo com este paciente." },
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
      return NextResponse.json(
        {
          error: "Você não possui vínculo ativo com este paciente.",
          materials: [],
        },
        { status: auth.error.status },
      );
    }

    const materials = await prisma.patientMaterial.findMany({
      where: {
        patientId,
        psychologistId: auth.psychologist.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      materials: materials.map(mapMaterial),
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

    const auth = await getAuthorizedPsychologist(req, patientId);

    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();

    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const category = normalizeText(body.category);
    const url = normalizeUrl(body.url);
    const content = normalizeText(body.content);

    if (!title) {
      return NextResponse.json(
        { error: "O título do material é obrigatório." },
        { status: 400 },
      );
    }

    if (title.length > 120) {
      return NextResponse.json(
        { error: "O título deve ter no máximo 120 caracteres." },
        { status: 400 },
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "A descrição deve ter no máximo 500 caracteres." },
        { status: 400 },
      );
    }

    if (category && category.length > 80) {
      return NextResponse.json(
        { error: "A categoria deve ter no máximo 80 caracteres." },
        { status: 400 },
      );
    }

    if (content && content.length > 5000) {
      return NextResponse.json(
        { error: "O conteúdo deve ter no máximo 5000 caracteres." },
        { status: 400 },
      );
    }

    if (body.url && !url) {
      return NextResponse.json(
        { error: "Informe um link válido começando com http ou https." },
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

    const material = await prisma.patientMaterial.create({
      data: {
        title,
        description,
        category,
        url,
        content,
        patientId,
        psychologistId: auth.psychologist.id,
      },
    });

    return NextResponse.json({
      message: "Material psicoeducativo enviado com sucesso.",
      material: mapMaterial(material),
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