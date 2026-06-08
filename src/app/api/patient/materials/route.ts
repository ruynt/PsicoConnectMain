import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Acesso não autorizado.", materials: [] },
      { status: 403 },
    );
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: {
        userId: String(token.id),
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Paciente não encontrado.", materials: [] },
        { status: 404 },
      );
    }

    const materials = await prisma.patientMaterial.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        psychologist: {
          include: {
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
        title: material.title,
        description: material.description || "",
        category: material.category || "",
        url: material.url || "",
        content: material.content || "",
        viewedAt: material.viewedAt?.toISOString() || null,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
        psychologist: {
          id: material.psychologistId,
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
