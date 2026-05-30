import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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
    const reason = String(body?.reason || "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Informe o motivo da rejeição do CRP." },
        { status: 400 },
      );
    }

    const psychologist = await prisma.psychologist.update({
      where: { id },
      data: {
        crpVerificationStatus: "REJECTED",
        crpVerifiedAt: null,
        crpRejectedAt: new Date(),
        crpRejectionReason: reason,
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
  } catch (error: any) {
    console.error("Erro ao rejeitar psicólogo:", error);

    if (error?.code === "P2025") {
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