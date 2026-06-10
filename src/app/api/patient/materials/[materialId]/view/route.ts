import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

type RouteContext = {
  params: Promise<{
    materialId: string;
  }>;
};

async function getAuthenticatedPatient(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PATIENT") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
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
        { error: "Paciente não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    patient,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedPatient(req);

    if (auth.error) {
      return auth.error;
    }

    const { materialId } = await context.params;

    const material = await prisma.patientMaterial.findFirst({
      where: {
        id: materialId,
        patientId: auth.patient.id,
      },
      select: {
        id: true,
        viewedAt: true,
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material não encontrado." },
        { status: 404 },
      );
    }

    let viewedAt = material.viewedAt;

    if (!viewedAt) {
      const updatedMaterial = await prisma.patientMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          viewedAt: new Date(),
        },
        select: {
          viewedAt: true,
        },
      });

      viewedAt = updatedMaterial.viewedAt;
    }

    return NextResponse.json({
      message: "Material marcado como visualizado.",
      material: {
        id: material.id,
        viewedAt: viewedAt?.toISOString() || null,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao marcar material como visualizado:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao marcar material como visualizado.",
        ),
      },
      { status: 500 },
    );
  }
}