import { NextResponse } from "next/server";

import prisma from "../../../../lib/prisma";
import { getTokenLookupCandidates } from "../../../../lib/token-hash";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(request: Request) {
  const urlParts = request.url.split("/");
  const token = urlParts[urlParts.length - 1];

  if (!token || token.length < 30) {
    return NextResponse.json(
      { error: "Token em falta ou inválido no URL." },
      { status: 400 },
    );
  }

  const tokenCandidates = getTokenLookupCandidates(token);

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token: {
        in: tokenCandidates,
      },
    },
  });

  if (!verificationToken) {
    return NextResponse.json(
      { error: "Token inválido ou não encontrado" },
      { status: 404 },
    );
  }

  const hasExpired = new Date(verificationToken.expiresAt) < new Date();
  if (hasExpired) {
    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    return NextResponse.json(
      { error: "Token expirado. Por favor, tente registrar-se novamente." },
      { status: 410 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: verificationToken.email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utilizador não encontrado" },
      { status: 404 },
    );
  }

  if (user.emailVerified) {
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      },
    }),
    prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    }),
  ]);

  return NextResponse.redirect(`${baseUrl}/login?verified=true`);
}
