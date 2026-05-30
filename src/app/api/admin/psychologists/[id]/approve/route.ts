import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "../../../../../../lib/auth";
import {
  sendCrpApprovedEmail,
} from "../../../../../../lib/emails";
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

export async function PATCH(_req: Request, context: RouteContext) {
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

    const psychologist = await prisma.psychologist.update({
      where: { id },
      data: {
        crpVerificationStatus: "APPROVED",
        crpVerifiedAt: new Date(),
        crpRejectedAt: null,
        crpRejectionReason: null,
      },
      include: {
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
      await sendCrpApprovedEmail({
        to: psychologist.user.email,
        name: psychologist.user.name,
        crp: psychologist.crp,
        crpState: psychologist.crpState,
        crpRegion: psychologist.crpRegion,
        crpNumber: psychologist.crpNumber,
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de aprovação de CRP:", emailError);
    }

    return NextResponse.json({
      message: "Psicólogo aprovado com sucesso.",
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
  } catch (error: any) {
    console.error("Erro ao aprovar psicólogo:", error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível aprovar o psicólogo." },
      { status: 500 },
    );
  }
}