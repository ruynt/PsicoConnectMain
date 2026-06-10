import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { getErrorCode } from "@/lib/errorUtils";
import { authConfig } from "../../../../../../lib/auth";
import { sendCrpRejectedEmail } from "../../../../../../lib/emails";
import prisma from "../../../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function requireAdmin() {
  const session = await getServerSession(authConfig);
  const role = (session?.user as { role?: string } | undefined)?.role;

  return role === "ADMIN";
}

function normalizeReason(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 1000);
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const isAdmin = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Psicólogo não informado." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = normalizeReason(body?.reason);

    if (!reason) {
      return NextResponse.json(
        { error: "Informe o motivo da rejeição do CRP." },
        { status: 400 },
      );
    }

    const existingPsychologist = await prisma.psychologist.findUnique({
      where: { id },
      select: {
        id: true,
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!existingPsychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    if (existingPsychologist.user.role !== "PSYCHOLOGIST") {
      return NextResponse.json(
        { error: "Este usuário não está ativo como psicólogo." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.update({
      where: { id: existingPsychologist.id },
      data: {
        crpVerificationStatus: "REJECTED",
        crpVerifiedAt: null,
        crpRejectedAt: new Date(),
        crpRejectionReason: reason,
      },
      select: {
        id: true,
        crp: true,
        crpState: true,
        crpRegion: true,
        crpNumber: true,
        crpVerificationStatus: true,
        crpVerifiedAt: true,
        crpRejectedAt: true,
        crpRejectionReason: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    try {
      await sendCrpRejectedEmail({
        to: psychologist.user.email,
        name: psychologist.user.name,
        crp: psychologist.crp,
        crpState: psychologist.crpState,
        crpRegion: psychologist.crpRegion,
        crpNumber: psychologist.crpNumber,
        reason,
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de rejeição de CRP:", emailError);
    }

    return NextResponse.json({
      message: "Psicólogo rejeitado com sucesso.",
      psychologist: {
        id: psychologist.id,
        crp: psychologist.crp,
        crpState: psychologist.crpState,
        crpRegion: psychologist.crpRegion,
        crpNumber: psychologist.crpNumber,
        crpVerificationStatus: psychologist.crpVerificationStatus,
        crpVerifiedAt: psychologist.crpVerifiedAt?.toISOString() || null,
        crpRejectedAt: psychologist.crpRejectedAt?.toISOString() || null,
        crpRejectionReason: psychologist.crpRejectionReason || null,
        user: psychologist.user,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao rejeitar psicólogo:", error);

    if (getErrorCode(error) === "P2025") {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível rejeitar o psicólogo." },
      { status: 500 },
    );
  }
}
