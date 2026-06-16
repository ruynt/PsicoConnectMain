import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";
import { decryptNullableSensitiveText } from "@/lib/encryption";

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado.", materials: [] },
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
        { error: "Paciente não encontrado.", materials: [] },
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

    const materials = await prisma.patientMaterial.findMany({
      where: {
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        url: true,
        content: true,
        viewedAt: true,
        createdAt: true,
        updatedAt: true,
        psychologistId: true,
        psychologist: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      materials: materials.map((material) => ({
        id: material.id,
        title: decryptNullableSensitiveText(material.title),
        description: decryptNullableSensitiveText(material.description),
        category: decryptNullableSensitiveText(material.category),
        url: decryptNullableSensitiveText(material.url),
        content: decryptNullableSensitiveText(material.content),
        viewedAt: material.viewedAt?.toISOString() || null,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
        psychologist: {
          id: material.psychologist.id || material.psychologistId,
          name: material.psychologist.user.name,
          email: material.psychologist.user.email,
        },
      })),
    });
  } catch (error: unknown) {
    console.error("Erro ao listar materiais do paciente:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error, "Erro interno ao listar materiais."),
        materials: [],
      },
      { status: 500 },
    );
  }
}