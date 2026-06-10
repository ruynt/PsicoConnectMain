import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";
import { getErrorMessage } from "@/lib/errorUtils";

async function getAuthorizedPsychologist(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || token.role !== "PSYCHOLOGIST") {
    return {
      error: NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 },
      ),
    };
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
    return {
      error: NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
  };
}

async function revokeGoogleToken(tokenToRevoke: string) {
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

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const tokenToRevoke =
      auth.psychologist.googleRefreshToken ||
      auth.psychologist.googleAccessToken ||
      "";

    if (tokenToRevoke) {
      await revokeGoogleToken(tokenToRevoke);
    }

    await prisma.psychologist.update({
      where: {
        id: auth.psychologist.id,
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
  } catch (error: unknown) {
    console.error("Erro ao desconectar Google Calendar:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(
          error,
          "Erro interno ao desconectar Google Calendar.",
        ),
      },
      { status: 500 },
    );
  }
}
