import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

export async function POST(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return NextResponse.json(
      { error: "Acesso não autorizado." },
      { status: 403 },
    );
  }

  const psychologist = await prisma.psychologist.findUnique({
    where: {
      userId: String(token.id),
    },
    select: {
      id: true,
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  if (!psychologist) {
    return NextResponse.json(
      { error: "Psicólogo não encontrado." },
      { status: 404 },
    );
  }

  const tokenToRevoke =
    psychologist.googleRefreshToken || psychologist.googleAccessToken || "";

  if (tokenToRevoke) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          token: tokenToRevoke,
        }),
      });
    } catch (error) {
      console.error("Falha ao revogar token Google:", error);
    }
  }

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleAccessTokenExpires: null,
      googleCalendarEmail: null,
    },
  });

  return NextResponse.json({
    message: "Google Calendar desconectado com sucesso.",
  });
}
