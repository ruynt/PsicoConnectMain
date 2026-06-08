import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getErrorCode } from "@/lib/errorUtils";

import { authConfig } from "../../../../../../lib/auth";
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
        { error: "Usuário não informado." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { emailVerified: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({
      message: "E-mail marcado como verificado.",
      user: {
        ...user,
        emailVerified: user.emailVerified?.toISOString() || null,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao verificar e-mail do usuário:", error);

    if (getErrorCode(error) === "P2025") {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível verificar o e-mail." },
      { status: 500 },
    );
  }
}
