import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    materialId: string;
  }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const { materialId } = await context.params;

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

    const material = await prisma.patientMaterial.findFirst({
      where: {
        id: materialId,
        patientId: patient.id,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material não encontrado." },
        { status: 404 },
      );
    }

    const updatedMaterial = await prisma.patientMaterial.update({
      where: {
        id: material.id,
      },
      data: {
        viewedAt: material.viewedAt || new Date(),
      },
    });

    return NextResponse.json({
      message: "Material marcado como visualizado.",
      material: {
        id: updatedMaterial.id,
        viewedAt: updatedMaterial.viewedAt?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error("Erro ao marcar material como visualizado:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erro interno ao marcar material como visualizado.",
      },
      { status: 500 },
    );
  }
}
