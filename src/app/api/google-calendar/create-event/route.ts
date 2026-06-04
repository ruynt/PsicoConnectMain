import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../../lib/prisma";

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        "Erro ao renovar token do Google.",
    );
  }

  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000),
  };
}

async function getValidGoogleAccessToken(psychologist: {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleAccessTokenExpires: Date | null;
}) {
  const expiresAt = psychologist.googleAccessTokenExpires?.getTime() || 0;
  const tokenIsValid =
    psychologist.googleAccessToken && expiresAt > Date.now() + 60 * 1000;

  if (tokenIsValid) {
    return psychologist.googleAccessToken as string;
  }

  if (!psychologist.googleRefreshToken) {
    return null;
  }

  const refreshed = await refreshGoogleAccessToken(
    psychologist.googleRefreshToken,
  );

  await prisma.psychologist.update({
    where: {
      id: psychologist.id,
    },
    data: {
      googleAccessToken: refreshed.accessToken,
      googleAccessTokenExpires: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

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

  try {
    const psychologist = await prisma.psychologist.findUnique({
      where: {
        userId: String(token.id),
      },
      select: {
        id: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleAccessTokenExpires: true,
      },
    });

    if (!psychologist) {
      return NextResponse.json(
        { error: "Psicólogo não encontrado." },
        { status: 404 },
      );
    }

    const googleAccessToken = await getValidGoogleAccessToken(psychologist);

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google Calendar não conectado." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const { title, date, startTime, endTime, location, description } = body;

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Título, data, hora inicial e hora final são obrigatórios." },
        { status: 400 },
      );
    }

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;

    const googleResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description: description || "",
          location: location || "",
          start: {
            dateTime: startDateTime,
            timeZone: "America/Fortaleza",
          },
          end: {
            dateTime: endDateTime,
            timeZone: "America/Fortaleza",
          },
        }),
      },
    );

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      return NextResponse.json(
        {
          error: "Erro ao criar evento no Google Calendar.",
          details: data,
        },
        { status: googleResponse.status },
      );
    }

    return NextResponse.json({
      message: "Evento criado com sucesso no Google Calendar.",
      event: data,
    });
  } catch (error) {
    console.error("Erro ao criar evento:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar evento no Google Calendar." },
      { status: 500 },
    );
  }
}
