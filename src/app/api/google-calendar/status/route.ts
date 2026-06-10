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
        { connected: false, calendarEmail: "", error: "Acesso não autorizado." },
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
      googleCalendarEmail: true,
    },
  });

  if (!psychologist) {
    return {
      error: NextResponse.json(
        {
          connected: false,
          calendarEmail: "",
          error: "Psicólogo não encontrado.",
        },
        { status: 404 },
      ),
    };
  }

  return {
    psychologist,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedPsychologist(req);

    if (auth.error) {
      return auth.error;
    }

    const connected = Boolean(
      auth.psychologist.googleAccessToken || auth.psychologist.googleRefreshToken,
    );

    return NextResponse.json({
      connected,
      calendarEmail: auth.psychologist.googleCalendarEmail || "",
    });
  } catch (error: unknown) {
    console.error("Erro ao consultar status do Google Calendar:", error);

    return NextResponse.json(
      {
        connected: false,
        calendarEmail: "",
        error: getErrorMessage(
          error,
          "Erro interno ao consultar status do Google Calendar.",
        ),
      },
      { status: 500 },
    );
  }
}
