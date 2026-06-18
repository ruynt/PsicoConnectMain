import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import prisma from "../../../../lib/prisma";
import { getTokenLookupCandidates } from "../../../../lib/token-hash";
import {
  isPasswordLongEnough,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from "../../../../lib/password-policy";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token || token === "undefined") {
      return NextResponse.json(
        { error: "Token de redefinição inválido." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const password = String(body?.password || "");

    if (!isPasswordLongEnough(password)) {
      return NextResponse.json(
        { error: PASSWORD_MIN_LENGTH_MESSAGE },
        { status: 400 },
      );
    }

    const tokenCandidates = getTokenLookupCandidates(token);

    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: {
          in: tokenCandidates,
        },
      },
    });

    if (!passwordResetToken) {
      return NextResponse.json(
        { error: "Link de redefinição inválido ou já utilizado." },
        { status: 400 },
      );
    }

    if (passwordResetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id },
      });

      return NextResponse.json(
        { error: "Link de redefinição expirado. Solicite um novo link." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: passwordResetToken.email },
      select: { id: true },
    });

    if (!user) {
      await prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id },
      });

      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id },
      }),
    ]);

    return NextResponse.json({
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);

    return NextResponse.json(
      { error: "Não foi possível redefinir a senha." },
      { status: 500 },
    );
  }
}